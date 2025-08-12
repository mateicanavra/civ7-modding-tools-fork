/**
 * @file war-chooser-item.ts
 * @copyright 2024, Firaxis Games
 */
import { ChooserItem } from "/base-standard/ui/chooser-item/chooser-item.js";
export class WarChooserItem extends ChooserItem {
    set warChooserData(warData) {
        this._warChooserData = warData;
    }
    render() {
        super.render();
        if (!this._warChooserData) {
            console.error("war-chooser-item: Attempting to render a war-chooser-item with no valid WarChooserData");
            return;
        }
        const localPlayer = Players.get(GameContext.localPlayerID);
        if (!localPlayer?.Diplomacy) {
            console.error("war-chooser-item: No valid PlayerDiplomacy for localPlayer");
            return;
        }
        this.Root.classList.add("text-accent-2", "w-136", "flex", "flex-row", "mb-2", "grow", "justify-between", "war-chooser-item");
        const bg = document.createElement("div");
        bg.classList.value = "war-chooser-item_bg absolute size-full";
        this.Root.appendChild(bg);
        const border = document.createElement("div");
        border.classList.value = "absolute size-full war-chooser-item_border";
        this.Root.appendChild(border);
        const initiator = Configuration.getPlayer(this._warChooserData.initialPlayer);
        if (!initiator.leaderTypeName) {
            console.error("war-chooser-item: Attempting to assign initiator leader icon, but no valid leaderTypeName!");
            return;
        }
        const initiatorIcon = document.createElement("leader-icon");
        initiatorIcon.classList.add("mx-2", "w-16", "h-16", "my-3", "pointer-events-auto");
        initiatorIcon.setAttribute("leader", initiator.leaderTypeName);
        initiatorIcon.setAttribute("bg-color", UI.Player.getPrimaryColorValueAsString(this._warChooserData.initialPlayer));
        if (initiator.leaderName) {
            initiatorIcon.setAttribute("data-tooltip-content", Locale.compose(initiator.leaderName));
        }
        this.Root.appendChild(initiatorIcon);
        const warDetailsContainer = document.createElement("div");
        warDetailsContainer.classList.value = "flex flex-col grow mt-2 relative";
        const warData = Game.Diplomacy.getWarData(this._warChooserData.uniqueID, GameContext.localPlayerID);
        const warNameElement = document.createElement("div");
        warNameElement.classList.value = "font-title text-sm uppercase text-center mb-2";
        warNameElement.innerHTML = warData.warName;
        warDetailsContainer.appendChild(warNameElement);
        //TODO: Progress bar and support - should work the same as what is in screen-diplomacy-action-details
        const supportBar = document.createElement("div");
        supportBar.classList.value = "flex-auto h-5 war-chooser-item_support-tracker relative";
        warDetailsContainer.appendChild(supportBar);
        let supportDelta = 0;
        if (this._warChooserData.initialPlayer == GameContext.localPlayerID || localPlayer.Diplomacy.hasAllied(this._warChooserData.initialPlayer) || Game.Diplomacy.getSupportingPlayersWithBonusEnvoys(this._warChooserData.uniqueID).includes(GameContext.localPlayerID)) {
            bg.classList.add("-scale-x-100");
            supportDelta = Game.Diplomacy.getSupportingPlayersWithBonusEnvoys(this._warChooserData.uniqueID).length - Game.Diplomacy.getOpposingPlayersWithBonusEnvoys(this._warChooserData.uniqueID).length;
        }
        else if (this._warChooserData.targetPlayer != GameContext.localPlayerID && !localPlayer.Diplomacy.hasAllied(this._warChooserData.targetPlayer) && !Game.Diplomacy.getOpposingPlayersWithBonusEnvoys(this._warChooserData.uniqueID).includes(GameContext.localPlayerID)) {
            bg.classList.add("hidden");
            supportDelta = Game.Diplomacy.getSupportingPlayersWithBonusEnvoys(this._warChooserData.uniqueID).length - Game.Diplomacy.getOpposingPlayersWithBonusEnvoys(this._warChooserData.uniqueID).length;
        }
        else {
            supportBar.classList.add("-scale-x-100");
            supportDelta = Game.Diplomacy.getOpposingPlayersWithBonusEnvoys(this._warChooserData.uniqueID).length - Game.Diplomacy.getSupportingPlayersWithBonusEnvoys(this._warChooserData.uniqueID).length;
        }
        const supportBarBorder = document.createElement("div");
        supportBarBorder.classList.value = "size-full war-chooser-item_war-support-bar-border";
        supportBar.appendChild(supportBarBorder);
        const supportTracker = document.createElement("div");
        supportTracker.classList.value = "pledge-slots-container h-full absolute";
        // arbitrary cap to limit bar size
        let cappedDelta = supportDelta;
        if (cappedDelta > 20) {
            cappedDelta = 20;
        }
        if (cappedDelta < -20) {
            cappedDelta = -20;
        }
        // normalize to map from 0-20 to 0-50
        const normalizedDelta = (cappedDelta * 50) / 20;
        if (normalizedDelta > 0) {
            supportTracker.style.right = "50%";
        }
        else {
            supportTracker.style.left = "50%";
        }
        supportTracker.style.width = Math.abs(normalizedDelta).toString() + "%";
        supportBar.appendChild(supportTracker);
        const supportDeltaElement = document.createElement("div");
        supportDeltaElement.classList.value = "font-title text-sm text-center";
        supportDeltaElement.innerHTML = supportDelta > 0 ? "+" + supportDelta : supportDelta.toString();
        warDetailsContainer.appendChild(supportDeltaElement);
        this.Root.appendChild(warDetailsContainer);
        const target = Configuration.getPlayer(this._warChooserData.targetPlayer);
        if (!target.leaderTypeName) {
            console.error("war-chooser-item: Attempting to assign target leader icon, but no valid leaderTypeName!");
            return;
        }
        const targetIcon = document.createElement("leader-icon");
        targetIcon.classList.add("mx-2", "w-16", "h-16", "my-3");
        targetIcon.setAttribute("leader", target.leaderTypeName);
        targetIcon.setAttribute("bg-color", UI.Player.getPrimaryColorValueAsString(this._warChooserData.targetPlayer));
        if (target.leaderName) {
            targetIcon.setAttribute("data-tooltip-content", Locale.compose(target.leaderName));
        }
        this.Root.appendChild(targetIcon);
    }
}
Controls.define('war-chooser-item', {
    createInstance: WarChooserItem,
    description: 'A chooser item to be used with the diplomacy actions panel',
    classNames: ['war-chooser-item', "relative"],
    styles: [
        'fs://game/base-standard/ui/chooser-item/chooser-item.css',
        'fs://game/base-standard/ui/diplomacy-chooser-items/war-chooser-item.css',
    ],
    images: ['fs://game/hud_sidepanel_list-bg.png', 'fs://game/hud_list-focus_frame.png', 'fs://game/hud_turn-timer.png', 'fs://game/hud_civics-icon_frame.png'],
    attributes: [{ name: 'reveal' }]
});
//# sourceMappingURL=file:///base-standard/ui/diplomacy-chooser-items/war-chooser-item.js.map
