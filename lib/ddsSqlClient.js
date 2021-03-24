'use strict';
const sql = require('mssql')
const QueryBuilder = require('./queryBuilder/queryBuilder')

/**
 * Class representation of a DdsClient
 * @typedef {Object} DdsClient
 */
class DdsSqlClient {

    /**
     * Create a DdsClient.
     * @param config
     */
    constructor(config) {
        this.pool = new sql.ConnectionPool(config)
        this.qb = null
    }

    /**
     * execute a sql statement
     * @param sql
     * @returns {Promise<*>}
     */
    async exec (sql) {
        await this.pool.connect()
        try {
            const request = this.pool.request()
            return await request.query(`${sql}`)
        } catch (err) {
            throw err
        }
    }

    /**
     * closes a connection
     */
    close () {
        this.pool.close()
    }

    /**
     * merges two tables together
     * @param table
     * @param tempTable
     * @param options
     * @returns {Promise<*>}
     */
    async merge (table, tempTable, options = { sync: false, primaryKey: 'id' }) {
        const { sync, primaryKey } = options
        return await this.exec(`
            MERGE ${table} AS TARGET
            USING ${tempTable} AS SOURCE 
            ON (TARGET.${primaryKey} = JSON_VALUE(SOURCE.data, '$.${primaryKey}')) 
            --When records are matched, update the records if there is any change
            WHEN MATCHED AND TARGET.data <> SOURCE.data 
                THEN UPDATE SET TARGET.data = SOURCE.data 
            --When no records are matched, insert the incoming records from source table to target table
            WHEN NOT MATCHED BY TARGET 
                THEN INSERT (data) VALUES (SOURCE.data)${sync ? 'WHEN NOT MATCHED BY SOURCE THEN DELETE' : ''};          
        `)
    }

    /**
     * Bulk upsets a table
     * @param tableName
     * @param rows
     * @param options
     * @returns {Promise<*>}
     */
    async bulkUpsert (tableName, rows = [], options = { action: 'upsert', primaryKey: 'id'}) {
        await this.connection // ensures that the pool has been created
        const tempTableName = `#${tableName}`
        const tempTable = new sql.Table(tempTableName) // or temporary table, e.g. #temptable
        tempTable.create = true
        tempTable.columns.add('data', sql.NVarChar(sql.MAX), {nullable: false})

        for (const row of rows) {
            tempTable.rows.add(JSON.stringify(row))
        }
        const request = new sql.Request(this.pool)
        try {
            await request.bulk(tempTable)
            return await this.merge(tableName, tempTableName, options)
        }
        catch (err) {
            console.error('SQL error', err);
        }
    }

    // QUERY BUILDER
    /**
     * Instantiate a query
     * @param table
     * @returns {DdsSqlClient}
     */
    query (table) {
        this.qb = new QueryBuilder(table)
        return this
    }

    /**
     * Instantiate a select statement
     * @param args
     * @returns {DdsSqlClient}
     */
    select (...args) {
        this.qb.select(args)
        return this
    }

    /**
     * Instantiate a select statement with raw sql (excluding the SELECT operator)
     * @param raw
     * @returns {DdsSqlClient}
     */
    selectRaw (raw) {
        this.qb.selectRaw(raw)
        return this
    }

    // WHERES
    /**
     * create a WHERE statement
     * @param args
     * @returns {DdsSqlClient}
     */
    where (...args) {
        this.qb.wheres.push(this.qb.createWhere('where', args))
        return this
    }
    /**
     * create a WHERE NOT statement
     * @param args
     * @returns {DdsSqlClient}
     */
    whereNot (...args) {
        this.qb.wheres.push(this.qb.createWhere('where', args, false, true))
        return this
    }
    /**
     * create a OR WHERE statement
     * @param args
     * @returns {DdsSqlClient}
     */
    orWhere (...args) {
        this.qb.wheres.push(this.qb.createWhere('where', args, true))
        return this
    }

    /**
     * create a OR WHERE NOT statement
     * @param args
     * @returns {DdsSqlClient}
     */
    orWhereNot (...args) {
        this.qb.wheres.push(this.qb.createWhere('where', args, true, true))
        return this
    }

    // NULLS
    /**
     * create a WHERE IS NULL statement
     * @param args
     * @returns {DdsSqlClient}
     */
    whereNull (...args) {
        this.qb.wheres.push(this.qb.createWhere('null', args))
        return this
    }

    /**
     * create a WHERE IS NOT NULL statement
     * @param args
     * @returns {DdsSqlClient}
     */
    whereNotNull (...args) {
        this.qb.wheres.push(this.qb.createWhere('null', args, false, true))
        return this
    }

    /**
     * create a OR WHERE IS NULL statement
     * @param args
     * @returns {DdsSqlClient}
     */
    orWhereNull (...args) {
        this.qb.wheres.push(this.qb.createWhere('null', args, true))
        return this
    }

    /**
     * create a OR WHERE IS NOT NULL statement
     * @param args
     * @returns {DdsSqlClient}
     */
    orWhereNotNull (...args) {
        this.qb.wheres.push(this.qb.createWhere('null', args, true, true))
        return this
    }

    // BETWEENS
    /**
     * create a WHERE BETWEEN x AND y statement
     * @param args
     * @returns {DdsSqlClient}
     */
    whereBetween (...args) {
        this.qb.wheres.push(this.qb.createWhere('between', args))
        return this
    }

    /**
     *
     * @param args
     * @returns {DdsSqlClient}
     */
    whereNotBetween (...args) {
        this.qb.wheres.push(this.qb.createWhere('between', args, false, true))
        return this
    }
    orWhereBetween (...args) {
        this.qb.wheres.push(this.qb.createWhere('between', args, true))
        return this
    }
    orWhereNotBetween (...args) {
        this.qb.wheres.push(this.qb.createWhere('between', args, true, true))
        return this
    }

    // INS
    whereIn (...args) {
        this.qb.wheres.push(this.qb.createWhere('in', args))
        return this
    }
    whereNotIn (...args) {
        this.qb.wheres.push(this.qb.createWhere('in', args, false, true))
        return this
    }
    orWhereIn (...args) {
        this.qb.wheres.push(this.qb.createWhere('in', args, true))
        return this
    }
    orWhereNotIn (...args) {
        this.qb.wheres.push(this.qb.createWhere('in', args, true, true))
        return this
    }

    // GROUPS
    whereGroup (whereArray) {
        this.qb.wheres.push(this.createWhereGroup(whereArray))
        return this
    }
    whereNotGroup (whereArray) {
        this.qb.wheres.push(this.createWhereGroup(whereArray, false, true))
        return this
    }
    orWhereGroup (whereArray) {
        this.qb.wheres.push(this.createWhereGroup(whereArray), true)
        return this
    }
    orWhereNotGroup (whereArray) {
        this.qb.wheres.push(this.createWhereGroup(whereArray), true, true)
        return this
    }

    // ORDER BY
    orderBy (column) {
        this.qb.addOrderBy(column, 'asc')
        return this
    }
    orderByDesc (column) {
        this.qb.addOrderBy(column, 'desc')
        return this
    }

    // LIMIT & OFFSET
    limit (limit) {
        this.qb.setLimit(limit)
        return this
    }
    offset (offset) {
        this.qb.setLimit(offset)
        return this
    }

    // SELECT
    async get () {
        return await this.exec(this.qb.sql())
    }
}

module.exports = DdsSqlClient
