/**
 * Created by mahuynh on 10/11/2014.
 */

var mongoose = require ('mongoose'),
    config = require ('../cfg/config'),
    trace = require ('../lib/trace'),
    errCodes = require('../lib/errorCodes'),
    events = require('events'),
    assert = require('assert');

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

/*
 * Global database error handler. Traces the failure before executing callback.
 * @param callback
 * @return executes the callback, passing DATABASE_FAILURE as the error code
 */
function DatabaseErrorHandler(err, callback) {
    assert.notEqual(err, null, "this function should only be called when there is a database error");
    assert.notEqual(callback, null, "every call to this function needs to provide a callback");

    // trace the error
    trace.error(err);

    // stop the database function and return a failure code
    return callback(errCodes.DATABASE_FAILURE);
}

/*
 * Finds a user using their Steam64Id.
 * @param playerSteam64Id - the user's steam64id
 * @param callback
 * @return errorCode - indicates whether user was found or not
 * @return player - Player object if we found the user
 */
function FindUserBySteam64Id(playerSteam64Id, callback) {
    Player.findOne({steam64Id: playerSteam64Id}, function (err, player) {
        if (err) {
            DatabaseErrorHandler(err, callback);
        } else {
            if (player == null) {
                return callback (errCodes.USER_NOT_REGISTERED);
            } else {
                return callback (errCodes.SUCCESS, player);
            }
        }
    });
}

/*
 * Registers a user by creating a Player record if the user does not already exist.
 * @param playerSteam64Id - steam64id of the player to register
 * @param username - username of the player to register
 * @param initialRating - a rating between 0 and 100000 to override the default of 1000
 * @param admin - boolean that if true indicates user should be an admin
 * @param callback
 * @return errorCode - indicates whether the user was registered or not
 */
DbClient.prototype.Register = function (playerSteam64Id, username, initialRating, admin, callback) {
    // ensure user does not exist
    FindUserBySteam64Id(playerSteam64Id, function (err, player) {
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
                if (err) {
                    DatabaseErrorHandler(err, callback);
                } else {
                    trace.debug(JSON.stringify(savedPlayer));
                    return callback (errCodes.SUCCESS);
                }
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

/**
 * Finds the latest season.
 * @param callback
 * @return
 */
function FindLatestSeason(callback) {
    Season.find({})
        .sort('-seasonNum')
        .limit(1)
        .exec(function (err, seasons) {
            var latestSeason = seasons[0];
            if (err) {
                DatabaseErrorHandler(err, callback);
            } else if (latestSeason == null) {
                return callback(errCodes.NO_SEASONS_FOUND);
            } else {
                return callback(errCodes.SUCCESS, latestSeason);
            }
        });
}

/**
 * Creates a new season.
 * Notes: Be aware every game created from after this database call finishes will use this newly created season.
 * Algorithm: Closes the old season by setting the EndDate. Creates the new season with today's date as StartDate
 *            and seasonNum as the incremental number after the latest seasonNum.
 * @param playerSteam64Id - steam64id of the user calling this
 * @param seasonName - name of the season
 * @param callback
 * @return errorCode - indicates whether the new season was created or not
 * @return newSeasonObject - newly created Season object
 */
DbClient.prototype.NewSeason = function (playerSteam64Id, seasonName, callback) {
    FindUserBySteam64Id(playerSteam64Id, function (err, player) {
        if (err == errCodes.SUCCESS) {
            // ensure user is admin
            if (player.admin) {
                // get previous season
                FindLatestSeason(function (err, latestSeason) {
                    if (err == errCodes.SUCCESS || err == errCodes.NO_SEASONS_FOUND) {
                        var newSeasonNum = 1;
                        var today = new Date();

                        // if there was a previous season
                        if (err != errCodes.NO_SEASONS_FOUND) {
                            //trace.debug("there was a previous season: " + JSON.stringify(latestSeason));
                            newSeasonNum = latestSeason.number + 1;

                            latestSeason.endDate = today;
                            latestSeason.save(function (err) {
                                if (err) {
                                    // we failed to close out the old season, trace this error
                                    trace.log("could not close out season " + latestSeason.number);
                                    DatabaseErrorHandler(err, callback);
                                } else {
                                    //trace.debug("we closed out season " + latestSeason.number);
                                }
                            });
                        }

                        // create new season
                        var newSeason = new Season({startDate: today, number: newSeasonNum, name: seasonName});
                        //trace.debug("newSeason: " + JSON.stringify(newSeason));
                        newSeason.save(function (err, savedSeason, numAffected) {
                            if (err) {
                                DatabaseErrorHandler(err, callback);
                            } else {
                                return callback(errCodes.SUCCESS, savedSeason);
                            }
                        });
                    } else {
                        // bubble up the database failure
                        return callback(err);
                    }

                });

            } else {
                // user is not admin
                return callback(errCodes.UNAUTHORIZED);
            }
        } else {
            // bubble up the error
            return callback(err);
        }
    });
};