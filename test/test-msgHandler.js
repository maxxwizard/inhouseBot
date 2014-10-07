/*
 * Author: matthewhuynh88@gmail.com
 * Description: simulates load by pushing synthetic transactions through the system and verifying output is expected
 */

var nodeunit = require('nodeunit'),
    dataAccess = require('../lib/dataAccess.js'),
    errCodes = require('../lib/errorCodes.js'),
    handlers = require('../lib/handlers.js');

/* the general idea is:
 * - run through every client call possible for 0 seasons
 * - run through every client call possible for 1 season
 */

exports.testResolvePlayerNames = function (test) {

};

exports.testZeroSeasons = function (test) {
    var dbClient = new dataAccess.DbClient();
    var test1_steam64id = "76561197968837492";
    var test1_username = "maxxwizard";

    dbClient.Connect(function (err, db) {
        assert.equal(err, null, "database connection failed");
        db.dropDatabase(function (err, result) {
            handlers.universalMessageHandler(dbClient, db, test1_steam64id, test1_username, "!register", function (err, responseMsg) {
                test.expect(2);
                test.equal(err, errCodes.NO_SEASONS_FOUND);
                test.notEqual(responseMsg, null);
                test.done();
            });
        });
    });

    /*
        handlers.universalMessageHandler(DbClient, db, "76561197968837492", "maxxwizard", "!register", function (err, responseMsg) {
            assert.equal(err, errCodes.USER_ALREADY_REGISTERED, "user already registered scenario : " + err + " : " + responseMsg);
            handlers.universalMessageHandler(DbClient, db, "76561197968837492", "maxxwizard", "!games", function (err, responseMsg) {
                assert.equal(err, errCodes.NO_SEASONS_FOUND, "0 game scenario : " + err + " : " + responseMsg);
                handlers.universalMessageHandler(DbClient, db, "76561197968837492", "maxxwizard", "!newSeason 'Season 1'", function (err, responseMsg) {
                    assert.equal(err, errCodes.USER_NOT_REGISTERED, "unregistered user !newGame scenario : " + err + " : " + responseMsg);
                    handlers.universalMessageHandler(DbClient, db, "76561197968837492", "maxxwizard", "!reportWin", function (err, responseMsg) {
                        assert.equal(err, errCodes.USER_NOT_REGISTERED, "unregistered user !reportWin scenario : " + err + " : " + responseMsg);
                        // TODO: write full suite of tests for handler
                        trace.debug("HANDLER TESTS FINISHED!");
                        if (callback)
                            callback();
                    });
                });
            });
        });
    });
    */
};