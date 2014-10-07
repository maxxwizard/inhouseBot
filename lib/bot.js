/*
 * Author: matthewhuynh88@gmail.com
 * Description: contains logic for the bot like connecting to steam, launching dota2, listening for requests, etc.
 */

exports.start = start;

// start the bot
function start() {
    //var fs = require('fs');
    var assert = require("assert");
    var util = require("util");
    var Steam = require('steam');
    var serversFile = 'servers';
    var config = require("./config");
    var DataAccess = require('./dataAccess');
    var trace = require('./trace');
    var DbClient = new DataAccess.DbClient();
    var botTest = require("./botTest");
    var dota2 = require('dota2');
    var handlers = require('./handlers.js');
    var errCodes = require('./errorCodes');
    var reporter = require('nodeunit').reporters.default;
    var nodeunit = require('nodeunit');

    // initialize bot
    var steamClient = new Steam.SteamClient();
    var Dota2 = new dota2.Dota2Client(steamClient, config.debug);

    // create our credentials package
    var logOnDetails = {
        "accountName": config.steam.username,
        "password": config.steam.password
    };

    // configure out error and debug event handlers
    steamClient.on('error', function (e) {
        trace.error(e.cause + ' : ' + e.eresult);
    });
    steamClient.on('debug', function (msg) {
        trace.debug(msg);
    });
    
    // log on unless we've set the debug variable
    if (!config.botOffline) {
        trace.log('bot logging onto Steam');
        steamClient.logOn(logOnDetails);
    }
    
    // run all our tests if requested
    if (config.runTests) {
        botTest.TestAllFunctionality(DbClient);

        //var testMsgHandler = require('../test/test-msgHandler.js');
        //nodeunit.run({'Message Handling Suite': testMsgHandler});
        //reporter.run(['test']);

    } else {
        // otherwise we're in production mode

        // connect to database before connecting to Steam
        DbClient.Connect(function (err, db) {
            assert.equal(null, err, "database connection failed");

            steamClient.on("loggedOn", function () {
                trace.log('Logged in! Our SteamID is: ' + steamClient.steamID);
                steamClient.setPersonaState(Steam.EPersonaState.Online); // to display bot's status as "Online"
                steamClient.setPersonaName(config.steam.botName); // to change its nickname

                // launch dota2
                Dota2.launch();

                Dota2.on("ready", function() {
                    /* Note:  Should not declare new event listeners nested inside of
                     'ready', else you could end up with duplicated handlers if 'ready'
                     is fired multiple times.  Exception is made within this test file
                     for the same of keeping relevant samples together. */

                    trace.log("Node-dota2 ready.");

                    // chill and wait for requests
                    trace.log("bot waiting for requests");

                    /* GUILD */
                    Dota2.requestGuildData();
                    Dota2.on("guildOpenPartyData", function(guildId, openParties){
                        trace.debug(JSON.stringify(guildId));
                        trace.debug(JSON.stringify(openParties));

                        // Doing chat stuffs.
                        var guildChannelName = util.format("Guild_%s", guildId);
                        Dota2.joinChat(guildChannelName, dota2.DOTAChatChannelType_t.DOTAChannelType_Guild);
                        trace.debug("joined guild chat channel " + guildChannelName);

                        // setTimeout(function(){ Dota2.sendMessage(guildChannelName, "hello world!"); }, 5000);
                        // setTimeout(function(){ Dota2.leaveChat(guildChannelName); }, 10000);
                    });
                });

                Dota2.on("unready", function onUnready(){
                    console.log("Node-dota2 unready.");
                });

                // dota 2 chat message event handler
                Dota2.on("chatMessage", function(channel, personaName, message, chatData) {
                    // chatData: chatData = {"accountId":8571764,"channelId":"431772","personaName":"maxxwizard","text":"boop"}

                    // respond to all guild messages by default
                    var respond = true;
                    if (config.debug) {
                        // respond only to debugGuild messages if debug flag is set
                        if (channel == config.steam.productionGuild) {
                            respond = false;
                        }
                    }
                    if (respond) {
                        var steam64id = Dota2.ToSteamID(chatData.accountId);
                        handlers.onGuildMessage(DbClient, db, channel, steam64id, personaName, message, function (err, responseMsg) {

                            var messagesToSend = responseMsg.split("\n");
                            for (var j = 0; j < messagesToSend.length; j++) {
                                if (messagesToSend[j].length > 0) {
                                    Dota2.sendMessage(channel, messagesToSend[j]);
                                }
                            }
                        });
                    }
                });

                Dota2.on("guildInvite", function(guildId, guildName, inviter) {
                    // Dota2.setGuildAccountRole(guildId, 75028261, 3);
                });

                Dota2.on("unhandled", function(kMsg) {
                    util.log("UNHANDLED MESSAGE " + kMsg);
                });

            });

            // chatroom and private messaging event handler
            steamClient.on('friendMsg', function (source, message, type, chatter) {

                // find user's personaName for later use
                var user = steamClient.users[source];
                var personaName = user.playerName;

                handlers.onPrivateMessage(DbClient, db, source, personaName, message, function (err, responseMsg) {

                    var messagesToSend = responseMsg.split("\n");
                    for (var j = 0; j < messagesToSend.length; j++) {
                        if (messagesToSend[j].length > 0) {
                            steamClient.sendMessage(source, messagesToSend[j], Steam.EChatEntryType.ChatMsg);
                        }
                    }

                });
            });
        });
    }

    /* Functionality we don't need right now commented out

     // listen for friend requests
     steamClient.on('friend', function (id, relationship) {
     if (relationship == Steam.EFriendRelationship.RequestRecipient) {
     trace.log('got a friend request from ' + id);
     }
     });

     // listen for relationships?
     steamClient.on('relationships', function (id) {
     trace.log('received a relationship update');
     });

    steamClient.on('chatInvite', function (chatRoomID, chatRoomName, patronID) {
        trace.log('Got an invite to ' + chatRoomName + ' from ' + steamClient.users[patronID].playerName);
        //steamClient.joinChat(chatRoomID); // autojoin on invite
    });

    steamClient.on('chatStateChange', function (stateChange, chatterActedOn, steamIdChat, chatterActedBy) {
        if (stateChange == Steam.EChatMemberStateChange.Kicked && chatterActedOn == bot.steamID) {
            steamClient.joinChat(steamIdChat);  // autorejoin!
        }
    });

    steamClient.on('announcement', function (group, headline) {
        trace.log('Group with SteamID ' + group + ' has posted ' + headline);
    });
    */
}