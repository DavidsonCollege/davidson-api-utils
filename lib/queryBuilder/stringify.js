'use strict';

exports.stringify = function(value) {
    return typeof value === 'string' ? `'${value}'` : value
}
