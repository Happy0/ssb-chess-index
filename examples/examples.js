const pull = require('pull-stream');
const ssbClient = require('ssb-client');
const Index = require('../index');

ssbClient((err, client) => {

    var index = Index(client);
    var me = "@RJ09Kfs3neEZPrbpbWVDxkN92x9moe3aPusOMOc4S2I=.ed25519";
    var random = "@zurF8X68ArfRM71dF3mKh36W0xDM8QmOnAS5bYOq8hA=.ed25519";

 //   index.weightedPlayFrequencyList(me, (ee, result) => console.log(result));
    //const source = index.getObservableGames(me);

    //pull(source, pull.drain(e => console.log(e.length)))

    const rec = pull(index.pendingChallengesSent(me), pull.drain(e => console.log(e)) )

    getGamesAgreedToPlayIds(index, me).then(e => console.log(e));


})


function getGamesAgreedToPlayIds(chessIndex, playerId) {
    return new Promise((resolve, reject) => {
      pull(
        chessIndex.getGamesInProgressIds(playerId),
        pull.take(1),
        pull.drain(result => resolve(result) )
      );
    });
  }

