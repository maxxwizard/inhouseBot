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
var Player = require("../model/Player");
var Season = require("../model/Season");
var Game = require("../model/Game");

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

function DatabaseErrorHandler(err, callback) {
    if (err) {
        trace.error(err);
        return callback(errCodes.DATABASE_FAILURE);
    } else {
        return callback();
    }
}

function FindUser(playerSteam64Id, callback) {
    Player.findOne({steam64Id: playerSteam64Id}, function (err, player) {
        DatabaseErrorHandler(err, function () {
            if (player == null) {
                return callback (errCodes.USER_NOT_REGISTERED);
            } else {
                return callback (errCodes.SUCCESS, player);
            }
        });
    });
}

DbClient.prototype.Register = function (playerSteam64Id, username, initialRating, admin, callback) {
    // ensure user does not exist
    FindUser(playerSteam64Id, function (err, player) {
        if (err == errCodes.USER_NOT_REGISTERED) {

            // if player is specified in config file to be admin, promote user
            if (config.steam.admins.indexOf(playerSteam64Id) != -1) {
                admin = 1;
            }

            // register the player
            var newPlayer = new Player({'username': username, steam64Id: playerSteam64Id, 'admin': admin});
            if (initialRating) {
                newPlayer.rating = initialRating;
            }
            newPlayer.save(function (err, savedPlayer, numAffected) {
                DatabaseErrorHandler(err, function () {
                    trace.debug(JSON.stringify(savedPlayer));
                    return callback (errCodes.SUCCESS);
                });
            });

        } else if (err == errCodes.SUCCESS) {
            // if we found a user, it means they're already registered
            return callback(errCodes.USER_ALREADY_REGISTERED);
        } else {
            // bubble up the error
            return callback(err);
        }
    });
};

/*
DbClient.prototype.Register = function (db, playerSteam64Id, username, initialRating, admin, callback) {
    // ensure user does not exist
    //trace.debug("Register: finding ObjectId for player " + playerSteam64Id);
    FindUser(db, playerSteam64Id, function (err, doc) {
        if (err == errCodes.USER_NOT_REGISTERED) {
            // create new Player record

            // if player is specified in config file to be admin, promote user
            if (config.steam.admins.indexOf(playerSteam64Id) != -1) {
                admin = 1;
            }

            db.collection("players").insert({ steam64Id : playerSteam64Id, 'username': username, rating : initialRating, 'admin' : admin }, { w: 1 }, function (err, docs) {
                if (err) {
                    return callback(errCodes.DATABASE_FAILURE);
                } else {
                    return callback(errCodes.SUCCESS);
                }
            });
        } else if (err == errCodes.SUCCESS) {
            // if we found a user, it means they're already registered
            return callback(errCodes.USER_ALREADY_REGISTERED);
        } else {
            // bubble up the error
            return callback(err);
        }
    }); // end player find call
};
    */