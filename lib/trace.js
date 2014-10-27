/*
 * Author: matthewhuynh88@gmail.com
 * Description: functions for tracing/debugging
 */ 

var config = require('../cfg/config');
var util = require('util');

module.exports.debug = function (str) {
    if (config.debug) {
        util.log(str);
    }
};

module.exports.log = function (str) {
    util.log(str);
};

module.exports.warn = function (str) {
    util.log(str);
};

module.exports.error = function (str) {
    //console.error(str);
    if (config.debug) {
        console.trace(str);
    } else {
        util.log(str);
    }
};