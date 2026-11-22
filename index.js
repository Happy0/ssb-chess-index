const flumeViewIndex = require("./flumeview");
const ChessFlumeview = require("./flumeview/chess-flumeview-plugin");
const inMemoryChessIndex = require("./memory");

module.exports.FlumeViewChessIndex = flumeViewIndex;
module.exports.InMemoryChessIndex = inMemoryChessIndex;
module.exports.ChessFlumeview = ChessFlumeview;
