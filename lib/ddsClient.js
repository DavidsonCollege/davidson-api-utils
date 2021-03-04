'use strict';
const sql = require('mssql')

module.exports = class DdsClient {
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
    mergeSql (table, tempTable, sync = false) {
        return `
            MERGE ${table} AS TARGET
            USING ${tempTable} AS SOURCE 
            ON (TARGET.id = SOURCE.id) 
            --When records are matched, update the records if there is any change
            WHEN MATCHED AND TARGET.data <> SOURCE.data 
                THEN UPDATE SET TARGET.data = SOURCE.data 
            --When no records are matched, insert the incoming records from source table to target table
            WHEN NOT MATCHED BY TARGET 
                THEN INSERT (id, data) VALUES (SOURCE.id, SOURCE.data)${sync ? 'WHEN NOT MATCHED BY SOURCE THEN DELETE' : ''};          
        `
    }
    async sync (table, tempTable) {
        console.log('syncing')
        return await this.exec(this.mergeSql(table, tempTable, true))
    }
    async upsert (table, tempTable) {
        console.log('upserting')
        return await this.exec(this.mergeSql(table, tempTable))
    }
    async bulkUpsert (tableName, rows = [], action = 'upsert') {
        await this.connection // ensures that the pool has been created
        if (!['upsert', 'sync'].includes(action)) {
            throw 'Not a valid action'
        }
        const tempTableName = `#${tableName}`
        const tempTable = new sql.Table(tempTableName) // or temporary table, e.g. #temptable
        tempTable.create = true
        tempTable.columns.add('id', sql.BigInt, {nullable: false, primary: true})
        tempTable.columns.add('data', sql.NVarChar(sql.MAX), {nullable: false})

        for (const row of rows) {
            tempTable.rows.add(row.id, JSON.stringify(row.data))
        }
        const request = new sql.Request(this.pool)
        try {
            await request.bulk(tempTable)
            return await this[action](tableName, tempTableName)
        }
        catch (err) {
            console.error('SQL error', err);
        }
    }
}

