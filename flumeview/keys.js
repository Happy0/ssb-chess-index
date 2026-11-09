function chessGameDbKey(gameId) {
  return `/game/${gameId}`;
}

function playerPendingChallengeSentKey(gameId, authorId, date) {}

function playerPendingChallengeReceivedKey(authorId, gameId, date) {}

function playerGameInProgressKey(authorId, gameId) {}

function playerGameAcceptanceTrackingKey(authorId, gameId) {}

function playerGameEndTrackingKey(authorId, gameId) {}

module.exports = {
  chessGameDbKey,
  playerPendingChallengeSentKey,
  playerPendingChallengeReceivedKey,
  playerGameInProgressKey,
  playerGameAcceptanceTrackingKey,
  playerGameEndTrackingKey,
};
