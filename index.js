const pull = require('pull-stream')
const many = require('pull-many')
const scan = require('pull-scan')
const dedup = require('./pull-dedup')

module.exports = (sbot) => {

    // Annotate 'sync' messages (indicating queue is now live) with source message type
    function annotateSync(source, msg) {
        if (!msg.sync) {
            return msg;
        } else {
            msg["source"] = source;
            return msg;
        }
    }

    const inviteMessages = pull(sbot.messagesByType({type: "chess_invite", live: true}), pull.map(msg => annotateSync("chess_invite", msg)));
    const acceptMessages = pull(sbot.messagesByType({type: "chess_invite_accept", live: true}), pull.map(msg => annotateSync("chess_invite_accept", msg)));
    const finishMessages = pull(sbot.messagesByType({type: "chess_game_end", live: true}), pull.map(msg => annotateSync("chess_game_end", msg)));

  
    /**
     * A pull-stream source of the changing array of invites sent by the given
     * user ID to other users.
     * 
     * Changes if a new invite is sent by the user ID, or an invite is accepted
     * making it no longer pending
     * 
     * Only starts emitting once the internal indexing has processed all current
     * messages in the system
     * 
     * @param {*} id the user ID 
     */
    function pendingChallengesSent(playerId) {

        const scanState = {
            invitesLive: false,
            acceptsLive: false,
            invites: [],
            // A list of the game IDs of every game with an accepted invite
            gamesStarted: []
        }

        // Changes the 'invites' list when the user sends a new invite, or an invite
        // the user has sent is accepted
        const invitesStateScanFunction = (state, msg) => {
            if (msg.sync && msg.source == "chess_invite") {
                state.invitesLive = true;
                return state;
            } else if (msg.sync && msg.source == "chess_invite_accept") {
                state.acceptsLive = true;
                return state;
            } else {
                if (msg.value.content.type=="chess_invite_accept") {
                    const gameId = msg.value.content.root
                    state.gamesStarted.push(gameId);

                    const newInvites = state.invites.filter(game => {
                        return game.gameId !== gameId
                    });
                    state.invites = newInvites;
                    return state;                    
                } else if (msg.value.content.type=="chess_invite" && msg.value.author === playerId) {

                    const gameId = msg.key;

                    // We know that game has started
                    if (state.gamesStarted.indexOf(gameId) != -1) {
                        return state;
                    } else {
                        const newState = addGame(state, msg);
                        return newState;
                    }

                } else {
                    return state;
                }
            }   
        }

        const addGame = (state, msg) => {
            const gameSummary = {
                gameId: msg.key,
                sentBy: msg.value.author,
                inviting: msg.value.content.inviting,
                inviterPlayingAs: msg.value.content.myColor,
                timestamp: msg.timestamp
            }
            state.invites.push(gameSummary);
            return state;
        }

        // TODO: filter out duplicate values...
        return pull(
            many([inviteMessages, acceptMessages]),
            scan(invitesStateScanFunction, scanState),
            pull.filter(state => state.invitesLive && state.acceptsLive),
            pull.map(state => state.invites),
            dedup((x,y) => x.length == y.length, [])
        );
    }
  
    /**
     * A pull-stream source of the changing array of invites received by the given
     * user ID to other users.
     * 
     * Changes if an invite sent to the user ID is accepted.
     * 
     * Only starts emitting once the internal indexing has processed all current
     * messages in the system
     * 
     * @param {*} id the user ID 
     */
    function pendingChallengesReceived(playerId) {
  
        const scanState = {
            invitesLive: false,
            acceptsLive: false,
            invites: [],
            // A list of the game IDs of every game with an accepted invite
            gamesStarted: []
        }

        // Changes the 'invites' list when a user receives an invite, and when
        // a user accepts an invite (removing it from the pending invites)
        const invitesStateScanFunction = (state, msg) => {
            if (msg.sync && msg.source == "chess_invite") {
                state.invitesLive = true;
                return state;
            } else if (msg.sync && msg.source == "chess_invite_accept") {
                state.acceptsLive = true;
                return state;
            } else {
                if (msg.value.content.type=="chess_invite_accept" && msg.value.author === playerId) {
                    const gameId = msg.value.content.root
                    state.gamesStarted.push(gameId);

                    const newInvites = state.invites.filter(game => {
                        return game.gameId !== gameId
                    });
                    state.invites = newInvites;
                    return state;                    
                } else if (msg.value.content.type=="chess_invite" && msg.value.content.inviting === playerId ) {

                    const gameId = msg.key;

                    // We know that game has started
                    if (state.gamesStarted.indexOf(gameId) != -1) {
                        return state;
                    } else {
                        const newState = addGame(state, msg);
                        return newState;
                    }

                } else {
                    return state;
                }
            }   
        }

        const addGame = (state, msg) => {
            const gameSummary = {
                gameId: msg.key,
                sentBy: msg.value.author,
                inviting: msg.value.content.inviting,
                inviterPlayingAs: msg.value.content.myColor,
                timestamp: msg.timestamp
            }
            state.invites.push(gameSummary);
            return state;
        }

        // TODO: filter out duplicate values...
        return pull(
            many([inviteMessages, acceptMessages]),
            scan(invitesStateScanFunction, scanState),
            pull.filter(state => state.invitesLive && state.acceptsLive),
            pull.map(state => state.invites),
            dedup((x,y) => x.length == y.length, [])
        );
    }
  
    /**
     * A pull-stream source of the changing array of the games the user has in progress.
     * Only the game IDs are present in the array.
     * 
     * Changes when games finish or when a new game begins after an invite has been accepted
     * 
     * Only starts emitting once the internal indexing has processed all current
     * messages in the system
     * 
     * @param {*} id the user ID 
     */
    function getGamesInProgressIds(id) {

        const scanFn = (state, msg) => {

            if (msg.sync && msg.source == "chess_invite") {
                state.invitesLive = true;
            } else if (msg.sync && msg.source == "chess_invite_accept") {
                state.acceptsLive = true;
            } else if (msg.sync && msg.source == "chess_game_end") {
                state.finishedsLive = true;
            } else if (msg.value.content.type == "chess_invite") {
                const gameId = getGameId(msg);
                const playerInInvite = isPlayerInInvite(msg, id);
                if (playerInInvite && state.finished.indexOf(gameId) == -1 ) {
                    state.gameStates[gameId] = {
                        gameId: gameId,
                        state: state.accepted.indexOf(gameId) !== -1 ? "live": "invited" 
                    }
                }

            } else if (msg.value.content.type == "chess_invite_accept") {
                const gameId = getGameId(msg);

                if (state.gameStates[gameId]) {
                    state.gameStates[gameId].state = "live";
                } else {
                    state.accepted.push(gameId);
                }
                
            } else if (msg.value.content.type == "chess_game_end") {
                const gameId = getGameId(msg);

                state.finished.push(gameId);
                delete state.gameStates[gameId];
            }

            return state;
        }

        const state = {
            invitesLive: false,
            acceptsLive: false,
            finishedsLive: false,
            finished: [],
            accepted: [],
            gameStates: {}
        }

        const isPlayerInInvite = (msg, id) => {
            return msg.value.author == id || msg.value.content.inviting == id;
        }

        const gamesInProgressOnly = (state) => 
            Object.values(state.gameStates).filter(gameState => gameState.state == "live").map(game => game.gameId);

        return pull(
            many([finishMessages, inviteMessages, acceptMessages]),
            scan(scanFn, state),
            pull.filter(state => state.invitesLive && state.acceptsLive && state.finishedsLive),
            pull.map(state => gamesInProgressOnly(state)),
            dedup((x,y) => x.length == y.length, [])
        );
    }

  
    /**
     * A pull-stream source of the changing array of the games the user can observe.
     * (e.g. not their own games)
     * 
     * Changes when a game finishes or when a new game begins after an invite has been
     * accepted and the given user is not a player in these games
     * 
     * Only starts emitting once the internal indexing has processed all current
     * messages in the system
     * 
     * @param {*} id the user ID 
     */
    function getObservableGamesIds(id) {
  
    }
  
    /**
     * A pull-stream source of the changing of the games the user has finished.
     * Only the game IDs are present in the array.
     * 
     * Changes when a game finishes that the user is a player in 
     * 
     * Only starts emitting once the internal indexing has processed all current
     * messages in the system
     * 
     * @param {*} id the user ID 
     */
    function getGamesFinishedIds(playerId) {
  
    }
  
      /**
     * A pull-stream source of all the games in the database of any state (finished, started, invited).
     *  
     * Only starts emitting once the internal indexing has processed all current
     * messages in the system
     * 
     * @param {*} id the user ID 
     */
    function getAllGamesInDb() {
  
    }
  
    /**
     * 
     * Calls back with a boolean indicating whether the game has the player or not
     * 
     * Only calls back once the internal indexing has processed all current
     * messages in the system
     * 
     * @param {*} gameId 
     * @param {*} playerId 
     * @param {*} cb 
     */
    function gameHasPlayer(gameId, playerId, cb) {
  
    }
  
    /**
     * A list of the players the player has played with, weighted by the number of times they've played and
     * how recent those games were
     * 
     * Only calls back once the internal indexing has processed all current
     * messages in the system
     */
    function weightedPlayFrequencyList(playerId, view) {
  
    }
  
    const getGameId = (msg) => {
        if (msg.value.content.type == "chess_invite") {
            return msg.key;
        } else {
            return msg.value.content.root;
        }
    }
  
    return {
        pendingChallengesSent,
        pendingChallengesReceived,
        getGamesInProgressIds,
        getObservableGamesIds,
        getGamesFinishedIds,
        getAllGamesInDb,
        gameHasPlayer,
        weightedPlayFrequencyList
    }
  
  }