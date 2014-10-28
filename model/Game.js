/**
 * Created by Matthew on 10/21/2014.
 */

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId;

/*
 // Score: {_id: ObjectId("guid"), playerId: ObjectId("guid"), winner: 'Radiant'}
 var scoreSchema = new Schema({
 playerId: {type: ObjectId, required: true},
 winner: {type: String, required: true, enum: scoreTeams}
 });
 var Score = mongoose.model('Score', scoreSchema);
 */

// Game: { _id: ObjectId("guid"), seasonId: ObjectId("guid"), winner : 'Dire', gameNum: 26, status : 'Completed',
// players: [playerId: {ObjectId("guid"), team: 'Radiant'}], scores: [{playerId: ObjectId("guid"), winner: 'Radiant'}],
// gameCreatorId: ObjectId("guid") }

var teams = require("../lib/playerTeam");
var playerTeams = [teams.RADIANT, teams.DIRE, teams.TO_BE_DECIDED];
var scoreTeams = [teams.RADIANT, teams.DIRE];

var status = require("../lib/gameStatus");
var gameStatuses = [status.WAITING_FOR_PLAYERS,
    status.IN_PROGRESS,
    status.CANCELLED,
    status.COMPLETED];

var gameSchema = new Schema({
    season: {type: ObjectId, required: true, ref: 'Season'},
    winner: {type: String, enum: scoreTeams},
    gameCreator: {type: ObjectId, required: true, ref: 'Player'},
    number: {type: Number, min: 1, required: true},
    status: {type: String, required: true, enum: gameStatuses},
    players: {type: [{
        player: {type: ObjectId, required: true, ref: 'Player'},
        team: {type: playerTeams, required: true}}], required: true},
    scores: {type: [{
        player: {type: ObjectId, required: true, ref: 'Player'},
        winner: {type: scoreTeams, required: true}
    }]}
});
// when we want to populate info, exec something like:
// Game.findOne({}).populate('players.player','username rating')
// should get the usernames and ratings for the players in a game

var Game = mongoose.model('Game', gameSchema);

Game.schema.path('players').validate(function (value) {
    return (value.length > 10);
}, 'There cannot be more than 10 players in a game');

module.exports = Game;