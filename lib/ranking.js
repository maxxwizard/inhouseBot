/*
 * Author: matthewhuynh88@gmail.com
 * Description: contains the properties and methods required to do simple ranking, might get sophisticated later
 */ 

var trace = require('./trace'),
    errCodes = require('./errorCodes'),
    assert = require('assert'),
    config = require('./config');

module.exports.InitialRating = 1000; // everyone starts at 1000

/*
 * Description: general purpose combinations function
 * Source: https://gist.github.com/axelpale/3118596
 */
function k_combinations(arr, k) {
    var i, j, combs, head, tailcombs;
    
    if (k > arr.length || k <= 0) {
        return [];
    }
    
    if (k == arr.length) {
        return [arr];
    }
    
    if (k == 1) {
        combs = [];
        for (i = 0; i < arr.length; i++) {
            combs.push([arr[i]]);
        }
        return combs;
    }
    
    // Assert {1 < k < set.length}
    
    combs = [];
    for (i = 0; i < arr.length - k + 1; i++) {
        head = arr.slice(i, i + 1);
        tailcombs = k_combinations(arr.slice(i + 1), k - 1);
        for (j = 0; j < tailcombs.length; j++) {
            combs.push(head.concat(tailcombs[j]));
        }
    }
    return combs;
}

/*
 * Description: returns the sum of the ratings in an array of player objects
 */
function sum(arr) {
    var result = 0;
    for (var i = 0; i < arr.length; i++) {
        result += arr[i].rating;
    }
    return result;
}

/*
 * Description: prints team summaries
 */
function printTeamSummaries(arr) {
    trace.log("Radiant");
    for (var i = 0; i < arr.Radiant.length; i++) {
        var player = arr.Radiant[i];
        trace.log(player.steam64Id + "/" + player.username + " (" + player.rating + ")");
    }
    trace.log("Dire");
    for (var j = 0; j < arr.Dire.length; j++) {
        var player = arr.Dire[j];
        trace.log(player.steam64Id + "/" + player.username + " (" + player.rating + ")");
    }
}

/*
 * Description: Takes in an array of 10 player objects. Returns array in format:
 *              { Radiant: [player1, player3, player5, player7, player9],
 *              Dire: [player2, player4, player6, player8, player10] }
 * Algorithm: 1) split the 2 highest-ranked players to start each team
 *            2) calculate all combinations (8 choose 4) and save the combination where the ranking/MMR delta is the smallest
 *            difference in 2 teams rating = absolute( (total - combinationSum) - combinationSum)
 */
module.exports.BalancedShuffle = function (arrayOfPlayers, callback) {
    
    var playerSplit = { Radiant: [], Dire: [] };
    
    // sort by ranking
    players = arrayOfPlayers.sort(function (a, b) { 
        return a.rating > b.rating;
    });
    
    var rank1Player = players.pop();
    var rank2Player = players.pop();
    
    var sidesRandomizer = Math.random();
    if (sidesRandomizer > 0.5) {
        playerSplit.Dire.push(rank1Player);
        playerSplit.Radiant.push(rank2Player);
    } else {
        playerSplit.Dire.push(rank2Player);
        playerSplit.Radiant.push(rank1Player);
    }
    
    // calculate and store all possible combinations
    var combosArr = k_combinations(players, 4);
    
    // figure out which combo has the lowest difference in team rating sums
    var indexLowestDiff = 0;
    var lowestDiff = Number.MAX_VALUE;
    var total = sum(players);
    for (var i = 0; i < combosArr.length; i++) {
        var newSum = sum(combosArr[i]);
        var diff = Math.abs( (total-newSum) - newSum );
        if (diff < lowestDiff) {
            lowestDiff = diff;
            indexLowestDiff = i;
        }
        //trace.debug("inspecting combosArr[" + i + "]");
    }
    
    // fill out our playerSplit by putting bestSplit into Radiant and rest of players into Dire
    var bestSplit = combosArr[indexLowestDiff];
    players.forEach(function (playerObj) {
        var playerAddedToRadiant = false;
        for (var k = 0; k < bestSplit.length; k++) {
            if (playerObj.steam64Id == bestSplit[k].steam64Id) {
                AddPlayerToSet(playerSplit.Radiant, playerObj);
                playerAddedToRadiant = true;
                //trace.debug(playerObj.username + " added to Radiant");
            }
        }
        if (!playerAddedToRadiant) {
            AddPlayerToSet(playerSplit.Dire, playerObj);
            //trace.debug(playerObj.username + " added to Dire");
        }
    });
    
    // actualDiff includes the top 2 ranked players and thus doesn't match lowestDiff, which only included bottom 8 players
    var radiantSum = sum(playerSplit.Radiant);
    var direSum = sum(playerSplit.Dire);
    var actualDiff = Math.abs(radiantSum - direSum);

    //trace.debug("teams have a rating difference of " + actualDiff);
    //printTeamSummaries(playerSplit);

    assert.equal(playerSplit.Dire.length, playerSplit.Radiant.length, "each team should have 5 players");
    
    if (callback) {
        callback(playerSplit);
    }
}

/*
 * Description: adds Player to array only if it doesn't already exist
 */
function AddPlayerToSet(arr, playerToAdd) {
    var safeToAdd = true;
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].steam64Id == playerToAdd.steam64Id) {
            safeToAdd = false;
        }
    }
    if (safeToAdd) {
        arr.push(playerToAdd);
    }
}