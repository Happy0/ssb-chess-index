const flumeViewIndex = require("./flumeview");
const chessFlumeview = require("./flumeview/chess-flumeview-plugin");
const inMemoryChessIndex = require("./memory");

module.exports.FlumeViewChessIndex = flumeViewIndex;
module.exports.InMemoryChessIndex = inMemoryChessIndex;
module.exports.chessFlumeview = chessFlumeview;
