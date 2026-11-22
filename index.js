const flumeViewIndex = require('./flumeview');
const FlumeViewLevelCustom = require('./flumeview/chess-flumeview-plugin');
const inMemoryChessIndex = require('./memory');

module.exports.FlumeViewChessIndex = flumeViewIndex;
module.exports.InMemoryChessIndex = inMemoryChessIndex;
module.exports.FlumeViewLevelCustom = FlumeViewLevelCustom;