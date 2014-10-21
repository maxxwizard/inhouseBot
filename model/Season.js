/**
 * Created by Matthew on 10/21/2014.
 */

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId;

// Season: {_id: ObjectId("guid"), number: 1, startDate: Date(2014, 9, 1), endDate: Date(2014, 12, 31), name: 'Season 1'}
var seasonSchema = new Schema({
    number : {type: Number, min: 0, required: true},
    startDate: {type: Date, required: true},
    endDate: {type: Date},
    name: {type: String}
});
var Season = mongoose.model('Season', seasonSchema);
module.exports = Season;