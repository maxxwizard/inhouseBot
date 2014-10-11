var env = process.env.NODE_ENV || 'dev',
    cfg = require('../cfg/config.'+env);

module.exports = cfg;