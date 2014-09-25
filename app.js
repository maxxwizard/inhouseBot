/*
 * Author: matthewhuynh88@gmail.com
 * Description: initializes the inhouse bot.
 */

/*
var http = require('http');
var port = process.env.port || 1337;
http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot server is running\n');
    
}).listen(port);
 */

/*
 * Implementation plan/timeline:
 * 1) create bot functionality
 * 2) change backing store from localhost to Azure
 * 3) migrate workload to Azure
 */

var bot = require('./lib/bot');
bot.start();