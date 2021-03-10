'use strict';

const Column = require('./column')
const Where = require('./where')

/** Class representing a Query.
 * @typedef {Object} Query
 */
class QueryBuilder {

    /**
     * Create a Query.
     * @param {string} table - The table to query
     */
    constructor(table) {
        this.table = table
        this.action = null
        this.wheres = []
        this.selections = ''
        this.limit = 100
        this.offset = 0
        this.orderBys = []
    }

    select (columns) {
        const cols = []
        // if columns are passed in, try instantiate a column object for each one
        if (columns) {
            try {
                for (const column of columns) {
                    cols.push(new Column(column))
                }
            } catch (e) {
                throw e.message
            }
        } else {
            // else just use '*'
            cols.push(new Column())
        }
        this.selections = cols.map(i => i.selection()).join(', ')
    }

    selectRaw (raw) {
        this.action = 'select'
        // if Raw is passed in
        if (typeof columns === 'object' && columns.constructor.name === 'Raw') {
            this.selections = raw
        }
    }

    // where
    createWhere (type, args, or = false, not = false) {
        return new Where(type, or, not).init(...args)
    }

    // GROUPS
    createWhereGroup (wheres, or = false, not = false) {
        return {
            andOr: or ? 'OR' : 'AND',
            not: not ? 'NOT ' : '',
            group: true,
            wheres: wheres.map(where => {
                // analyze the passed query
                const whereClause = where[0]
                const args = where[1]
                // check of an 'or' in the string
                const isOr = whereClause.match(/or/i)
                // check for another nested whereGroup
                const isGroup = whereClause.match(/group/i)
                // if a group, run createWhereGroup
                // need to check for a NOT in the string
                const isNot = whereClause.match(/not/i)
                if (isGroup) {
                    return this.createWhereGroup(args, isOr !== null, isNot !== null)
                } else {
                    // else run create where
                    // check for in, between, or null
                    const isSpecial = whereClause.match(/((in)|(between)|(null))$/i)
                    // type is the match return of isSpecial (default where)
                    let type = 'where'
                    if (isSpecial) {
                        type = isSpecial[0].toLowerCase()
                    }
                    return this.createWhere(type, args, isOr !== null, isNot !== null)
                }
            })
        }
    }

    // FINAL WHERE STMT
    whereSql (wheres) {
        let sql = ''
        for (let i = 0;  i < wheres.length; i++) {
            if (i !== 0) {
                sql += ` ${wheres[i].andOr} `
            }
            if (wheres[i].group) {
                sql += `${wheres[i].not}(${this.whereSql(wheres[i].wheres)})`
            } else {
                sql += wheres[i].sql
            }
        }
        return sql
    }

    setLimit (limit) {
        this.limit = limit
    }

    setOffset (offset) {
        this.offset = offset
    }

    addOrderBy (orderBy, direction) {
        this.orderBys.push([new Column(orderBy), direction])
    }

    orderBySql () {
        if (this.orderBys.length === 0) {
            return `${this.table}._id`
        } else {
            // i[0] is the Column
            // i[1] is the direction
            return this.orderBys.map(i => `${i[0].assignment}${i[1] === 'asc' ? '' : ' DESC' }`).join(', ')
        }
    }

    getCrossApplys (wheres) {
        // recurssively reduce any crossapply statements into a single array
        // filter any falses
        // make unique
        // join with spaces
        const crossApplys =  wheres.reduce((acc, curr) => {
            const crossApplies = Array.isArray(curr) ? this.getCrossApplys(curr) : [curr.crossApplySql]
            return acc.concat(crossApplies)
        }, []).filter(i => i).filter((v, i, self) => self.indexOf(v) === i).join(' ')
        return crossApplys
    }

    sql () {
        const whereSql = this.whereSql(this.wheres)
        return [
            `SELECT ${this.selections}`,
            `FROM ${this.table}`,
            `${this.getCrossApplys(this.wheres)}`,
            whereSql !== '' ? `WHERE ${this.whereSql(this.wheres)}` : '',
            `ORDER BY ${this.orderBySql()}`,
            `OFFSET ${this.offset} ROWS`,
            `FETCH NEXT ${this.limit} ROWS ONLY`
        ].filter(i => i !== '').join(' ')
    }
}

module.exports = QueryBuilder
