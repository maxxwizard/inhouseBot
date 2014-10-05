#InhouseBot
========

A bot that keeps track of an inhouse Dota 2 league. Responds to commands sent over private and guild messages.

##Client API
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
* `!name <new name>` - updates your username stored inside the database

##Admin API
* `!newSeason <name>` - creates a season with the next season number and specified name