/*
 * Author: matthewhuynh88@gmail.com
 * Description: functions for tracing/debugging
 */ 

var config = require('./../cfg/config');

module.exports.debug = function (str) {
    if (config.debug) {
        util.debug(str);
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