// start our server
// "C:\Program Files\MongoDB 2.6 Standard\bin\mongod.exe"-- dbpath C:\sources\InhouseBot\InhouseBot\db

// interactive client
// mongo.exe inhouseBot

// seed our database with test values
var randPlayerId = ObjectId();
var randPlayerId2 = ObjectId();
db.players.insert({ _id: randPlayerId, username: 'maxxwizard', rating: 1500, steam64Id: '76561197968837492' });
db.players.insert({ _id: randPlayerId2, username: 'saltydog', rating: 1500, steam64Id: '76561198029982751' });

var randSeasonId = ObjectId();
db.seasons.insert({ _id: randSeasonId, seasonNum: 1, startDate: Date(2014, 9, 1), endDate: Date(2014, 12, 31), name: 'Season 1' });

var randGameId = ObjectId();
db.games.insert({ _id: randGameId, seasonId : randSeasonId, winner : '', gameNum: 1, status : 'WaitingForPlayers', players: [randPlayerId, randPlayerId2] });

// display database
db.players.find();
db.seasons.find();
db.games.find();

// clear the database
db.games.remove({});
db.seasons.remove({});
db.players.remove({});