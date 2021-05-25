const pull = require('pull-stream');
const ssbClient = require('ssb-client');
const Index = require('../index');

ssbClient((err, client) => {

    var index = Index(client);
    
    const source = index.pendingChallengesSent("@RJ09Kfs3neEZPrbpbWVDxkN92x9moe3aPusOMOc4S2I=.ed25519");

    pull(source, pull.drain(state => console.log(state)));
})