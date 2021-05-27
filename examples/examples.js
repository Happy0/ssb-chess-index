const pull = require('pull-stream');
const ssbClient = require('ssb-client');
const Index = require('../index');

ssbClient((err, client) => {

    var index = Index(client);
    var me = "@RJ09Kfs3neEZPrbpbWVDxkN92x9moe3aPusOMOc4S2I=.ed25519";
    //const source = index.getGamesInProgressIds("@coByZxTQOm/340Gc4G/eJwJniEIHjHt0Kh15N611BQ4=.ed25519");
    const source = index.getObservableGamesIds(me);


    pull(source, pull.take(1), pull.drain(state => console.log(state.length)));
})

