'use strict';

/*
TODO: This needs to be refactored

JSON Columns are much more complex and should be their own class as an extension of this one
- TODO: test class override assignment, i.e. if isJson { this = new JsonColumn(string) }

Examples of incoming construction and the resulting SQL

// top level
- qb.select('$data.subject_code').where('$data.subject_code')
- SELECT JSON_VALUE(data, '$.subject_code') AS data_subject_code
  FROM courses
  WHERE JSON_VALUE(data, '$.subject_code') = 'BIO'

// nested object
- qb.select('$data.enrollment.max').where('$data.enrollment.max')
- SELECT JSON_VALUE(data, '$.enrollment.max') AS data_enrollment_max
  FROM courses
  WHERE JSON_VALUE(data, '$.enrollment.max') > 0

// nested in array
- qb.select('$data.meetings[0].type').where('$data.meetings[0].type')
- SELECT JSON_VALUE(data, '$.meetings[0].type') AS data_meetings_0_type
  FROM courses
  WHERE JSON_VALUE(data, '$.meetings[0].type') = 'lecture'

// string in splat array (wherein)
- qb.select('$data.notes[*]').whereIn('$data.notes[*]', [1,3])
- SELECT data_notes_x AS data_notes
  FROM courses
  CROSS APPLY OPENJSON(data, '$.notes') WITH (data_notes_x NVARCHAR(max) '$') // NOTE!!! THERE IS NO AS JSON because the result is a single value
  WHERE data_notes_x IN (1,3)

// object in splat array
- qb.select('$data.meetings[*].').whereNull('$data.meetings[*].')
- SELECT data_meetings_x AS data_meetings
  FROM courses
  CROSS APPLY OPENJSON(data, '$.meetings') WITH (data_meetings_x NVARCHAR(max) '$' AS JSON) // NOTE!!! AS JSON because the result is an object
  WHERE data_meetings_x = '{}' // NOTE this is unique NULL case

// string nested in splat array
- qb.select('$data.meetings[*].type').whereIn('$data.meetings[*].type')
- SELECT JSON_VALUE(data_meetings_x, '$.type') AS data_meetings_type
  FROM courses
  CROSS APPLY OPENJSON(data, '$.meetings') WITH (data_meetings_x NVARCHAR(max) '$' AS JSON)
  WHERE JSON_VALUE(data_meetings_x, '$.type') = 'lecture'

// sting with multiple nesting of splat arrays
- qb.select('$data.meetings[*].days[*].something').whereIn('$data.meetings[*].days[*].something', [1,3])
- SELECT JSON_VALUE(data_meetings_days_x, '$.something') AS data_meetings_days_something
  FROM courses
  CROSS APPLY OPENJSON(data, '$.meetings') WITH (data_meetings_x NVARCHAR(max) '$' AS JSON)
  CROSS APPLY OPENJSON(data_meetings_x, '$.days') WITH (data_meetings_days_x NVARCHAR(max) '$' AS JSON)
  WHERE JSON_VALUE(data_meetings_days_x, '$.something') IN (1,3)

Observations
- if the string ends with [*], the last cross apply does not need to have AS JSON
- but any other non-ending [*]s in the string require AS JSON because we need to expose the object
- this also affects the select statement


NOTE!!!
The only supported WHERE should be NULL to test for empty objects. WHERE and WHERE IN and WHERE BETWEEN
are unnecessary, as you would simply target the underlying value. I believe this must be done like
WHERE colname = '{}' or '[]' we may want to call this a new WHERE like whereEmpty

// -- Mixing and matching

- qb.select('$data.meetings[*].').whereIn('$data.meetings[*].days[*]', (1,3)).where('$data.meetings[*].type', 'lecture')
- SELECT data_meetings_x AS data_meetings // NOTE: if it's a splat array, it's always cross applied
  FROM courses
  CROSS APPLY OPENJSON(data, '$.meetings') WITH (data_meetings NVARCHAR(max) '$' AS JSON)
  CROSS APPLY OPENJSON(data_meetings, '$.days') WITH (data_meetings_days NVARCHAR(max) '$')
  WHERE JSON_VALUE(data_meetings_days, '$.something') = 'lecture'
  JSON_VALUE(data_meetings, '$.type') = 'lecture'

NOTE!!!
Need to uniquify the cross applies

 */

/** Class representing a Column
 * @typedef {Object} Column
 */
class Column {
    /**
     * Create a Column
     * @param {string} column - the config for the column
     *
     * string e.g.
     * - name
     * - name as first_name
     * - table1.name as first_name
     * - $data.first_name
     * - $data.address.line[0]
     * - $data.address:array
     * - table1.$data.address[0] as address
     * - TABLE.$JSON_ROOT.PATH.TO.VALUE:TYPE
     */
    constructor (column = '*') {
        this.column = column
        const error = `${column.toString()} is not a valid column`
        let name = '*'
        this.alias = false
        this.json = false
        // check that it is a valid column string
        if (!this.isValidString(column)) {
            throw error
        }
        name = this.processTableAndAlias(column)

        // if name is prepended with $, check that it is a valid json path
        if (this.isJsonPath(name)) {
            if (!this.isValidJsonPath(name)) {
                throw error
            }
            name = this.processJsonPath(name)
        }
        this.name = name
    }

    /**
     * test is the passed column name is valid
     * @param string
     * @returns {boolean}
     */
    isValidString(string) {
        // if it's a string, it should match either 'column_name' or 'column_name as col'
        // or be a json path, e.g. $data.first_name or $data.address:array
        // if you put spaces in your column names, i hate you (i.e., do not do "column_name as ['column name'])"
        const split = string.split(' ')
        if (split.length === 2 || split.length > 3) {
            return false
        }
        return !(split.length > 1 && split[1] !== 'as')
    }

    /**
     * test is the passed column name is a valid json path
     * @param string
     * @returns {boolean}
     */
    isValidJsonPath(string) {
        // potential new json regex: return /\$\w+(\.\w+(\[[\d*]*])?)+\.?$/.test(string)
        return /\$\w+(\.\w+(\[\d*])?)+(:\w+)?$/.test(string)
    }

    /**
     * process the table and alias out of the passed string
     * @param string
     * @returns {string}
     */
    processTableAndAlias(string) {
        // split off the alias
        const aSplit = string.split(' ')
        this.alias = aSplit[2] || false
        // split off the table
        const tSplit = aSplit[0].split('.')
        // if the first value starts with $, no table was prepended
        // or if the length of the tSplit === 1, no table was prepended
        if (this.isJsonPath(tSplit[0]) || tSplit.length === 1) {
            return aSplit[0]
        }
        // else a table name was prepended
        // shift() returns tSplit[0] and removes it from the array
        this.table = tSplit.shift()
        // return everything else, joining with '.' in case it was a json path
        return tSplit.join('.')
    }

    /**
     * processes the json path, setting class values
     * @param string
     * @returns {string}
     */
    processJsonPath(string) {
        // indicate this is a json column
        const json = {}
        // split off the type
        const typeSplit = string.split(':')
        // set the type
        json.type = typeSplit[1] || 'string'
        // split the path
        const rootSplit = typeSplit[0].split('.')
        // the root element (actual column where the json is stored) is the first value
        json.root = rootSplit.shift().substr(1)
        const path = rootSplit.join('.')
        json.normalized = path.replace(/\W/g,'_')
        this.json = json
        return path
    }

    /**
     * test is the passed string is prepended with $, indicating a json path
     * @param string
     * @returns {boolean}
     */
    isJsonPath (string) {
        return string.substr(0, 1) === '$'
    }

    prependTable () {
        return this.table ? `${this.table}.` : ''
    }

    jsonPartialAssignment () {
        return `(${this.prependTable()}${this.json.root}, '$.${this.name}')`
    }

    /**
     * create a basic assignment for the column name
     */
    assignment () {
        let sql = ''
        if (this.json) {
            // for strings and numbers need to use json_value
            const action = ['array', 'object'].includes(this.json.type)
                ? 'JSON_QUERY' : 'JSON_VALUE'
            sql = `${action}${this.jsonPartialAssignment()}`
        } else {
            sql = `${this.prependTable()}${this.name}`
        }
        return sql
    }

    /**
     * creates a sql string for a select statement
     * @returns {string}
     */
    selection () {
        let alias = this.alias ? ` as ${this.alias}` : ''
        if (alias === '' && this.json) {
            alias = ` as ${this.json.normalized}`
        }
        return `${this.assignment()}${alias}`
    }

    /**
     * creates a json context, specifically required for querying WHERE IN on a json array
     * @returns {object}
     */
    jsonCrossApply () {
        if (this.json && this.json.type === 'array') {
            const assignment = `${this.json.normalized}_cross`
            return {
                sql: `CROSS APPLY OPENJSON ${this.jsonPartialAssignment()} WITH (${assignment} NVARCHAR(max) '$')`,
                assignment
            }
        }
        return false
    }


}

module.exports = Column
