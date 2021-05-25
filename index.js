const pull = require('pull-stream')
const many = require('pull-many')
const scan = require('pull-scan')

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
            gamesStarted: [],
            changed: false
        }

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
            pull.map(state => state.invites)
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
    function pendingChallengesReceived(id) {
  
    }
  
    /**
     * A pull-stream source of the changing array of the games the user has in progress.
     * 
     * Changes when games finish or when a new game begins after an invite has been accepted
     * 
     * Only starts emitting once the internal indexing has processed all current
     * messages in the system
     * 
     * @param {*} id the user ID 
     */
    function getGamesInProgress(id) {
  
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
    function getObservableGames(id) {
  
    }
  
    /**
     * A pull-stream source of the changing of the games the user has finished.
     * 
     * Changes when a game finishes that the user is a player in 
     * 
     * Only starts emitting once the internal indexing has processed all current
     * messages in the system
     * 
     * @param {*} id the user ID 
     */
    function getGamesFinished(playerId) {
  
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
  
    function getInviteSummary(gameInfo) {
      var invite = {
        gameId: gameInfo[ID_FIELD],
        sentBy: gameInfo[INVITER_FIELD],
        inviting: gameInfo[INVITEE_FIELD],
        inviterPlayingAs: gameInfo[INVITER_COLOUR_FIELD],
        timestamp: gameInfo[UPDATED_FIELD]
      }
    
      return invite;
    }
  
    return {
        pendingChallengesSent,
        pendingChallengesReceived,
        getGamesInProgress,
        getObservableGames,
        getGamesFinished,
        getAllGamesInDb,
        gameHasPlayer,
        weightedPlayFrequencyList
    }
  
  }