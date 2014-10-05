/*
 * Author: matthewhuynh88@gmail.com
 * Description: initializes the inhouse bot.
 */

// High priority
// TODO: have bot join MS Guild chat
// TODO: implement Client API (message event handler)
// TODO: implement registration check prior to every database API call


// Normal priority
// TODO: migrate workload to Azure
// TODO: change backing store to Azure MongoDB

// Low priority
// TODO: investigate whether bot can auto-host lobbies
// TODO: code analysis over entire project to clean up warnings
// TODO: add JSDoc comments to every method
// TODO: after registration check, update the player's username if it has changed
// TODO: display MMR difference between 2 teams
// TODO: add more test code for DbClient.NewSeason
// TODO: if friend request from a guild member, auto-add the user
// TODO: !games should display 'Cancelled' games in last 15 minutes

var bot = require('./lib/bot');
bot.start();