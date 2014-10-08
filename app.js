/*
 * Author: matthewhuynh88@gmail.com
 * Description: initializes the inhouse bot.
 */

// High priority
// TODO: implement !unsign in msg handler
// TODO: Use mongoose for DB modeling
// TODO: Use Mocha + should + monky to implement tests
// TODO: implement registration check prior to every database API call
// TODO: change the DbClient class to use a singleton MongoDb object instead of passing db to every method call

// Normal priority
// TODO: migrate workload to Azure
// TODO: change backing store to Azure MongoDB

// Low priority
// TODO: investigate whether bot can auto-host lobbies
// TODO: code analysis over entire project to clean up warnings
// TODO: add JSDoc comments to every method
// TODO: after registration check, update the player's username if it has changed
// TODO: display MMR difference between 2 teams
// TODO: if friend request from a guild member, auto-add the user
// TODO: !games should display 'Cancelled' or 'Completed' games in last 15 minutes
// TODO: !sign should sign you into the sole game if there is only one
// TODO: !cancel and !start should start your game if you are the creator
// TODO: make !newSeason support names with spaces
// TODO: bug - messageHandler for !games when no seasons exist gives unknown error

var bot = require('./lib/bot');
bot.start();