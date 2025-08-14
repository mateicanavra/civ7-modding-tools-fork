/**
 * @file Land Claim Flag Manager
 * @copyright 2021, Firaxis Games
 * @description Land claim flags, management layer.
 */
import { PlotCoord } from '/core/ui/utilities/utilities-plotcoord.js';
class LandClaimFlagManager extends Component {
    constructor() {
        super(...arguments);
        this.diplomacyEventStartedListener = (data) => { this.onDiplomacyEventStarted(data); };
        this.diplomacyEventSupportChangedListener = (data) => { this.onDiplomacyEventSupportChanged(data); };
        this.diplomacyEventEndedListener = (data) => { this.onDiplomacyEventEnded(data); };
        this.globalHideListener = () => { this.onGlobalHide(); };
        this.globalShowListener = () => { this.onGlobalShow(); };
        this.plotVisibilityChangedListener = (data) => { this.onPlotVisibilityChanged(data); };
        this.localPlayerTurnBeginListener = () => { this.onLocalPlayerTurnBegin(); };
        this.landClaimFlagGroup = WorldUI.createModelGroup("LandClaimFlagGroup");
        this.landClaimPlotMap = new Map();
        this.landClaimTextMap = new Map();
    }
    onAttach() {
        super.onAttach();
        engine.on('DiplomacyEventStarted', this.diplomacyEventStartedListener);
        engine.on('DiplomacyEventSupportChanged', this.diplomacyEventSupportChangedListener);
        engine.on('DiplomacyEventEnded', this.diplomacyEventEndedListener);
        engine.on('PlotVisibilityChanged', this.plotVisibilityChangedListener);
        engine.on('LocalPlayerTurnBegin', this.localPlayerTurnBeginListener);
        window.addEventListener('ui-hide-land-claim-flags', this.globalHideListener);
        window.addEventListener('ui-show-land-claim-flags', this.globalShowListener);
        // restore land claim flags on load
        const events = Game.Diplomacy.getActiveEvents();
        for (let i = 0; i < events.length; i++) {
            if (events[i].actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_LAND_CLAIM) {
                continue;
            }
            const landClaimData = Game.Diplomacy.getLandClaimData(events[i].uniqueID);
            const plotIndex = GameplayMap.getIndexFromLocation(landClaimData.location);
            this.landClaimPlotMap.set(plotIndex, events[i].initialPlayer);
        }
        this.updateLandClaimFlags();
    }
    onDetach() {
        engine.off('DiplomacyEventStarted', this.diplomacyEventStartedListener);
        engine.off('DiplomacyEventEnded', this.diplomacyEventEndedListener);
        engine.off('PlotVisibilityChanged', this.plotVisibilityChangedListener);
        engine.off('LocalPlayerTurnBegin', this.localPlayerTurnBeginListener);
        window.removeEventListener('ui-hide-land-claim-flags', this.globalHideListener);
        window.removeEventListener('ui-show-land-claim-flags', this.globalShowListener);
        super.onDetach();
    }
    onDiplomacyEventStarted(data) {
        if (data.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_LAND_CLAIM) {
            return;
        }
        if (data.initialPlayer != undefined && data.location) {
            const plotIndex = GameplayMap.getIndexFromLocation(data.location);
            this.landClaimPlotMap.set(plotIndex, data.initialPlayer);
            this.updateLandClaimFlags();
        }
    }
    onDiplomacyEventSupportChanged(data) {
        const kEvent = Game.Diplomacy.getDiplomaticEventData(data.actionID);
        if (kEvent.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_LAND_CLAIM) {
            return;
        }
        const landClaimData = Game.Diplomacy.getLandClaimData(kEvent.uniqueID);
        const plotIndex = GameplayMap.getIndexFromLocation(landClaimData.location);
        if (!this.landClaimTextMap.has(plotIndex)) {
            return;
        }
        let banner = this.landClaimTextMap.get(plotIndex);
        if (banner) {
            this.updateFlagTurnTextFromEvent(banner, kEvent);
        }
    }
    onDiplomacyEventEnded(data) {
        if (data.location) {
            const plotIndex = GameplayMap.getIndexFromLocation(data.location);
            this.landClaimPlotMap.delete(plotIndex);
            // if we have a text object attached to this flag, delete it from the DOM now
            let banner = this.landClaimTextMap.get(plotIndex);
            if (banner) {
                this.Root.removeChild(banner);
            }
            this.updateLandClaimFlags();
        }
    }
    onPlotVisibilityChanged(data) {
        if (data.changedBy.owner && data.changedBy.owner == GameContext.localPlayerID) {
            const plotIndex = GameplayMap.getIndexFromLocation(data.location);
            if (this.landClaimPlotMap.has(plotIndex)) {
                this.updateLandClaimFlags();
            }
        }
    }
    onLocalPlayerTurnBegin() {
        this.updateLandClaimFlags();
    }
    updateLandClaimFlags() {
        this.landClaimFlagGroup.clear();
        this.landClaimPlotMap.forEach((playerId, plotIndex) => {
            const plotLocation = GameplayMap.getLocationFromIndex(plotIndex);
            const revealedState = GameplayMap.getRevealedState(GameContext.localPlayerID, plotLocation.x, plotLocation.y);
            if (revealedState == RevealedStates.HIDDEN) {
                return;
            }
            const playerPrimaryColor = UI.Player.getPrimaryColorValueAsHex(playerId);
            const playerSecondaryColor = UI.Player.getSecondaryColorValueAsHex(playerId);
            this.landClaimFlagGroup.addModelAtPlot('UI_Land_Claim_Flag', { i: plotLocation.x, j: plotLocation.y }, { x: -0.2, y: 0, z: 0 }, { angle: 0, alpha: 1.0, tintColor1: playerPrimaryColor, tintColor2: playerSecondaryColor });
            if (!this.landClaimTextMap.has(plotIndex)) {
                const banner = document.createElement("land-claim-flag");
                banner.setAttribute('data-bind-attributes', PlotCoord.toString(plotLocation));
                this.Root.appendChild(banner);
                this.updateFlagTurnText(banner, plotLocation, playerId);
                this.landClaimTextMap.set(plotIndex, banner);
            }
            else {
                let banner = this.landClaimTextMap.get(plotIndex);
                if (banner) {
                    this.updateFlagTurnText(banner, plotLocation, playerId);
                }
            }
        });
    }
    updateFlagTurnText(banner, plotLocation, playerId) {
        const events = Game.Diplomacy.getPlayerEvents(playerId);
        for (let i = 0; i < events.length; i++) {
            const kEvent = events[i];
            if (kEvent.initialPlayer != playerId) {
                continue;
            }
            if (kEvent.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_LAND_CLAIM) {
                continue;
            }
            const landClaimData = Game.Diplomacy.getLandClaimData(kEvent.uniqueID);
            if (landClaimData.location.x != plotLocation.x || landClaimData.location.y != plotLocation.y) {
                continue;
            }
            this.updateFlagTurnTextFromEvent(banner, kEvent);
        }
    }
    updateFlagTurnTextFromEvent(banner, kEvent) {
        const completionData = Game.Diplomacy.getCompletionData(kEvent.uniqueID);
        if (completionData.bWillComplete) {
            banner.setAttribute('data-string', Locale.compose("LOC_UI_LAND_CLAIM_TURNS", completionData.turnsToCompletion));
        }
        else if (completionData.bWillCancel) {
            banner.setAttribute('data-string', Locale.compose("LOC_UI_LAND_CLAIM_STALLED"));
        }
        else {
            if (kEvent.support == 0) {
                banner.setAttribute('data-string', Locale.compose("LOC_UI_LAND_CLAIM_STALLED"));
            }
            else {
                if (completionData.requiredTokensToComplete == 1) {
                    const remainingProgress = kEvent.completionScore - kEvent.progressScore;
                    if (remainingProgress < completionData.turnsCounted) {
                        banner.setAttribute('data-string', Locale.compose("LOC_UI_LAND_CLAIM_TURNS", remainingProgress));
                    }
                    else {
                        banner.setAttribute('data-string', Locale.compose("LOC_UI_LAND_CLAIM_TURNS_PLUS", completionData.turnsCounted));
                    }
                }
                else {
                    banner.setAttribute('data-string', Locale.compose("LOC_UI_LAND_CLAIM_TURNS_PLUS", completionData.turnsCounted));
                }
            }
        }
    }
    onGlobalHide() {
        this.landClaimFlagGroup.clear();
        this.landClaimTextMap.forEach((element) => {
            element.classList.add("hidden");
        });
    }
    onGlobalShow() {
        this.updateLandClaimFlags();
        this.landClaimTextMap.forEach((element) => {
            element.classList.remove("hidden");
        });
    }
}
Controls.define('land-claim-flags', {
    createInstance: LandClaimFlagManager,
    description: 'Land Claim Flag Manager',
    attributes: []
});

//# sourceMappingURL=file:///base-standard/ui/land-claim-flag/land-claim-flag-manager.js.map
