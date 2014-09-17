/*
 * Author: matthewhuynh88@gmail.com
 * Description: contains logic for testing all of the bot functionality
 */

var trace = require('./trace.js');

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
    
    // test new game creation functionality
    DbClient.NewGame("76561197968837492", function (err, newGame) {
        if (err) {
            trace.warn("BotTest: game was not created");
        } else {
            trace.log("BotTest: new game #" + newGame.gameNum + " created");
        }
    });
    
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