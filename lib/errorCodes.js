var codes = {}

codes.UNKNOWN_FAILURE = -1;
codes.SUCCESS = 0;
codes.DATABASE_FAILURE = 1;
codes.USER_NOT_REGISTERED = 20;
codes.USER_ALREADY_REGISTERED = 21;
codes.USER_ALREADY_SIGNED = 22;
codes.USER_NOT_SIGNED = 23;
codes.UNAUTHORIZED = 5;
codes.GAME_NOT_FOUND = 30;
codes.GAME_NOT_READY = 31;

module.exports = codes;