﻿/*
 * Author: matthewhuynh88@gmail.com
 * Description: has knowledge about the database layout and how to work with objects inside it
 */ 

/*
 * Database layout
 * 
 * scores: { _id : ObjectId("guid"), gameId: ObjectId("guid"), playerId: ObjectId("guid"), winner: 'Radiant' }
 * constraints: - winner must be string 'Radiant' or 'Dire'
 *  
 * games: { _id : ObjectId("guid"), seasonId : ObjectId("guid"), winner : 'Dire', gameNum: 26, status : 'InProgress',
 *         players: [ObjectId("guid"), ObjectId("guid")], scores: [] }
 * constraints: - there cannot be more than 10 items in players array
 *              - winner must be string 'Radiant' or 'Dire'
 *              - status must be 'WaitingForPlayers' or 'InProgress' or 'Completed' or 'Cancelled'
 *              - scores is an array of key-value pairs <playerObjectId : winner>
 * 
 * seasons: {_id : ObjectId("guid"), seasonNum: 1, startDate: Date(2014, 9, 1), endDate: Date(2014, 12, 31), name: 'Season 1'}
 * constraints: - seasonNum will be 0 if it is a special event
 * 
 * players: {_id: ObjectId("guid"), username: 'maxxwizard', rating: 1500, steam64Id: '76561197968837492'}
 * 
 */

var format = require('util').format;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var config = require('./config.js');

// exporting DbClient as a class. initialize like this:
// var dbClient = new DataAccess.DbClient();
module.exports.DbClient = DbClient = function () {
    this.MongoClient = require('mongodb').MongoClient;
    this.host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : config.mongo.host;
    this.port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : config.mongo.port;
    this.dbName = config.mongo.dbName;
}

DbClient.prototype.CloseConnection = function () { }

DbClient.prototype.GetCurrentGames = function () { }

/*
* Returns the ObjectId of the player based on their Steam64Id. Returns null if error (e.g. not found).
*/ 
DbClient.prototype.GetPlayerObjectIdFromSteam64Id = function (playerSteam64Id) {
    this.MongoClient.connect(format("mongodb://%s:%s/%s", this.host, this.port, this.dbName), function (err, db) {
        if (!err) {
            console.log("finding dbGuid for player " + playerSteam64Id);
            db.collection("players").findOne({ steam64Id: playerSteam64Id }, { _id: 1 }, function (err, doc) {
                if (!err) {
                    var playerObjectId = doc._id;
                    console.log("returning " + playerObjectId);
                    return playerObjectId;
                } else {
                    console.warn("couldn't find player " + playerSteam64Id);
                    return null;
                }
            });
        } else {
            console.warn("couldn't connect to database " + this.host + ":" + this.port);
            return null;
        }
    });
}

/*
 * Description: Creates a new game in the current/latest season
 * Notes: we first resolve the playerSteam64Id to an ObjectId, latest gameNum, latest season, and then create the new game
 */
DbClient.prototype.NewGame = function (playerSteam64Id) {
    this.MongoClient.connect(format("mongodb://%s:%s/%s", this.host, this.port, this.dbName), function (err, db) {
        if (err) {
            console.warn("couldn't connect to database " + this.host + ":" + this.port);
            return;
        } else {
            console.log("finding ObjectId for player " + playerSteam64Id);
            db.collection("players").findOne({ steam64Id: playerSteam64Id }, { _id: 1 }, function (err, doc) {
                if (err || doc == null) {
                    console.warn("couldn't find player " + playerSteam64Id);
                } else {
                    var playerObjectId = doc;
                    console.log("found ObjectId " + playerObjectId._id + " for playerSteam64Id " + playerSteam64Id);
                    console.log("finding latest season by ObjectId");
                    db.collection("seasons").find({}).sort({ _id: -1 }).limit(1).toArray(function (err, docs) {
                        if (err || docs.length == 0) {
                            console.warn("could not find latest season!");
                        } else {
                            var latestSeasonObject = docs[0];
                            console.log("found ObjectId " + latestSeasonObject._id + " as the latest season");
                            console.log("finding latest gameNum");
                            db.collection("games").find({}).sort({ gameNum: -1 }).limit(1).toArray(function (err, docs) {
                                if (err || docs.length == 0) {
                                    console.warn("couldn't find latest gameNum");
                                } else {
                                    var latestGameObject = docs[0];
                                    console.log("found latest gameNum: " + latestGameObject.gameNum);
                                    console.log("inserting new game");
                                    var newGameNum = latestGameObject.gameNum + 1;
                                    db.collection("games").insert({ seasonId : latestSeasonObject._id, gameNum: newGameNum, status : 'WaitingForPlayers', players: [playerObjectId._id] }, { w: 1 }, function (err, docs) {
                                        if (err) {
                                            console.warn("creation of new game failed");
                                        } else {
                                            console.log("new game #" + newGameNum + " created with ObjectId " + docs[0]._id);
                                        }
                                    }); // end game insert call
                                }
                            }); // end latest gameNum find call
                        }
                    }); // end latest season find call
                }
            }); // end playerObjectId find call
        }
    }); // end database connect call
} // end DbClient class