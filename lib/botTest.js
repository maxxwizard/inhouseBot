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
        assert.equal(null, err, "database connection failed");
        db.dropDatabase(function (err, result) {
            
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
                            TestNewGameCancelGameSuite(db, function () {
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
            assert.equal(err, errCodes.SUCCESS, "TestStartGame: initializing games failed with error code " + err);
            
            var newGameNum = newGameObj.gameNum;
            var counter = numOfTestPlayers;
            // sign enough players to fill the game
            for (i = 1; i <= numOfTestPlayers; i++) {
                DbClient.SignGame(db, i, newGameNum, function (err) {
                    assert.equal(err, errCodes.SUCCESS, "TestStartGame: test players initialization failed with error code " + err);
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
        });
    }
    
    function TestNewGameCancelGameSuite(db, callback) {
        // show zero game scenario
        DbClient.GetCurrentGames(db, function (err, games) {
            assert.equal(err, errCodes.SUCCESS, "TestNewGame: zero game scenario : game retrieval failed with error code " + err);
            assert.equal(games.length, 0, "TestNewGame: zero game scenario : game retrieval did not yield expected 0 game");
            // add game #1
            DbClient.NewGame(db, "76561197968837492", function (err, newGame) {
                assert.equal(err, errCodes.SUCCESS, "TestNewGame: one game scenario : game creation failed with error code " + err);
                assert.notEqual(newGame, null, "TestNewGame: one game scenario : newly created game should not be null");
                // show 1 game scenario
                DbClient.GetCurrentGames(db, function (err, games) {
                    assert.equal(err, errCodes.SUCCESS, "TestNewGame: one game scenario : game retrieval failed with error code " + err);
                    assert.equal(games.length, 1, "TestNewGame: one game scenario : game retrieval did not yield expected 1 game");
                    // add game #2
                    DbClient.NewGame(db, "76561198029982751", function (err, newGame) {
                        assert.equal(err, errCodes.SUCCESS, "TestNewGame: two game scenario : game creation failed with error code " + err);
                        assert.notEqual(newGame, null, "TestNewGame: two game scenario : newly created game should not be null");
                        // show 2 game scenario
                        DbClient.GetCurrentGames(db, function (err, games) {
                            assert.equal(err, errCodes.SUCCESS, "TestNewGame: two game scenario : game retrieval failed with error code " + err);
                            assert.equal(games.length, 2, "TestNewGame: two game scenario : game retrieval did not yield expected 2 games");
                            // add 3rd game with duplicate steam64id (should produce failure)
                            DbClient.NewGame(db, "76561198029982751", function (err, newGame) {
                                assert.equal(err, errCodes.USER_ALREADY_SIGNED, "TestNewGame: three game scenario : unexpected error code " + err);
                                assert.notEqual(newGame, null, "TestNewGame: three game scenario : retrieved game should not be null");
                                // cancel game that doesn't exist
                                DbClient.CancelGame(db, '76561197968837492', 0, false, function (err) {
                                    assert.equal(err, errCodes.GAME_NOT_FOUND, "TestCancelGame: game doesn't exist scenario : unexpected error code " + err);
                                    // cancel game as unauthorized user
                                    DbClient.CancelGame(db, '76561198029982751', 1, false, function (err) {
                                        assert.equal(err, errCodes.UNAUTHORIZED, "TestCancelGame: unauthorized user scenario : unexpected error code " + err);
                                        // cancel game with an unregistered user
                                        DbClient.CancelGame(db, '1234567890', 1, false, function (err) {
                                            assert.equal(err, errCodes.USER_NOT_REGISTERED, "TestCancelGame: unregistered user scenario : unexpected error code " + err);
                                            // cancel game as admin
                                            DbClient.CancelGame(db, '76561197968837492', 1, false, function (err) {
                                                assert.equal(err, errCodes.SUCCESS, "TestCancelGame: admin user scenario : unexpected error code " + err);
                                                // cancel game as game creator
                                                DbClient.CancelGame(db, '76561198029982751', 2, false, function (err) {
                                                    assert.equal(err, errCodes.SUCCESS, "TestCancelGame: game creator scenario : unexpected error code " + err);
                                                    // execute callback
                                                    trace.log("TestNewGameCancelGameSuite: all tests passed!");
                                                    if (callback) {
                                                        callback();
                                                    }
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