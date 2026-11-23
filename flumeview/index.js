const {
  chessGameDbKey,
  allObservableGamesKeyRange,
  allPlayerPendingChallengeSentKeyRange,
  allPlayerPendingChallengeReceivedKeyRange,
  allPlayerGamesInProgressKeyRange,
  allPlayerFinishedGamesKeyRange,
} = require("./keys");
const scan = require("pull-scan");
const pull = require("pull-stream");

module.exports = function (flumeLevelCustom) {
  function accumulateIntoChangeIdsArraySource(source) {
    return pull(
      source,
      scan(
        (acc, update) => {
          const updateType = update.type || "put";

          if (update.sync) {
            acc.sync = true;
            return acc;
          } else if (updateType === "put") {
            acc.items[update.key] = update.value;
            return acc;
          } else if (updateType === "del") {
            delete acc.items[update.key];
            return acc;
          } else {
            return acc;
          }
        },
        { items: {}, sync: false },
      ),
      pull.filter((acc) => acc.sync === true),
      pull.map((acc) => Object.values(acc.items)),
    );
  }

  function pendingChallengesSent(playerId) {
    const source = flumeLevelCustom.read({
      ...allPlayerPendingChallengeSentKeyRange(playerId),
      live: true,
    });

    return accumulateIntoChangeIdsArraySource(source);
  }

  function pendingChallengesReceived(playerId) {
    const range = allPlayerPendingChallengeReceivedKeyRange(playerId);

    const source = flumeLevelCustom.read({
      ...range,
      live: true,
    });

    return accumulateIntoChangeIdsArraySource(source);
  }

  function getGamesInProgressIds(playerId) {
    const source = flumeLevelCustom.read({
      ...allPlayerGamesInProgressKeyRange(playerId),
      live: true,
    });

    return accumulateIntoChangeIdsArraySource(source);
  }

  function getObservableGamesIds(playerId) {
    const source = flumeLevelCustom.read({
      ...allObservableGamesKeyRange(),
      live: true
    });

    const otherPlayerGames = pull(
      source,
      pull.filter((update) => update.sync || update.key.indexOf(playerId) === -1),
    );

    return accumulateIntoChangeIdsArraySource(otherPlayerGames);
  }

  function getGamesFinishedIds(playerId) {
    const source = flumeLevelCustom.read({
      ...allPlayerFinishedGamesKeyRange(playerId),
      reverse: true,
      live: true,
    });

    return pull(
      source,
      pull.filter((msg) => !msg.sync),
    );
  }

  function getAllGamesInDb() {
    const source = flumeLevelCustom.read({
      ...allGamesKeyRange(),
      reverse: true,
      live: true,
    });

    return pull(
      source,
      pull.filter((x) => !x.sync),
      pull.map((x) => x.value),
    );
  }

  function gameHasPlayer(gameId, playerId, cb) {
    flumeLevelCustom.get(chessGameDbKey(gameId), (err, result) => {
      if (err) {
        cb(err);
        return;
      }

      const hasPlayer =
        result.inviter === playerId || result.invited === playerId;
      cb(null, hasPlayer);
    });
  }

  function weightedPlayFrequencyList(playerId, cb) {
    const finishedGamesSource = flumeLevelCustom.read(
      allPlayerFinishedGamesKeyRange(playerId),
    );

    pull(
      finishedGamesSource,
      pull.reduce(
        (acc, data) => {
          // TODO: It's a bit hacky to use the key like this
          const otherPlayerId = data.key.split("/")[4];

          const existingEntry = acc[otherPlayerId];

          if (existingEntry) {
            acc[otherPlayerId] = existingEntry + 1;
          } else {
            acc[otherPlayerId] = 1;
          }

          return acc;
        },
        {},
        cb,
      ),
    );
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
