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
    
    var db = new Db(config.mongo.dbName, new Server(config.mongo.host, config.mongo.port), { safe: true });
    db.open(function (err, db) {
        if (err) {
            trace.error("BotTest: couldn't connect to database " + this.host + ":" + this.port);
            return false;
        } else {
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
                            
                            TestNewGameSuite(function () {
                                TestSignUnsignSuite();
                            });
                            
                            TestRegisterFunctionality();
                        });
                    });
                });
            });

        }
    }); // end database connect call
    
    function TestNewGameSuite(callback) {
        // show zero game scenario
        TestGetCurrentGamesFunctionality(function () {
            // add game #1
            TestNewGameFunctionality("76561197968837492", function () {
                // show 1 game scenario
                TestGetCurrentGamesFunctionality(function () {
                    // add game #2
                    TestNewGameFunctionality("76561198029982751", function () {
                        // show 2 game scenario
                        TestGetCurrentGamesFunctionality(function () {
                            // add 3rd game with duplicate steam64id (should produce failure)
                            TestNewGameFunctionality("76561198029982751", function () {
                                // cancel game that doesn't exist
                                TestCancelGameFunctionality('76561197968837492', 0, function () {
                                    // cancel game as unauthorized user
                                    TestCancelGameFunctionality('76561198029982751', 1, function (err) {
                                        // cancel game with an unregistered user
                                        TestCancelGameFunctionality('1234567890', 1, function (err) {
                                            // cancel game as admin
                                            TestCancelGameFunctionality('76561197968837492', 1, function () {
                                                // cancel game as game creator
                                                TestCancelGameFunctionality('76561198029982751', 2, function () { 
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
    
    function TestSignUnsignSuite() {
        TestNewGameFunctionality("76561197968837492", function (err, newGameNum1) {
            TestNewGameFunctionality("76561198029982751", function (err, newGameNum2) {
                // sign to non-existent game
                TestSignGameFunctionality("76561197968837492", 0, function () {
                    // sign with unregistered user
                    TestSignGameFunctionality("123456789", newGameNum1, function () {
                        // duplicate sign-in
                        TestSignGameFunctionality("76561197968837492", newGameNum1, function () {
                            // proper sign-in
                            TestSignGameFunctionality("76561197968837492", newGameNum2, function () {
                                // unsign from non-existent game
                                TestUnsignGameFunctionality("76561197968837492", 0, function () {
                                    // unsign with unregistered user
                                    TestUnsignGameFunctionality("123456789", newGameNum1, function () {
                                        // unsign twice from a game
                                        TestUnsignGameFunctionality("76561197968837492", newGameNum1, function () {
                                            TestUnsignGameFunctionality("76561197968837492", newGameNum1, function () { });
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
    
    function TestUnsignGameFunctionality(steam64id, gameNum, callback) {
        DbClient.UnsignGame(steam64id, gameNum, function (err) {
            trace.log("TestUnsignGame: " + steam64id + " unsigned from game " + gameNum + " with error code " + err);
            if (callback) {
                callback(err);
            }
        });
    }
    
    function TestSignGameFunctionality(steam64id, gameNum, callback) {
        DbClient.SignGame(steam64id, gameNum, function (err) {
            trace.log("TestSignGame: " + steam64id + " signed into game " + gameNum + " with error code " + err);
            if (callback) {
                callback(err);
            }
        });
    }
    
    function TestCancelGameFunctionality(steam64id, gameNum, callback) {
        DbClient.CancelGame(steam64id, gameNum, false, function (err) {
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
    
    function TestNewGameFunctionality(steam64id, callback) {
        DbClient.NewGame(steam64id, function (err, newGame) {
            var newGameNum = newGame == null ? 0 : newGame.gameNum;
            trace.log("TestNewGame: new game #" + newGameNum + " created with error code " + err);
            if (callback) {
                callback(err, newGame.gameNum);
            }
        });
    }
    
    function TestRegisterFunctionality(callback) {
        // test duplicate record scenario
        DbClient.Register("76561197968837492", "maxxwizard", function (err) {
            if (err) {
                trace.warn("TestRegister: registration for maxxwizard failed with error code " + err);
            } else {
                trace.log("TestRegister: registration for maxxwizard succeeded");
            }
            // test new user scenario
            DbClient.Register("76561198051766196", "gemini", function (err) {
                if (err) {
                    trace.warn("TestRegister: registration for gemini failed with error code " + err);
                } else {
                    trace.log("TestRegister: registration for gemini succeeded");
                }
                // execute callback
                if (callback) {
                    callback(err);
                }
            });
        });
    }
    
    function TestGetCurrentGamesFunctionality(callback) {
        DbClient.GetCurrentGames(function (err, games) {
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