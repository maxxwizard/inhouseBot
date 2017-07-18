# Overview
A bot that keeps track of an inhouse Dota 2 league. Responds to commands sent over private and guild messages.

## Quick Start Guide
1. Run `!register` to register yourself into the system (records your name and gives you initial rating of 1000).
2. Run `!games` to find current games. If there are no games, run `!newGame` to host a new game. You'll be auto-signed into it.
3. Run `!sign <gameNum>` to sign yourself into a game.
4. Once the game is filled, run `!start <gameNum>` to start your game. You'll be prompted to host a lobby and the rest of your game's players should follow you into the lobby.
5. Once the game is finished, run `!reportLoss` or `!reportWin` to report your score. Once 5 reports are submitted, the game's victor will be declared and you can play another game.

## Client API
* `!help` - links you to our online documentation
* `!register` - initializes the player in the database
* `!stats <username>` - displays win/loss count, winrate and rating for yourself if no username, otherwise displays stats for username
* `!sign <gameNum>` - adds user to a specific game
* `!unsign <gameNum>` - removes user from a specific game
* `!start <gameNum>` - starts the game by changing the game to 'InProgress' and displaying who is on which team
* `!newGame` - starts a new game and outputs the new game number
* `!games` - displays 'WaitingForPlayers' and 'InProgress' games as well as games 'Cancelled' in last 15 minutes
* `!reportWin | !reportLoss` - determines what game you're in and reports score. if this if the 5th score game for the game, transitions game to 'Completed' and does appropriate housekeeping.
* `!seasons` - displays how many inhouse seasons there have been and the past 3's winners
* `!leaderboard` - displays top 10 rated players and their ratings
* `!cancel <gameNum>` - only admin or game owner can call this

## Admin API
* `!newSeason <name>` - creates a season with the next season number and specified name (no spaces in name allowed currently)
