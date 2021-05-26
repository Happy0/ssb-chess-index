const test = require('tape')
const pull = require('pull-stream')
const dedup = require('../pull-dedup')

test('De-duplicates as expected (array)', function(t) {
    t.plan(1);
    pull(
        pull.values([1,1,2,3,4,4,4,5,4]),
        dedup( (x,y) => x == y),
        pull.collect((err, data) => {
            t.deepEqual(data, [1,2,3,4,5,4])
        })
    );
})