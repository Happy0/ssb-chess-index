const {
  mapperBuilder,
  FlumeViewLevelCustom,
} = require("@happy0/flumeview-level-custom");

const {
  chessGameDbKey,
  playerPendingChallengeSentKey,
  playerPendingChallengeReceivedKey,
  playerGameAcceptanceTrackingKey,
  playerGameEndTrackingKey,
  playerGameEndKey,
  playerGameInProgressKey
} = require("./keys");

function isChessGameLifecycleMessage(msg) {
  return isChessInvite(msg) || isChessInviteAcceptance(msg) || isGameEnd(msg);
}

function isChessInvite(msg) {
  return msg.value.content.type === "chess_invite";
}

function isChessInviteAcceptance(msg) {
  return msg.value.content.type === "chess_invite_accept";
}

function isGameEnd(msg) {
  return msg.value.content.type === "chess_game_end";
}

async function getChessGameEntry(db, gameId) {
  const key = chessGameDbKey(gameId);
  return db.get(key);
}

function getGameId(msg) {
  if (isChessInvite(msg)) {
    return msg.key;
  } else {
    return msg.value.content.root;
  }
}

function createInviteBatchEntries(
  gameId,
  invitingPlayer,
  invitedPlayer,
  timestamp,
  messageType,
) {
  const type = messageType || "put";

  return [
    {
      type: type,
      key: playerPendingChallengeSentKey(
        gameId,
        invitingPlayer,
        timestamp,
      ),
      value: gameId,
    },
    {
      type: type,
      key: playerPendingChallengeReceivedKey(
        gameId,
        invitedPlayer,
        timestamp,
      ),
      value: gameId,
    },
  ];
}

function createGameInProgressBatchEntries(
  gameId,
  invitingPlayer,
  invitedPlayer,
  messageType,
) {
  const type = messageType || "put";

  return [
    {
      type: type,
      key: `${playerGameInProgressKey(invitingPlayer)}`,
      value: gameId,
    },
    {
      type: type,
      key: `${playerGameInProgressKey(invitedPlayer)}`,
      value: gameId,
    },
  ];
}

function createGameFinishedBatchEntries(
  gameId,
  invitingPlayer,
  invitedPlayer,
  date,
) {
  return [
    {
      type: "put",
      key: playerGameEndKey(invitingPlayer, date, gameId),
      value: gameId,
    },
    {
      type: "put",
      key: playerGameEndKey(invitedPlayer, date, gameId),
      value: gameId,
    },
  ];
}

async function getInviteAcceptionAssertion(db, invited, gameId) {
  const existingAcceptanceKey = playerGameAcceptanceTrackingKey(
    invited,
    gameId,
  );
  const existingAcceptance = await db.get(existingAcceptanceKey);

  return existingAcceptance;
}

async function getGameEndAssertion(db, inviter, invited, gameId) {
  const inviterEndKey = playerGameEndTrackingKey(inviter, gameId);
  const invitedEndKey = playerGameEndTrackingKey(invited, gameId);

  const [inviterEndAssertion, invitedEndAssertion] = await Promise.all([
    db.get(inviterEndKey),
    db.get(invitedEndKey),
  ]);

  return invitedEndAssertion || inviterEndAssertion;
}

function createGameEndedBatchEntries(gameId, inviter, invited, finishedTimestamp, createdTimestamp) {
  return [
    ...createGameInProgressBatchEntries(gameId, inviter, inviter, "del"),
    ...createInviteBatchEntries(gameId, inviter, invited, createdTimestamp, "del"),
    ...createGameFinishedBatchEntries(gameId, inviter, invited, finishedTimestamp),
  ];
}

async function processInvite(db, gameId, msg) {
  const inviter = msg.value.author;
  const invited = msg.value.content.inviting;

  if (!inviter || !invited) {
    return [];
  }

  const [inviteAcceptedAssertion, gameFinishedAssertion] = await Promise.all([
    getInviteAcceptionAssertion(db, invited, gameId),
    getGameEndAssertion(db, inviter, invited, gameId),
  ]);

  if (!inviteAcceptedAssertion && !gameFinishedAssertion) {
    return [
      ...createInviteBatchEntries(
        gameId,
        inviter,
        invited,
        msg.value.timestamp,
      ),
      {
        type: "put",
        key: chessGameDbKey(gameId),
        value: {
          gameId: gameId,
          status: "invited",
          inviter: msg.value.author,
          invited: msg.value.content.inviting,
          createdAt: msg.value.timestamp
        },
      },
    ];
  } else if (inviteAcceptedAssertion === true && getGameEndAssertion === false) {
    return [
      ...createGameInProgressBatchEntries(
        gameId,
        msg.value.author,
        msg.value.content.inviting,
      ),
      ...createInviteBatchEntries(
        gameId,
        msg.value.author,
        msg.value.content.inviting,
        inviteAcceptedAssertion.timestamp,
        "del",
      ),
      // Add the missing player info
      {
        type: "put",
        key: gameId,
        value: {
          gameId: chessGameDbKey(gameId),
          status: "in_progress",
          inviter: msg.value.author,
          invited: msg.value.content.inviting,
          createdAt: msg.value.timestamp
        },
      },
    ];
  } else if (gameFinishedAssertion) {
    return [
      ...createGameEndedBatchEntries(
        gameId,
        existingGameEntry.inviter,
        existingGameEntry.invited,
        gameFinishedAssertion.finishedAt,
      ),
      {
        type: "put",
        key: chessGameDbKey(gameId),
        value: {
          invited: existingGameEntry.invited,
          inviter: existingGameEntry.invited,
          status: "finished",
        },
      },
    ];
  } else {
    return [];
  }
}

async function processInviteAcceptance(db, gameId, msg) {
  const existingGameEntry = await getChessGameEntry(db, gameId);

  if (!existingGameEntry) {
    return [
      {
        type: "put",
        value: {
          assertedBy: msg.value.author,
          timestamp: msg.value.timestamp
        },
        key: playerGameAcceptanceTrackingKey(msg.value.author, gameId),
      },
    ];
  } else if (
    existingGameEntry.invited === msg.value.author &&
    existingGameEntry.status !== "finished"
  ) {
    const updatedGame = { ...existingGameEntry, status: "in_progress" };

    return [
      {
        type: "put",
        key: chessGameDbKey(gameId),
        value: updatedGame,
      },
      ...createGameInProgressBatchEntries(
        gameId,
        existingGameEntry.inviter,
        existingGameEntry.invited,
      ),
      ...createInviteBatchEntries(
        gameId,
        existingGameEntry.inviter,
        existingGameEntry.invited,
        existingGameEntry.createdAt,
        'del'
      ),
    ];
  } else {
    return [];
  }
}

async function processGameEnd(db, gameId, msg) {
  const existingGameEntry = await getChessGameEntry(db, gameId);

  if (!existingGameEntry) {
    return [
      {
        type: "put",
        value: {
          assertedBy: msg.value.author,
          status: "finished",
          finishedAt: msg.value.timestamp,
        },
        key: playerGameEndTrackingKey(msg.value.author, gameId),
      },
    ];
  } else if (
    existingGameEntry.invited === msg.value.author ||
    existingGameEntry.inviter === msg.value.author
  ) {
    const gameUpdate = {
      type: "put",
      key: chessGameDbKey(gameId),
      timestamp: msg.value.timestamp,
      value: { ...existingGameEntry, status: "finished" },
    };

    return [
      ...createGameEndedBatchEntries(
        gameId,
        existingGameEntry.inviter,
        existingGameEntry.invited,
        msg.value.timestamp,
      ),
      gameUpdate,
    ];
  } else {
    return [];
  }
}

async function chessMessageMapper(db, msg) {
  const gameId = getGameId(msg);

  if (!gameId) {
    console.warn(`Unexpectedly no gameId for chess messae: ${msg}`);
    return [];
  }

  if (isChessInvite(msg)) {
    return processInvite(db, gameId, msg);
  } else if (isChessInviteAcceptance(msg)) {
    return processInviteAcceptance(db, gameId, msg);
  } else if (isGameEnd(msg)) {
    return processGameEnd(gameId, msg);
  } else if (!msg.sync) {
    console.warn(
      `Message unexpectedly got past game message filter: ${JSON.stringify(msg)}`,
    );
    return [];
  }
}

module.exports = FlumeViewLevelCustom(
  1,
  mapperBuilder.sequentialMapper(chessMessageMapper),
  isChessGameLifecycleMessage,
);
