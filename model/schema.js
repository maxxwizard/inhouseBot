/**
 * Created by mahuynh on 10/10/2014.
 */

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    ranking = require('../lib/ranking');

// Player: {_id: ObjectId("guid"), username: 'maxxwizard', rating: 1500, steam64Id: '76561197968837492', admin: 1}
var playerSchema = new Schema({
    username: {type: String, required: true, trim: true},
    rating: {type: Number, required: true, default: ranking.InitialRating, min: 0, max: 100000},
    steam64Id: {type: String, required: true, trim: true},
    admin: {type: Boolean}
});
var Player = mongoose.model('Player', playerSchema);

// Season: {_id: ObjectId("guid"), number: 1, startDate: Date(2014, 9, 1), endDate: Date(2014, 12, 31), name: 'Season 1'}
var seasonSchema = new Schema({
    number : {type: Number, min: 0, required: true},
    startDate: {type: Date, required: true},
    endDate: {type: Date},
    name: {type: String}
});
var Season = mongoose.model('Season', seasonSchema);

var scoreTeams = ["Radiant", "Dire"];
var playerTeams = ["Radiant", "Dire", "ToBeDecided"];

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

var gameStatuses = ["WaitingForPlayers", "InProgress", "Cancelled", "Completed"];

var gameSchema = new Schema({
    season: {type: ObjectId, required: true, ref: 'Season'},
    winner: {type: String, enum: scoreTeams},
    gameCreator: {type: ObjectId, required: true, ref: 'Player'},
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