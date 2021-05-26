const pull = require('pull-stream');
const ssbClient = require('ssb-client');
const Index = require('../index');

ssbClient((err, client) => {

    var index = Index(client);
    
    const source = index.pendingChallengesReceived("@coByZxTQOm/340Gc4G/eJwJniEIHjHt0Kh15N611BQ4=.ed25519");

    pull(source, pull.drain(state => console.log(state)));
})

