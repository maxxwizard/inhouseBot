/*
 * Author: matthewhuynh88@gmail.com
 * Description: initializes the inhouse bot.
 */

// High priority
// TODO: implement !reportWin/!reportLoss in dataAccess
// TODO: implement Client API (message event handler)
// TODO: implement registration check prior to every database API call
// TODO: have bot join MS Guild chat

// Normal priority
// TODO: migrate workload to Azure
// TODO: change backing store to Azure MongoDB

// Low priority
// TODO: investigate whether bot can auto-host lobbies
// TODO: code analysis over entire project to clean up warnings
// TODO: add JSDoc comments to every method

var bot = require('./lib/bot');
bot.start();