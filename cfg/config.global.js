var config = {}

config.creator = {};
config.creator.name = "Matthew Huynh";
config.creator.email = "matthewhuynh88@gmail.com";

config.mongo = {};
config.mongo.host = 'localhost';
config.mongo.port = 27017;
config.mongo.username = '';
config.mongo.pass = '';
config.mongo.dbName = 'inhouseBot';

config.steam = {};
config.steam.username = 'msftinhouse';
config.steam.password = 'p9Y7s59fjb9V';
config.steam.botName = "InhouseBot";
// list of steam64Ids of admins
config.steam.admins = ["76561197968837492", "76561198029982751"];
config.steam.productionGuild = "Guild_10341";
config.steam.debugGuild = "Guild_266326";

config.botOffline = true;
config.debug = true;
config.runTests = true;

module.exports = config;