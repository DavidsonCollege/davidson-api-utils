'use strict';
const sql = require('mssql')

module.exports = class DdsSqlClient {
    constructor(config) {
        this.pool = new sql.ConnectionPool(config)
        this.connection = this.pool.connect()
        console.log('connected')
    }
    async exec (sql) {
        await this.connection // ensures that the pool has been created
        try {
            const request = this.pool.request()
            return await request.query(sql)
        } catch (err) {
            console.error('SQL error', err);
        }
    }
    close () {
        this.pool.close()
    }
    merge (table, tempTable, options = { sync: false, primaryKey: 'id' }) {
        const { sync, primaryKey } = options
        return `
            MERGE ${table} AS TARGET
            USING ${tempTable} AS SOURCE 
            ON (TARGET.${primaryKey} = JSON_VALUE(SOURCE.data, '$.${primaryKey}')) 
            --When records are matched, update the records if there is any change
            WHEN MATCHED AND TARGET.data <> SOURCE.data 
                THEN UPDATE SET TARGET.data = SOURCE.data 
            --When no records are matched, insert the incoming records from source table to target table
            WHEN NOT MATCHED BY TARGET 
                THEN INSERT (data) VALUES (SOURCE.data)${sync ? 'WHEN NOT MATCHED BY SOURCE THEN DELETE' : ''};          
        `
    }

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
}

