'use strict';

const Column = require('./column')
const {stringify} = require('./stringify')

/** Class representing a Where.
 * @typedef {Object} Where
 */
class Where {

    /**
     * Create a Where.
     * @param {string} table - The table to query
     */
    constructor(type, or = false, not = false) {
        this.andOr = or ? 'OR' : 'AND'
        this.not = not ? 'NOT ' : ''
        this.type = type
        this.sql = ''
        this.crossApplySql = false
    }

    init (...args) {
        let sql = ''
        switch (this.type) {
            case 'null':
                sql = this.null(args[0])
                break
            case 'in':
                sql = this.in(args[0], args[1])
                break
            case 'between':
                sql = this.between(args[0], args[1])
                break
            case 'where':
                // if there are two args and the first is a string, it's a simple WHERE col = value, or WHERE IN, or WHERE BETWEEN
                if (args.length === 2 && typeof args[0] === 'string') {
                    sql = this.where(args[0], args[1])
                }
                // if there are three args, it's a where statement with a custom operator
                if (args.length === 3) {
                    sql = this.where(args[0], args[2], args[1])
                }
                break
            default:
                break
        }
        if (sql === '') {
            throw `Could not prepare where object: ${this.type}, ${args.toString()}`
        }
        this.sql = sql
        return this
    }

    between (column, values) {
        const col = new Column(column)
        if (Array.isArray(values) && values.length === 2) {
            return `${col.assignment()} ${this.not}BETWEEN ${stringify(values[0])} AND ${stringify(values[1])}`
        }
        throw 'Your where(Not)Between statement does not have the required 2 values'

    }

    in (column, values) {
        const col = new Column(column)
        let assignment = col.assignment()
        if (col.json && col.json.type === 'array') {
            const crossApply = col.jsonCrossApply()
            this.crossApplySql = crossApply.sql
            assignment = crossApply.assignment
        }
        if (typeof values === 'object') {
            if (Array.isArray(values)) {
                return `${assignment} ${this.not}IN (${values.map(i => stringify(i)).join(',')})`
            }
            if (values.constructor && values.constructor.name === 'Raw') {
                return `${assignment} ${this.not}IN (${values.sql})`
            }
        }
        throw 'A where(Not)In statement requires an array or a Raw class'
    }

    where (column, value, operator = '=') {
        // TODO check that operator is valid
        const col = new Column(column)
        return `${this.not}${col.assignment()} ${operator} ${stringify(value)}`
    }

    null (column) {
        const col = new Column(column)
        return `${col.assignment()} IS ${this.not}NULL`
    }


}

module.exports = Where
