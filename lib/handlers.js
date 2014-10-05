/*
 * Author: matthewhuynh88@gmail.com
 * Description: contains all the event handlers for the bot
 */

var config = require("./config"),
    DataAccess = require('./dataAccess'),
    errCodes = require('./errorCodes'),
    trace = require('./trace');

exports.onPrivateMessage = function onPrivateMessage(source, message, type, chatter, callback) {
    // source is a steam64id of a chatroom or user

    // only respond to real messages (0-length messages inform us someone is typing to us)
    if (message.length > 0) {
        trace.debug('Received message (' + message.length + '): ' + message);

        var responseMsg = "Something went terribly wrong if you are reading this. Please inform my creator at " + config.creator.email;
        if (message.length >= 4) {
            switch (message) {
                case 'zhen':
                    responseMsg = "GG, MMR too low n00b";
                    break;
                case 'ping':
                    responseMsg = 'pong';
                    break;
                case '!games':
                    responseMsg = 'here is the list of games: <to be implemented>';
                    break;
                case '!sign':
                    responseMsg = 'what game are you trying to sign into? use !sign <gameID>';
                    break;
                case '!stats':
                    responseMsg = 'here are your stats: <to be implemented>';
                    break;
                case '!leaderboard':
                    responseMsg = 'top 10 players right now: <to be implemented>';
                    break;
                default:
                    responseMsg = "I could not understand your query. You can view the list of available commands for me at https://github.com/maxxwizard/inhouseBot";
                    break;
            }
        }

        if (callback) {
            callback(errCodes.SUCCESS, responseMsg);
        }
    }
}

exports.onGuildMessage = function onGuildMessage(message, callback) {

}