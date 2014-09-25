/*
 * Author: matthewhuynh88@gmail.com
 * Description: contains logic for the bot like joining chat channel, listening for requests,
 *              tracking games, etc.
 */ 

/*
 * Client API
 * !register - initializes the player in the database
 * !stats <username> - displays win/loss count, winrate and rating for yourself if no username, otherwise displays stats for username
 * !sign <gameNum> - either adds/removes you from a specific game
 * !newGame - starts a new game and outputs the new game number
 * !games - displays 'WaitingForPlayers' and 'InProgress' games as well as games 'Cancelled' in last 15 minutes
 * !reportWin / !reportLoss - determines what game you're in and creates a Score record - if this if the 5th
 *                            Score game for the game, transitions game to 'Completed' and does appropriate housekeeping
 * !seasons - displays how many inhouse seasons there have been and the past 3's winners
 * !leaderboard - displays top 10 rated players and their ratings
 * !cancel <gameNum> - only admin (friend) or game owner can call this
 * !name <new name> - updates your username stored inside the database
 * 
 * Admin API
 * !newSeason <name>
 */

exports.start = start

// start the bot
function start() {
    var fs = require('fs');
    var Steam = require('steam');
    var serversFile = 'servers';
    var config = require("./config");
    var DataAccess = require('./dataAccess');
    var trace = require('./trace');
    var DbClient = new DataAccess.DbClient();
    var botTest = require("./botTest");
    
    // if we've saved a server list, use it
    if (fs.existsSync(serversFile)) {
        Steam.servers = JSON.parse(fs.readFileSync(serversFile));
    }
    
    // initialize bot
    var bot = new Steam.SteamClient();
    
    bot.on('error', function (e) {
        trace.error(e.cause + ' : ' + e.eresult);
    });
    
    // log on unless we've set the debug variable
    if (!config.botOffline) {
        trace.log('bot logging on Steam');
        bot.logOn({
            accountName: config.steam.username,
            password: config.steam.password
        });
    }
    
    // if we're in debug mode, run all our tests
    if (config.debug) {
        botTest.TestAllFunctionality(DbClient);
    }
    
    // listen for friend requests
    bot.on('friend', function (id, relationship) {
        if (relationship == Steam.EFriendRelationship.RequestRecipient) {
            trace.log('got a friend request from ' + id);
        }
    });
    
    // listen for relationships?
    bot.on('relationships', function () {
        trace.log('received a relationship update');
    });
    
    // Store sentry response
    //bot.on('sentry', function (buffer) {
    //    trace.debug('storing Steam Guard sentry hash: ' + buffer);
    //    fs.writeFile(sentryFile, buffer);
    //});
    
    bot.on('loggedOn', function () {
        trace.log('Logged in! Our SteamID is: ' + bot.steamID);
        bot.setPersonaState(Steam.EPersonaState.Online); // to display your bot's status as "Online"
        bot.setPersonaName('InhouseBot'); // to change its nickname
        
        // chill and wait for requests
        bot.joinChat('1035827914360004227'); // http://steamcommunity.com/groups/msft1 [this is currently owned by Nate Watley]
        trace.log("joined default MSFT Steam group");


        // attemping to look for 'maxxwizard'
        //DataAccess.GetPlayerDbGuidFromSteam64Id(

    //trace.debug('adding maxxwizard as friend');
    //bot.addFriend('76561197968837492');
    
    //trace.debug('adding saltydog as friend');
    //bot.addFriend('76561198029982751');
    
    });
    
    bot.on('servers', function (servers) {
        fs.writeFile('servers', JSON.stringify(servers));
    });
    
    bot.on('chatInvite', function (chatRoomID, chatRoomName, patronID) {
        trace.log('Got an invite to ' + chatRoomName + ' from ' + bot.users[patronID].playerName);
        //bot.joinChat(chatRoomID); // autojoin on invite
    });
    
    bot.on('message', function (source, message, type, chatter) { // source contains steam64id
        // respond to both chat room and private messages
        trace.debug('Received message (' + message.length + '): ' + message);
        if (message.length >= 4) {
            switch (message) {
                case 'zhen':
                    bot.sendMessage(source, 'MMR too low. GG n00b.', Steam.EChatEntryType.ChatMsg); // ChatMsg by default
                    break;
                case 'ping':
                    bot.sendMessage(source, 'pong', Steam.EChatEntryType.ChatMsg); // ChatMsg by default
                    break;
                case '!games':
                    bot.sendMessage(source, 'here is the list of games: <to be implemented>', Steam.EChatEntryType.ChatMsg); // ChatMsg by default
                    break;
                case '!sign':
                    bot.sendMessage(source, 'what game are you trying to sign into? use !sign <gameID>', Steam.EChatEntryType.ChatMsg); // ChatMsg by default
                    break;
                case '!stats':
                    bot.sendMessage(source, 'here are your stats: <to be implemented>', Steam.EChatEntryType.ChatMsg); // ChatMsg by default
                    break;
                case '!leaderboard':
                    bot.sendMessage(source, 'top 10 players right now: <to be implemented>', Steam.EChatEntryType.ChatMsg); // ChatMsg by default
                    break;
                default:
                    //if (message.contains('!sign')) {
                    //    bot.sendMessage(source, "you're signed into game #<to be implemented>!", Steam.EChatEntryType.ChatMsg); // ChatMsg by default
                    //} else {
                    bot.sendMessage(source, "here is the list of available commands: !games , !sign <gameID> , !stats , !leaderboard", Steam.EChatEntryType.ChatMsg); // ChatMsg by default
            //}
            }
        }
    });
    
    bot.on('chatStateChange', function (stateChange, chatterActedOn, steamIdChat, chatterActedBy) {
        if (stateChange == Steam.EChatMemberStateChange.Kicked && chatterActedOn == bot.steamID) {
            bot.joinChat(steamIdChat);  // autorejoin!
        }
    });
    
    bot.on('announcement', function (group, headline) {
        trace.log('Group with SteamID ' + group + ' has posted ' + headline);
    });
}