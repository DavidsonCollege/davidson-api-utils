'use strict';

/*
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
     * regular column e.g.
     * - name
     * - name as first_name
     * - table1.name as first_name
     *
     * json string
     * - $data.first_name
     * - $data.address.line[0]
     * - table1.$data.first_name as first_name
     *
     * json object (ends with a . to indicate an object)
     * - $data.
     * - $data.enrollment.
     * - table1.$data.address[0]. as address
     *
     * json array (ends with a [*] to indicate you want to cross apply each value of the array)
     * - $data.meetings[*]
     * - $data.meetings[*].days[*]
     * - $data.meetings[*].building.
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
        return /\$\w+\.(\w+(\[(\d+|\*)\])?\.?)*?$/.test(string)
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
        this.json = {
            xApplies: []
        }

        // split the paths
        const pathParts = string.split('.')

        // assign the root
        this.json.root = pathParts[0].replace('$','')

        // if the last pathPart is null, it means the string ended in a .
        // e.g. $data.something.
        // this indicates the return value is an object
        const is_object = string.endsWith('.')

        // if there is not a *, the resulting variables are simple to assign
        if (string.indexOf('*') === -1) {
            // JSON_QUERY or JSON_VALUE based on if the result is a string or not
            const subPath = pathParts[1] ? `.${pathParts.slice(1).join('.')}` : ''
            this.json.assignment = `JSON_${is_object ? 'QUERY' : 'VALUE'}(${this.prependTable()}${this.json.root}, '$${subPath.replace(/\.$/, '')}')`
            this.alias = this.alias || this.normalizeJsonPath(string)
        }
        // else, things get a little more complex
        else {
            // first split on the *, each [*] is going to require a cross apply statement
            // filter out any trailing closing brackets
            // NOTE: keep the trailing bracket if it ends with a ]., because this indicates a json value
            const splatSplits = string.split('*').filter(i => i !== ']')
            let computedXApply = 'x'
            // loop through the split values, creating a cross apply statement for each one
            for (let i = 0; i < splatSplits.length; i++) {
                // clean up the string, because there are strings like '$data.meetings[' and '].days['
                const cleaned = splatSplits[i].replace(/(^]\.|\[$)/g, '')
                // skip if this is the last splatSplit
                if (cleaned === '') {
                    continue
                }
                // this is an object is there are more splatSplits or if the next one is '].'
                const is_object = splatSplits[i+1] || splatSplits[i+1] === '].'
                // need to assess if there are additional cross applies coming later
                // in the instance where the cross apply is an array (ex. $data.notes[*]), there won't be another value in the array
                // in the instance where the cross apply is an object (ex. $data.meetings[*].), the next value will be '].'
                const is_last = typeof splatSplits[i+1] === 'undefined' || splatSplits[i+1] === '].'
                // if this is the first splatSplit, we use the root column instead of a computed cross applied one
                const is_first = i === 0
                // if this is the first, remove the root from the string
                const subPath = is_first ? cleaned.replace(`$${this.json.root}.`, '') : cleaned
                // need to freeze the current computedXApply before appending to use in the OPENJSON statement
                const freezeComputedXApply = computedXApply
                // this is a running computed column name, so the first name is x_data_meetings, and if there are additional cross applies
                // append _next_path, where next_path is the next path in the json path
                computedXApply += `_${this.normalizeJsonPath(cleaned)}`
                // create the cross apply sql
                const crossApply = `CROSS APPLY OPENJSON(${is_first ? this.prependTable() + this.json.root : freezeComputedXApply}, '$.${subPath}') WITH (${computedXApply} NVARCHAR(max) '$'${is_object ? ' AS JSON' : ''})`
                // add the cross apply sql to the array
                this.json.xApplies.push(crossApply)
                if (is_last) {
                    this.json.assignment = computedXApply
                    this.alias = this.alias || computedXApply.replace(/^x_/, '')
                }
            }
        }
        return this.json.assignment
    }

    /**
     * normalizes a json path
     * @param string
     * @returns {*}
     */
    normalizeJsonPath (string) {
        return string.replace(/^\$/, '').replace(/\.$/, '').replace(/\[\*]/g,'').replace(/]/g, '').replace(/\W/g, '_')
    }

    /**
     * test is the passed string is prepended with $, indicating a json path
     * @param string
     * @returns {boolean}
     */
    isJsonPath (string) {
        return string.substr(0, 1) === '$'
    }

    /**
     * Prepends the table to the column definition
     * @returns {string|string}
     */
    prependTable () {
        return this.table ? `${this.table}.` : ''
    }

    /**
     * create a basic assignment for the column name
     */
    assignment () {
        return this.json ? this.json.assignment : `${this.prependTable()}${this.name}`
    }

    /**
     * creates a sql string for a select statement
     * @returns {string}
     */
    selection () {
        let alias = this.alias ? ` as ${this.alias}` : ''
        return `${this.assignment()}${alias}`
    }


}

module.exports = Column
