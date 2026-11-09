function chessGameDbKey(gameId) {
  return `/game/${gameId}`;
}

function playerPendingChallengeSentKey(gameId, authorId, date) {}

function playerPendingChallengeReceivedKey(authorId, gameId, date) {}

function playerGameInProgressKey(authorId, gameId) {}

function playerGameAcceptanceTrackingKey(authorId, gameId) {}

function playerGameEndTrackingKey(authorId, gameId) {}

function allPlayerPendingChallengeSentKeyRange(authorId) {}

function allPlayerPendingChallengeReceivedKeyRange(authorId) {}

function allPlayerGamesInProgressKeyRange(authorId) {}

function allPlayerFinishedGamesKeyRange(authorId) {}

module.exports = {
  chessGameDbKey,
  playerPendingChallengeSentKey,
  playerPendingChallengeReceivedKey,
  playerGameInProgressKey,
  playerGameAcceptanceTrackingKey,
  playerGameEndTrackingKey,
  allPlayerPendingChallengeSentKeyRange,
  allPlayerPendingChallengeReceivedKeyRange,
  allPlayerGamesInProgressKeyRange,
  allPlayerFinishedGamesKeyRange,
};
