const pull = require('pull-stream');
const ssbClient = require('ssb-client');
const Index = require('../index');

ssbClient((err, client) => {
    var id = '%3nQspEqJZhYbYmqP1WufgUSP7bXtFjylEceMh3dsZhA=.sha256'
    var filterQuery = {
        $filter: {
          dest: id ,
          timestamp: { $gt: 0 },
        }
      }

      var backlinks = client.backlinks.read({
        query: [filterQuery],
        index: 'DTA' // use asserted timestamps
      });


  pull(backlinks , pull.drain(msg => console.log(msg)) )

})