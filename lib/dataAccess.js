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
 *         players: [ObjectId("guid"), ObjectId("guid")], scores: [], gameCreator : ObjectId("guid") }
 * constraints: - there cannot be more than 10 items in players array
 *              - winner must be string 'Radiant' or 'Dire'
 *              - status must be 'WaitingForPlayers' or 'InProgress' or 'Completed' or 'Cancelled'
 *              - scores is an array of key-value pairs <playerObjectId : winner>
 * 
 * seasons: {_id : ObjectId("guid"), seasonNum: 1, startDate: Date(2014, 9, 1), endDate: Date(2014, 12, 31), name: 'Season 1'}
 * constraints: - seasonNum will be 0 if it is a special event
 * 
 * players: {_id: ObjectId("guid"), username: 'maxxwizard', rating: 1500, steam64Id: '76561197968837492', admin: 1}
 * constraints: - admin can be set to 1 to indicate user can administrate bot
 * 
 */

/* 
 * Tips: - db.users.update() will always overwrite the document
 *       - $addToSet - adds value to the array only if its not in the array already
 *       - $push / $pull - for use against an array
 *       - $set - to add a field
 *       - findAndModify is like update, but it also gives the updated document to your callback
 */

var format = require('util').format;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var config = require('./config');
var trace = require('./trace');
var ranking = require('./ranking');
var errCodes = require('./errorCodes');

// exporting DbClient as a class. initialize like this:
// var dbClient = new DataAccess.DbClient();
module.exports.DbClient = DbClient = function () {
    this.MongoClient = require('mongodb').MongoClient;
    this.host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : config.mongo.host;
    this.port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : config.mongo.port;
    this.dbName = config.mongo.dbName;
}

/*
 * Description: Checks that a player is registered and returns the user.
*/ 
function FindUser(db, playerSteam64Id, callback) {
    db.collection("players").findOne({ steam64Id: playerSteam64Id }, function (err, user) {
        if (err) {
            return callback(errCodes.DATABASE_FAILURE);
        } else if (user == null) {
            return callback(errCodes.USER_NOT_REGISTERED);
        } else {
            return callback(errCodes.SUCCESS, user);
        }
    });
}

/*
 * Description: helper method to ensure a game exists before we do operations against it
 */
function FindActiveGame(db, gameNum, callback) {
    db.collection("games").findOne({ 'gameNum': gameNum, status: { $in: ['WaitingForPlayers', 'InProgress'] } }, function (err, game) {
        if (err) {
            trace.error("FindActiveGame: something went wrong during database call");
            return callback(errCodes.DATABASE_FAILURE);
        } else if (game == null) {
            return callback(errCodes.GAME_NOT_FOUND);
        } else {
            return callback(errCodes.SUCCESS, game);
        }
    });
}

/*
 * Description: adds a player to a game
*/ 
DbClient.prototype.SignGame = function (playerSteam64Id, gameNum, callback) {
    this.MongoClient.connect(format("mongodb://%s:%s/%s", this.host, this.port, this.dbName), function (err, db) {
        if (err) {
            trace.error("SignGame: couldn't connect to database " + this.host + ":" + this.port);
            return callback(errCodes.DATABASE_FAILURE);
        } else {
            FindUser(db, playerSteam64Id, function (err, user) {
                if (err) {
                    return callback(err);
                } else {
                    FindActiveGame(db, gameNum, function (err, game) {
                        if (err) {
                            return callback(err);
                        } else {
                            // add user to game
                            db.collection("games").update({ 'gameNum': gameNum, status: { $in: ['WaitingForPlayers', 'InProgress'] } }, { $addToSet: { players: user._id } }, function (err, doc) {
                                if (err) {
                                    return callback(errCodes.DATABASE_FAILURE);
                                } else {
                                    return callback(errCodes.SUCCESS);
                                }
                            });
                        }
                    });
                }
            });
        }
    });
}

/*
 * Description: removes a player from a game
*/ 
DbClient.prototype.UnsignGame = function (playerSteam64Id, gameNum, callback) {
    this.MongoClient.connect(format("mongodb://%s:%s/%s", this.host, this.port, this.dbName), function (err, db) {
        if (err) {
            trace.error("UnsignGame: couldn't connect to database " + this.host + ":" + this.port);
            return callback(errCodes.DATABASE_FAILURE);
        } else {
            FindUser(db, playerSteam64Id, function (err, user) {
                if (err) {
                    return callback(err);
                } else {
                    FindActiveGame(db, gameNum, function (err, game) {
                        if (err) {
                            return callback(err);
                        } else {
                            // remove user from game
                            db.collection("games").update({ 'gameNum': gameNum, status: { $in: ['WaitingForPlayers', 'InProgress'] } }, { $pull: { players: user._id } }, function (err, doc) {
                                if (err) {
                                    return callback(errCodes.DATABASE_FAILURE);
                                } else {
                                    return callback(errCodes.SUCCESS);
                                }
                            });
                        }
                    });
                }
            });
        }
    });
}

/*
 * Description: Cancels the game if the user is the game creator or admin or system
 * Notes: - systemOverride should be set to FALSE if this method is being called by a user, TRUE if it is being called by internal code
*/ 
DbClient.prototype.CancelGame = function (playerSteam64Id, gameNum, systemOverride, callback) {
    this.MongoClient.connect(format("mongodb://%s:%s/%s", this.host, this.port, this.dbName), function (err, db) {
        if (err) {
            trace.error("CancelGame: couldn't connect to database " + this.host + ":" + this.port);
            return callback(errCodes.DATABASE_FAILURE);
        } else {
            // check that the game exists
            FindActiveGame(db, gameNum, function (err, game) {
                if (err) {
                    return callback(err);
                } else {
                    if (systemOverride) {
                        // cancel game if system override
                        CancelGameInternal(db, playerSteam64Id, gameNum, function (err) {
                            return callback(err);
                        });
                    } else {
                        // check if user is game creator or admin
                        db.collection("players").findOne({ steam64Id: playerSteam64Id }, function (err, user) {
                            if (err) {
                                trace.error("CancelGame: something went wrong during database call");
                                return callback(errCodes.DATABASE_FAILURE);
                            } else {
                                if (user == null) {
                                    trace.warn("CancelGame: user not found");
                                    return callback(errCodes.USER_NOT_REGISTERED);
                                } else {
                                    if (user.admin) {
                                        // cancel game if admin
                                        CancelGameInternal(db, playerSteam64Id, gameNum, function (err) {
                                            return callback(err);
                                        });
                                    } else {
                                        // user is not game creator
                                        if (!game.gameCreator.equals(user._id)) {
                                            return callback(errCodes.UNAUTHORIZED);
                                        } else {
                                            // cancel game if game creator
                                            CancelGameInternal(db, playerSteam64Id, gameNum, function (err) {
                                                return callback(err);
                                            });
                                        }
                                    }
                                }
                            }
                        });
                    }
                }
            });
        }
    }); // end database connect call
}

/*
 * Description: Helper method for CancelGame that does the actual database update.
 */
function CancelGameInternal (db, playerSteam64Id, gameNum, callback) {
    db.collection("games").update({ 'gameNum': gameNum, status: { $in: ['WaitingForPlayers', 'InProgress'] } }, { $set: { status: 'Cancelled' } }, function (err, doc) {
        if (callback) {
            if (err) {
                return callback(errCodes.DATABASE_FAILURE);
            } else {
                return callback(errCodes.SUCCESS);
            }
        }
    });
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
                        return callback(errCodes.USER_ALREADY_REGISTERED);
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
            FindUser(db, playerSteam64Id, function (err, user) {
                if (err) {
                    return callback(err);
                } else {
                    var playerObjectId = user._id;
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
                                        db.collection("games").insert({ seasonId : latestSeasonObject._id, gameNum: newGameNum, status : 'WaitingForPlayers', players: [playerObjectId], gameCreator: playerObjectId }, { w: 1 }, function (err, docs) {
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