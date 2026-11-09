const ChessFlumeviewLevelCustomPlugin = require("../../flumeview/chess-flumeview-plugin");
const {
  allPlayerPendingChallengeSentKeyRange,
  allPlayerPendingChallengeReceivedKeyRange,
  allPlayerGamesInProgressKeyRange,
  allPlayerFinishedGamesKeyRange,
} = require("../../flumeview/keys");

const Flume = require("flumedb");
const Log = require("flumelog-offset");
const codec = require("flumecodec");

const pull = require("pull-stream");

const possibleArrivalOrders = [
  ["chess_invite", "chess_game_end", "chess_invite_accept"],
  ["chess_invite_accept", "chess_invite", "chess_game_end"],
  ["chess_invite_accept", "chess_game_end", "chess_invite"],
  ["chess_game_end", "chess_invite", "chess_invite_accept"],
  ["chess_game_end", "chess_invite_accept", "chess_invite"],
];

const happyPathScenario = {
  scenarioDescription: "Happy path",
  arrivalOrder: ["chess_invite", "chess_invite_accept", "chess_game_end"],
  stateAfterFirst: {
    inboundInvites: true,
    outboundInvites: true,
    gamesInProgress: false,
    gamesEnded: 0,
  },
  stateAfterSecond: {
    inboundInvites: 0,
    outboundInvites: 0,
    gamesInProgress: true,
    gamesEnded: 0,
  },
  stateAfterThird: {
    inboundInvites: 0,
    outboundInvites: 0,
    gamesInProgress: 0,
    gamesEnded: true,
  },
};

async function setupFlumeDbLog(items) {
  const randomFileName = crypto.randomUUID();

  const db = Flume(
    Log(
      `/tmp/ssb-chess-index-tests/${randomFileName}.offset`,
      1024,
      codec.json,
    ),
  );

  return new Promise((resolve, reject) => {
    db.append(items, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

function attachPlugin(db, pluginName) {
  return db.use(pluginName, ChessFlumeviewLevelCustomPlugin);
}

async function getAllItems(flumePlugin, range) {
  const stream = flumePlugin.read(range);

  return new Promise((resolve, reject) => {
    pull(
      stream,
      pull.collect((err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      }),
    );
  });
}

const inviterAuthor = "@RJ09Kfs3neEZPrbpbWVDxkN92x9moe3aPusOMOc4S2I=.ed25519";
const invitedAuthor = "@STgkEO48Kucd57i7x0vBqfkz/euvt2XdglwF6gZLtdk=.ed25519";
const gameId = "%Zf7y1aoZ/51P5IzF6GEvXNRkBqs+X7r+hG5djhQfwpM=.sha256";

const inviteMessage = {
  key: gameId,
  value: {
    previous: "%EA7jGV3XotJ3qQRMwpDbswj2xfHkEFCbZtSiXfr6d6E=.sha256",
    sequence: 19942,
    author: inviterAuthor,
    timestamp: 1791495457292,
    hash: "sha256",
    content: {
      type: "chess_invite",
      inviting: "@STgkEO48Kucd57i7x0vBqfkz/euvt2XdglwF6gZLtdk=.ed25519",
      myColor: "black",
      branch: [
        "%AxUibLnrkZrzA6bk15LpGGDepPZOR2nEn24Kql0YYho=.sha256",
        "%t/8R6p+0Hkq7vDacYwiMOoKNzRf9DD2Ukhiyhxmsroc=.sha256",
        "%01ksKwoAAkrY+bjYdP1WCgtZHHGGcZ8bXmEoYnUlyn4=.sha256",
        "%9oK3ltfnvH9/7h5sxD6Cu+IYoSXcOddTMPJ5L6dLsUM=.sha256",
        "%ldUBk14tkOXNoLECOP9BYDyCyBh4p9KvfHAIzpwcK9k=.sha256",
      ],
    },
    signature:
      "LSq6Ul3o71i7QlPANr3xEhuazhHhPyByLoCGtxv+Nhu37VeI35UOIjCXGBfUNl+9c4f54y6XRNZXS4/ctQvhAg==.sig.ed25519",
  },
};

const inviteAcceptMessage = {
  key: "%GpeF1QW5NEiyMDSnotDYoU/2YDFAVVVNYJDleKpnhtw=.sha256",
  value: {
    previous: "%sat8SZr1QshItA3IZK4e6221k8i+3NOf0JLH6PlgIzw=.sha256",
    sequence: 5561,
    author: invitedAuthor,
    timestamp: 1793634892038,
    hash: "sha256",
    content: {
      type: "chess_invite_accept",
      root: "%Zf7y1aoZ/51P5IzF6GEvXNRkBqs+X7r+hG5djhQfwpM=.sha256",
      branch: "%Zf7y1aoZ/51P5IzF6GEvXNRkBqs+X7r+hG5djhQfwpM=.sha256",
    },
    signature:
      "S/ZvvE9VNtkcI6vMJmijlwU8kDAjKLlWhAMenA/tZQRs1MOsDnl3AySfNMAkNEIJw4pUP0//EeTUOFPQgECwCA==.sig.ed25519",
  },
  timestamp: 1793639323422,
  rts: 1793634892038,
};

const gameEndMessage = {
  key: "%00GGh5dE7AxTRuuRFmAypqvjleLnR83IkPyJrbvRE28=.sha256",
  value: {
    previous: "%fjdCUzbiH0DQ049XD7vQwuCwA0RQ/jN2PzWAXsnGQEI=.sha256",
    sequence: 20002,
    author: inviterAuthor,
    timestamp: 1791912334797,
    hash: "sha256",
    content: {
      type: "chess_game_end",
      status: "resigned",
      root: "%YtpT1cCD7HiCKRpHltKs2dPKGFPADCGhwDnQgD6y/3M=.sha256",
      branch: "%5K8C9E+8UB/CkK7xHV7mWaTJYL3vfJXJQSyKn/vpbiQ=.sha256",
    },
    signature:
      "nlZXJbcyrmT3aXfrYqR8ZFD/UZLQvU92LsNaW3dCtPGTzk/TKWm1NGcnyip9GYoclRm3/P9GuC/QvtKKRzYYBA==.sig.ed25519",
  },
  timestamp: 1791912334798,
  rts: 1791912334797,
};

const typeMessageMappings = {
  chess_invite: inviteMessage,
  chess_invite_accept: inviteAcceptMessage,
  chess_game_end: gameEndMessage,
};

async function runTest(inputMessages, expectedAtStage) {
  const db = await setupFlumeDbLog(inputMessages);

  const pluginName = crypto.randomUUID();
  const dbWithPlugin = attachPlugin(db, pluginName);

  const flumePlugin = db[pluginName];

  const allInvitesSent = await getAllItems(
    flumePlugin,
    allPlayerPendingChallengeSentKeyRange(inviterAuthor),
  );

  expect(allInvitesSent.length).toStrictEqual(
    expectedAtStage.outboundInvites ? 1 : 0,
  );
  expect(allInvitesSent[0]).toStrictEqual(
    expectedAtStage.outboundInvites ? gameId : undefined,
  );

  const allInvitesReceived = await getAllItems(
    dbWithPlugin,
    allPlayerPendingChallengeReceivedKeyRange(invitedAuthor),
  );

  expect(allInvitesReceived).toStrictEqual(
    expectedAtStage.inboundInvites.length ? 1 : 0,
  );
  expect(allInvitesReceived[0]).toStrictEqual(
    expectedAtStage.inboundInvites[0] ? gameId : undefined,
  );

  // Games in progress, inviter and invited

  const allGamesInProgressInviter = await getAllItems(
    dbWithPlugin,
    allPlayerGamesInProgressKeyRange(inviterAuthor),
  );
  expect(allGamesInProgressInviter.length).toStrictEqual(
    expectedAtStage.gamesInProgress ? 1 : 0,
  );
  expect(allGamesInProgressInviter[0]).toStrictEqual(
    expectedAtStage.gamesInProgress ? [gameId] : undefined,
  );

  const allGamesInProgressInvited = await getAllItems(
    dbWithPlugin,
    allPlayerGamesInProgressKeyRange(invitedAuthor),
  );
  expect(allGamesInProgressInvited.length).toStrictEqual(
    expectedAtStage.gamesInProgress ? 1 : 0,
  );
  expect(allGamesInProgressInvited[0]).toStrictEqual(
    expectedAtStage.gamesInProgress ? [gameId] : undefined,
  );

  // Games finished, inviter and invited

  const allGamesFinishedInviter = await getAllItems(
    dbWithPlugin,
    allPlayerFinishedGamesKeyRange(inviterAuthor),
  );
  expect(allGamesFinishedInviter.length).toStrictEqual(
    expectedAtStage.gamesInProgress ? 1 : 0,
  );
  expect(allGamesInProgressInviter[0]).toStrictEqual(
    expectedAtStage.gamesInProgress ? [gameId] : undefined,
  );

  const allGamesFinishedInvited = await getAllItems(
    dbWithPlugin,
    allPlayerFinishedGamesKeyRange(invitedAuthor),
  );
  expect(allGamesFinishedInvited.length).toStrictEqual(
    expectedAtStage.gamesInProgress ? 1 : 0,
  );
  expect(allGamesFinishedInvited[0]).toStrictEqual(
    expectedAtStage.gamesInProgress ? [gameId] : undefined,
  );

  dbWithPlugin.close(() => {});
}

async function testScenario(scenario) {
  const messages = scenario.arrivalOrder.map((x) => typeMessageMappings[x]);

  await runTest([messages[0]], scenario.stateAfterFirst);

  await runTest([messages[0], messages[1]], scenario.stateAfterSecond);

  await runTest(
    [messages[0], messages[1].messages[2]],
    scenario.stateAfterThird,
  );
}

describe("Chess lifecycle message order arrival scenarios", async () => {
  test("Happy path", async () => {
    await testScenario(happyPathScenario);
  });

  // TODO: scenario where the 'invited' ends the game
});
