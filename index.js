'use strict';

let DdsClient = require('./lib/ddsClient');
let DdsSqlClient = require('./lib/ddsSqlClient');

exports.DdsClient = DdsClient;
exports.createDdsClient = function (config) {
    return new DdsClient(config)
}

exports.DdsSqlClient = DdsSqlClient;
exports.createDdsSqlClient = function (config) {
    return new DdsSqlClient(config)
}


