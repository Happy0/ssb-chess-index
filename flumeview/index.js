const { allGamesInProgressKeyRange, allPlayerPendingChallengeSentKeyRange, allPlayerPendingChallengeReceivedKeyRange, allPlayerGamesInProgressKeyRange, allPlayerFinishedGamesKeyRange } = require('./keys');
const scan = require("pull-scan");
const pull = require('pull-stream');

module.exports = function (flumeLevelCustom) {

  function accumulateIntoChangeIdsArraySource(source) {
    return pull(
      source,
      scan((acc, update) => {
          if (update.sync) {
            acc.sync = true;
            return acc;
          } else if (update.type === 'put') {
            acc.items[update.key] = update.value;
            return acc;
          } else if (update.type === 'del') {
            delete acc.items[update.key];
            return acc;
          } else {
            return acc;
          }
        }, {arr: [], sync: false}),
      pull.filter(acc => acc.sync === true),
      pull.map(acc => Object.values(acc.items))
    )
  };

  function pendingChallengesSent(playerId) {
    const source = flumeLevelCustom.read({
      ...allPlayerPendingChallengeSentKeyRange(playerId),
      live: true
    });

    return accumulateIntoChangeIdsArraySource(source);
  };

  function pendingChallengesReceived(playerId) {
    const source = flumeLevelCustom.read({
      ...allPlayerPendingChallengeReceivedKeyRange(playerId),
      live: true
    });

    return accumulateIntoChangeIdsArraySource(source);
  };

  function getGamesInProgressIds(playerId) {
    const source = flumeLevelCustom.read({
      ...allPlayerGamesInProgressKeyRange(playerId),
      live: true
    });

    return accumulateIntoChangeIdsArraySource(source);
  }

  function getObservableGamesIds(playerId) {
    const source = flumeLevelCustom.read({
      ...allGamesInProgressKeyRange()
    })

    const otherPlayerGames = pull(source, pull.filter(update => !update.key.indexOf(playerId)))

    return accumulateIntoChangeIdsArraySource(otherPlayerGames);
  }

  function getGamesFinishedIds(playerId) {
    const source = flumeLevelCustom.read({
      ...allPlayerFinishedGamesKeyRange(playerId),
      reverse: true
    });

    return source;
  }

  function getAllGamesInDb() {

  }

  function gameHasPlayer(gameId, playerId, cb) {

  }

  function weightedPlayFrequencyList(playerId, cb) {
    
  }

  return {
    pendingChallengesSent,
    pendingChallengesReceived,
    getGamesInProgressIds,
    getObservableGamesIds,
    getGamesFinishedIds,
    getAllGamesInDb,
    gameHasPlayer,
    weightedPlayFrequencyList,
  };
};
