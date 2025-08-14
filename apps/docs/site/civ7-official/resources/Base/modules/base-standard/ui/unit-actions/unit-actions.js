/**
 * @file unit-actions.ts
 * @copyright 2024-2025, Firaxis Games
 * @description Unit information and actions raised by manager.
 */
import { Audio } from '/core/ui/audio-base/audio-support.js';
import DialogManager, { DialogBoxAction } from '/core/ui/dialog-box/manager-dialog-box.js';
import ActionHandler from '/core/ui/input/action-handler.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
import { UnitActionHandlers } from '/base-standard/ui/unit-interact/unit-action-handlers.js';
import UnitSelection from '/base-standard/ui/unit-selection/unit-selection.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { InputEngineEventName } from '/core/ui/input/input-support.js';
import PlotCursor from '/core/ui/input/plot-cursor.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
import WorldInput from '/base-standard/ui/world-input/world-input.js';
import { displayRequestUniqueId } from '/core/ui/context-manager/display-handler.js';
import { Focus } from '/core/ui/input/focus-support.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { UpdateOperationTargetEvent } from '/base-standard/ui/lenses/layer/operation-target-layer.js';
import { UnitRenameConfirmEventName, UnitRenameHideStatusToggledEventName } from '/base-standard/ui/unit-rename/unit-rename.js';
var UnitActionPanelState;
(function (UnitActionPanelState) {
    UnitActionPanelState[UnitActionPanelState["HIDDEN"] = 0] = "HIDDEN";
    UnitActionPanelState[UnitActionPanelState["ANIMATEIN"] = 1] = "ANIMATEIN";
    UnitActionPanelState[UnitActionPanelState["ANIMATEOUT"] = 2] = "ANIMATEOUT";
    UnitActionPanelState[UnitActionPanelState["VISIBLE"] = 3] = "VISIBLE";
})(UnitActionPanelState || (UnitActionPanelState = {}));
export var UnitActionCategory;
(function (UnitActionCategory) {
    UnitActionCategory[UnitActionCategory["NONE"] = 0] = "NONE";
    UnitActionCategory[UnitActionCategory["MAIN"] = 1] = "MAIN";
    UnitActionCategory[UnitActionCategory["COMMAND"] = 2] = "COMMAND";
    UnitActionCategory[UnitActionCategory["HIDDEN"] = 3] = "HIDDEN";
})(UnitActionCategory || (UnitActionCategory = {}));
const STARTING_INNER_HTML = `
<fxs-spatial-slot class="relative flex items-center unit-actions__main-container min-w-84 h-full" data-navrule-up="stop" data-navrule-left="stop">
	<div class="unit-actions__shelf-container h-full flex flex-row">
		<fxs-activatable class="flex pointer-events-auto unit-actions__shelf-button">
			<div class="unit-actions__shelf-button-highlight absolute inset-0"></div>
			<div class="unit-actions__shelf-button-icon relative flex bg-no-repeat bg-cover self-center w-4 h-6 pointer-events-none"></div>
		</fxs-activatable>
		<div class="unit-actions__hidden-column-bg">
			<div class="unit-actions__hidden-actions flex flex-col m-3 flex-wrap"></div>
		</div>
	</div>

	<div class="flex flex-col min-w-84 relative h-full justify-center">
		<div class="unit-action__portrait-stats-row flex flex-row items-end ml-2\\.5 mr-2\\.5">
			<div class="unit-actions__unit-portrait-container flex">
				<div class="unit-actions__unit-portrait-background flex center w-28 h-28">
				<div class="unit-actions__unit-portrait-image flex center self-center w-19 h-19">
						<div class="unit-actions__unit-health-bar-container relative flex flex-auto h-3 items-center self-end mx-0\\.5">
							<div class="unit-action__unit-health-bar-bg absolute inset-0\\.5">
								<div class="unit-action__unit-health-progress-bar h-2"></div>
							</div>
						</div>
					</div>
				</div>							
			</div>
			<div class="unit-actions__stats-column flex relative flex-col mb-2\\.5">
				<div class="unit-actions__unit-identifier-container flex space-between items-center trigger-nav-help relative flex-row justify-start">
					<fxs-nav-help action-key="inline-cycle-previous"></fxs-nav-help>
					<p class="unit-actions__unit-name font-title-base uppercase flex relative pointer-events-none -mr-0\\.5 max-w-162 h-auto"></p>
					<fxs-nav-help class= "ml-2\\.5" action-key="inline-cycle-next"></fxs-nav-help>
				</div>
				<div class="unit-actions__filigree-container flex-row justify-center items-center mt-1">
					<div class="unit-actions__name-filigree-left flex w-32 h-4"></div>
					<div class="unit-actions__name-filigree-center flex w-32 h-10"></div>
					<div class="unit-actions__name-filigree-right flex w-32 h-4"></div>
				</div>
				<div class="unit-actions__stats_container">	
					<div class="unit-actions__unit-stats-container flex relative flex-row justify-center mt-2\\.5">
						<div role="paragraph" class="unit-actions__hit-points-container flex flex-col items-center pointer-events-auto">
							<div class="unit-actions__hit-points-icon flex size-7 bg-contain bg-no-repeat"></div>
							<div class="unit-actions__hit-points-value self-center font-body-base">000/000</div>
						</div>
						<div class="unit-actions__stat-div"></div>
						<div role="paragraph" class="unit-actions__move-points-container pointer-events-auto flex flex-col items-center">
							<div class="unit-actions__move-points-icon flex size-7"></div>
							<div class="unit-actions__move-points-value self-center font-body-base">000/000</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div>
			<div class="unit-actions__action-row-container my-1\\.25 mx-5">
				<div class="unit-actions__action-row-bg">
					<div class="unit-actions__standard-actions flex flex-row">
					</div>
				</div>
			</div>
			<div class="unit-actions__action-row-container my-1\\.25 mx-5">
				<div class="unit-actions__action-row-bg">
					<div class="flex flex-row unit-actions__commander-actions flex flex-row">
					</div>
				</div>
			</div>
		</div>
		<div class="unit-actions__commander-banner-container w-full justify-center absolute flex-auto -top-12 right-1\\/2">
			<div class="unit-actions__commander-banner-bg px-5 relative self-center h-18">
				<div class="unit-action__commander-info-container flex flex-auto items-center trigger-nav-help">
					<div class="unit-actions__commander-level-container relative bg-cover  bg-no-repeat size-16">
						<fxs-ring-meter class="unit-actions__commander-xp-meter relative w-8\\.25 h-8\\.25 mt-2\\.5 mb-3\\.5"></fxs-ring-meter>
						<p class="unit-actions__commander-level-value absolute pointer-events-none top-6 left-3\\.5 w-9 justify-center">#</p>
					</div>
					<fxs-edit-button class="unit-actions_commander-edit-button size-5 bg-contain bg-no-repeat bg-center mb-2\\.5 mr-2" tabindex="-1"></fxs-edit-button>
					<div class="flex space-between items-center mb-2\\.5">
						<fxs-nav-help class="mr-1" action-key="inline-cycle-previous"></fxs-nav-help>
						<p class="unit-actions_commander-name relative flex-auto font-title-base max-w-80 font-fit-shrink truncate"></p>
						<fxs-nav-help class="ml-2\\.5" action-key="inline-cycle-next"></fxs-nav-help>
					</div>
				</div>
			</div>
		</div>
		<unit-rename class="-top-72 hidden"></unit-rename>
	</div>
	
	<div class="absolute h-full flex items-center justify-end unit-actions__action-panel-decor w-14 -right-9"></div>
</fxs-spatial-slot>

`;
class UnitActions extends Panel {
    get isCyclable() {
        const player = Players.get(GameContext.localPlayerID);
        const hasMoreThanOneUnit = player && player.Units ? player.Units.getUnits().length >= 2 : false;
        return hasMoreThanOneUnit;
    }
    constructor(root) {
        super(root);
        this.unitId = null;
        this.isCommander = false;
        this.isInArmy = false;
        this.animTimer = 0;
        /// Are events subscribed to?
        this.isSubscribed = false;
        this._currentState = UnitActionPanelState.HIDDEN;
        this.mainContainer = null;
        this.panelDecor = null;
        // actions
        this.actions = [];
        this.standardContainer = null;
        this.commanderContainer = null;
        this.standardActions = [];
        this.commandActions = [];
        this.hiddenActions = [];
        this.standardActionElements = [];
        this.commandActionElements = [];
        this.hiddenActionElements = [];
        // info
        this.unitNameDiv = null;
        this.unitNameFiligreeContainer = null;
        this.commanderNameDiv = null;
        this.commanderBannerContainer = null;
        this.commanderLevelValue = null;
        this.commanderXPMeter = null;
        this.portraitContainer = null;
        this.portraitImage = null;
        this.identifierRow = null;
        this.healthValueDiv = null;
        this.unitHealthbar = null;
        this.moveValueDiv = null;
        this.unitStatsContainer = null;
        this.portraitStatsRow = null;
        this.statInstances = [];
        this.statDividers = [];
        this.commanderNameEditButton = null;
        this.MEDIUM_HEALTH_THRESHHOLD = .75; // thresholds for healthbar color changes in unit percentage
        this.LOW_HEALTH_THRESHHOLD = .5;
        this.unitCycleNavHelpContainer = null;
        this.unitNavHelpWorldAnchorHandle = null;
        this.dialogId = displayRequestUniqueId();
        this.unitReselectedListener = this.onUnitReselected.bind(this);
        this.onGlobalShowListener = this.onGlobalShow.bind(this);
        this.onGlobalHideListener = this.onGlobalHide.bind(this);
        this.onViewReceiveFocusListener = this.onViewReceiveFocus.bind(this);
        this.onUnitHotkeyListener = this.onUnitHotkey.bind(this);
        this.onEngineInputListener = this.onEngineInput.bind(this);
        this.onNavigateListener = this.onNavigateInput.bind(this);
        this.shelfFocusoutListener = this.onShelfFocusout.bind(this);
        this.shelfFocusInListener = this.onShelfFocused.bind(this);
        this.shelfToggleListener = this.toggleShelfOpen.bind(this);
        this.onCommanderEditPressedListener = this.onCommanderEditPressed.bind(this);
        this.infoContainerEngineInputListener = this.onInfoContainerEngineInput.bind(this);
        this.onCommanderNameConfirmedListener = this.onCommanderNameConfirmed.bind(this);
        this.onCommanderNameHideStatusToggledListener = this.onCommanderNameHideStatusToggled.bind(this);
        this.raiseUnitSelectionListener = this.onRaiseUnitSelection.bind(this);
        this.lowerUnitSelectionListener = this.onLowerUnitSelection.bind(this);
        this.updateFocusGate = new UpdateGate(() => {
            if (this.unitId == null || ComponentID.isInvalid(this.unitId)) {
                // It's valid to have no unitId once an action has completed.
                return;
            }
            if (this.currentState == UnitActionPanelState.VISIBLE) {
                this.realizeFocus();
            }
        });
        this.animateInType = this.animateOutType = AnchorType.RelativeToBottomRight;
    }
    static getIconsToPreload() {
        const iconsToPreload = new Set();
        for (const entry of GameInfo.UnitCommands) {
            if (entry.Icon) {
                // NOTE: Currently the icon entry is a URL.  In the future, this will be replaced with an ICON *tag*. 
                // Preloading will then be the responsibility of the icon manager.
                iconsToPreload.add(entry.Icon);
            }
        }
        for (const entry of GameInfo.UnitOperations) {
            if (entry.Icon) {
                // NOTE: Currently the icon entry is a URL.  In the future, this will be replaced with an ICON *tag*. 
                // Preloading will then be the responsibility of the icon manager.
                iconsToPreload.add(entry.Icon);
            }
        }
        return Array.from(iconsToPreload);
    }
    get currentState() {
        return this._currentState;
    }
    set currentState(_state) {
        switch (_state) {
            case UnitActionPanelState.ANIMATEIN:
                this.Root.classList.toggle('unit-actions--anim-out', false);
                this.updateLayout();
                clearTimeout(this.animTimer);
                this.animTimer = setTimeout(() => {
                    this.realizeButtons();
                    this.currentState = UnitActionPanelState.VISIBLE;
                    this.updateFocusGate.call('animationComplete');
                }, UnitActions.ANIM_DELAY);
                this.Root.classList.toggle('unit-actions--anim-in', true);
                break;
            case UnitActionPanelState.ANIMATEOUT:
                this.Root.classList.toggle('unit-actions--anim-in', false);
                clearTimeout(this.animTimer);
                this.animTimer = setTimeout(() => {
                    this.currentState = UnitActionPanelState.HIDDEN;
                }, UnitActions.ANIM_DELAY);
                this.Root.classList.toggle('unit-actions--anim-out', true);
                break;
            case UnitActionPanelState.HIDDEN:
                this.Root.classList.remove('unit-actions--anim-out');
                this.portraitContainer?.classList.toggle("isInArmy", false);
                this.identifierRow?.classList.toggle("isCommander", false);
                this.identifierRow?.classList.toggle("trigger-nav-help", false);
                this.commanderBannerContainer?.classList.toggle("isCommander", false);
                this.unitNameFiligreeContainer?.classList.toggle("isInArmyNotCommander", false);
                break;
            case UnitActionPanelState.VISIBLE:
                this.realizeButtons();
                break;
            default:
                console.error(`Bad state enum of ${_state} attempting to be set to unit-actions->currentState`);
                return;
        }
        this._currentState = _state;
    }
    onAttach() {
        // No super.
        engine.on('DebugWidgetUpdated', this.onDebugWidgetUpdated, this);
        engine.on("UnitOperationSegmentComplete", this.onUnitOperationSegmentComplete, this);
        engine.on("UnitOperationDeactivated", this.onUnitOperationDeactivated, this);
        engine.on("UnitOperationsCleared", this.onUnitOperationUpdated, this);
        engine.on("UnitOperationAdded", this.onUnitOperationUpdated, this);
        this.Root.addEventListener('engine-input', this.onEngineInputListener);
        this.Root.addEventListener('navigate-input', this.onNavigateListener);
        this.commanderNameEditButton?.addEventListener('action-activate', this.onCommanderEditPressedListener);
        this.commanderInfoContainer.addEventListener(InputEngineEventName, this.infoContainerEngineInputListener);
        this.commanderRenameElement.addEventListener(UnitRenameConfirmEventName, this.onCommanderNameConfirmedListener);
        this.commanderRenameElement.addEventListener(UnitRenameHideStatusToggledEventName, this.onCommanderNameHideStatusToggledListener);
        UnitSelection.onLower.on(this.lowerUnitSelectionListener);
        UnitSelection.onRaise.on(this.raiseUnitSelectionListener);
    }
    onDetach() {
        engine.off('DebugWidgetUpdated', this.onDebugWidgetUpdated, this);
        engine.off("UnitOperationSegmentComplete", this.onUnitOperationSegmentComplete, this);
        engine.off("UnitOperationDeactivated", this.onUnitOperationDeactivated, this);
        engine.off("UnitOperationsCleared", this.onUnitOperationUpdated, this);
        engine.off("UnitOperationAdded", this.onUnitOperationUpdated, this);
        this.Root.removeEventListener('engine-input', this.onEngineInputListener);
        this.Root.removeEventListener('navigate-input', this.onNavigateListener);
        this.commanderNameEditButton?.removeEventListener('action-activate', this.onCommanderEditPressedListener);
        this.commanderInfoContainer.removeEventListener(InputEngineEventName, this.infoContainerEngineInputListener);
        this.commanderRenameElement.removeEventListener(UnitRenameConfirmEventName, this.onCommanderNameConfirmedListener);
        this.commanderRenameElement.removeEventListener(UnitRenameHideStatusToggledEventName, this.onCommanderNameHideStatusToggledListener);
        this.shutdown();
        UnitSelection.onLower.off(this.lowerUnitSelectionListener);
        UnitSelection.onRaise.off(this.raiseUnitSelectionListener);
        // No super.
    }
    onInitialize() {
        super.onInitialize();
        this.Root.classList.add('opacity-0', 'translate-x-full', 'pointer-events-auto');
        this.Root.innerHTML = STARTING_INNER_HTML;
        this.getElements();
        // Register debug widget.
        const disableUnitActions = {
            id: 'disableUnitActions',
            category: 'HUD',
            caption: 'Disable Unit Actions panel',
            domainType: 'bool',
            value: false,
        };
        UI.Debug.registerWidget(disableUnitActions);
        this.startup();
    }
    getElements() {
        this.shelfButton = MustGetElement(".unit-actions__shelf-button", this.Root);
        this.hiddenContainer = MustGetElement(".unit-actions__hidden-actions", this.Root);
        this.mainContainer = MustGetElement(".unit-actions__main-container", this.Root);
        this.panelDecor = MustGetElement(".unit-actions__action-panel-decor", this.Root);
        this.identifierRow = MustGetElement(".unit-actions__unit-identifier-container", this.Root);
        this.portraitStatsRow = MustGetElement(".unit-action__portrait-stats-row", this.Root);
        this.unitStatsContainer = MustGetElement(".unit-actions__unit-stats-container", this.Root);
        this.portraitContainer = MustGetElement(".unit-actions__unit-portrait-container", this.Root);
        this.commanderLevelValue = MustGetElement(".unit-actions__commander-level-value", this.Root);
        this.commanderXPMeter = MustGetElement(".unit-actions__commander-xp-meter", this.Root);
        this.commanderBannerContainer = MustGetElement(".unit-actions__commander-banner-container", this.Root);
        this.unitHealthbar = MustGetElement(".unit-action__unit-health-progress-bar", this.Root);
        this.unitNameDiv = MustGetElement('.unit-actions__unit-name', this.Root);
        this.commanderNameDiv = MustGetElement('.unit-actions_commander-name', this.Root);
        this.unitNameFiligreeContainer = MustGetElement('.unit-actions__filigree-container', this.Root);
        this.portraitImage = MustGetElement('.unit-actions__unit-portrait-image', this.Root);
        this.commanderInfoContainer = MustGetElement('.unit-action__commander-info-container', this.Root);
        this.commanderNameEditButton = MustGetElement('.unit-actions_commander-edit-button', this.Root);
        this.commanderRenameElement = MustGetElement('unit-rename', this.Root);
        if (!Network.hasAccessUGCPrivilege(false)) {
            this.commanderNameEditButton.remove();
            this.commanderNameEditButton = null;
            this.commanderInfoContainer.querySelector('fxs-nav-help')?.remove();
        }
    }
    startup() {
        const unitComponentID = UI.Player.getHeadSelectedUnit();
        if (ComponentID.isValid(unitComponentID)) {
            this.onRaiseUnitSelection(unitComponentID);
        }
    }
    shutdown() {
        // Get the head componentID for the cleanest of shutdowns; if none-exists, ensure the invalid CID is used (better than nothing.)
        const unitComponentID = (UI.Player.getHeadSelectedUnit() ?? ComponentID.getInvalidID());
        this.onLowerUnitSelection(unitComponentID);
    }
    onUnitOperationUpdated({ unit }) {
        if (ComponentID.isMatch(unit, this.unitId) == false)
            return; // Not for us
        this.realizeButtons();
        this.updateFocusGate.call("unitOperationUpdated");
    }
    onDebugWidgetUpdated(id, value) {
        if (id == 'disableUnitActions') {
            if (value) {
                this.shutdown();
            }
            else {
                this.startup();
            }
        }
    }
    updateLayout() {
        // army unit (no portrait)
        this.portraitContainer?.classList.toggle("isInArmy", this.isInArmy);
        this.identifierRow?.classList.toggle("isCommander", this.isCommander);
        this.identifierRow?.classList.toggle("isInArmy", this.isInArmy);
        // disable the nav help
        this.identifierRow?.classList.toggle("trigger-nav-help", this.isCyclable);
        // completely hide nav help to avoid icon flashing
        this.identifierRow?.classList.toggle("hide-nav-help", !this.isCyclable);
        this.commanderBannerContainer?.classList.toggle("isCommander", this.isCommander);
        this.unitNameFiligreeContainer?.classList.toggle("isInArmyNotCommander", this.isInArmy && !this.isCommander);
        this.mainContainer?.classList.toggle("isInArmy", this.isInArmy);
        this.panelDecor?.classList.toggle("isInArmy", this.isInArmy);
        this.unitStatsContainer?.classList.toggle("isInArmy", this.isInArmy);
        this.unitStatsContainer?.classList.toggle("isCommander", this.isCommander);
        this.portraitStatsRow?.classList.toggle("isInArmy", this.isInArmy);
    }
    /**
     * @param unit the unit selected
     * @param data1 the value of (int) IsReadyToSelect(pkUnit)
    */
    onUnitOperationDeactivated({ unit, data1 }) {
        const headUnit = UI.Player.getHeadSelectedUnit();
        if (!data1 && unit.owner == headUnit?.owner && unit.id == headUnit.id) {
            this.switchToDefault();
        }
    }
    /**
     * @param unit the unit selected
     * @param data1 always set to false atm
    */
    onUnitOperationSegmentComplete({ unit, data1 }) {
        const headUnit = UI.Player.getHeadSelectedUnit();
        if (!data1 && unit.owner == headUnit?.owner && unit.id == headUnit.id) {
            this.switchToDefault();
        }
    }
    switchToDefault() {
        this.currentState = UnitActionPanelState.ANIMATEOUT;
        InterfaceMode.switchToDefault();
    }
    /**
     * Conforms to UnitSelectionListener
     */
    onRaiseUnitSelection(cid) {
        if (cid && ComponentID.isValid(cid)) {
            this.unitId = cid;
        }
        else {
            console.error(`UIP received a bad component ID when raising the panel.`);
            return;
        }
        const unit = Units.get(this.unitId);
        if (!unit) {
            console.error(`UIP could not raise the panel due to missing unit for ${ComponentID.toLogString(this.unitId)}.`);
            return;
        }
        if (!this.isSubscribed) {
            this.isSubscribed = true;
            engine.on('PlayerTurnActivated', this.onPlayerTurnActivated, this);
            engine.on('UnitMovementPointsChanged', this.onUnitMovementPointsChanged, this);
            window.addEventListener('unit-reselected', this.unitReselectedListener);
            window.addEventListener('ui-show-unit-info-panel', this.onGlobalShowListener);
            window.addEventListener('ui-hide-unit-info-panel', this.onGlobalHideListener);
            window.addEventListener('unit-hotkey', this.onUnitHotkeyListener);
            this.Root.addEventListener('view-received-focus', this.onViewReceiveFocusListener);
            UI.playUnitSelectSound(unit.name);
        }
        else {
            console.warn(`UIP are attempting to re-subscribe (re-raise) with '${ComponentID.toLogString(cid)}', raised with '${ComponentID.toLogString(this.unitId)}'`);
        }
        this.commanderRenameElement.setAttribute("active", "true");
        this.cleanupStats();
        this.clearButtons();
        this.setupUnitInfo();
        if (this.currentState != UnitActionPanelState.ANIMATEIN && this.currentState != UnitActionPanelState.VISIBLE) {
            Audio.playSound('data-audio-unit-panel-appear', 'audio-unit');
        }
        this.currentState = UnitActionPanelState.ANIMATEIN;
        this.realizeButtons();
        this.updateUnitCycleNavHelp();
    }
    /**
     * Conforms to UnitSelectionListener
     */
    onLowerUnitSelection(cid) {
        if (this.isSubscribed) {
            this.isSubscribed = false;
            engine.off('PlayerTurnActivated', this.onPlayerTurnActivated, this);
            engine.off('UnitMovementPointsChanged', this.onUnitMovementPointsChanged, this);
            window.removeEventListener('unit-reselected', this.unitReselectedListener);
            window.removeEventListener('ui-show-unit-info-panel', this.onGlobalShowListener);
            window.removeEventListener('ui-hide-unit-info-panel', this.onGlobalHideListener);
            window.removeEventListener('unit-hotkey', this.onUnitHotkeyListener);
            this.Root.removeEventListener('view-received-focus', this.onViewReceiveFocusListener);
            Audio.playSound('data-audio-unit-exited', 'interact-unit');
        }
        else {
            console.warn(`UIP are attempting to re-unsubscribe (re-lower) with '${ComponentID.toLogString(cid)}'`);
        }
        if (this.unitId == null) {
            //TODO: this is probably hiding a larger/deeper issue. Shouldn't be getting a lower call on null.
            this.currentState = UnitActionPanelState.HIDDEN;
            console.warn(`Attempting to lower with unit actions with null unit id for componentID: '${ComponentID.toLogString(cid)}'`);
        }
        else {
            this.currentState = UnitActionPanelState.ANIMATEOUT;
        }
        this.updateUnitCycleNavHelp();
        this.unitId = null;
        if (this.Root.contains(FocusManager.getFocus())) {
            FocusManager.setFocus(document.body);
        }
    }
    onPlayerTurnActivated(data) {
        if (!data) {
            return;
        }
        if (data.player == GameContext.localPlayerID) {
            const unitComponentID = UI.Player.getHeadSelectedUnit();
            if (ComponentID.isValid(unitComponentID)) {
            }
        }
    }
    onUnitMovementPointsChanged(data) {
        if (ComponentID.isMatch(data.unit, this.unitId)) {
            this.updateMovement(data.unit);
            this.updateUnitCycleNavHelp();
            this.realizeButtons();
            this.updateFocusGate.call("onUnitMovementPointsChanged");
        }
    }
    // A unit was selected when already selected.  If it's the gamepad, cancel the event
    // so world-input doesn't take its default action of deselecting everything, and
    // put up the unit action interface.
    onUnitReselected(event) {
        if (ActionHandler.isGamepadActive) {
            event.preventDefault();
            event.stopPropagation();
        }
    }
    onGlobalHide() {
        this.currentState = UnitActionPanelState.ANIMATEOUT;
    }
    onGlobalShow() {
        const selectedUnit = UI.Player.getHeadSelectedUnit();
        if (selectedUnit) {
            this.currentState = UnitActionPanelState.ANIMATEIN;
        }
        else {
            this.currentState = UnitActionPanelState.HIDDEN;
        }
    }
    onViewReceiveFocus() {
        if (this.currentState == UnitActionPanelState.VISIBLE) {
            this.realizeFocus();
        }
    }
    realizeFocus() {
        // Focus the move button by default
        const moveButtonIndex = this.standardActions.findIndex((action) => {
            return action.type == "UNITOPERATION_MOVE_TO";
        });
        const moveButton = moveButtonIndex != -1 ? this.standardActionElements[moveButtonIndex] : null;
        if (this.currentState == UnitActionPanelState.VISIBLE && moveButton && moveButton.hasAttribute('tabindex')) {
            FocusManager.setFocus(moveButton);
        }
        else if (this.currentState == UnitActionPanelState.VISIBLE && this.standardActionElements.length > 0) {
            FocusManager.setFocus(this.standardActionElements[0]);
        }
        else {
            console.error(`Focus was not set on unit-actions!`);
        }
    }
    setupUnitInfo() {
        if (this.unitId) {
            const unit = Units.get(this.unitId);
            if (unit) {
                this.isCommander = unit.isCommanderUnit;
                this.isInArmy = ComponentID.isValid(unit.armyId);
                let combat = unit.Combat;
                const unitDef = GameInfo.Units.lookup(unit.type);
                if (!unitDef) {
                    console.error(`No unit definition found for ${unit.name}`);
                }
                else {
                    const unitType = unitDef.UnitType;
                    const isUnique = unitDef.TraitType != null; // also includes city-state granted units
                    WorldUI.requestPortrait(unitType, unitType, isUnique ? "UnitPortraitsBG_UNIQUE" : "UnitPortraitsBG_BASE");
                    const portraitPath = `url("live:/${unitType}")`;
                    this.portraitImage.style.backgroundImage = portraitPath;
                }
                if (this.commanderXPMeter && unit.Experience) {
                    this.commanderXPMeter.setAttribute("value", `${Math.min(1, (unit.Experience.experiencePoints / unit.Experience.experienceToNextLevel)) * 100}`);
                }
                if (this.commanderLevelValue) {
                    this.commanderLevelValue.textContent = `${unit.Experience?.getLevel}`;
                }
                // Set unit name
                const unitName = ((unit) ? Locale.compose(unit.name) : "Unknown CID: " + ComponentID.toLogString(this.unitId));
                if (this.unitNameDiv && this.unitNameDiv.textContent != unitName) {
                    this.unitNameDiv.textContent = unitName;
                }
                if (this.commanderNameDiv && this.commanderNameDiv.textContent != unitName) {
                    this.commanderNameDiv.textContent = unitName;
                }
                if (!unit.isAerodromeCommander) {
                    this.Root.querySelector('.unit-actions__shelf-container')?.classList.toggle("hidden", false);
                    this.unitStatsContainer.classList.toggle("hidden", false);
                    // show health. Health bar is done in different area since it's coupled with the unit portrait
                    this.healthValueDiv = this.Root.querySelector(".unit-actions__hit-points-value");
                    this.updateHealth(this.unitId);
                    // always show moves remaining, even if it's zero
                    this.moveValueDiv = this.Root.querySelector(".unit-actions__move-points-value");
                    this.updateMovement(this.unitId);
                    // show melee strength for all units, ranged if the unit has it
                    if (combat) {
                        this.addStatDivider();
                        this.addStat(combat.getMeleeStrength(false), combat.canAttack ? "LOC_UNIT_INFO_MELEE_STRENGTH" : "LOC_UNIT_INFO_DEFENSE_STRENGTH");
                        if (combat.rangedStrength > 0) {
                            this.addStatDivider();
                            this.addStat(combat.rangedStrength, "LOC_UNIT_INFO_RANGED_STRENGTH");
                        }
                        // show range if greater than 1
                        if (combat?.attackRange > 1) {
                            this.addStatDivider();
                            this.addStat(combat.attackRange, "LOC_UNIT_INFO_RANGE");
                        }
                    }
                    // show build charges if a unit has any
                    if (unit.buildCharges > 0) {
                        this.addStatDivider();
                        this.addStat(unit.buildCharges, "LOC_UNIT_INFO_BUILD_CHARGES");
                    }
                }
                else {
                    this.Root.querySelector('.unit-actions__shelf-container')?.classList.toggle("hidden", true);
                    this.unitStatsContainer.classList.toggle("hidden", true);
                }
            }
            else {
                console.error("unit-info-panel: Unable to get the Unit object for unit ID: " + this.unitId);
                return;
            }
        }
    }
    updateUnitCycleNavHelp() {
        if (this.addUnitCycleNavHelp()) {
            return;
        }
        this.unitCycleNavHelpContainer?.classList.remove("trigger-nav-help");
        this.unitCycleNavHelpContainer?.remove();
        if (this.unitNavHelpWorldAnchorHandle != null) {
            WorldAnchors.UnregisterUnitAnchor(this.unitNavHelpWorldAnchorHandle);
        }
        this.unitCycleNavHelpContainer = null;
        this.unitNavHelpWorldAnchorHandle = null;
    }
    addUnitCycleNavHelp() {
        if (this.currentState == UnitActionPanelState.HIDDEN || this.currentState == UnitActionPanelState.ANIMATEOUT || !this.unitId) {
            return false;
        }
        const unit = Units.get(this.unitId);
        if (!unit) {
            return false;
        }
        const unitsSamePosition = MapUnits.getUnits(unit.location.x, unit.location.y);
        const isMore2UnitsSamePositionOwned = unitsSamePosition.filter(u => u.owner == GameContext.localPlayerID).length >= 2;
        const districtIdSamePosition = MapCities.getDistrict(unit.location.x, unit.location.y);
        const isDistrictSelectable = WorldInput.isDistrictSelectable(districtIdSamePosition ?? ComponentID.getInvalidID());
        if (!isMore2UnitsSamePositionOwned && !isDistrictSelectable) {
            return false;
        }
        if (this.unitCycleNavHelpContainer != null) {
            // This was already added, return true so updateUnitCycleNavHelp doesn't remove it.
            return true;
        }
        this.unitCycleNavHelpContainer = document.createElement("div");
        this.unitCycleNavHelpContainer.classList.add("trigger-nav-help", "size-0");
        const unitCycleNavHelp = document.createElement("fxs-nav-help");
        unitCycleNavHelp.classList.add("absolute");
        unitCycleNavHelp.setAttribute("action-key", "inline-swap-plot-selection");
        unitCycleNavHelp.style.setProperty("transform", `translate(${Layout.pixels(-16)}, ${Layout.pixels(40)})`);
        this.unitCycleNavHelpContainer.appendChild(unitCycleNavHelp);
        this.unitNavHelpWorldAnchorHandle = WorldAnchors.RegisterUnitAnchor(this.unitId, 40);
        this.unitCycleNavHelpContainer?.setAttribute('data-bind-style-transform2d', `{{UnitAnchors.offsetTransforms[${this.unitNavHelpWorldAnchorHandle}].value}}`);
        this.unitCycleNavHelpContainer?.setAttribute('data-bind-style-opacity', `{{UnitAnchors.visibleValues[${this.unitNavHelpWorldAnchorHandle}]}}`);
        document.querySelector("#worldanchor")?.appendChild(this.unitCycleNavHelpContainer);
        return true;
    }
    addStat(statValue, statName) {
        const newStat = document.createElement("div");
        newStat.role = "paragraph";
        newStat.classList.value = "unit-info__stat-container pointer-events-auto flex flex-col justify-end items-center bg-no-repeat";
        const icon = document.createElement("div");
        icon.classList.value = "unit-info__stat-icon flex size-7 bg-contain bg-no-repeat";
        let statIcon = '';
        switch (statName) {
            case 'LOC_UNIT_INFO_MELEE_STRENGTH':
                statIcon = 'Action_Attack';
                break;
            case 'LOC_UNIT_INFO_RANGED_STRENGTH':
                statIcon = 'Action_Ranged';
                break;
            case 'LOC_UNIT_INFO_BUILD_CHARGES':
                statIcon = 'Action_Construct';
                break;
            case 'LOC_UNIT_INFO_DEFENSE_STRENGTH':
                statIcon = 'Action_Defend';
                break;
            case 'LOC_UNIT_INFO_RANGE':
                statIcon = 'action_rangedattack';
                break;
        }
        icon.style.backgroundImage = `url("fs://game/${statIcon}.png")`;
        newStat.appendChild(icon);
        const displayNum = document.createElement("div");
        displayNum.classList.add("unit-info__stat-value", "font-body-base", "self-center");
        newStat.appendChild(displayNum);
        if (displayNum) {
            displayNum.textContent = statValue.toString();
        }
        this.statInstances.push(newStat);
        this.unitStatsContainer?.appendChild(newStat);
    }
    addStatDivider() {
        const statDiv = document.createElement("div");
        statDiv.classList.add("unit-actions__stat-div", "flex", "w-0\\.5");
        this.statDividers.push(statDiv);
        this.unitStatsContainer?.appendChild(statDiv);
    }
    realizeButtons() {
        if (this.unitId == null || ComponentID.isInvalid(this.unitId)) {
            console.error("UIP update buttons requested but no valid unit!");
            return;
        }
        const unit = Units.get(this.unitId);
        if (unit == null) {
            console.error(`UIP could not update buttons for CID: ${ComponentID.toLogString(this.unitId)}`);
            return;
        }
        this.clearButtons();
        this.getUnitActions(unit);
        this.setupButtonSections();
        this.updateShelf();
        // TODO investigate why the spatial slot mutation observer does not trigger when updating the buttons
        engine.trigger("InteractUnitDataUpdated");
    }
    cleanupStats() {
        this.statInstances.forEach(stat => {
            this.unitStatsContainer?.removeChild(stat);
        });
        this.statDividers.forEach(divider => {
            this.unitStatsContainer?.removeChild(divider);
        });
        this.statInstances = [];
        this.statDividers = [];
        this.isCommander = false;
        this.isInArmy = false;
    }
    removeAllChildren(container) {
        if (container) {
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        }
    }
    clearButtons() {
        this.removeAllChildren(this.standardContainer);
        this.removeAllChildren(this.commanderContainer);
        this.removeAllChildren(this.hiddenContainer);
        this.actions = [];
        this.standardActions = [];
        this.commandActions = [];
        this.hiddenActions = [];
        this.standardActionElements = [];
        this.commandActionElements = [];
        this.hiddenActionElements = [];
    }
    updateMovement(unitId) {
        const unit = Units.get(unitId);
        if (unit) {
            if (!unit.isAerodromeCommander) {
                const movesRemaining = unit.Movement?.movementMovesRemaining ?? 0;
                const movesMax = unit.Movement?.maxMoves ?? 0;
                if (this.moveValueDiv) {
                    this.moveValueDiv.textContent = movesRemaining.toString().concat("/").concat(movesMax.toString());
                }
            }
        }
    }
    updateHealth(unitId) {
        const unit = Units.get(unitId);
        if (unit) {
            if (!unit.isAerodromeCommander) {
                if (unit?.Health) {
                    let normalizedHealthValue = (unit.Health.maxDamage - unit.Health.damage) / unit.Health.maxDamage;
                    if (this.healthValueDiv) {
                        this.healthValueDiv.textContent = `${(unit.Health.maxDamage - unit.Health.damage)}/${unit.Health.maxDamage}`;
                    }
                    this.unitHealthbar?.style.setProperty("--health-percentage", `${normalizedHealthValue * 100}%`);
                    // Restore healthbar color back to healthy to avoid missing edge cases, then change if needed
                    this.unitHealthbar?.classList.toggle("unit-actions__med-health-bar", false);
                    this.unitHealthbar?.classList.toggle("unit-actions__low-health-bar", false);
                    if (unit.Health.damage > 0) {
                        if (normalizedHealthValue <= this.MEDIUM_HEALTH_THRESHHOLD && normalizedHealthValue >= this.LOW_HEALTH_THRESHHOLD) {
                            this.unitHealthbar?.classList.toggle("unit-actions__med-health-bar", true);
                        }
                        else if (normalizedHealthValue < this.LOW_HEALTH_THRESHHOLD) {
                            this.unitHealthbar?.classList.toggle("unit-actions__low-health-bar", true);
                        }
                    }
                }
            }
        }
    }
    getUnitActions(unit) {
        // build an array of actions associated with the current unit
        // Add unit operations.
        const processOperation = (operation, unitAbility = null) => {
            // ask for canStart on an invalid plot - GameCore gives the correct answers then.			// TODO is this the right way?
            // TODO: update type to not be any.
            const parameters = {
                X: -9999,
                Y: -9999 // PlotCoord.Range.INVALID_Y
            };
            // Include unitAbility index or NO_ABILITY(-1)
            parameters.UnitAbilityType = unitAbility ? unitAbility.$index : -1;
            if (operation.OperationType == "UNITOPERATION_WMD_STRIKE") {
                parameters.Type = Database.makeHash("WMD_NUCLEAR_DEVICE");
            }
            const exclusionResult = Game.UnitOperations?.canStart(unit.id, operation.OperationType, parameters, true);
            const enabled = Game.UnitOperations?.canStart(unit.id, operation.OperationType, parameters, false); //TODO: PostVS Change from loosely type after
            let annotation = "";
            switch (operation.OperationType) {
                case "UNITOPERATION_MOVE_TO":
                    annotation = `${unit.Movement?.movementMovesRemaining.toString()}/${unit.Movement?.maxMoves.toString()}`;
                    break;
                case "UNITOPERATION_RANGE_ATTACK":
                    annotation = unit.Combat?.attacksRemaining.toString();
                    break;
                default:
                    annotation = "";
                    break;
            }
            if (exclusionResult.Success) {
                if (unit.shouldShowActivationOperationPlots(unit.id, operation.OperationType)) {
                    // First try the exclusion test to see if we can ever activate on some plots
                    const exclusionPlots = unit.getActivationOperationPlots(unit.id, operation.OperationType, true);
                    if (exclusionPlots.length > 0) {
                        // Then check if we can start the ability rBight now
                        const canStartPlots = unit.getActivationOperationPlots(unit.id, operation.OperationType, false);
                        if (canStartPlots.length > 0) {
                            window.dispatchEvent(new UpdateOperationTargetEvent(canStartPlots, true));
                        }
                        else {
                            // If we can't activate the ability right now highlight the exclusion plots
                            window.dispatchEvent(new UpdateOperationTargetEvent(exclusionPlots, false));
                        }
                    }
                }
                let name = `[ERR] Ability (Operation) Unknown for ${operation.OperationType}`;
                let icon = operation.Icon;
                name = `[STYLE:unit-action__tooltip-title]${Locale.compose(operation.Name)}[/STYLE]`;
                if (operation.Description) {
                    name += `[n]${Locale.compose(operation.Description)}`;
                }
                if (enabled.AdditionalDescription) {
                    for (const desc of enabled.AdditionalDescription) {
                        name += `[n][STYLE:unit-action__tooltip-additional-desc]${Locale.compose(desc)}[/STYLE]`;
                    }
                }
                if (!enabled.Success) {
                    if (enabled.FailureReasons) {
                        for (const reason of enabled.FailureReasons) {
                            name += `[n][STYLE:text-negative]${reason}[/STYLE]`;
                        }
                    }
                }
                if (enabled.ChargesRemaining) {
                    name += `[n]${Locale.compose("LOC_UNIT_INFO_CHARGES_LEFT", enabled.ChargesRemaining)}`;
                }
                if (this.isTargetPlotOperation(operation.OperationType)) {
                    const unitAction = {
                        name: name,
                        icon: icon,
                        type: operation.OperationType,
                        annotation: annotation,
                        active: enabled.Success,
                        confirmTitle: enabled.ConfirmDialogTitle,
                        confirmBody: enabled.ConfirmDialogBody,
                        UICategory: this.getUnitActionCategory(operation.CategoryInUI),
                        priority: operation.PriorityInUI ? operation.PriorityInUI : 0,
                        callback: (_location) => {
                            if (enabled.Success) {
                                parameters.X = _location.x;
                                parameters.Y = _location.y;
                                if (operation.OperationType == "UNITOPERATION_MOVE_TO") {
                                    parameters.Modifiers = UnitOperationMoveModifiers.ATTACK;
                                }
                                Game.UnitOperations?.sendRequest(unit.id, operation.OperationType, parameters);
                                this.realizeButtons();
                                this.updateFocusGate.call(`getUnitActions-callback-operation-${operation.OperationType.toString()}`);
                            }
                        },
                        chargesLeft: enabled.ChargesRemaining,
                    };
                    // Override the default callback if we want to go to a custom interface mode
                    if (UnitActionHandlers.doesActionHaveHandler(operation.OperationType) && (!ActionHandler.isGamepadActive || UnitActionHandlers.useHandlerWithGamepad(operation.OperationType))) {
                        unitAction.callback = (_location) => {
                            if (enabled.Success) {
                                UnitActionHandlers.switchToActionInterfaceMode(operation.OperationType, { UnitID: unit.id });
                            }
                        };
                    }
                    this.actions.push(unitAction);
                }
                else {
                    this.actions.push({
                        name: name,
                        icon: icon,
                        type: operation.OperationType,
                        annotation: annotation,
                        active: enabled.Success,
                        confirmTitle: enabled.ConfirmDialogTitle,
                        confirmBody: enabled.ConfirmDialogBody,
                        UICategory: this.getUnitActionCategory(operation.CategoryInUI),
                        priority: operation.PriorityInUI ? operation.PriorityInUI : 0,
                        callback: (location) => {
                            if (enabled.Success) {
                                if (location) {
                                    parameters.X = location.x;
                                    parameters.Y = location.y;
                                }
                                Game.UnitOperations?.sendRequest(unit.id, operation.OperationType, parameters);
                                this.switchToDefault();
                            }
                        },
                        chargesLeft: enabled.ChargesRemaining,
                    });
                }
            }
        };
        GameInfo.UnitOperations.forEach((operation) => {
            if (!operation.VisibleInUI) {
                return;
            }
            // If this operation is linked to any UnitAbilities, process it per ability type associated
            const unitAbilities = this.getUnitAbilitiesForOperationOrCommand(operation.OperationType);
            if (unitAbilities.length > 0) {
                for (const unitAbility of unitAbilities) {
                    processOperation(operation, unitAbility);
                }
            }
            // If this operation has no associated UnitAbilities, process it alone
            else {
                processOperation(operation);
            }
        });
        // Add unit commands.
        const processCommand = (command, unitAbility = null) => {
            // ask for canStart on an invalid plot - GameCore gives the correct answers then.
            let parameters = {
                X: -9999,
                Y: -9999 // PlotCoord.Range.INVALID_Y
            };
            // Include unitAbility index or NO_ABILITY(-1)
            parameters.UnitAbilityType = unitAbility ? unitAbility.$index : -1;
            let exclusionResult = Game.UnitCommands?.canStart(unit.id, command.CommandType, parameters, true);
            let enabled = Game.UnitCommands?.canStart(unit.id, command.CommandType, parameters, false);
            var annotation = "";
            // TODO: will unit commands need this kind of annotation?
            if (exclusionResult.Success) {
                if (unit.shouldShowActivationPlots(unit.id, command.CommandType)) {
                    // First try the exclusion test to see if we can ever activate on some plots
                    const exclusionPlots = unit.getActivationPlots(unit.id, command.CommandType, true);
                    if (exclusionPlots.length > 0) {
                        // Then check if we can start the ability rBight now
                        const canStartPlots = unit.getActivationPlots(unit.id, command.CommandType, false);
                        if (canStartPlots.length > 0) {
                            window.dispatchEvent(new UpdateOperationTargetEvent(canStartPlots, true));
                        }
                        else {
                            // If we can't activate the ability right now highlight the exclusion plots
                            window.dispatchEvent(new UpdateOperationTargetEvent(exclusionPlots, false));
                        }
                    }
                }
                const icon = command.Icon;
                let commandText = `[ERR] Command Unknown for type ${command.CommandType}`;
                commandText = `[STYLE:unit-action__tooltip-title]${Locale.compose(command.Name)}[/STYLE]`;
                if (command.Description) {
                    commandText += `[n]${Locale.compose(command.Description)}`;
                }
                if (enabled.AdditionalDescription) {
                    commandText += `[n]${enabled.AdditionalDescription}`;
                }
                if (!enabled.Success && enabled.FailureReasons) {
                    for (const reason of enabled.FailureReasons) {
                        commandText += `[n][STYLE:text-negative]${reason}[/STYLE]`;
                    }
                }
                else {
                    if (enabled.BestConstructible) {
                        const constructibleInfo = GameInfo.Constructibles.lookup(enabled.BestConstructible);
                        if (constructibleInfo) {
                            let constructibleText = Locale.compose(constructibleInfo.Name);
                            if (constructibleInfo.Description) {
                                constructibleText += ": " + Locale.compose(constructibleInfo.Description);
                            }
                            commandText += `[n][STYLE:unit-action__tooltip-title]${constructibleText}[/STYLE]`;
                        }
                    }
                }
                if (this.isTargetPlotOperation(command.CommandType)) {
                    const unitAction = {
                        name: commandText,
                        icon: icon,
                        type: command.CommandType,
                        annotation: annotation,
                        active: enabled.Success,
                        confirmTitle: enabled.ConfirmDialogTitle,
                        confirmBody: enabled.ConfirmDialogBody,
                        UICategory: this.getUnitActionCategory(command.CategoryInUI),
                        priority: command.PriorityInUI ? command.PriorityInUI : 0,
                        callback: (location) => {
                            if (enabled.Success) {
                                parameters.X = location.x;
                                parameters.Y = location.y;
                                Game.UnitCommands?.sendRequest(unit.id, command.CommandType, parameters);
                                this.realizeButtons();
                                this.updateFocusGate.call(`getUnitActions-callback-command-${command.CommandType.toString()}`);
                            }
                        }
                    };
                    // Override the default callback if we want to go to a custom interface mode
                    if (UnitActionHandlers.doesActionHaveHandler(command.CommandType) && (!ActionHandler.isGamepadActive || UnitActionHandlers.useHandlerWithGamepad(command.CommandType))) {
                        unitAction.callback = (_location) => {
                            if (enabled.Success) {
                                UnitActionHandlers.switchToActionInterfaceMode(command.CommandType, { UnitID: unit.id, CommandArguments: parameters });
                            }
                        };
                    }
                    this.actions.push(unitAction);
                }
                else {
                    if (UnitActionHandlers.doesActionHaveHandler(command.CommandType)) {
                        this.actions.push({
                            name: commandText,
                            icon: icon,
                            type: command.CommandType,
                            annotation: annotation,
                            active: enabled.Success,
                            confirmTitle: enabled.ConfirmDialogTitle,
                            confirmBody: enabled.ConfirmDialogBody,
                            UICategory: this.getUnitActionCategory(command.CategoryInUI),
                            priority: command.PriorityInUI ? command.PriorityInUI : 0,
                            callback: (_location) => {
                                if (enabled.Success) {
                                    UnitActionHandlers.switchToActionInterfaceMode(command.CommandType, { UnitID: unit.id, CommandArguments: parameters });
                                    this.realizeButtons();
                                    this.updateFocusGate.call(`getUnitActions-callback-command-notarget-${command.CommandType.toString()}`);
                                }
                            }
                        });
                        return;
                    }
                    this.actions.push({
                        name: commandText,
                        icon: icon,
                        type: command.CommandType,
                        annotation: annotation,
                        active: enabled.Success,
                        confirmTitle: enabled.ConfirmDialogTitle,
                        confirmBody: enabled.ConfirmDialogBody,
                        UICategory: this.getUnitActionCategory(command.CategoryInUI),
                        priority: command.PriorityInUI ? command.PriorityInUI : 0,
                        callback: (location) => {
                            if (enabled.Success) {
                                if (location) {
                                    parameters.X = location.x;
                                    parameters.Y = location.y;
                                }
                                Game.UnitCommands?.sendRequest(unit.id, command.CommandType, parameters);
                                if (command.CommandType == "UNITCOMMAND_WAKE" || command.CommandType == "UNITCOMMAND_CANCEL") {
                                    const frameLimit = 5;
                                    let framesLeft = frameLimit;
                                    new Promise((resolve, reject) => {
                                        const checkWakeStatus = () => {
                                            framesLeft--;
                                            requestAnimationFrame(() => {
                                                // is the unit awake yet?
                                                if (Game.UnitOperations?.canStart(unit.id, "UNITOPERATION_SLEEP", parameters, true).Success) {
                                                    resolve();
                                                }
                                                // frame limit has been reached; just hide the buttons
                                                else if (framesLeft <= 0) {
                                                    console.error(`Could not wake unit ${unit.name} after completing action ${command.CommandType} within ${frameLimit} frame(s)`);
                                                    reject();
                                                }
                                                // loop back
                                                else {
                                                    checkWakeStatus();
                                                }
                                            });
                                        };
                                        checkWakeStatus();
                                    }).then(() => {
                                        this.realizeButtons();
                                        this.updateFocusGate.call(`getUnitActions-defaultHandler-${command.CommandType.toString()}`);
                                    }).catch(() => {
                                        this.switchToDefault();
                                    });
                                    Audio.playSound(Audio.getSoundTag("data-audio-cancel-action", "interact-unit"));
                                }
                                else {
                                    this.switchToDefault();
                                }
                            }
                        }
                    });
                }
            }
        };
        GameInfo.UnitCommands.forEach((command) => {
            if (!command.VisibleInUI) {
                return;
            }
            // If this command is linked to any UnitAbilities, process it per ability type associated
            const unitAbilities = this.getUnitAbilitiesForOperationOrCommand(command.CommandType);
            if (unitAbilities.length > 0) {
                for (const unitAbility of unitAbilities) {
                    processCommand(command, unitAbility);
                }
            }
            // If this command has no associated UnitAbilities, process it alone
            else {
                processCommand(command);
            }
        });
    }
    getUnitAbilitiesForOperationOrCommand(type) {
        const results = [];
        for (const unitAbility of GameInfo.UnitAbilities) {
            if (unitAbility.CommandType && unitAbility.CommandType == type) {
                results.push(unitAbility);
            }
            else if (unitAbility.OperationType && unitAbility.OperationType == type) {
                results.push(unitAbility);
            }
        }
        return results;
    }
    setupButtonSections() {
        this.standardContainer = this.Root.querySelector(".unit-actions__standard-actions");
        this.standardContainer?.setAttribute('data-navrule-up', 'stop');
        this.commanderContainer = this.Root.querySelector(".unit-actions__commander-actions");
        this.Root.querySelector('.unit-actions__shelf-container')?.setAttribute('data-navrule-left', 'stop');
        this.Root.querySelector('.unit-actions__shelf-container')?.setAttribute('data-navrule-up', 'stop');
        this.shelfButton.setAttribute('tabindex', "-1");
        this.shelfButton.setAttribute('data-audio-group-ref', 'audio-unit');
        this.shelfButton.setAttribute('data-audio-activate-ref', 'data-audio-unit-drawer-toggle');
        this.shelfButton.setAttribute('data-audio-press-ref', 'data-audio-unit-drawer-press');
        this.shelfButton.addEventListener('action-activate', this.shelfToggleListener);
        this.shelfButton.setAttribute('data-navrule-left', 'stop');
        this.shelfButton.addEventListener('focus', this.shelfFocusInListener);
        this.hiddenContainer.addEventListener('focusin', this.shelfFocusInListener);
        this.hiddenContainer.addEventListener('focusout', this.shelfFocusoutListener);
        this.sortActions();
        this.createButtons(this.standardActions);
        this.createButtons(this.commandActions);
        this.createButtons(this.hiddenActions);
    }
    sortActions() {
        // Sort by category then priority for position
        let mainActions = this.actions.filter((action) => action.UICategory == UnitActionCategory.MAIN);
        let commandActions = this.actions.filter((action) => action.UICategory == UnitActionCategory.COMMAND);
        let hiddenActions = this.actions.filter((action) => action.UICategory == UnitActionCategory.HIDDEN);
        mainActions.sort((a, b) => a.priority != 0 ? a.priority - b.priority : 0);
        commandActions.sort((a, b) => a.priority != 0 ? a.priority - b.priority : 0);
        hiddenActions.sort((a, b) => a.priority != 0 ? a.priority - b.priority : 0);
        this.standardActions = mainActions;
        this.commandActions = commandActions;
        this.hiddenActions = hiddenActions;
    }
    onUnitHotkey(hotkey) {
        let actionType;
        if (this.currentState != UnitActionPanelState.VISIBLE) {
            // Ignore hotkeys if the unit actions panel isn't visible
            return;
        }
        switch (hotkey.detail.name) {
            case 'unit-ranged-attack':
                actionType = 'UNITOPERATION_RANGE_ATTACK';
                break;
            case 'unit-move':
                actionType = 'UNITOPERATION_MOVE_TO';
                break;
            case 'unit-skip-turn':
                actionType = 'UNITOPERATION_SKIP_TURN';
                break;
            case 'unit-sleep':
                actionType = 'UNITOPERATION_SLEEP';
                break;
            case 'unit-heal':
                actionType = 'UNITOPERATION_REST_UNTIL_HEALED';
                break;
            case 'unit-fortify':
                actionType = 'UNITOPERATION_FORTIFY';
                break;
            case 'unit-alert':
                actionType = 'UNITOPERATION_ALERT';
                break;
            case 'cycle-prev':
                UI.Player.selectPreviousUnit();
                return;
            case 'cycle-next':
                UI.Player.selectNextUnit();
                return;
        }
        if (actionType) {
            for (const action of this.actions) {
                if (action.type === actionType) {
                    action.callback({ x: -9999, y: -9999 });
                    break;
                }
            }
        }
        else {
            console.warn(`unit-action: unknown unit hotkey: ${hotkey}`);
        }
    }
    createButtons(actions) {
        let lastButton = null;
        const spacerClass = actions == this.hiddenActions ? "mb-2" : "mr-3";
        const halfLength = (actions.length + 1) >> 1;
        for (const [index, action] of actions.entries()) {
            // TODO: refactor into/create icon button component
            let newButton = document.createElement("unit-action-button");
            newButton.classList.add(spacerClass, "relative");
            newButton.innerHTML = `
			<fxs-activatable class="unit-actions__action-button">
				<div class="unit-action-button__button-bg-container">
					<div class="unit-action-button__button-highlight"></div>
					<div class="unit-action-button__button-icon flex-auto bg-contain pointer-events-none bg-no-repeat relative"></div>
				</div>
			</fxs-activatable>
			`;
            // Add margins for when shelf wraps
            if (actions == this.hiddenActions && actions.length >= 4 && index >= halfLength) {
                newButton.classList.add("ml-2");
            }
            lastButton = newButton;
            if (actions == this.commandActions) {
                let buttonBackground = newButton.querySelector(".unit-action-button__button-bg-container");
                let buttonHighlight = newButton.querySelector(".unit-action-button__button-highlight");
                buttonBackground?.classList.add("isCommander");
                buttonHighlight?.classList.add("isCommander");
            }
            let newActivatable = newButton.querySelector(".unit-actions__action-button");
            if (newActivatable == null) {
                console.error("No activatable found for unit action button!");
                return;
            }
            newActivatable.setAttribute('tabindex', "-1");
            newActivatable.setAttribute('disable-focus-allowed', "true");
            newActivatable.setAttribute("data-audio-group-ref", "interact-unit");
            newActivatable.setAttribute("data-audio-focus", "unit-info-hovered");
            newActivatable.setAttribute("data-audio-press-ref", "data-audio-unit-action-clicked");
            switch (action.type) {
                case "UNITCOMMAND_MAKE_TRADE_ROUTE":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-unit-merchant-activate");
                    break;
                case "UNITCOMMAND_PACK_ARMY":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-unit-packed");
                    break;
                case "UNITCOMMAND_PROMOTE":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-unit-commander-promotion-activated");
                    break;
                case "UNITOPERATION_FOUND_CITY":
                    newActivatable.setAttribute("data-audio-activate-ref", "none");
                    break;
                case "UNITCOMMAND_UPGRADE":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-unit-upgraded");
                    break;
                case "UNITOPERATION_RANGE_ATTACK":
                case "UNITOPERATION_AIR_ATTACK":
                case "UNITOPERATION_NAVAL_ATTACK":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-unit-combat-activated");
                    break;
                case "UNITOPERATION_MOVE_TO":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-unit-move-activated");
                    break;
                case "UNITOPERATION_SPREAD_RELIGION":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-ability-spread-religion");
                    break;
                case "UNITCOMMAND_UPGRADE":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-ability-upgrade");
                    break;
                case "UNITOPERATION_REINFORCE_ARMY":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-ability-reinforce-army");
                    break;
                case "UNITOPERATION_EMBARK":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-ability-embark");
                    break;
                case "UNITOPERATION_FORTIFY":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-ability-fortify");
                    break;
                case "UNITCOMMAND_DEFENSIVE_PERIMETER":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-ability-defensive-perimeter");
                    break;
                case "UNITOPERATION_DEPLOY":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-ability-deploy-army");
                    break;
                case "UNITOPERATION_REST_UNTIL_HEALED":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-ability-rest-until-healed");
                    break;
                case "UNITOPERATION_EMBED_LOOKOUT":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-ability-embed-lookout");
                    break;
                case "UNITOPERATION_SLEEP":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-ability-sleep");
                    break;
                case "UNITOPERATION_DISPERSE_INDEPENDENT":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-ability-disperse-independent");
                    break;
                case "UNITOPERATION_ALERT":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-ability-alert");
                    break;
                case "UNITCOMMAND_SCORCHED_EARTH":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-ability-scorched-earth");
                    break;
                case "UNITCOMMAND_REMOVE_FROM_ARMY":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-ability-leave-army");
                    break;
                case "UNITOPERATION_PILLAGE":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-unit-pillage-release");
                    break;
                case "UNITOPERATION_EXCAVATE":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-ability-excavate");
                    break;
                case "UNITOPERATION_RESEARCH_ARTIFACTS":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-ability-research-artifacts");
                    break;
                case "UNITOPERATION_SEARCH":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-ability-search");
                    break;
                case "UNITOPERATION_TELEPORT_TO_CITY":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-ability-teleport");
                    break;
                case "UNITCOMMAND_MOVE_BY_RAIL":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-move-by-rail");
                    break;
                case "UNITCOMMAND_ACTIVATE_GREAT_PERSON":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-unit-great-person-activate");
                    break;
                case "UNITCOMMAND_TREAT_SICK":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-unit-great-person-activate");
                    break;
                case "UNITCOMMAND_CLAIM_MOUNTAIN":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-unit-ability-claim-mountain");
                    break;
                case "UNITOPERATION_CONVERT_INDEPENDENTS":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-unit-convert-independent");
                    break;
                case "UNITCOMMAND_STONE_TRAP":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-unit-set-jaguar-trap");
                    break;
                case "UNITCOMMAND_DISBAND":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-treasure-unload");
                    break;
                case "UNITCOMMAND_UPGRADE_ARMY":
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-commander-upgrade-all");
                    break;
                default:
                    newActivatable.setAttribute("data-audio-activate-ref", "data-audio-unit-action-activated");
                    break;
            }
            this.setButtonData(newActivatable, action);
            switch (action.UICategory) {
                case UnitActionCategory.MAIN:
                    this.standardContainer?.appendChild(newButton);
                    this.standardActionElements.push(newActivatable);
                    break;
                case UnitActionCategory.COMMAND:
                    this.commanderContainer?.appendChild(newButton);
                    this.commandActionElements.push(newActivatable);
                    break;
                case UnitActionCategory.HIDDEN:
                    this.hiddenContainer.appendChild(newButton);
                    this.hiddenActionElements.push(newActivatable);
                    break;
                default:
                    console.error(`Invalid UICategory for ${action.type}, unit-info-panel can not sort the action.`);
                    break;
            }
            if (action.chargesLeft !== undefined) {
                const chargesLeftElement = document.createElement("div");
                chargesLeftElement.classList.value = "absolute text-sm font-title bg-primary-4 self-center -bottom-2 pointer-events-none px-0\\.5 py-px";
                chargesLeftElement.innerHTML = `${action.chargesLeft}`;
                newButton.appendChild(chargesLeftElement);
            }
        }
        if (lastButton) {
            lastButton.classList.remove(spacerClass);
        }
    }
    setButtonData(button, action) {
        if (action && button) {
            button.setAttribute("data-tooltip-content", action.name);
            button.setAttribute("data-tooltip-anchor", "left");
            button.setAttribute("data-tooltip-alignment", "top-right");
            // add tutorial highlight tag
            if (action.type == "UNITOPERATION_FOUND_CITY") {
                button.setAttribute("data-tut-highlight", "founderHighlight");
                button.classList.add("unit-action-UNITOPERATION_FOUND_CITY");
            }
            button.setAttribute("data-tooltip-hide-on-update", "");
            button.setAttribute("category", UnitActionCategory[action.UICategory]);
            if (!action.icon) {
                console.error(`unit-actions: No icon URL associated with action ${action.name}.`);
            }
            const icon = action.icon ?? "";
            const iconCSS = (icon) ? `url("${icon}")` : '';
            button.style.setProperty("--button-icon", iconCSS);
            button.classList.toggle("inactive", !action.active);
            button.setAttribute("play-error-sound", (!action.active).toString());
            button.addEventListener('action-activate', (event) => { this.onButtonActivated(event); });
        }
    }
    onButtonActivated(event) {
        if (event.target instanceof HTMLElement) {
            // figure out which button list the button data is in so we can retrieve the associated action's data
            let selectedAction = this.findSelectedUnitAction(event.target);
            if (selectedAction != null) {
                if (selectedAction.active) {
                    this.onActionChosen(selectedAction);
                }
            }
        }
    }
    onShelfFocused() {
        if (!UnitActionsPanelModel.isShelfOpen) {
            this.toggleShelfOpen();
        }
    }
    onShelfFocusout({ relatedTarget }) {
        if (ActionHandler.isGamepadActive && !(relatedTarget instanceof Node && this.hiddenContainer.contains(relatedTarget)) && UnitActionsPanelModel.isShelfOpen) {
            this.toggleShelfOpen();
        }
    }
    onActionChosen(action) {
        let doAction = () => {
            action.callback(PlotCursor.plotCursorCoords); // target location
            engine.trigger("InteractUnitActionChosen");
            if (action.type == "UNITCOMMAND_DELETE") {
                UI.sendAudioEvent(Audio.getSoundTag("data-audio-delete-unit-confirm-release", "interact-unit"));
            }
        };
        if (action.type == "UNITOPERATION_MOVE_TO") {
            // If the action was just choosen from the unit panel, ignore.
            // But if this is the result of a world action with a gamepad, then route through world-input rules now.
            if (this.unitId && PlotCursor.plotCursorCoords) {
                WorldInput.requestMoveOperation(this.unitId, { X: PlotCursor.plotCursorCoords.x, Y: PlotCursor.plotCursorCoords.y });
                return;
            }
        }
        // Confirm dialog first, or just go?
        if (action.confirmBody) {
            const confirmUnitActionTitleDefault = Locale.compose("LOC_UNIT_INTERACT_CONFIRM_ACTION_TITLE_DEFAULT");
            const dbCallback = (eAction) => {
                if (eAction == DialogBoxAction.Confirm) {
                    doAction();
                }
            };
            DialogManager.createDialog_ConfirmCancel({
                dialogId: this.dialogId,
                body: action.confirmBody,
                title: action.confirmTitle || confirmUnitActionTitleDefault,
                callback: dbCallback
            });
        }
        else {
            doAction();
        }
    }
    toggleShelfOpen() {
        UnitActionsPanelModel.isShelfOpen = !UnitActionsPanelModel.isShelfOpen;
        if (UnitActionsPanelModel.isShelfOpen) {
            UI.sendAudioEvent(Audio.getSoundTag('data-audio-unit-drawer-open', 'audio-unit'));
        }
        else {
            UI.sendAudioEvent(Audio.getSoundTag('data-audio-unit-drawer-close', 'audio-unit'));
        }
        this.updateShelf();
        if (UnitActionsPanelModel.isShelfOpen && this.currentState == UnitActionPanelState.VISIBLE) {
            const firstPanelAction = this.hiddenContainer.querySelector('.unit-actions__action-button');
            if (firstPanelAction) {
                Focus.setContextAwareFocus(firstPanelAction, this.Root);
            }
            else {
                console.error('Unit actions: no shelve action found.');
            }
        }
    }
    updateShelf() {
        if (UnitActionsPanelModel.isShelfOpen) {
            this.shelfButton.removeAttribute('tabindex');
        }
        else {
            this.shelfButton.setAttribute('tabindex', '-1');
        }
        const isDouble = this.hiddenActions.length >= 4;
        this.Root.querySelector(".unit-actions__hidden-column-bg")?.classList.toggle("no-col", !UnitActionsPanelModel.isShelfOpen);
        this.Root.querySelector(".unit-actions__hidden-column-bg")?.classList.toggle("single-col", UnitActionsPanelModel.isShelfOpen && !isDouble);
        this.Root.querySelector(".unit-actions__hidden-column-bg")?.classList.toggle("double-col", UnitActionsPanelModel.isShelfOpen && isDouble);
        this.shelfButton.classList.toggle("flip", UnitActionsPanelModel.isShelfOpen);
        // completely hide nav help to avoid icon flashing
        this.identifierRow?.classList.toggle("hide-nav-help", !UnitActionsPanelModel.isShelfOpen);
    }
    //toggle showing the unit rename panel
    onCommanderEditPressed() {
        if (!Network.hasAccessUGCPrivilege(false)) {
            return;
        }
        const shouldHide = !(this.commanderRenameElement.getAttribute("active") == "true");
        this.commanderRenameElement.setAttribute("active", shouldHide.toString());
    }
    onInfoContainerEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.detail.name == "touch-tap") {
            this.onCommanderEditPressed();
        }
    }
    //confirm the commander's name and send the request to gamecore to change it on the backend
    onCommanderNameConfirmed(event) {
        const newCommanderName = event.detail.newName;
        this.commanderRenameElement.setAttribute("active", "true");
        const args = {
            Name: newCommanderName
        };
        if (!this.unitId) {
            console.error(`unit-actions: onCommanderNameConfirmed - Tried to name a unit with no unit ID!`);
            return;
        }
        const result = Game.UnitCommands.canStart(this.unitId, UnitCommandTypes.NAME_UNIT, args, false);
        if (result.Success) {
            Game.UnitCommands.sendRequest(this.unitId, UnitCommandTypes.NAME_UNIT, args);
            this.commanderNameDiv?.setAttribute("data-l10n-id", Locale.fromUGC("LOC_UNIT_ARMY_COMMANDER_NAME", newCommanderName));
        }
        else {
            console.error('unit-actions: onCommanderNameConfirmed - unit name change operation failed!', result.FailureReasons);
        }
    }
    //react to the unit rename panel being hidden so we can refocus where we should
    onCommanderNameHideStatusToggled(event) {
        if (event.detail.isHidden) {
            this.realizeFocus();
        }
    }
    findSelectedUnitAction(selectedButton) {
        // figure out which button list the button is in so we can retrieve the associated action's data
        let selectedAction = null;
        let actionIndex = this.standardActionElements.indexOf(selectedButton);
        if (actionIndex >= 0) {
            selectedAction = this.standardActions[actionIndex];
        }
        else if ((actionIndex = this.commandActionElements.indexOf(selectedButton)) >= 0) {
            selectedAction = this.commandActions[actionIndex];
        }
        else if ((actionIndex = this.hiddenActionElements.indexOf(selectedButton)) >= 0) {
            selectedAction = this.hiddenActions[actionIndex];
        }
        return selectedAction;
    }
    /**
     * Does a particular unit operation require a targetPlot if selected?
     * @param type Game core unit operation as string name.
     * @returns true if this operation requires a plot to be targeted before exectuing.
     */
    isTargetPlotOperation(type) {
        if (UnitActionHandlers.doesActionHaveHandler(type.toString())) {
            return UnitActionHandlers.doesActionRequireTargetPlot(type.toString());
        }
        return false;
    }
    getUnitActionCategory(category) {
        let mappedCategory;
        switch (category) {
            case "MOVE":
            case "ACTIVE_PRIMARY":
            case "ACTIVE_SECONDARY":
                mappedCategory = UnitActionCategory.MAIN;
                break;
            case "COMMAND":
                mappedCategory = UnitActionCategory.COMMAND;
                break;
            case "PASSIVE_PRIMARY":
            case "PASSIVE_SECONDARY":
            case "HIDDEN":
                mappedCategory = UnitActionCategory.HIDDEN;
                break;
            default:
                mappedCategory = UnitActionCategory.NONE;
                console.error(`Invalid UICategory for ${category}, unit-info-panel can not sort the action.`);
                break;
        }
        return mappedCategory;
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
    }
    onNavigateInput(navigationEvent) {
        const live = this.handleNavigation(navigationEvent);
        if (!live) {
            navigationEvent.preventDefault();
            navigationEvent.stopImmediatePropagation();
        }
    }
    /**
     * @returns true if still live, false if input should stop.
     */
    handleNavigation(navigationEvent) {
        if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
            // Ignore everything but FINISH events
            return true;
        }
        let live = true;
        const direction = navigationEvent.getDirection();
        switch (direction) {
            case InputNavigationAction.PREVIOUS: {
                live = false;
                UI.Player.selectPreviousUnit();
                break;
            }
            case InputNavigationAction.NEXT: {
                live = false;
                UI.Player.selectNextUnit();
                break;
            }
        }
        return live;
    }
}
UnitActions.ANIM_DELAY = 150;
Controls.define('unit-actions', {
    createInstance: UnitActions,
    description: 'Unit information and actions raised by manager',
    styles: ['fs://game/base-standard/ui/unit-actions/unit-actions.css'],
    images: [
        UnitActions.getIconsToPreload,
        'fs://game/Action_Move.png',
        'fs://game/prod_generic.png',
        'fs://game/unitflag_missingicon.png',
        'fs://game/hud_unit-panel_hex-action'
    ]
});
Controls.define("unit-action-button", {
    createInstance: Component,
    description: 'Unit Actions Button',
    // classNames: ['unit-action-button__button-bg-container'],
    styles: ['fs://game/base-standard/ui/unit-actions/unit-actions.css']
});
export class UnitActionsPanelModelImpl {
    constructor() {
        this._isShelfOpen = true;
    }
    get isShelfOpen() {
        return this._isShelfOpen;
    }
    set isShelfOpen(value) {
        this._isShelfOpen = value;
    }
}
export const UnitActionsPanelModel = new UnitActionsPanelModelImpl();

//# sourceMappingURL=file:///base-standard/ui/unit-actions/unit-actions.js.map
