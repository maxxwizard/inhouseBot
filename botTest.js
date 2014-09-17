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
                });
            });
            /*
            var randPlayerId = new ObjectId();
            var randPlayerId2 = new ObjectId();
            db.collection("players").insert({ _id: randPlayerId, username: 'maxxwizard', rating: 1500, steam64Id: '76561197968837492' }, function (err, docs) { });
             */
        }
    }); // end database connect call
    
    
    // test new game creation functionality
    /*
    DbClient.NewGame("76561197968837492", function (err, newGame) {
        if (err) {
            trace.warn("BotTest: game was not created");
        } else {
            trace.log("BotTest: new game #" + newGame.gameNum + " created");
        }
    });
     */
    
    // test registration functionality
    //var success = DbClient.Register("invalidsteamid", "test123");
    //success = DbClient.Register("76561197968837492", "maxxwizard");
    
    // test GetCurrentGames functionality
    /*
        var docs = DbClient.GetCurrentGames(function (err, games) {
            if (games.length == 0) {
                trace.warn("no current games found!");
            } else {
                games.forEach(function (game) {
                    trace.log("Game # " + game.gameNum + " | " + game.status + " | " + game.players.length + " players signed");
                });
            }
        });
         */

        // test CancelGame functionality

        
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