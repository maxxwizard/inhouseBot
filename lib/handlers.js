/*
 * Author: matthewhuynh88@gmail.com
 * Description: contains the event handlers for the bot.
 */

var config = require("./config"),
    DataAccess = require('./dataAccess'),
    errCodes = require('./errorCodes'),
    trace = require('./trace');

// Steam limits messages to 255 characters so we must respond with a message of that char limit
var defaultHelpMsg = "I could not understand your query. You can view the list of available commands for me at https://github.com/maxxwizard/inhouseBot";

exports.onPrivateMessage = function onPrivateMessage(steam64id, personaName, message, callback) {

    // only respond to real messages (0-length messages inform us someone is typing to us)
    if (message.length > 0) {
        util.log('Private message from ' + personaName + ' (' + steam64id + '): ' + message);

        universalMessageHandler(steam64id, personaName, message, function (err, responseMsg) {
            if (callback) {
                callback(err, responseMsg);
            }
        });
    }
};

exports.onGuildMessage = function onGuildMessage(channel, steam64id, personaName, message, callback) {
    util.log(channel + " message from " + personaName + " (" + steam64id + "): " + message);

    universalMessageHandler(steam64id, personaName, message, function (err, responseMsg) {
        if (callback) {
            callback(err, responseMsg);
        }
    });
};

function universalMessageHandler(playerSteam64Id, personaName, message, callback) {
    // all commands sent to bot need to start with ! (exclamation point)
    // shortest message is !help so ensure message at least 5 chars
    if (message.substring(0, 1) == "!" && message.length >= 5) {

        var responseMsg = "Something went terribly wrong if you are reading this. Please inform my creator at " + config.creator.email;

        var params = message.split(" ");
        var command = params[0] == null ? "" : params[0];
        var param = params[1] == null ? "" : params[1];

        switch (command.toLowerCase()) {
            case "!register":

                break;
            case "!games":
                break;
            case "!newgame":
                break;
            case "!cancel":
                break;
            case "!sign":
                break;
            case "!start":
                break;
            case "!reportwin":
                break;
            case "!reportloss":
                break;
            case "!stats":
                break;
            case "!help":
                responseMsg = defaultHelpMsg;
                break;
            case "!leaderboard":
            case "!leaderboards":
                break;
        }

        if (callback) {
            callback (errCodes.SUCCESS, responseMsg);
        }
    }
}