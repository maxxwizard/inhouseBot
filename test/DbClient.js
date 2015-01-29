/**
 * Created by Matthew on 10/26/2014.
 */

// initialize stuff
var DataAccess = require('../lib/dataAccessMongoose');
var DbClient = new DataAccess.DbClient();

var errCodes = require('../lib/errorCodes');
var util = require("util");
var should = require("should");
var ranking = require("../lib/ranking");

// import database schema
var Player = require("../model/Player");
var Season = require("../model/Season");
var Game = require("../model/Game");

// set up our test factories
var mongoose = require("mongoose");
var Monky = require('monky'),
    monky = new Monky(mongoose);
monky.factory('Player', {username: 'name#n', steam64Id: '#n', 'admin': false});
var today = new Date();
monky.factory('Season', {number: '#n', name: 'Season #n', startDate: today.toDateString()});

describe("DbClient", function () {

    before('connect to database', function(done) {
        DbClient.Connect(function () {
            done();
        });
    });

    /*
    after('drop database', function(done) {
        Player.remove({}, function (err) {
            should.equal(err, null);
            Season.remove({}, function (err) {
                should.equal(err, null);
                Game.remove({}, function (err) {
                    should.equal(err, null);
                    done();
                });
            });
        });
    });
    */

    describe("#Register()", function () {
        beforeEach('clear Players table', function(done) {
            Player.remove({}, function (err) {
                should.equal(err, null);
                done();
            });
        });

        after('clear Players table', function (done) {
            Player.remove({}, function (err) {
                should.equal(err, null);
                done();
            });
        });

        it("should register a new regular player with default rating", function (done) {
            monky.build('Player', function (err, player) {
                DbClient.Register(player.steam64Id, player.username, null /* no override */, player.admin, function (err, savedPlayer) {
                    err.should.equal(errCodes.SUCCESS);
                    savedPlayer.steam64Id.should.equal(player.steam64Id);
                    savedPlayer.username.should.equal(player.username);
                    savedPlayer.rating.should.equal(ranking.InitialRating);
                    savedPlayer.admin.should.equal(player.admin);
                    done();
                });
            });
        });

        it("should register a new admin player with default rating", function (done) {
            monky.build('Player', {admin: true}, function (err, player) {
                DbClient.Register(player.steam64Id, player.username, null /* no override */, player.admin, function (err, savedPlayer) {
                    err.should.equal(errCodes.SUCCESS);
                    savedPlayer.steam64Id.should.equal(player.steam64Id);
                    savedPlayer.username.should.equal(player.username);
                    savedPlayer.rating.should.equal(ranking.InitialRating);
                    savedPlayer.admin.should.equal(player.admin);
                    done();
                });
            });
        });

        // TODO: write tests to check InitialRating override

        it("should not allow duplicate registration", function (done) {
            monky.build('Player', function (err, player) {
                DbClient.Register(player.steam64Id, player.username, null /* no override */, player.admin, function (err, savedPlayer) {
                    err.should.equal(errCodes.SUCCESS);
                    DbClient.Register(player.steam64Id, player.username, null /* no override */, player.admin, function (err, savedPlayer) {
                        err.should.equal(errCodes.USER_ALREADY_REGISTERED);
                        done();
                    });
                });
            });
        });
    });

    describe('#NewSeason()', function () {
        beforeEach('drop the Seasons and Players tables', function (done) {
            Season.remove({}, function (err) {
                should.equal(err, null);
                Player.remove({}, function (err) {
                    should.equal(err, null);
                    done();
                });
            });
        });

        it("should not allow an unregistered player to create a season", function (done) {
            monky.build('Season', function (err, season) {
                DbClient.NewSeason('invalid', season.name, function (err, savedSeason) {
                    err.should.equal(errCodes.USER_NOT_REGISTERED);
                    done();
                });
            });
        });

        it("should not allow a non-admin to create a season", function (done) {
            monky.create('Player', function (err, player) {
                monky.build('Season', function (err, season) {
                    DbClient.NewSeason(player.steam64Id, season.name, function (err, savedSeason) {
                        err.should.equal(errCodes.UNAUTHORIZED);
                        done();
                    });
                });
            });
        });

        it("should allow an admin to create the first season", function (done) {
            monky.create('Player', {admin: true}, function (err, player) {
                monky.build('Season', function (err, season) {
                    DbClient.NewSeason(player.steam64Id, season.name, function (err, savedSeason) {
                        err.should.equal(errCodes.SUCCESS);
                        savedSeason.name.should.equal(season.name);
                        savedSeason.number.should.equal(1);
                        done();
                    });
                });
            });
        });

        it("should allow an admin to create the second season", function (done) {
            monky.create('Player', {admin: true}, function (err, player) {
                monky.create('Season', function (err, season1) {
                    monky.build('Season', function (err, season2) {
                        DbClient.NewSeason(player.steam64Id, season2.name, function (err, savedSeason) {
                            err.should.equal(errCodes.SUCCESS);
                            savedSeason.name.should.equal(season2.name);
                            savedSeason.number.should.equal(season1.number + 1);
                            done();
                        });
                    });
                });
            });
        });
    });

    describe('#NewGame()', function () {
        beforeEach('drop the Seasons, Players, Games tables', function (done) {
            Season.remove({}, function (err) {
                should.equal(err, null);
                Game.remove({}, function (err) {
                    should.equal(err, null);
                    Player.remove({}, function (err) {
                        should.equal(err, null);
                        done();
                    });
                });
            });
        });

        it("should not allow an unregistered player to create a game", function (done) {
            monky.build('Game', function (err, game) {
                DbClient.NewGame('invalid', function (err, savedSeason) {
                    err.should.equal(errCodes.USER_NOT_REGISTERED);
                    done();
                });
            });
        });

        it("should allow a registered player to create a game", function (done) {
            monky.create('Player', {admin: false}, function (err, player) {
                monky.create('Season', function (err, season) {
                    monky.build('Game', function (err, game) {
                        DbClient.NewGame(player.steam64Id, function (err, savedGame) {
                            err.should.equal(errCodes.SUCCESS);
                            savedGame.gameNum.should.equal(1);
                            done();
                        });
                    });
                });
            });
        });
    });
});