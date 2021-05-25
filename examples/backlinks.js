const pull = require('pull-stream');
const ssbClient = require('ssb-client');
const Index = require('../index');

ssbClient((err, client) => {
    var filterQuery = {
        $filter: {
          dest: '%nU8BcDdpcD7t3y2MOwhezdqc8ruXxFxOfGL7ZxC8M4g=.sha256'
        }
      }

      var backlinks = client.backlinks.read({
        query: [filterQuery],
        index: 'DTA', // use asserted timestamps
        live: true
      });


    pull(backlinks , pull.drain(msg => console.log(msg)) )


})