function chessGameDbKey(gameId) {
  return `/game/${gameId}`;
}

function playerPendingChallengeSentKey(gameId, authorId, date) {
  return `/invites/${authorId}/outbound/date/${date}/${gameId}`;
}

function allPlayerPendingChallengeSentKeyRange(authorId) {
  return {
    gt: `/invites/${authorId}/outbound/date/`,
    lt: `/invites/${authorId}/outbound/date/\uffff`,
  };
}

function playerPendingChallengeReceivedKey(authorId, gameId, date) {
  return `/invites/${authorId}/inbound/date/${date}/${gameId}`;
}

function playerGameInProgressKey(player, otherPlayer, gameId) {
  return `/games/live/${player}/${otherPlayer}/${gameId}`;
}

function observableGameKey(player, otherPlayer, gameId, date) {
  return `/games/observe/${date}/${player}/${otherPlayer}/${gameId}`;
}

function allObservableGamesKeyRange() {
  return {
    gt: `/games/observe/`,
    lt: `/games/observe/\uffff`,
  };
}

function allPlayerGamesInProgressKeyRange(authorId) {
  return {
    gt: `/games/live/${authorId}/`,
    lt: `/games/live/${authorId}/\uffff`,
  };
}

function allGamesInProgressKeyRange() {
  return {
    gt: `/games/live`,
    lt: `/games/live/\uffff`,
  };
}

function allGamesKeyRange() {
  return {
    gt: `/games`,
    lt: `/games/\uffff`,
  };
}

function playerGameAcceptanceTrackingKey(authorId, gameId) {
  return `/games/${gameId}/invited_accepted_assertion/${authorId}`;
}

function playerGameEndTrackingKey(authorId, gameId) {
  return `/games/${gameId}/game_finished_assertion/${authorId}`;
}

function playerFinishedGameKey(player, otherPlayer, date, gameId) {
  return `/games/finished/${player}/${otherPlayer}/${date}/game/${gameId}`;
}

function allPlayerFinishedGamesKeyRange(authorId) {
  return {
    gt: `/games/finished/${authorId}/`,
    lt: `/games/finished/${authorId}/\uffff`,
  };
}

function allPlayerPendingChallengeReceivedKeyRange(authorId) {
  return {
    gt: `/invites/${authorId}/inbound/date/`,
    lt: `/invites/${authorId}/inbound/date/\uffff`,
  };
}

module.exports = {
  chessGameDbKey,
  playerPendingChallengeSentKey,
  playerPendingChallengeReceivedKey,
  playerGameInProgressKey,
  playerGameAcceptanceTrackingKey,
  playerGameEndTrackingKey,
  playerGameEndKey: playerFinishedGameKey,
  allPlayerPendingChallengeSentKeyRange,
  allPlayerPendingChallengeReceivedKeyRange,
  allPlayerGamesInProgressKeyRange,
  allPlayerFinishedGamesKeyRange,
  allGamesInProgressKeyRange,
  allGamesKeyRange,
  observableGameKey,
  allObservableGamesKeyRange,
};
