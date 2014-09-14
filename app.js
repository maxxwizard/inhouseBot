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

var bot = require("./bot");
bot.start();