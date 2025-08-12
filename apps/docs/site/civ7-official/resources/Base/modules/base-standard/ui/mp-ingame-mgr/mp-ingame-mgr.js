/**
 * Multiplayer Ingame Manager
 * @copyright 2020-2021, Firaxis Games
 *
 * Handles multiplayer related events while ingame.
  */
import DialogManager from '/core/ui/dialog-box/manager-dialog-box.js';
import { NetworkUtilities } from '/core/ui/utilities/utilities-network.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
class MultiplayerIngameSingleton {
    constructor() {
        this.multiplayerGameAbandonedListener = (data) => { this.onMultiplayerGameAbandoned(data); };
        this.multiplayerGameLastPlayerListener = () => { this.onMultiplayerGameLastPlayer(); };
        engine.whenReady.then(() => { this.onReady(); });
    }
    //===============================================================
    // UI Object Events 
    onReady() {
        engine.on('MultiplayerGameAbandoned', this.multiplayerGameAbandonedListener);
        engine.on('MultiplayerGameLastPlayer', this.multiplayerGameLastPlayerListener);
    }
    //===============================================================
    // Engine Events 
    onMultiplayerGameAbandoned(data) {
        const abandonPopup = NetworkUtilities.multiplayerAbandonReasonToPopup(data.reason);
        DialogManager.createDialog_Confirm({
            body: abandonPopup.body,
            title: abandonPopup.title,
            callback: this.onAbandonedConfirm
        });
    }
    onMultiplayerGameLastPlayer() {
        // We don't want to display the All Alone dialog when it could break end game sequencing.
        // We also directly check game over states in gamecore because it is possible that 
        // the game just ended and the end game screens just haven't popped yet.
        if (ContextManager.getTarget("screen-endgame")) {
            return;
        }
        const localPlayerID = GameContext.localPlayerID;
        const localPlayer = Players.get(localPlayerID);
        if (localPlayer && !localPlayer.isAlive) {
            return;
        }
        if (!ContextManager.isGameActive()) {
            return;
        }
        DialogManager.createDialog_Confirm({
            body: "TXT_KEY_MP_LAST_PLAYER",
            title: "TXT_KEY_MP_LAST_PLAYER_TITLE",
        });
    }
    //===============================================================
    // Dialog Callbacks
    onAbandonedConfirm() {
        engine.call('exitToMainMenu');
    }
}
const MultiplayerIngame = new MultiplayerIngameSingleton();
export { MultiplayerIngame as default };

//# sourceMappingURL=file:///base-standard/ui/mp-ingame-mgr/mp-ingame-mgr.js.map
