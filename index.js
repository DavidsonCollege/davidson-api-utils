'use strict';

let DdsSqlClient = require('./lib/ddsSqlClient');

exports.DdsSqlClient = DdsSqlClient;
exports.createDdsSqlClient = function (config) {
    return new DdsSqlClient(config)
}


