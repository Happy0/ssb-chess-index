const pull = require('pull-stream')
const many = require('pull-many')
const scan = require('pull-scan')
const dedup = require('./pull-dedup')

/**
 * 
 * @param {*} dataAccess an instance implementing the ssb-chess-data-access interface
 * @returns 
 */
module.exports = (dataAccess) => {

    // Annotate 'sync' messages (indicating queue is now live) with source message type
    function annotateSync(source, msg) {
        if (!msg.sync) {
            return msg;
        } else {
            msg["source"] = source;
            return msg;
        }
    }
  
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

        const inviteMessages = pull(dataAccess.chessInviteMessages(true), pull.map(msg => annotateSync("chess_invite", msg)));
        const acceptMessages = pull(dataAccess.chessInviteAcceptMessages(true), pull.map(msg => annotateSync("chess_invite_accept", msg)));

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


        const inviteMessages = pull(dataAccess.chessInviteMessages(true), pull.map(msg => annotateSync("chess_invite", msg)));
        const acceptMessages = pull(dataAccess.chessInviteAcceptMessages(true), pull.map(msg => annotateSync("chess_invite_accept", msg)));

  
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

        const inviteMessages = pull(dataAccess.chessInviteMessages(true), pull.map(msg => annotateSync("chess_invite", msg)));
        const acceptMessages = pull(dataAccess.chessInviteAcceptMessages(true), pull.map(msg => annotateSync("chess_invite_accept", msg)));
        const finishMessages = pull(dataAccess.chessEndMessages(true), pull.map(msg => annotateSync("chess_game_end", msg)));

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

        const inviteMessages = pull(dataAccess.chessInviteMessages(true), pull.map(msg => annotateSync("chess_invite", msg)));
        const acceptMessages = pull(dataAccess.chessInviteAcceptMessages(true), pull.map(msg => annotateSync("chess_invite_accept", msg)));
        const finishMessages = pull(dataAccess.chessEndMessages(true), pull.map(msg => annotateSync("chess_game_end", msg)));

  
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
                if (!playerInInvite && state.finished.indexOf(gameId) == -1 ) {
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
     * A pull-stream source of the changing of the games the user has finished.
     * Only the game IDs are present in the array.
     * 
     * Changes when a game finishes that the user is a player in 
     * 
     * @param {*} id the user ID 
     */
    function getGamesFinishedIds(playerId) {
        const finishMessages = pull(dataAccess.chessEndMessages(true), pull.map(msg => annotateSync("chess_game_end", msg)));

        return pull(
            finishMessages,
            pull.filter(msg => !msg.sync),
            pull.asyncMap((data, cb) => {
                const gameId = data.value.content.root;
                dataAccess.getInviteMessage(gameId, (err, result) => {
                    if (err) {
                        cb(null, null);
                    } else {
                        cb(null, isPlayerInInvite(result, playerId) ? gameId : null )
                    }
                })
            }),
            pull.filter(id => id != null)
        )
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
        const inviteMessages = pull(dataAccess.chessInviteMessages(true), pull.map(msg => annotateSync("chess_invite", msg)));
        return pull(inviteMessages, pull.filter(x => !x.sync), pull.map(msg => msg.key));
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
        dataAccess.getInviteMessage(gameId, (err, msg) => {
            if (msg == null || err) {
                cb(err, null)
            } else {
                cb(null, isPlayerInInvite(msg, playerId))
            }
        });
    }
  
    /**
     * A list of the players the player has played with, weighted by the number of times they've played
     * 
     * Only calls back once the internal indexing has processed all current
     * messages in the system
     */
    function weightedPlayFrequencyList(playerId, cb) {    

        const invites = pull(dataAccess.chessInviteMessages(false));

        // todo: make it weight more recent games more strongly
        pull(invites, pull.reduce((acc, msg) => {
            if (isPlayerInInvite(msg, playerId)) {
                const otherPlayer = msg.value.author == playerId ? msg.value.content.inviting : msg.value.author;

                if (acc[otherPlayer]) {
                    acc[otherPlayer] = acc[otherPlayer] + 1
                } else {
                    acc[otherPlayer] = 1
                }

            }

            return acc;
        }, {}, cb));
    }
  
    const getGameId = (msg) => {
        if (msg.value.content.type == "chess_invite") {
            return msg.key;
        } else {
            return msg.value.content.root;
        }
    }

    const isPlayerInInvite = (msg, id) => {
        // sbot.get has a different schema...
        if (!msg.value) {
            msg.value = {};
            msg.value.author = msg.author;
            msg.value.content = msg.content;
        }

        return msg.value.author == id || msg.value.content.inviting == id;
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