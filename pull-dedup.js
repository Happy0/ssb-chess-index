const pull = require('pull-stream');
const scan = require('pull-scan');

module.exports = function dedup(comparator, initial) {

    const initialState = {
        current: initial,
        duplicate: false
    }

    return pull(
        scan((state, elem) => {
            if (comparator(elem, state.current)) {
                state.duplicate = true;
            } else {
                state.current = elem;
                state.duplicate = false;
            }

            return state;
        }, initialState),
        pull.filter(state => !state.duplicate),
        pull.map(e => e.current)
    )
}
