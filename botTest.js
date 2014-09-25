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
    trace = require('./trace.js'),
    errCodes = require('./errorCodes.js'),
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
                    db.collection("players").insert({ _id: randPlayerId, username: 'maxxwizard', rating: 1500, steam64Id: '76561197968837492' }, function (err, docs) {
                        trace.debug("BotTest: player maxxwizard inserted");
                        db.collection("players").insert({ _id: randPlayerId2, username: 'saltydog', rating: 1400, steam64Id: '76561198029982751' }, function (err, docs) {
                            trace.debug("BotTest: player saltydog inserted");
                            // show zero game scenario, add a game, show 1 game scenario, add 2nd game, show 2 game scenario,
                            // add 3rd game with duplicate steam64id (should produce failure)
                            TestGetCurrentGamesFunctionality(function () {
                                TestNewGameFunctionality("76561197968837492", function () {
                                    TestGetCurrentGamesFunctionality(function () {
                                        TestNewGameFunctionality("76561198029982751", function () {
                                            TestGetCurrentGamesFunctionality(function () { 
                                                TestNewGameFunctionality("76561198029982751", function () { });
                                            });
                                        });
                                    });
                                })
                            });
                            TestRegisterFunctionality();
                            
                        });
                    });
                });
            });

        }
    }); // end database connect call
    
    function TestNewGameFunctionality(steam64id, callback) {
        DbClient.NewGame(steam64id, function (err, newGame) {
            if (err) {
                trace.warn("BotTest: game was not created with error code " + err);
                if (err == errCodes.USER_ALREADY_SIGNED) {
                    trace.warn("BotTest: user already signed into game #" + newGame.gameNum);
                }
            } else {
                trace.log("BotTest: new game #" + newGame.gameNum + " created");
            }
            if (callback) {
                callback();
            }
        });
    }
    
    function TestRegisterFunctionality(callback) {
        // test duplicate record scenario
        DbClient.Register("76561197968837492", "maxxwizard", function (err) {
            if (err) {
                trace.warn("BotTest: registration for maxxwizard failed with error code " + err);
            } else {
                trace.log("BotTest: registration for maxxwizard succeeded");
            }
            // test new user scenario
            DbClient.Register("76561198051766196", "gemini", function (err) {
                if (err) {
                    trace.warn("BotTest: registration for gemini failed with error code " + err);
                } else {
                    trace.log("BotTest: registration for gemini succeeded");
                }
                // execute callback
                if (callback) {
                    callback();
                }
            });
        });
    }
    
    function TestGetCurrentGamesFunctionality(callback) {
        DbClient.GetCurrentGames(function (err, games) {
            if (err) {
                trace.error("error code " + err);
            } else {
                if (games.length == 0) {
                    trace.warn("BotTest: no current games found!");
                } else {
                    games.forEach(function (game) {
                        trace.log("BotTest: Game # " + game.gameNum + " | " + game.status + " | " + game.players.length + " players signed");
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