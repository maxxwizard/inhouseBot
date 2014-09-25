/*
 * Author: matthewhuynh88@gmail.com
 * Description: has knowledge about the database layout and how to work with objects inside it
 */ 

/*
 * Database layout
 * 
 * scores: { _id : ObjectId("guid"), gameId: ObjectId("guid"), playerId: ObjectId("guid"), winner: 'Radiant' }
 * constraints: - winner must be string 'Radiant' or 'Dire'
 *  
 * games: { _id : ObjectId("guid"), seasonId : ObjectId("guid"), winner : 'Dire', gameNum: 26, status : 'InProgress',
 *         players: [ObjectId("guid"), ObjectId("guid")], scores: [], gameCreatorSteam64Id : '76561197968837492' }
 * constraints: - there cannot be more than 10 items in players array
 *              - winner must be string 'Radiant' or 'Dire'
 *              - status must be 'WaitingForPlayers' or 'InProgress' or 'Completed' or 'Cancelled'
 *              - scores is an array of key-value pairs <playerObjectId : winner>
 * 
 * seasons: {_id : ObjectId("guid"), seasonNum: 1, startDate: Date(2014, 9, 1), endDate: Date(2014, 12, 31), name: 'Season 1'}
 * constraints: - seasonNum will be 0 if it is a special event
 * 
 * players: {_id: ObjectId("guid"), username: 'maxxwizard', rating: 1500, steam64Id: '76561197968837492'}
 * 
 */

/* 
 * Tips: - db.users.update() will always overwrite the document
 *       - $addToSet - update a field without overwriting
 *       - $push / $pull - for use against an array
 *       - $set - to add a field
 *       - findAndModify is like update, but it also gives the updated document to your callback
 */

var format = require('util').format;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var config = require('./config.js');
var trace = require('./trace.js');
var ranking = require('./ranking.js');
var errCodes = require('./errorCodes.js');

// exporting DbClient as a class. initialize like this:
// var dbClient = new DataAccess.DbClient();
module.exports.DbClient = DbClient = function () {
    this.MongoClient = require('mongodb').MongoClient;
    this.host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : config.mongo.host;
    this.port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : config.mongo.port;
    this.dbName = config.mongo.dbName;
}

/*
 * Description: Cancels the game if the user is the game creator or admin.
 * 
 * TO-DO: you can cancel the game if you are admin
*/ 
DbClient.prototype.CancelGame = function (playerSteam64Id, gameNum, callback) {
    this.MongoClient.connect(format("mongodb://%s:%s/%s", this.host, this.port, this.dbName), function (err, db) {
        if (err) {
            trace.error("CancelGame: couldn't connect to database " + this.host + ":" + this.port);
            return false;
        } else {
            // check if user is game creator or admin
        }
    }); // end database connect call
}

/*
 * Description: If user is not already in database, create a record in Players collection.
 * Return: callback with error code
*/ 
DbClient.prototype.Register = function (playerSteam64Id, username, callback) {
    this.MongoClient.connect(format("mongodb://%s:%s/%s", this.host, this.port, this.dbName), function (err, db) {
        if (err) {
            trace.error("Register: couldn't connect to database " + this.host + ":" + this.port);
            return callback(errCodes.DATABASE_FAILURE);
        } else {
            // ensure user does not exist
            trace.debug("Register: finding ObjectId for player " + playerSteam64Id);
            db.collection("players").findOne({ steam64Id: playerSteam64Id }, { _id: 1 }, function (err, doc) {
                if (err) {
                    trace.error("Register: something went wrong during database call");
                    return callback(errCodes.DATABASE_FAILURE);
                } else {
                    // if user already exists
                    if (doc != null) {
                        trace.warn("Register: user <" + playerSteam64Id + ", " + username + "> already exists");
                        return callback(errCodes.USER_ALREADY_EXISTS);
                    } else {
                        // create new Player record
                        db.collection("players").insert({ steam64Id : playerSteam64Id, 'username': username, rating : ranking.InitialRating }, { w: 1 }, function (err, docs) {
                            if (err) {
                                trace.error("Register: failed to insert <" + playerSteam64Id + ", " + username + ">");
                                return callback(errCodes.DATABASE_FAILURE);
                            } else {
                                trace.log("Register: new player <" + playerSteam64Id + ", " + username + "> created!");
                                return callback(errCodes.SUCCESS);
                            }
                        }); // end player insert call
                    }
                }
            }); // end player find call
            
        }
    }); // end database connect call
}

/*
 * Description: Returns array of Game objects with status as 'WaitingForPlayers' and 'InProgress'
 * TO-DO: return games 'Completed' or 'Cancelled' in last 15 minutes as well
 * Returns: array of game objects (could be 0-length)
*/ 
DbClient.prototype.GetCurrentGames = function (callback) {
    this.MongoClient.connect(format("mongodb://%s:%s/%s", this.host, this.port, this.dbName), function (err, db) {
        if (err) {
            trace.error("GetCurrentGames: couldn't connect to database " + this.host + ":" + this.port);
            return callback(errCodes.DATABASE_FAILURE);
        } else {
            // get list of games
            var cursor = db.collection("games").find({ 'status': { $in: ['WaitingForPlayers', 'InProgress'] } }).sort({ gameNum : 1 }).toArray(function (err, docs) {
                if (err) {
                    trace.error("GetCurrentGames: can't find list of games");
                    return callback(errCodes.DATABASE_FAILURE);
                } else {
                    // return list of games
                    trace.debug("GetCurrentGames: got list of games from database");
                    return callback(errCodes.SUCCESS, docs);
                }
            });
        }
    }); // end database connect call
}

/*
 * DEPRECATED - probably going to remove this function soon
* Returns the ObjectId of the player based on their Steam64Id. Returns null if error (e.g. not found).
*/ 
/*
DbClient.prototype.GetPlayerObjectIdFromSteam64Id = function (playerSteam64Id) {
    this.MongoClient.connect(format("mongodb://%s:%s/%s", this.host, this.port, this.dbName), function (err, db) {
        if (!err) {
            trace.debug("GetPlayerObjectIdFromSteam64Id: finding dbGuid for player " + playerSteam64Id);
            db.collection("players").findOne({ steam64Id: playerSteam64Id }, { _id: 1 }, function (err, doc) {
                if (!err) {
                    var playerObjectId = doc._id;
                    trace.debug("GetPlayerObjectIdFromSteam64Id: returning " + playerObjectId);
                    return playerObjectId;
                } else {
                    trace.error("GetPlayerObjectIdFromSteam64Id: couldn't find player " + playerSteam64Id);
                    return null;
                }
            });
        } else {
            trace.error("GetPlayerObjectIdFromSteam64Id: couldn't connect to database " + this.host + ":" + this.port);
            return null;
        }
    });
}
 */

/*
 * Description: Creates a new game in the current/latest season
 * Algorithm: 1) Resolve the playerSteam64Id to an ObjectId
 *            2) ensure user isn't already signed to a game or playing in one
 *            3) find latest gameNum and latest season
 *            4) finally create the new game
 * Return: game object that contains either the game user is already signed into or newly created game
 */
DbClient.prototype.NewGame = function (playerSteam64Id, callback) {
    this.MongoClient.connect(format("mongodb://%s:%s/%s", this.host, this.port, this.dbName), function (err, db) {
        if (err) {
            trace.error("NewGame: couldn't connect to database " + this.host + ":" + this.port);
            return callback(errCodes.DATABASE_FAILURE);
        } else {
            trace.debug("NewGame: finding ObjectId for player " + playerSteam64Id);
            db.collection("players").findOne({ steam64Id: playerSteam64Id }, { _id: 1 }, function (err, doc) {
                if (err || doc == null) {
                    trace.warn("NewGame: couldn't find player " + playerSteam64Id);
                    return callback(errCodes.USER_NOT_FOUND);
                } else {
                    var playerObjectId = doc._id;
                    trace.debug("NewGame: found ObjectId " + playerObjectId + " for playerSteam64Id " + playerSteam64Id);
                    db.collection("games").find({ $and: [{ status: { $in: ["WaitingForPlayers", "InProgress"] } },{ players: { $elemMatch: { $in: [playerObjectId] } } }] }).toArray(function (err, docs) {
                        if (err) {
                            trace.error("NewGame: database call failed trying to determine if user " + playerSteam64Id + " is signed into a game or not");
                            return callback(errCodes.DATABASE_FAILURE);
                        } else if (docs.length > 0) {
                            trace.warn("NewGame: player " + playerSteam64Id + " already signed to a game");
                            return callback(errCodes.USER_ALREADY_SIGNED, docs[0]);
                        } else {
                        //trace.debug("NewGame: finding latest season by ObjectId");
                        db.collection("seasons").find({}).sort({ _id: -1 }).limit(1).toArray(function (err, docs) {
                            if (err || docs.length == 0) {
                                trace.error("NewGame: could not find latest season!");
                                return callback(errCodes.DATABASE_FAILURE);
                            } else {
                                var latestSeasonObject = docs[0];
                                trace.debug("NewGame: found ObjectId " + latestSeasonObject._id + " as the latest season");
                                //trace.debug("NewGame: finding latest gameNum");
                                db.collection("games").find({seasonId: latestSeasonObject._id}).sort({ gameNum: -1 }).limit(1).toArray(function (err, docs) {
                                    if (err) {
                                        trace.error("NewGame: couldn't find latest gameNum due to DB error");
                                        return callback(errCodes.DATABASE_FAILURE);
                                    } else {
                                        var latestGameObject = docs[0];
                                        var newGameNum = 1;
                                        if (docs.length == 0) {
                                            trace.debug("NewGame: this is the first game of season '" + latestSeasonObject.name + "'");
                                        } else {
                                            trace.debug("NewGame: found latest gameNum: " + latestGameObject.gameNum);
                                            newGameNum = latestGameObject.gameNum + 1;
                                        }
                                        trace.debug("NewGame: inserting new game");
                                        db.collection("games").insert({ seasonId : latestSeasonObject._id, gameNum: newGameNum, status : 'WaitingForPlayers', players: [playerObjectId] }, { w: 1 }, function (err, docs) {
                                            if (err) {
                                                trace.error("NewGame: creation of new game failed");
                                            } else {
                                                var newGame = docs[0];
                                                trace.debug("NewGame: new game #" + newGame.gameNum + " created with ObjectId " + newGame._id);
                                                return callback(errCodes.SUCCESS, newGame);
                                            }
                                        }); // end game insert call
                                    }
                                }); // end latest gameNum find call
                            }
                        }); // end latest season find call
                    }
                }); // end playerObjectId find call
            }
            }); // end ensurePlayerSignedInGame find call
        }
    }); // end database connect call
} // end DbClient class