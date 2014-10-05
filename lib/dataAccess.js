/*
 * Author: matthewhuynh88@gmail.com
 * Description: has knowledge about the database layout and how to work with objects inside it
 */ 

/*
 * Database layout
 *  
 * games: { _id : ObjectId("guid"), seasonId : ObjectId("guid"), winner : 'Dire', gameNum: 26, status : 'InProgress',
 *         players: [id: {ObjectId("guid"), team: 'Radiant'}, etc], scores: [{playerObjId: ObjectId("guid"), winner: 'Radiant'}],
 *         gameCreator : ObjectId("guid") }
 * constraints: - there cannot be more than 10 items in players array
 *              - winner must be string 'Radiant' or 'Dire'
 *              - status must be 'WaitingForPlayers' or 'InProgress' or 'Completed' or 'Cancelled'
 *              - scores is an array of tuples {playerObjectId, winner} where winner = 'Radiant' or 'Dire'
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

var assert = require('assert');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var Db = require('mongodb').Db;
var Server = require('mongodb').Server;
var config = require('./config');
var trace = require('./trace');
var ranking = require('./ranking');
var errCodes = require('./errorCodes');

// exporting DbClient as a class. initialize like this:
// var dbClient = new DataAccess.DbClient();
module.exports.DbClient = DbClient = function () {
};

/*
* Description: This function should be called first in order to open a connection to our database.
*/
DbClient.prototype.Connect = function (callback) {
    DbClient.MongoClient = new MongoClient(new Server(config.mongo.host, config.mongo.port), { safe: true });
    
    if (DbClient.MongoClient == null) {
        trace.error("Connect: MongoClient initialization failed");
    } else {
        // create a connection!
        DbClient.MongoClient.open(function (err, mongoclient) {
            var openDb = mongoclient.db(config.mongo.dbName);
            if (err) {
                trace.error("Connect: couldn't connect to database on " + this.host + ":" + this.port);
                return callback(errCodes.DATABASE_FAILURE);
            } else {
                callback(err, openDb);
            }
        });
    }
};

/**
 *
 * @param db
 * @param playerSteam64Id
 * @param winOrLoss 'win' or 'loss'
 * @param callback
 * @param winnerOverride for testing: pass in 'Radiant' or 'Dire'
 */
DbClient.prototype.ReportScore = function ReportScore(db, playerSteam64Id, winOrLoss, winnerOverride, callback) {
    FindUser(db, playerSteam64Id, function (err, user) {
        if (err) {
            return callback(err);
        } else {
            // find the InProgress game that the user is signed into
            FindActiveGameForPlayer(db, user._id, function (err, game) {
                if (err == errCodes.GAME_NOT_FOUND) {
                    return callback(errCodes.USER_NOT_SIGNED);
                } else if (err == errCodes.SUCCESS && game) {
                    // report score by creating a score record
                    var playerTeam;
                    for (var player in game.players) {
                        if (user._id.equals(player.id)) {
                            playerTeam = player.team;
                            break;
                        }
                    }

                    var winner;
                    if (winnerOverride) {
                        winner = winnerOverride;
                    } else {
                        switch (winOrLoss) {
                            case "win" :
                                if (playerTeam.equals("Radiant")) {
                                    winner = "Radiant";
                                } else {
                                    winner = "Dire";
                                }
                                break;
                            case "loss" :
                                if (playerTeam.equals("Radiant")) {
                                    winner = "Dire";
                                } else {
                                    winner = "Radiant";
                                }
                                break;
                        }
                    }

                    var newScore = {playerObjId: user._id, 'winner': winner};
                    db.collection("games").findAndModify({ _id: game._id, status: 'InProgress' }, {}, { $addToSet: { scores: newScore } }, {new:true}, function (err, updatedGameObj) {
                        if (err) {
                            return callback(errCodes.DATABASE_FAILURE);
                        } else {
                            //trace.debug("score added <" + newScore.playerObjId + "," + newScore.winner + ">");

                            // after 5th report, we need to check if there are 5 reports for a team.
                            // if so, mark the game as Completed and declare winner.
                            if (updatedGameObj.scores.length >= 5) {
                                var radiantWinReports = 0;
                                var direWinReports = 0;
                                for (var i = 0; i < updatedGameObj.scores.length; i++) {
                                    var score = updatedGameObj.scores[i];
                                    if (score.winner == "Radiant") {
                                        radiantWinReports++;
                                    } else {
                                        direWinReports++;
                                    }
                                    if (radiantWinReports >= 5) {
                                        ReportScoreInternal(db, game._id, 'Radiant', function (err, updatedGameObj) {
                                            return callback(err, updatedGameObj);
                                        });
                                    } else if (direWinReports >= 5) {
                                        ReportScoreInternal(db, game._id, 'Radiant', function (err, updatedGameObj) {
                                            return callback(err, updatedGameObj);
                                        });
                                    }
                                }
                            } else {
                                // not enough reports to declare victor yet
                                return callback(errCodes.SUCCESS, updatedGameObj);
                            }
                        }

                    });
                }
            });
        }
    });
};

function ReportScoreInternal(db, gameObjId, winner, callback) {
    db.collection("games").findAndModify({ _id: gameObjId, status: 'InProgress' }, {}, { $set: { status: 'Completed', 'winner': winner } }, {new:true}, function (err, updatedGameObj) {
        if (err) {
            return callback(errCodes.DATABASE_FAILURE);
        } else {
            return callback(errCodes.SUCCESS, updatedGameObj);
        }
    });
}

/*
 * Description: helper method that returns latest season
 */
function FindLatestSeason(db, callback) {
    db.collection("seasons").find({}).sort({ _id: -1 }).limit(1).toArray(function (err, docs) {
        if (err) {
            return callback(errCodes.DATABASE_FAILURE);
        } else if (docs.length == 0) {
            return callback(errCodes.NO_SEASONS_FOUND);
        } else {
            return callback(errCodes.SUCCESS, docs[0]);
        }
    });
}

function CreateNewSeasonInternal(db, startDate, newSeasonNum, seasonName, callback) {
    db.collection("seasons").insert({ 'startDate': startDate, seasonNum: newSeasonNum, name: seasonName }, { w: 1 }, function (err, docs) {
        if (err) {
            return callback(errCodes.DATABASE_FAILURE);
        } else {
            return callback(errCodes.SUCCESS, docs[0]);
        }
    });
}
/**
 * Creates a new season.
 * Notes: Be aware every game created from after this database call finishes will use this newly created season.
 * Algorithm: Closes the old season by setting the EndDate. Creates the new season with today's date as StartDate
 *            and seasonNum as the incremental number after the latest seasonNum.
 * @param db
 * @param playerSteam64Id
 * @param seasonName
 * @param callback returns (err, newSeasonObject)
 */
DbClient.prototype.NewSeason = function (db, playerSteam64Id, seasonName, callback) {
    FindUser(db, playerSteam64Id, function (err, user) {
        if (err) {
            return callback(err);
        } else {
            // ensure user is admin
            if (user.admin) {
                // get previous season
                FindLatestSeason(db, function (err, latestSeason) {
                    var newSeasonNum;
                    var today = new Date();
                    if (err == errCodes.NO_SEASONS_FOUND) {
                        newSeasonNum = 1;
                        // create new season
                        CreateNewSeasonInternal(db, today, newSeasonNum, seasonName, callback);
                    } else {
                        newSeasonNum = latestSeason.seasonNum + 1;
                        // close out old season
                        db.collection("seasons").update({ _id : latestSeason._id }, { $set: { endDate: today } }, function (err, docs) {
                            if (err) {
                                return callback(errCodes.DATABASE_FAILURE);
                            } else {
                                // create new season
                                CreateNewSeasonInternal(db, today, newSeasonNum, seasonName, callback);
                            }
                        });
                    }
                });

            } else {
                // user is not admin
                return callback(errCodes.UNAUTHORIZED);
            }
        }
    });
};

/*
 * Description: Verifies the host's game has 10 players, changes the game status to 'InProgress',
 *              determines the balanced shuffle for the players and returns that list in the form:
 *              { Radiant: ['name1', 'name2', 'etc'], Dire: ['name1', 'name2', 'etc'] }
 */ 
DbClient.prototype.StartGame = function (db, playerSteam64Id, gameNum, callback) {
    FindActiveGame(db, gameNum, function (err, game) {
        if (err) {
            return callback(err);
        } else {
            // ensure game is hosted by our player
            FindUser(db, playerSteam64Id, function (err, user) {
                if (err) {
                    return callback(err);
                } else {
                    if (!game.gameCreator.equals(user._id)) {
                        return callback(errCodes.UNAUTHORIZED);
                    } else {
                        // ensure game has 10 players
                        if (game.players.length < 0 || game.players.length > 10) {
                            trace.error("StartGame: the players table is corrupt for game #" + game.gameNum);
                            return callback(errCodes.UNKNOWN_FAILURE);
                        } else if (game.players.length < 10) {
                            return callback(errCodes.GAME_NOT_READY);
                        } else {
                            // change game status to InProgress
                            db.collection("games").update({ _id: game._id }, { $set: { status: 'InProgress' } }, function (err) {
                                if (err) {
                                    return callback(errCodes.DATABASE_FAILURE);
                                } else {
                                    // calculate balanced shuffle and return
                                    GetPlayersForGame(db, game.players, function (err, players) {
                                        ranking.BalancedShuffle(players, function (playerSplit) {

                                            // need to transform our playerSplit array into the following format
                                            // { {id: ObjectId("guid"), team: 'Radiant'}, {id: ObjectId("guid"), team: 'Dire'}, etc}
                                            var playersWithTeams = [];
                                            for (var i = 0; i < playerSplit.Radiant.length; i++) {
                                                var newPlayer = {id: playerSplit.Radiant[i]._id, team: 'Radiant'};
                                                playersWithTeams.push(newPlayer);
                                            }
                                            for (var i = 0; i < playerSplit.Dire.length; i++) {
                                                var newPlayer = {id: playerSplit.Dire[i]._id, team: 'Dire'};
                                                playersWithTeams.push(newPlayer);
                                            }

                                            // save updated players array to database
                                            db.collection("games").update({_id: game._id}, { $set : {players: playersWithTeams}}, function (err) {
                                                if (err) {
                                                    return callback(errCodes.DATABASE_FAILURE);
                                                } else {
                                                    return callback(errCodes.SUCCESS, playerSplit);
                                                }
                                            });
                                        });
                                    });
                                }
                            });
                        }
                    }
                }
            });
        }
    });
};

/*
 * Description: Returns an array of 10 player objects for a game (has all fields like ranking, username, etc).
 */
function GetPlayersForGame(db, players, callback) {
    // we need to extract the ObjectIds from the players array because it contains team right now
    var playerObjectIds = [];
    for (var i = 0; i < players.length; i++) {
        playerObjectIds.push(players[i].id);
    }

    db.collection("players").find({ _id: { $in: playerObjectIds } }).toArray(function (err, docs) {
        if (err) {
            return callback(errCodes.DATABASE_FAILURE);
        } else {
            callback(err, docs);
        }
    });
}

/*
 * Description: Checks that a player is registered and returns the user.
 */ 
function FindUser(db, playerSteam64Id, callback) {
    db.collection("players").findOne({ steam64Id: playerSteam64Id }, function (err, user) {
        if (err) {
            return callback(errCodes.DATABASE_FAILURE, null);
        } else if (user == null) {
            return callback(errCodes.USER_NOT_REGISTERED, null);
        } else {
            return callback(errCodes.SUCCESS, user);
        }
    });
}

/*
 * Description: helper method to ensure a game exists in the current season before we do operations against it
 */
function FindActiveGame(db, gameNum, callback) {
    FindLatestSeason(db, function(err, latestSeason) {
        db.collection("games").findOne({ seasonId: latestSeason._id, 'gameNum': gameNum, status: { $in: ['WaitingForPlayers', 'InProgress'] } }, function (err, game) {
            if (err) {
                trace.error("FindActiveGame: something went wrong during database call");
                return callback(errCodes.DATABASE_FAILURE);
            } else if (game == null) {
                return callback(errCodes.GAME_NOT_FOUND);
            } else {
                return callback(errCodes.SUCCESS, game);
            }
        });
    });
}

/*
 * Description: helper method that returns true if player is in the game
 */
function IsPlayerInGame(gameObject, playerObjectId) {
    for (var i = 0; i < gameObject.players.length; i++) {
        if (gameObject.players[i].id.equals(playerObjectId))
            return true;
    }
    return false;
}

/*
 * Description: adds a player to a game
*/ 
DbClient.prototype.SignGame = function (db, playerSteam64Id, gameNum, callback) {
    FindUser(db, playerSteam64Id, function (err, user) {
        if (err) {
            return callback(err);
        } else {
            FindActiveGame(db, gameNum, function (err, game) {
                if (err) {
                    return callback(err);
                } else {
                    // check if user is already signed into game already
                    if (IsPlayerInGame(game, user._id)) {
                        return callback(errCodes.USER_ALREADY_SIGNED, game);
                    }
                    FindLatestSeason(db, function (err, latestSeason) {
                        // add user to game
                        db.collection("games").update({seasonId: latestSeason._id, 'gameNum': gameNum, status: { $in: ['WaitingForPlayers', 'InProgress'] } }, { $addToSet: { players: {id: user._id, team: 'ToBeDecided'} } }, function (err, doc) {
                            if (err) {
                                return callback(errCodes.DATABASE_FAILURE);
                            } else {
                                return callback(errCodes.SUCCESS);
                            }
                        });
                    });
                }
            });
        }
    });
};

/*
 * Description: removes a player from a game
*/ 
DbClient.prototype.UnsignGame = function (db, playerSteam64Id, gameNum, callback) {
    FindUser(db, playerSteam64Id, function (err, user) {
        if (err) {
            return callback(err);
        } else {
            FindActiveGame(db, gameNum, function (err, game) {
                if (err) {
                    return callback(err);
                } else {
                    // check that user is actually signed into game
                    if (!IsPlayerInGame(game, user._id)) {
                        return callback(errCodes.USER_NOT_SIGNED, game);
                    }
                    FindLatestSeason(db, function (err, latestSeason) {
                        // remove user from game
                        db.collection("games").update({seasonId: latestSeason._id, 'gameNum': gameNum, status: { $in: ['WaitingForPlayers', 'InProgress'] } }, { $pull: { players : {id: user._id } }}, function (err, doc) {
                            if (err) {
                                return callback(errCodes.DATABASE_FAILURE);
                            } else {
                                return callback(errCodes.SUCCESS);
                            }
                        });
                    });
                }
            });
        }
    });
};

DbClient.prototype.CancelAllGamesLatestSeason = function (db, callback) {
    FindLatestSeason(db, function(err, latestSeason) {
        db.collection("games").find({seasonId: latestSeason._id}).toArray(function (err, games) {
            var gamesLeftToCancel = games.length;
            for (var i = 0; i < games.length; i++) {
                CancelGameInternal(db, games[i]._id, function (err) {
                    assert.equal(err, errCodes.SUCCESS, "CancelAllGamesLatestSeason: game cancellation failed");
                    gamesLeftToCancel--;
                    if (gamesLeftToCancel == 0) {
                        trace.debug("all current games cancelled!");
                        return callback(errCodes.SUCCESS);
                    }
                });
            }
        });
    });
}

/*
 * Description: Cancels the game if the user is the game creator or admin or system
 * Notes: - systemOverride should be set to FALSE if this method is being called by a user, TRUE if it is being called by internal code
*/ 
DbClient.prototype.CancelGame = function (db, playerSteam64Id, gameNum, systemOverride, callback) {
    // check that the game exists
    FindActiveGame(db, gameNum, function (err, game) {
        if (err) {
            return callback(err);
        } else {
            if (systemOverride) {
                // cancel game if system override
                CancelGameInternal(db, playerSteam64Id, game._id, function (err) {
                    return callback(err);
                });
            } else {
                // check if user is game creator or admin
                FindUser(db, playerSteam64Id, function (err, user) {
                    if (err) {
                        return callback(err);
                    } else {
                        if (user.admin) {
                            // cancel game if admin
                            CancelGameInternal(db, game._id, function (err) {
                                return callback(err);
                            });
                        } else {
                            // user is not game creator
                            if (!game.gameCreator.equals(user._id)) {
                                return callback(errCodes.UNAUTHORIZED);
                            } else {
                                // cancel game if game creator
                                CancelGameInternal(db, game._id, function (err) {
                                    return callback(err);
                                });
                            }
                        }
                    }
                });
            }
        }
    });
};

/*
 * Description: Helper method for CancelGame that does the actual database update.
 */
function CancelGameInternal(db, gameObjId, callback) {
    FindLatestSeason(db, function (err, latestSeason) {
        db.collection("games").update({ _id: gameObjId, status: { $in: ['WaitingForPlayers', 'InProgress'] } }, { $set: { status: 'Cancelled' } }, function (err, doc) {
            if (callback) {
                if (err) {
                    return callback(errCodes.DATABASE_FAILURE);
                } else {
                    //trace.debug("game " + gameObjId + " cancelled");
                    return callback(errCodes.SUCCESS);
                }
            }
        });
    });
}

/**
 * If user is not already in database, create a record in Players collection.
 * @param db
 * @param playerSteam64Id
 * @param username
 * @param initialRating
 * @param admin 1 if admin, 0 if regular
 * @param {function} callback
 * @constructor
 */
DbClient.prototype.Register = function (db, playerSteam64Id, username, initialRating, admin, callback) {
    // ensure user does not exist
    //trace.debug("Register: finding ObjectId for player " + playerSteam64Id);
    FindUser(db, playerSteam64Id, function (err, doc) {
        if (err == errCodes.USER_NOT_REGISTERED) {
            // create new Player record
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

/*
 * Description: Returns array of Game objects with status as 'WaitingForPlayers' and 'InProgress'
 * TO-DO: return games 'Completed' or 'Cancelled' in last 15 minutes as well
 * Returns: array of game objects (could be 0-length)
*/ 
DbClient.prototype.GetCurrentGames = function (db, callback) {
    FindLatestSeason(db, function (err, latestSeason) {
        // get list of games
        db.collection("games").find({ seasonId : latestSeason._id, 'status': { $in: ['WaitingForPlayers', 'InProgress'] } }).sort({ gameNum : 1 }).toArray(function (err, docs) {
            if (err) {
                return callback(errCodes.DATABASE_FAILURE, docs);
            } else {
                // return list of games
                return callback(errCodes.SUCCESS, docs);
            }
        });
    });
};

function FindActiveGameForPlayer(db, playerObjectId, callback) {
    FindLatestSeason(db, function (err, latestSeason) {
        db.collection("games").find({ $and: [{seasonId : latestSeason._id},
            { status: { $in: ["WaitingForPlayers", "InProgress"] } },
            { 'players.id': playerObjectId }]}).toArray(function (err, docs) {
            if (err) {
                return callback(errCodes.DATABASE_FAILURE);
            } else if (docs.length == 0) {
                return callback(errCodes.GAME_NOT_FOUND, null);
            } else {
                return callback (errCodes.SUCCESS, docs[0]);
            }
        });
    });
}

/*
 * Description: Creates a new game in the current/latest season
 * Algorithm: 1) Resolve the playerSteam64Id to an ObjectId
 *            2) ensure user isn't already signed to a game or playing in one
 *            3) find latest gameNum and latest season
 *            4) finally create the new game
 * @param db Database object
 * @return: game object that contains either the game user is already signed into or newly created game
 */
DbClient.prototype.NewGame = function (db, playerSteam64Id, callback) {
    /// <summary>Creates a new game in the current/latest season</summary>
    /// <returns>callback(err, newGame [game object that contains either the game user is already signed into or newly created game])</returns>
    FindUser(db, playerSteam64Id, function (err, user) {
        if (err) {
            return callback(err);
        } else {
            var playerObjectId = user._id;
            FindActiveGameForPlayer (db, user._id, function (err, game) {
                if (err == errCodes.SUCCESS && game) {
                    //trace.warn("NewGame: player " + playerSteam64Id + " already signed to a game");
                    return callback(errCodes.USER_ALREADY_SIGNED, game);
                } else {
                    //trace.debug("NewGame: finding latest season by ObjectId");
                    FindLatestSeason(db, function (err, latestSeasonObject) {
                        //trace.debug("NewGame: found ObjectId " + latestSeasonObject._id + " as the latest season");
                        //trace.debug("NewGame: finding latest gameNum");
                        db.collection("games").find({ seasonId: latestSeasonObject._id }).sort({ gameNum: -1 }).limit(1).toArray(function (err, docs) {
                            if (err) {
                                //trace.error("NewGame: couldn't find latest gameNum due to DB error");
                                return callback(errCodes.DATABASE_FAILURE);
                            } else {
                                var latestGameObject = docs[0];
                                var newGameNum = 1;
                                if (docs.length == 0) {
                                        //trace.debug("NewGame: this is the first game of season '" + latestSeasonObject.name + "'");
                                } else {
                                    //trace.debug("NewGame: found latest gameNum: " + latestGameObject.gameNum);
                                    newGameNum = latestGameObject.gameNum + 1;
                                }
                                //trace.debug("NewGame: inserting new game");
                                db.collection("games").insert({ seasonId : latestSeasonObject._id, gameNum: newGameNum, status : 'WaitingForPlayers', players: [{id: playerObjectId, team: 'ToBeDecided'}], gameCreator: playerObjectId }, { w: 1 }, function (err, docs) {
                                    if (err) {
                                        //trace.error("NewGame: creation of new game failed");
                                        return callback(errCodes.DATABASE_FAILURE);
                                    } else {
                                        var newGame = docs[0];
                                        //trace.debug("NewGame: new game #" + newGame.gameNum + " created with ObjectId " + newGame._id);
                                        return callback(errCodes.SUCCESS, newGame);
                                    }
                                }); // end game insert call
                            }
                        }); // end latest gameNum find call
                    }); // end latest season find call
                }
            }); // end playerObjectId find call
        }
    }); // end ensurePlayerSignedInGame find call
}; // end NewGame function