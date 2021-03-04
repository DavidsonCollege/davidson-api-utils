'use strict';
const sql = require('mssql')

module.exports = class DdsClient {
    constructor(config) {
        this.pool = new sql.ConnectionPool(config)
        this.connection = this.pool.connect()
        console.log('connected')
    }
    async exec (sql) {
        console.log('await')
        await this.connection // ensures that the pool has been created
        console.log('connected')
        try {
            console.log('requesting')
            const request = this.pool.request()
            return await request.query(sql)
        } catch (err) {
            console.error('SQL error', err);
        }
    }
    close () {
        this.pool.close()
    }
}

