const pull = require('pull-stream');
const ssbClient = require('ssb-client');
const Index = require('../index');

ssbClient((err, client) => {

    var index = Index(client);
    var me = "@RJ09Kfs3neEZPrbpbWVDxkN92x9moe3aPusOMOc4S2I=.ed25519";
    var random = "@GgWXfvg2NFTVG/HaaWO1qc4Eqv1k9jq71g8zucQusC0=.ed25519";

    //const source = index.getGamesInProgressIds("@coByZxTQOm/340Gc4G/eJwJniEIHjHt0Kh15N611BQ4=.ed25519");
    const source = index.getGamesFinishedIds(me);

    pull(source, pull.asyncMap(client.get),  pull.drain(msg => console.log(msg)));


    index.gameHasPlayer("%QuBX3teq0sviXtWjzUmlcySR1TNH30I3/g+Zja3XKpU=.sha256", random, (err, result) => console.log(result))

})

