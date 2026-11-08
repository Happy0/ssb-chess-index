const {
  mapperBuilder,
  FlumeViewLevelCustom,
} = require("@happy0/flumeview-level-custom");

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

function chessGameDbKey(gameId) {
  return `/game/${gameId}`;
}

async function getChessGameEntry(gameId) {
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

async function processInvite(existingGameEntry, msg) {}

async function processInviteAcceptance(existingGameEntry, msg) {}

async function processGameEnd(existingGameEntry, msg) {}

async function chessMessageMapper(db, msg) {
  const gameId = getGameId(msg);

  if (!gameId) {
    return [];
  }

  const existingGameEntry = await getChessGameEntry(gameId);

  if (isChessInvite(msg)) {
    return processInvite(existingGameEntry, msg);
  } else if (isChessInviteAcceptance(msg)) {
    return processInviteAcceptance(existingGameEntry, msg);
  } else if (isGameEnd(msg)) {
    return processGameEnd(msg);
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
