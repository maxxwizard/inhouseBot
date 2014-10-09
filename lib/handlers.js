/*
 * Author: matthewhuynh88@gmail.com
 * Description: contains the event handlers for the bot.
 */

var config = require("./config"),
    DataAccess = require('./dataAccess'),
    errCodes = require('./errorCodes'),
    ranking = require('./ranking'),
    format = require('util'),
    sprintf = require('sprintf'),
    trace = require('./trace');

// Steam limits messages to 255 characters so we must respond with a message of that char limit
var defaultHelpMsg = "You can view the list of available commands for me at https://github.com/maxxwizard/inhouseBot";

exports.onPrivateMessage = onPrivateMessage;
exports.onGuildMessage = onGuildMessage;
exports.universalMessageHandler = universalMessageHandler;

function onPrivateMessage(DbClient, db, steam64id, personaName, message, callback) {

    // only respond to real messages (0-length messages inform us someone is typing to us)
    if (message.length > 0) {
        util.log('Private message from ' + personaName + ' (' + steam64id + '): ' + message);

        universalMessageHandler(DbClient, db, steam64id, personaName, message, function (err, responseMsg) {
            if (callback) {
                callback(err, responseMsg);
            }
        });
    }
};

function onGuildMessage(DbClient, db, channel, steam64id, personaName, message, callback) {
    util.log(channel + " message from " + personaName + " (" + steam64id + "): " + message);

    universalMessageHandler(DbClient, db, steam64id, personaName, message, function (err, responseMsg) {
        if (callback) {
            callback(err, responseMsg);
        }
    });
};

/**
 * Returned message could have "\n" - this indicates a multi-line response.
 */
function universalMessageHandler(DbClient, db, playerSteam64Id, personaName, message, callback) {
    // all commands sent to bot need to start with ! (exclamation point)
    // shortest message is !help so ensure message at least 5 chars
    if (message.substring(0, 1) == "!" && message.length >= 5) {

        var responseMsg = "Something went terribly wrong if you are reading this. Please inform my creator at " + config.creator.email + ".";

        var params = message.split(" ");
        var command = params[0] == null ? "" : params[0];
        var param = params[1] == null ? "" : params[1];

        var trueCommand = command.toLowerCase();
        switch (trueCommand) {
            case "!register":
                //trace.debug("universalMessageHandler: !register for " + playerSteam64Id);
                DbClient.Register(db, playerSteam64Id, personaName, ranking.InitialRating, 0, function (err) {
                    //trace.debug("universalMessageHandler: error code from database " + err);
                    switch (err) {
                        case errCodes.DATABASE_FAILURE:
                            responseMsg = personaName+", I couldn't register you due to a database error. Please try again later.";
                            break;
                        case errCodes.USER_ALREADY_REGISTERED:
                            responseMsg = personaName+", you are already registered.";
                            break;
                        case errCodes.SUCCESS:
                            responseMsg = personaName+", you are now registered.";
                            break;
                    }
                    return callback (err, responseMsg);
                });
                break;
            case "!games":
                DbClient.GetCurrentGames(db, function (err, games) {
                    switch (err) {
                        case errCodes.DATABASE_FAILURE:
                            responseMsg = "I can't list the current games due to a database error. Please try again later.";
                            break;
                        case errCodes.NO_SEASONS_FOUND:
                            responseMsg = "No seasons were found. Please alert my creator or find an admin.";
                            break;
                        case errCodes.SUCCESS:
                            if (games.length == 0) {
                                err = errCodes.NO_CURRENT_GAMES;
                                responseMsg = sprintf("%s, there are currently no games waiting for players or in progress.", personaName);
                            } else {
                                // we have to clear our default
                                responseMsg = "";
                                for (var i = 0; i < games.length; i++) {
                                    var game = games[i];
                                    responseMsg += sprintf("Game #%04u | %17s | %2u players signed\n", game.gameNum, game.status, game.players.length);
                                }
                            }
                            break;
                    }
                    return callback(err, responseMsg);
                });
                break;
            case "!newgame":
                DbClient.NewGame(db, playerSteam64Id, function (err, currGame) {
                    switch (err) {
                        case errCodes.DATABASE_FAILURE:
                            responseMsg = personaName+", I cannot create a new game for you due to a database error. Please try again later.";
                            break;
                        case errCodes.NO_SEASONS_FOUND:
                            responseMsg = "No seasons were found. Please alert my creator or find an admin.";
                            break;
                        case errCodes.USER_NOT_REGISTERED:
                            responseMsg = personaName+", you must register before you attempt to create a game.";
                            break;
                        case errCodes.USER_ALREADY_SIGNED:
                            responseMsg = personaName+", you are already signed into game #" + currGame.gameNum;
                            break;
                        case errCodes.SUCCESS:
                            responseMsg = personaName+", I have created game #" + currGame.gameNum + " for you.";
                            break;
                    }
                    return callback(err, responseMsg);
                });
                break;
            case "!cancel":
                var targetGameNum = parseInt(param);
                if (targetGameNum >= 0) {
                    DbClient.CancelGame(db, playerSteam64Id, targetGameNum, false /* no sysOverride */, function (err) {
                        switch (err) {
                            case errCodes.DATABASE_FAILURE:
                                responseMsg = personaName+", I cannot cancel game #" + targetGameNum+ " for you due to a database error. Please try again later.";
                                break;
                            case errCodes.NO_SEASONS_FOUND:
                                responseMsg = "No seasons were found. Please alert my creator or find an admin.";
                                break;
                            case errCodes.USER_NOT_REGISTERED:
                                responseMsg = personaName+", you must register before you attempt to cancel a game.";
                                break;
                            case errCodes.UNAUTHORIZED:
                                responseMsg = personaName+", you must be the game creator or an admin to cancel a game.";
                                break;
                            case errCodes.SUCCESS:
                                responseMsg = personaName+", I have cancelled game #" + targetGameNum + " for you.";
                                break;
                        }
                        return callback(err, responseMsg);
                    });
                } else {
                    responseMsg = personaName+", please specify a game number to cancel.";
                    return callback(errCodes.SUCCESS, responseMsg);
                }
                break;
            case "!sign":
                var targetGameNum = parseInt(param);
                if (targetGameNum >= 0) {
                    DbClient.SignGame(db, playerSteam64Id, targetGameNum, function (err, updatedGame) {
                        switch (err) {
                            case errCodes.DATABASE_FAILURE:
                                responseMsg = sprintf("%s, I cannot sign you into game #%u due to a database error. Please try again later.", personaName, targetGameNum);
                                break;
                            case errCodes.NO_SEASONS_FOUND:
                                responseMsg = "No seasons were found. Please alert my creator or find an admin.";
                                break;
                            case errCodes.USER_NOT_REGISTERED:
                                responseMsg = personaName+", you must register before you attempt to sign into a game.";
                                break;
                            case errCodes.GAME_NOT_FOUND:
                                responseMsg = sprintf("%s, I could not find game #%u to sign you into.", personaName, targetGameNum);
                                break;
                            case errCodes.USER_ALREADY_SIGNED:
                                responseMsg = personaName + ", you are already signed into game #" + targetGameNum+".";
                                break;
                            case errCodes.SUCCESS:
                                var playersNeeded = 10 - updatedGame.players.length;
                                if (playersNeeded > 0) {
                                    responseMsg = sprintf("%s, you are now signed into game #%u. The game needs %u more players to start.", personaName, targetGameNum, playersNeeded);
                                } else {
                                    responseMsg = sprintf("%s, you are now signed into game #%u.", personaName, targetGameNum);
                                    responseMsg += sprintf("\nGame #%u can be started at any time by the game creator or an admin.", targetGameNum);
                                }
                                break;
                        }
                        return callback(err, responseMsg);
                    });
                } else {
                    responseMsg = personaName+", please specify a game number to sign to.";
                    return callback(errCodes.SUCCESS, responseMsg);
                }
                break;
            case "!unsign":
                var targetGameNum = parseInt(param);
                if (targetGameNum >= 0) {
                    DbClient.UnsignGame(db, playerSteam64Id, targetGameNum, function (err, game) {
                        switch (err) {
                            case errCodes.DATABASE_FAILURE:
                                responseMsg = sprintf("%s, I cannot unsign you from game #%u due to a database error. Please try again later.", personaName, targetGameNum);
                                break;
                            case errCodes.NO_SEASONS_FOUND:
                                responseMsg = "No seasons were found. Please alert my creator or find an admin.";
                                break;
                            case errCodes.USER_NOT_REGISTERED:
                                responseMsg = sprintf("%s, you must register before you attempt to unsign from a game.", personaName);
                                break;
                            case errCodes.GAME_NOT_FOUND:
                                responseMsg = sprintf("%s, I could not find game #%u to unsign you from.", personaName, targetGameNum);
                                break;
                            case errCodes.USER_NOT_SIGNED:
                                responseMsg = sprintf("%s, you are not signed into game #%u.0.", personaName, targetGameNum);
                                break;
                            case errCodes.SUCCESS:
                                break;
                        }
                    });
                }
                break;
            case "!start":
                var targetGameNum = parseInt(param);
                if (targetGameNum >= 0) {
                    DbClient.StartGame(db, playerSteam64Id, targetGameNum, function (err, startedGame) {
                        switch (err) {
                            case errCodes.DATABASE_FAILURE:
                                responseMsg = sprintf("%s, I cannot start game #%u for you due to a database error. Please try again later.", personaName, targetGameNum);
                                break;
                            case errCodes.NO_SEASONS_FOUND:
                                responseMsg = "No seasons were found. Please alert my creator or find an admin.";
                                break;
                            case errCodes.USER_NOT_REGISTERED:
                                responseMsg = personaName+", you must register before you attempt to start a game.";
                                break;
                            case errCodes.GAME_NOT_FOUND:
                                responseMsg = sprintf("%s, I could not find game #%u to start.", personaName, targetGameNum);
                                break;
                            case errCodes.GAME_NOT_READY:
                                responseMsg = sprintf("%s, I couldn't start your game because it still requires %u more players to sign.", personaName, 10 - (startedGame.players.length));
                                break;
                            case errCodes.UNKNOWN_FAILURE:
                                //responseMsg will be the default
                                break;
                            case errCodes.SUCCESS:
                                DbClient.ResolvePlayerNames(db, startedGame.players, function (err, teams) {
                                    if (err == errCodes.DATABASE_FAILURE) {
                                        responseMsg = sprintf("%s, I cannot start game #%u for you due to a database error. Please try again later.", personaName, targetGameNum);
                                        return callback(err, responseMsg);
                                    } else {
                                        responseMsg = sprintf("%s, your game #%u is now started. Please form a lobby and start playing.", personaName, targetGameNum);
                                        responseMsg += "\nRadiant: ";
                                        for (var j = 0; j < teams.Radiant.length; j++) {
                                            var p = teams.Radiant[j];
                                            responseMsg += p.username + "(" + p.rating + ")";
                                            if (j <= 4) {
                                                responseMsg += ", ";
                                            }
                                        }
                                        responseMsg += "\nDire: ";
                                        for (var j = 0; j < teams.Dire.length; j++) {
                                            var p = teams.Dire[j];
                                            responseMsg += p.username + "(" + p.rating + ")";
                                            if (j <= 4) {
                                                responseMsg += ", ";
                                            }
                                        }
                                    }
                                });
                                break;
                        }
                        return callback(err, responseMsg);
                    });
                } else {
                    responseMsg = personaName+", please specify a game number to start.";
                    return callback(errCodes.SUCCESS, responseMsg);
                }
                break;
            case "!reportwin":
                DbClient.ReportScore(db, playerSteam64Id, "win", null /* no override */, function (err, updatedGame) {
                    switch (err) {
                        case errCodes.DATABASE_FAILURE:
                            responseMsg = sprintf("%s, I could not report your score due to a database error.", personaName);
                            break;
                        case errCodes.NO_SEASONS_FOUND:
                            responseMsg = "No seasons were found. Please alert my creator or find an admin.";
                            break;
                        case errCodes.USER_NOT_REGISTERED:
                            responseMsg = sprintf("%s, you must register before you can report scores.", personaName);
                            break;
                        case errCodes.USER_NOT_SIGNED:
                            responseMsg = sprintf("%s, you must be playing in a game to report a score.", personaName);
                            break;
                        case errCodes.SUCCESS:
                            responseMsg = sprintf("%s, thanks for the score report.", personaName);
                            break;
                    }
                    return callback(err, responseMsg);
                });
                break;
            case "!reportloss":
                DbClient.ReportScore(db, playerSteam64Id, "loss", null /* no override */, function (err, updatedGame) {
                    switch (err) {
                        case errCodes.DATABASE_FAILURE:
                            responseMsg = sprintf("%s, I could not report your score due to a database error.", personaName);
                            break;
                        case errCodes.NO_SEASONS_FOUND:
                            responseMsg = "No seasons were found. Please alert my creator or find an admin.";
                            break;
                        case errCodes.USER_NOT_REGISTERED:
                            responseMsg = sprintf("%s, you must register before you can report scores.", personaName);
                            break;
                        case errCodes.USER_NOT_SIGNED:
                            responseMsg = sprintf("%s, you must be playing in a game to report a score.", personaName);
                            break;
                        case errCodes.SUCCESS:
                            responseMsg = sprintf("%s, thanks for the score report.", personaName);
                            break;
                    }
                    return callback(err, responseMsg);
                });
                break;
            case "!stats":
                responseMsg = sprintf("%s, I apologize but this function has not been implemented yet.");
                return callback(errCodes.SUCCESS, responseMsg);
                break;
            case "!help":
                responseMsg = defaultHelpMsg;
                return callback(errCodes.SUCCESS, responseMsg);
                break;
            case "!newseason":
                DbClient.NewSeason(db, playerSteam64Id, param, function (err, newSeason) {
                    switch (err) {
                        case errCodes.DATABASE_FAILURE:
                            responseMsg = sprintf("%s, I could not create a new season due to a database error.", personaName);
                            break;
                        case errCodes.USER_NOT_REGISTERED:
                            responseMsg = sprintf("%s, you must register before you can create a new season.", personaName);
                            break;
                        case errCodes.UNAUTHORIZED:
                            responseMsg = sprintf("%s, you must be an admin to create a new season.", personaName);
                            break;
                        case errCodes.SUCCESS:
                            responseMsg = sprintf("%s, I have created a new season #%u for us.", personaName, newSeason.seasonNum);
                            break;
                    }
                    return callback(err, responseMsg);
                });
                break;
            case "!leaderboard":
            case "!leaderboards":
                responseMsg = sprintf("%s, I apologize but this function has not been implemented yet.");
                return callback(errCodes.SUCCESS, responseMsg);
                break;
        }
    }
}