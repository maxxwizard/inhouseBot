/**
 * Created by mahuynh on 10/11/2014.
 */

var mongoose = require ('mongoose'),
    config = require ('../cfg/config'),
    trace = require ('../lib/trace'),
    errCodes = require('../lib/errorCodes'),
    events = require('events');

// default database call error handler
function HandleDatabaseError(err, callback) {
    assert.notEqual(callback, null, "every call to this handler needs to provide a callback");
    if (err) {
        util.log("database error: " + err);
        return callback(errCodes.DATABASE_FAILURE);
    } else {
        return callback();
    }
}

// native parser means we use C++ parser instead of JS parser, which is theoretically faster
// default connection pool of 5
// enable keepAlive to avoid DB connection from terminating (autoReconnect is enabled by default as well)
var options = {
    db: { native_parser: true },
    server: { poolSize: 5, socketOptions: {keepAlive: 1} }
};

// if production, we need to provide a username and password
if (config.env != 'dev') {
    options.user = config.mongo.username;
    options.pass = config.mongo.pass;
}

var uri = ['mongodb://', config.mongo.host, ':', config.mongo.port, '/', config.mongo.dbName].join("");

// import database schema
require("../model/schema");

// exporting DbClient as a class. initialize like this:
// var dbClient = new DataAccess.DbClient();
module.exports.DbClient = DbClient = function () {

};

DbClient.prototype.Connect = function (onConnectedFunc) {

    // attach callbacks

    // When the connection is connected
    mongoose.connection.on('connected', function () {
        trace.log('Mongoose default connection open to ' + uri);
        onConnectedFunc();

        // TODO: with this current design, the bot will essentially restart every time the database connection is reset.
    });

    // If the connection throws an error
    mongoose.connection.on('error',function (err) {
        trace.error('Mongoose default connection error: ' + err);
    });

    // When the connection is disconnected
    mongoose.connection.on('disconnected', function () {
        trace.log('Mongoose default connection disconnected');
    });

    // If the Node process ends, close the Mongoose connection
    process.on('SIGINT', function() {
        mongoose.connection.close(function () {
            trace.log('Mongoose default connection disconnected through app termination');
            process.exit(0);
        });
    });

    // establish data connection
    trace.log("Initializing database connection to " + uri);
    mongoose.connect(uri, options);
};

DbClient.prototype.Register = function (playerSteam64Id, username, initialRating, admin, callback) {

};