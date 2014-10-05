/*
 * Author: matthewhuynh88@gmail.com
 * Description: initializes the inhouse bot.
 */

// High priority
// TODO: change players array inside a game object to format {id: playerObjId, team: 'Radiant'}
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
// TODO: after registration check, update the player's username if it has changed
// TODO: display MMR difference between 2 teams

var bot = require('./lib/bot');
bot.start();