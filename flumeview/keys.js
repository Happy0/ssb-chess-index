function chessGameDbKey(gameId) {
  return `/game/${gameId}`;
}

function playerPendingChallengeSentKey(gameId, authorId, date) {
  return `/invites/${authorId}/outbound/date/${date}/${gameId}`;
}

function playerPendingChallengeReceivedKey(authorId, gameId, date) {
  return `/invites/${authorId}/inbound/date/${date}/${gameId}`;
}

function playerGameInProgressKey(authorId, gameId) {
  return `/games/live/${authorId}/${gameId}`;
}

function allPlayerGamesInProgressKeyRange(authorId) {
  return {
    gt: `/games/live/${authorId}/`,
    lt: `/games/live/${authorId}/\uffff`,
  };
}

function playerGameAcceptanceTrackingKey(authorId, gameId) {
  return `/games/${gameId}/invited_accepted_assertion/${authorId}`;
}

function playerGameEndTrackingKey(authorId, gameId) {
  return `/games/${gameId}/game_finished_assertion/${authorId}`;
}

function playerFinishedGameKey(author, date, gameId) {
  return `/games/finished/${author}/${date}/game/${gameId}`;
}

function allPlayerFinishedGamesKeyRange(authorId) {
  return {
    gt: `/games/finished/${authorId}/`,
    lt: `/games/finished/${authorId}/\uffff`,
  };
}

function allPlayerPendingChallengeSentKeyRange(authorId) {
  return {
    gt: `/invites/${authorId}/outbound/date/`,
    lt: `/invites/${authorId}/outbound/date/\uffff`,
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
};
