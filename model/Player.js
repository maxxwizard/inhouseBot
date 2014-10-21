/**
 * Created by Matthew on 10/21/2014.
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
module.exports = Player;