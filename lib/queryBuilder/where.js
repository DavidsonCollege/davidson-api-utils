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
        this.column = null
    }

    init (...args) {
        // instantiate sql
        let sql = ''
        // create the column class
        this.column = new Column(args[0])
        switch (this.type) {
            case 'null':
                sql = this.null()
                break
            case 'in':
                sql = this.in(args[1])
                break
            case 'between':
                sql = this.between(args[1])
                break
            case 'where':
                // if there are two args and the first is a string, it's a simple WHERE col = value
                if (args.length === 2 && typeof args[0] === 'string') {
                    sql = this.where(args[1])
                }
                // if there are three args, it's a where statement with a custom operator
                if (args.length === 3) {
                    sql = this.where(args[2], args[1])
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

    between (values) {
        if (Array.isArray(values) && values.length === 2) {
            return `${this.column.assignment()} ${this.not}BETWEEN ${stringify(values[0])} AND ${stringify(values[1])}`
        }
        throw 'Your where(Not)Between statement does not have the required 2 values'

    }

    in (values) {
        if (typeof values === 'object') {
            if (Array.isArray(values)) {
                return `${this.column.assignment()} ${this.not}IN (${values.map(i => stringify(i)).join(',')})`
            }
        }
        throw 'A where(Not)In statement requires an array or a Raw class'
    }

    where (value, operator = '=') {
        // TODO check that operator is valid
        return `${this.not}${this.column.assignment()} ${operator} ${stringify(value)}`
    }

    null () {
        return `${this.column.assignment()} IS ${this.not}NULL`
    }


}

module.exports = Where
