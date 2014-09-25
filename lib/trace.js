/*
 * Author: matthewhuynh88@gmail.com
 * Description: functions for tracing/debugging
 */ 

var config = require('./config');

module.exports.debug = function (str) {
    if (config.debug) {
        console.log(str);
    }
}

module.exports.log = function (str) {
    console.log(str);
}

module.exports.warn = function (str) {
    console.warn(str);
}

module.exports.error = function (str) {
    //console.error(str);
    console.trace(str);
}