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

    DbClient.Connect(function (err, db) {
        assert.equal(null, err, "database connection failed");
        db.dropDatabase(function (err, result) {
            trace.debug("BotTest: database dropped!");
            TestRegisterFunctionality(db, function () {
                TestNewSeasonFunctionality(db, function () {
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

    function TestNewSeasonFunctionality(db, callback) {
        DbClient.NewSeason(db, '76561197968837492', "Season 1", function (err) {
            assert.equal(err, errCodes.SUCCESS, "TestNewSeason: 0 season scenario : unexpected error code " + err);
            DbClient.NewSeason(db, '76561197968837492', "Season 2", function(err, newSeason) {
                assert.equal(err, errCodes.SUCCESS, "TestNewSeason: 1 season scenario : unexpected error code " + err);
                assert.notEqual(newSeason, null, "TestNewSeason: 1 season scenario : new season should have been created and returned");
                trace.log("TestNewSeason: all tests passed!");
                if (callback) {
                    callback();
                }
            });
        });
    }
    
    /*
     * Description: helper method that registers players
     */
    function SeedTestPlayers(db, numOfPlayersToSeed, callback) {
        // register 10 players with randomized ratings
        var counterPlayersToRegister = numOfPlayersToSeed;
        for (i = 1; i <= numOfPlayersToSeed; i++) {
            var randomRating = Math.floor((Math.random() * 1000) + 1);
            DbClient.Register(db, i, "user" + i.toString(), ranking.InitialRating + randomRating, 0, function () {
                counterPlayersToRegister--;
                //trace.debug("counter: " + counter);
                if (counterPlayersToRegister == 0) {
                    // we've finished seeding database with players so execute callback
                    callback();
                }
            });
        }
    }
    
    function TestStartGameFunctionality(db, callback) {
        
        var numOfTestPlayers = 10;
        
        // seed our players
        SeedTestPlayers(db, numOfTestPlayers, function () {
            //trace.debug(numOfTestPlayers + " test players seeded");

            // create a game and sign user1 through user10 additional players to make a full house
            DbClient.NewGame(db, 1, function (err, newGameObj) {
                assert.equal(err, errCodes.SUCCESS, "TestStartGame: initializing games failed with error code " + err);
                
                var newGameNum = newGameObj.gameNum;
                
                // sign enough players to fill the game
                var counterPlayersToSign = numOfTestPlayers - 1; // first player is already signed into game
                for (var i = 2; i <= numOfTestPlayers; i++) {
                    DbClient.SignGame(db, i, newGameNum, function (err) {
                        assert.equal(err, errCodes.SUCCESS, "TestStartGame: test players initialization failed with error code " + err);
                        counterPlayersToSign--;
                        if (counterPlayersToSign == 0) {
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
                                            DbClient.StartGame(db, 1, newGameNum, function (err, playerSplit) {
                                                assert.equal(err, errCodes.SUCCESS, "TestStartGame: 10-player scenario failed with error code " + err);
                                                assert.equal(playerSplit.Dire.length, playerSplit.Radiant.length, "TestStartGame: 10-player scenario : each team should have 5 players");
                                                trace.log("TestStartGame: all tests passed!");
                                                // now we're done so execute callback
                                                if (callback) {
                                                    callback();
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
        DbClient.NewGame(db, "76561197968837492", function (err, newGame1) {
            assert.equal(err, errCodes.SUCCESS, "TestSignUnsign: game 1 initialization : unexpected error code " + err);
            DbClient.NewGame(db, "76561198029982751", function (err, newGame2) {
                assert.equal(err, errCodes.SUCCESS, "TestSignUnsign: game 2 initialization : unexpected error code " + err);
                // sign to non-existent game
                DbClient.SignGame(db, "76561197968837492", 0, function (err) {
                    assert.equal(err, errCodes.GAME_NOT_FOUND, "TestSignUnsign: non-existent game sign scenario : unexpected error code " + err);
                    // sign with unregistered user
                    DbClient.SignGame(db, "123456789", newGame1.gameNum, function (err) {
                        assert.equal(err, errCodes.USER_NOT_REGISTERED, "TestSignUnsign: unregistered user sign scenario : unexpected error code " + err);
                        // duplicate sign-in
                        DbClient.SignGame(db, "76561197968837492", newGame1.gameNum, function (err, signedGame) {
                            assert.equal(err, errCodes.USER_ALREADY_SIGNED, "TestSignUnsign: duplicate sign-in scenario : unexpected error code " + err);
                            assert.equal(signedGame.gameNum, newGame1.gameNum, "TestSignUnsign: duplicate sign-in scenario: unexpected gameNum");
                            // proper sign-in
                            DbClient.SignGame(db, "76561197968837492", newGame2.gameNum, function (err) {
                                assert.equal(err, errCodes.SUCCESS, "TestSignUnsign: proper sign-in scenario : unexpected error code " + err);
                                // unsign from non-existent game
                                DbClient.UnsignGame(db, "76561197968837492", 0, function (err) {
                                    assert.equal(err, errCodes.GAME_NOT_FOUND, "TestSignUnsign: non-existent game unsign scenario : unexpected error code " + err);
                                    // unsign with unregistered user
                                    DbClient.UnsignGame(db, "123456789", newGame1.gameNum, function (err) {
                                        assert.equal(err, errCodes.USER_NOT_REGISTERED, "TestSignUnsign: unregistered user unsign scenario : unexpected error code " + err);
                                        // proper unsign
                                        DbClient.UnsignGame(db, "76561197968837492", newGame1.gameNum, function (err) {
                                            assert.equal(err, errCodes.SUCCESS, "TestSignUnsign: proper unsign scenario : unexpected error code " + err);
                                            // unsign from game where we're not unsigned
                                            DbClient.UnsignGame(db, "76561197968837492", newGame1.gameNum, function (err) {
                                                assert.equal(err, errCodes.USER_NOT_SIGNED, "TestSignUnsign: user not signed scenario : unexpected error code " + err);
                                                // execute callback
                                                trace.log("TestSignUnsignSuite: all tests passed!");
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
        });
    }
    
    function TestRegisterFunctionality(db, callback) {
        // admin registration scenario
        DbClient.Register(db, '76561197968837492', 'maxxwizard', 1500, 1, function (err) {
            assert.equal(err, errCodes.SUCCESS, "TestRegister: maxxwizard insertion failed with err code " + err);
            // regular user registration scenario
            DbClient.Register(db, '76561198029982751', 'saltydog', 1400, 0, function (err) {
                assert.equal(err, errCodes.SUCCESS, "TestRegister: saltydog insertion failed with err code " + err);
                // test duplicate record scenario
                DbClient.Register(db, "76561197968837492", "maxxwizard", ranking.InitialRating, 0, function (err) {
                    assert.equal(err, errCodes.USER_ALREADY_REGISTERED, "TestRegister: duplicate registration scenario : unexpected error code " + err);
                    // test new user scenario
                    DbClient.Register(db, "76561198051766196", "gemini", ranking.InitialRating, 0, function (err) {
                        assert.equal(err, errCodes.SUCCESS, "TestRegister: new/proper user scenario : unexpected error code " + err);
                        trace.log("TestRegisterSuite: all tests passed!");
                        if (callback) {
                            callback(err);
                        }
                    });
                });
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
};