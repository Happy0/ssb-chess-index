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

function createInviteBatchEntries(gameId, invitingPlayer, invitedPlayer, type) {
  const type = type || "put";

  return [
    {
      type: type,
      key: playerPendingChallengeSentKey(
        gameId,
        invitingPlayer,
        msg.value.timestamp,
      ),
      value: gameId,
    },
    {
      type: type,
      key: playerPendingChallengeReceivedKey(
        gameId,
        invitedPlayer,
        msg.value.timestamp,
      ),
      value: gameId,
    },
  ];
}

function createGameInProgressBatchEntries(
  gameId,
  invitingPlayer,
  invitedPlayer,
  type,
) {
  const type = type || "put";

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
) {}

async function gameInviteAlreadyAccepted(db, invited, gameId) {
  const existingAcceptanceKey = playerGameAcceptanceTrackingKey(
    invited,
    gameId,
  );
  const existingAcceptance = await db.get(existingAcceptanceKey);

  return existingAcceptance != undefined;
}

async function gameAlreadyEnded(db, inviter, invited, gameId) {
  // TODO: aye or naw
}

function createGameEndedBatchEntries(gameId, inviter, invited) {
  return [
    ...createGameInProgressBatchEntries(gameId, inviter, inviter, "del"),
    ...createInviteBatchEntries(gameId, inviter, invited, "del"),
    ...createGameFinishedBatchEntries(gameId, inviter, invited),
  ];
}

async function processInvite(db, gameId, msg) {
  const inviter = msg.value.content.inviting;
  const invited = msg.value.content.invited;

  if (!inviter || !invited) {
    return [];
  }

  const [alreadyAccepted, gameAlreadyFinished] = await Promise.all([
    gameInviteAlreadyAccepted(db, invited, gameId),
    gameAlreadyEnded(db, inviter, invited, gameId)
  ]);

  if (!existingAcceptance) {
    return [
      ...createInviteBatchEntries(
        gameId,
        msg.value.author,
        msg.value.content.inviting,
      ),
      {
        type: "put",
        key: gameId,
        value: {
          gameId: gameId,
          status: "invited",
          inviter: msg.value.author,
          invited: msg.value.content.inviting,
        },
      },
    ];
  } else if (alreadyAccepted === true && gameAlreadyEnded === false) {
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
        "del",
      ),
      // Add the missing player info
      {
        type: "put",
        key: gameId,
        value: {
          gameId: gameId,
          status: "in_progress",
          inviter: msg.value.author,
          invited: msg.value.content.inviting,
        },
      },
    ];
  } else if (gameAlreadyFinished) {
    return [
      ...createGameEndedBatchEntries(
        gameId,
        existingGameEntry.inviter,
        existingGameEntry.invited,
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
          status: "in_progress",
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
      value: { ...existingGameEntry, status: "finished" },
    };

    return [
      ...createGameEndedBatchEntries(
        gameId,
        existingGameEntry.inviter,
        existingGameEntry.invited,
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
