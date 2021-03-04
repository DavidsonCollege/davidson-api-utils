'use strict';

let DdsClient = require('./lib/ddsClient');

exports.DdsClient = DdsClient;
exports.createDdsClient = function (config) {
    return new DdsClient(config)
}


