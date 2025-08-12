/**
 * @file relationship-tooltip
 * @copyright 2023, Firaxis Games
 * @description Custom tooltip for the relationship buttons.
 */
import TooltipManager from '/core/ui/tooltips/tooltip-manager.js';
import DiplomacyManager from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import { RelationshipBreakdown } from '/base-standard/ui/relationship-breakdown/relationship-breakdown.js';
export class RelationshipTooltipType {
    constructor() {
        // Flip this bool to see the debugging tooltip information as you move the cursor around 
        this.showDebugInformation = false;
        this.tooltip = null;
        this.hoveredPlayerID = null;
    }
    getHTML() {
        this.tooltip = document.createElement('fxs-tooltip');
        this.tooltip.classList.add('w-128');
        if (this.fragment) {
            this.tooltip.appendChild(this.fragment);
        }
        return this.tooltip;
    }
    reset() {
        this.fragment = document.createDocumentFragment();
        while (this.tooltip?.hasChildNodes()) {
            this.tooltip.removeChild(this.tooltip.lastChild);
        }
    }
    isUpdateNeeded(target) {
        const playerIDString = target.getAttribute("data-player-id");
        if (!playerIDString) {
            this.hoveredPlayerID = null;
            if (!this.fragment) {
                return true;
            }
            return false;
        }
        const playerID = playerIDString ? parseInt(playerIDString) : PlayerIds.NO_PLAYER;
        if (playerID != this.hoveredPlayerID || (playerID == this.hoveredPlayerID && !this.fragment)) {
            this.hoveredPlayerID = playerID;
            return true;
        }
        return false;
    }
    update() {
        const playerID = this.hoveredPlayerID != PlayerIds.NO_PLAYER && this.hoveredPlayerID != null ? this.hoveredPlayerID : DiplomacyManager.selectedPlayerID;
        const player = Players.get(playerID);
        if (player === null) {
            console.error("relationship-tooltip: Attempting to update relationship info screen, but unable to get selected player library");
            return;
        }
        const playerDiplomacy = player.Diplomacy;
        if (playerDiplomacy === undefined) {
            console.error("relationship-tooltip: Attempting to update relationship info screen, but unable to get selected player diplomacy library");
            return;
        }
        const relationshipHeader = document.createElement("div");
        relationshipHeader.classList.add('flex', 'flex-col', 'justify-center', 'items-center', 'w-full');
        const relationshipTitle = document.createElement("div");
        relationshipTitle.classList.add("text-sm", "font-title");
        relationshipHeader.appendChild(relationshipTitle);
        this.fragment?.appendChild(relationshipHeader);
        if (playerDiplomacy.isAtWarWith(GameContext.localPlayerID) && this.hoveredPlayerID != PlayerIds.NO_PLAYER && this.hoveredPlayerID) {
            //If we are at war with a player, show war weariness tooltip instead of relationship breakdown
            relationshipTitle.innerHTML = Locale.stylize("LOC_DIPLOMACY_WAR_WEARINESS");
            let warID = -1;
            const jointEvents = Game.Diplomacy.getJointEvents(GameContext.localPlayerID, this.hoveredPlayerID, false);
            if (jointEvents.length > 0) {
                jointEvents.forEach(jointEvent => {
                    if (jointEvent.actionTypeName == "DIPLOMACY_ACTION_DECLARE_WAR") {
                        warID = jointEvent.uniqueID;
                    }
                    ;
                });
            }
            if (warID == -1) {
                console.error("relationship-tooltip: Attempting to get war data, but there is no valid warID");
                return;
            }
            const warEventHeader = Game.Diplomacy.getDiplomaticEventData(warID);
            const warData = Game.Diplomacy.getProjectDataForUI(warEventHeader.initialPlayer, -1, DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET, DiplomacyActionGroups.NO_DIPLOMACY_ACTION_GROUP, -1, DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET).find(project => project.actionID == warID);
            if (warData == undefined) {
                console.error("relationship-tooltip: Attempting to get war data, but there is no valid DiplomaticProjectUIData for the war diplomatic event");
                return;
            }
            const warInfo = document.createElement("div");
            warInfo.classList.value = "font-body text-xs min-w-72";
            if (warEventHeader.initialPlayer == GameContext.localPlayerID) {
                //We are the initiator, calculate war weariness based on support
                const totalSupport = warData.supportingEnvoys.length - warData.opposingEnvoys.length;
                //TODO: Show war weariness levels and effect once data access is implemented
                if (totalSupport < 0) {
                    //We are gaining war weariness
                    warInfo.innerHTML = Locale.stylize("LOC_WAR_TOOLTIP_RECEIVING_WAR_WEARINESS", player.name);
                }
                else if (totalSupport == 0) {
                    warInfo.innerHTML = Locale.stylize("LOC_WAR_TOOLTIP_NO_WAR_WEARINESS");
                }
                else {
                    warInfo.innerHTML = Locale.stylize("LOC_WAR_TOOLTIP_GIVING_WAR_WEARINESS", player.name);
                }
            }
            else {
                //We are the target, calculate war weariness based on opposition
                const totalSupport = warData.supportingEnvoys.length - warData.opposingEnvoys.length;
                //TODO: Show war weariness levels and effect once data access is implemented
                if (totalSupport < 0) {
                    //We are gaining war weariness
                    warInfo.innerHTML = Locale.stylize("LOC_WAR_TOOLTIP_GIVING_WAR_WEARINESS", player.name);
                }
                else if (totalSupport == 0) {
                    warInfo.innerHTML = Locale.stylize("LOC_WAR_TOOLTIP_NO_WAR_WEARINESS");
                }
                else {
                    warInfo.innerHTML = Locale.stylize("LOC_WAR_TOOLTIP_RECEIVING_WAR_WEARINESS", player.name);
                }
            }
            this.fragment?.appendChild(warInfo);
            return;
        }
        const relationshipBreakdown = new RelationshipBreakdown(playerID);
        this.fragment?.appendChild(relationshipBreakdown.root);
        //Agenda!
        const agendaNames = Game.Diplomacy.getAgendaNames(playerID);
        if (player != null && player.isAI && agendaNames.length > 0) {
            const agendaDescs = Game.Diplomacy.getAgendaDescriptions(playerID);
            const agendaTitle = document.createElement("div");
            agendaTitle.classList.add("relationship-tooltip__agenda-title");
            agendaTitle.innerHTML = Locale.stylize("LOC_DIPLOMACY_AGENDA_TITLE");
            this.fragment?.appendChild(agendaTitle);
            for (let i = 0; i < agendaNames.length && i < agendaDescs.length; i++) {
                const agendaName = document.createElement("div");
                agendaName.classList.add("relationship-tooltip__agenda-name");
                agendaName.innerHTML = Locale.stylize(agendaNames[i]);
                this.fragment?.appendChild(agendaName);
                const agendaDesc = document.createElement("div");
                agendaDesc.classList.add("relationship-tooltip__agenda-description");
                if (i + 1 < agendaNames.length) {
                    agendaDesc.classList.add("mb-2");
                }
                agendaDesc.innerHTML = Locale.stylize(agendaDescs[i]);
                this.fragment?.appendChild(agendaDesc);
            }
        }
    }
    isBlank() {
        return false;
    }
}
class SanctionTooltipType {
    constructor() {
        this.tooltip = null;
        this.hoveredPlayerID = null;
    }
    getHTML() {
        this.tooltip = document.createElement('fxs-tooltip');
        this.tooltip.classList.add('relationship-tooltip');
        this.tooltip.appendChild(this.fragment);
        return this.tooltip;
    }
    reset() {
        this.fragment = document.createDocumentFragment();
        while (this.tooltip?.hasChildNodes()) {
            this.tooltip.removeChild(this.tooltip.lastChild);
        }
    }
    isUpdateNeeded(target) {
        const playerIDString = target.getAttribute("data-player-id");
        const playerID = playerIDString ? parseInt(playerIDString) : PlayerIds.NO_PLAYER;
        if (playerID != this.hoveredPlayerID || (playerID == this.hoveredPlayerID && !this.fragment)) {
            this.hoveredPlayerID = playerID;
            return true;
        }
        return false;
    }
    update() {
        const playerID = this.hoveredPlayerID != PlayerIds.NO_PLAYER && this.hoveredPlayerID != null ? this.hoveredPlayerID : DiplomacyManager.selectedPlayerID;
        const playerLibrary = Players.get(playerID);
        if (!playerLibrary) {
            console.error("relationship-tooltip: Attempting to update relationship info screen, but unable to get selected player diplomacy library");
            return;
        }
        const sanctionsHeader = document.createElement("div");
        sanctionsHeader.classList.add("flex", "flex-col", "items-center", "justify-center", "w-full");
        const sanctionsTitle = document.createElement("div");
        sanctionsTitle.classList.add("relationship-tooltip__relationship-title", "font-title");
        sanctionsTitle.innerHTML = Locale.stylize("LOC_DIPLOMACY_SANCTIONS_TOOLTIP_TITLE");
        sanctionsHeader.appendChild(sanctionsTitle);
        const sanctionsInfo = document.createElement("div");
        sanctionsInfo.classList.value = "font-body text-xs min-w-72";
        sanctionsInfo.innerHTML = Locale.stylize("LOC_DIPLOMACY_SANCTIONS_TOOLTIP", playerLibrary.name);
        sanctionsHeader.appendChild(sanctionsInfo);
        this.fragment.appendChild(sanctionsHeader);
    }
    isBlank() {
        return false;
    }
}
TooltipManager.registerType('relationship', new RelationshipTooltipType());
TooltipManager.registerType('sanction', new SanctionTooltipType());

//# sourceMappingURL=file:///base-standard/ui/tooltips/relationship-tooltip.js.map
