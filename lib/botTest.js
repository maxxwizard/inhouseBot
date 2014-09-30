/*
 * Author: matthewhuynh88@gmail.com
 * Description: contains logic for testing all of the bot functionality
 */

var Db = require('mongodb').Db,
    MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    ReplSetServers = require('mongodb').ReplSetServers,
    ObjectID = require('mongodb').ObjectID,
    Binary = require('mongodb').Binary,
    GridStore = require('mongodb').GridStore,
    Grid = require('mongodb').Grid,
    Code = require('mongodb').Code,
    BSON = require('mongodb').pure().BSON,
    assert = require('assert'),
    trace = require('./trace'),
    errCodes = require('./errorCodes'),
    ranking = require('./ranking.js'),
    config = require('./config');

module.exports.TestAllFunctionality = function (DbClient) {
    
    // drop database
    // insert new season
    // test: user registration
    // test: new game creation * 2
    // test: game cancellation
    // test: get current games
    // test: sign (in)
    // test: sign (out)
    // add 10 players to game
    // test: game start
    // add 4 Radiant win scores
    // test: reportWin
    // clear scores for game and add 4 Radiant loss scores
    // test: reportLoss
    
    // test: stats
    // test: leaderboard
    // test: name

    var numOfTestPlayers = 10;
    
    DbClient.Connect(function (err, db) {
        db.dropDatabase(function (err, result) {
            assert.equal(null, err);
            trace.debug("BotTest: database dropped!");
            // insert new season
            var randSeasonId = new ObjectID();
            var seasonColl = db.collection("seasons");
            seasonColl.save({ _id: randSeasonId, seasonNum: 1, startDate: Date(2014, 9, 1), endDate: Date(2014, 12, 31), name: 'Season 1' }, function (err, docs) {
                assert.equal(null, err);
                trace.debug("BotTest: season 1 inserted");
                var randPlayerId = new ObjectID();
                var randPlayerId2 = new ObjectID();
                db.collection("players").insert({ _id: randPlayerId, username: 'maxxwizard', rating: 1500, steam64Id: '76561197968837492', admin: 1 }, function (err, docs) {
                    trace.debug("BotTest: player maxxwizard inserted");
                    db.collection("players").insert({ _id: randPlayerId2, username: 'saltydog', rating: 1400, steam64Id: '76561198029982751' }, function (err, docs) {
                        trace.debug("BotTest: player saltydog inserted");
                        
                        TestRegisterFunctionality(db, function () {
                            TestNewGameSuite(db, function () {
                                TestSignUnsignSuite(db, function () {
                                    TestStartGameFunctionality(db, function () {
                                        // tests finished, close database connection
                                        db.close();
                                    });
                                });
                            });
                        });
                        
                    });
                });
            });
        });
    }); // end database connect call
    
    function TestStartGameFunctionality(db, callback) {
        // create a game and sign user1 through user10 additional players to make a full house
        DbClient.NewGame(db, 1, function (err, newGameObj) {
            if (err) {
                trace.log("TestStartGame: initializing games failed with error code " + err);
            } else {
                var newGameNum = newGameObj.gameNum;
                var counter = numOfTestPlayers;
                // sign enough players to fill the game
                for (i = 1; i <= numOfTestPlayers; i++) {
                    DbClient.SignGame(db, i, newGameNum, function () {
                        counter--;
                        if (counter == 0) {
                            // we've finished signing all 10 so now we can run our StartGame tests
                            
                            // start an invalid game
                            DbClient.StartGame(db, '76561197968837492', 0, function (err) {
                                assert.equal(err, errCodes.GAME_NOT_FOUND, "TestStartGame: invalid game # scenario failed with error code " + err);
                                // unregistered user start a game
                                DbClient.StartGame(db, '123456789', newGameNum, function (err) {
                                    assert.equal(err, errCodes.USER_NOT_REGISTERED, "TestStartGame: unregistered user scenario failed with error code " + err);
                                    // start a game that has less than 10 players
                                    DbClient.StartGame(db, '76561197968837492', 3, function (err) {
                                        assert.equal(err, errCodes.GAME_NOT_READY, "TestStartGame: less-than-10-players scenario failed with error code " + err);
                                        // start a game as unauthorized user
                                        DbClient.StartGame(db, 2, newGameNum, function (err) {
                                            assert.equal(err, errCodes.UNAUTHORIZED, "TestStartGame: unauthorized user scenario failed with error code " + err);
                                            // start a game that has 10 players
                                            DbClient.StartGame(db, 1, newGameNum, function (err) {
                                                assert.equal(err, errCodes.SUCCESS, "TestStartGame: 10-player scenario failed with error code " + err);
                                                trace.log("TestStartGame: all tests passed");
                                                // now we're done so execute callback
                                                if (callback) {
                                                    callback(err);
                                                }
                                            });
                                        });
                                    });
                                });
                            });
                        }
                    });
                }
            }
        });
    }
    
    function TestNewGameSuite(db, callback) {
        // show zero game scenario
        TestGetCurrentGamesFunctionality(db, function () {
            // add game #1
            TestNewGameFunctionality(db, "76561197968837492", function () {
                // show 1 game scenario
                TestGetCurrentGamesFunctionality(db, function () {
                    // add game #2
                    TestNewGameFunctionality(db, "76561198029982751", function () {
                        // show 2 game scenario
                        TestGetCurrentGamesFunctionality(db, function () {
                            // add 3rd game with duplicate steam64id (should produce failure)
                            TestNewGameFunctionality(db, "76561198029982751", function () {
                                // cancel game that doesn't exist
                                TestCancelGameFunctionality(db, '76561197968837492', 0, function () {
                                    // cancel game as unauthorized user
                                    TestCancelGameFunctionality(db, '76561198029982751', 1, function (err) {
                                        // cancel game with an unregistered user
                                        TestCancelGameFunctionality(db, '1234567890', 1, function (err) {
                                            // cancel game as admin
                                            TestCancelGameFunctionality(db, '76561197968837492', 1, function () {
                                                // cancel game as game creator
                                                TestCancelGameFunctionality(db, '76561198029982751', 2, function () {
                                                    // execute callback
                                                    callback();
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            })
        });
    }
    
    function TestSignUnsignSuite(db, callback) {
        TestNewGameFunctionality(db, "76561197968837492", function (err, newGameNum1) {
            TestNewGameFunctionality(db, "76561198029982751", function (err, newGameNum2) {
                // sign to non-existent game
                TestSignGameFunctionality(db, "76561197968837492", 0, function () {
                    // sign with unregistered user
                    TestSignGameFunctionality(db, "123456789", newGameNum1, function () {
                        // duplicate sign-in
                        TestSignGameFunctionality(db, "76561197968837492", newGameNum1, function () {
                            // proper sign-in
                            TestSignGameFunctionality(db, "76561197968837492", newGameNum2, function () {
                                // unsign from non-existent game
                                TestUnsignGameFunctionality(db, "76561197968837492", 0, function () {
                                    // unsign with unregistered user
                                    TestUnsignGameFunctionality(db, "123456789", newGameNum1, function () {
                                        // unsign twice from a game
                                        TestUnsignGameFunctionality(db, "76561197968837492", newGameNum1, function () {
                                            TestUnsignGameFunctionality(db, "76561197968837492", newGameNum1, function () {
                                                // execute callback
                                                callback();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }
    
    function TestUnsignGameFunctionality(db, steam64id, gameNum, callback) {
        DbClient.UnsignGame(db, steam64id, gameNum, function (err) {
            trace.log("TestUnsignGame: " + steam64id + " unsigned from game " + gameNum + " with error code " + err);
            if (callback) {
                callback(err);
            }
        });
    }
    
    function TestSignGameFunctionality(db, steam64id, gameNum, callback) {
        DbClient.SignGame(db, steam64id, gameNum, function (err) {
            trace.log("TestSignGame: " + steam64id + " signed into game " + gameNum + " with error code " + err);
            if (callback) {
                callback(err);
            }
        });
    }
    
    function TestCancelGameFunctionality(db, steam64id, gameNum, callback) {
        DbClient.CancelGame(db, steam64id, gameNum, false, function (err) {
            if (err == errCodes.SUCCESS) {
                trace.log("TestCancelGame: game " + gameNum + " canceled");
            } else {
                trace.warn("TestCancelGame: game " + gameNum + " was not canceled with error code " + err);
            }
            if (callback) {
                callback(err);
            }
        });
    }
    
    function TestNewGameFunctionality(db, steam64id, callback) {
        DbClient.NewGame(db, steam64id, function (err, newGame) {
            var newGameNum = newGame == null ? 0 : newGame.gameNum;
            trace.log("TestNewGame: new game #" + newGameNum + " created with error code " + err);
            if (callback) {
                callback(err, newGameNum);
            }
        });
    }
    
    function TestRegisterFunctionality(db, callback) {
        // test duplicate record scenario
        DbClient.Register(db, "76561197968837492", "maxxwizard", ranking.InitialRating, function (err) {
            if (err) {
                trace.warn("TestRegister: registration for maxxwizard failed with error code " + err);
            } else {
                trace.log("TestRegister: registration for maxxwizard succeeded");
            }
            // test new user scenario
            DbClient.Register(db, "76561198051766196", "gemini", ranking.InitialRating, function (err) {
                if (err) {
                    trace.warn("TestRegister: registration for gemini failed with error code " + err);
                } else {
                    trace.log("TestRegister: registration for gemini succeeded");
                }
                var counter = numOfTestPlayers;
                for (i = 1; i <= numOfTestPlayers; i++) {
                    var randomRating = Math.floor((Math.random() * 1000) + 1);
                    DbClient.Register(db, i, "user" + i.toString(), ranking.InitialRating+randomRating, function () {
                        counter--;
                        //trace.debug("counter: " + counter);
                        if (counter == 0) {
                            //trace.debug("finished player seeding");
                            // we've finished seeding database with players so execute callback
                            if (callback) {
                                callback(err);
                            }
                        }
                    });
                }
            });
        });
    }
    
    
    
    function TestGetCurrentGamesFunctionality(db, callback) {
        DbClient.GetCurrentGames(db, function (err, games) {
            if (err) {
                trace.error("TestGetCurrentGames: error code " + err);
            } else {
                if (games.length == 0) {
                    trace.warn("TestGetCurrentGames: no current games found!");
                } else {
                    games.forEach(function (game) {
                        trace.log("TestGetCurrentGames: Game # " + game.gameNum + " | " + game.status + " | " + game.players.length + " players signed");
                    });
                }
                if (callback) {
                    callback();
                }
            }
        });
    }
    
    var readline = require('readline');
    var rl = readline.createInterface(process.stdin, process.stdout);
    //rl.setPrompt('pausing console> ');
    rl.prompt();
    rl.on('line', function (line) {
        if (line === "exit") rl.close();
        if (line === "quit") rl.close();
        rl.prompt();
    }).on('close', function () {
        process.exit(0);
    });
}