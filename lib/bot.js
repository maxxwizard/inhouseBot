/*
 * Author: matthewhuynh88@gmail.com
 * Description: contains logic for the bot like connecting to steam, launching dota2, listening for requests, etc.
 */

exports.start = start;

// start the bot
function start() {
    //var fs = require('fs');
    var Steam = require('steam');
    var serversFile = 'servers';
    var config = require("./config");
    var DataAccess = require('./dataAccess');
    var trace = require('./trace');
    var DbClient = new DataAccess.DbClient();
    var botTest = require("./botTest");
    var dota2 = require('dota2');
    var handlers = require('./handlers.js');

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
    }

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
        });
    
    });

    // chatroom and private messaging event handler
    steamClient.on('message', function (source, message, type, chatter) {
        handlers.onPrivateMessage(source, message, type, chatter, function (err, responseMsg) {
            steamClient.sendMessage(source, responseMsg, Steam.EChatEntryType.ChatMsg);
        });
    });

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