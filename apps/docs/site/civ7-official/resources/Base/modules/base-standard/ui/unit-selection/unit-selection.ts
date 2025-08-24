/**
 * @file unit-selection.ts
 * @copyright 2020-2025, Firaxis Games
 * @description Handles activation/deactivation for when a unit is selected.
 */

import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import ActionHandler from '/core/ui/input/action-handler.js';
import { UnitHotkeyEvent } from '/core/ui/input/hotkey-manager.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
import ViewManager from '/core/ui/views/view-manager.js';


export class RaiseUnitSelectionEvent extends CustomEvent<{ cid: ComponentID }> {
	constructor(cid: ComponentID) {
		super('raise-unit-selection', { bubbles: true, cancelable: true, detail: { cid } });
	}
}

export class LowerUnitSelectionEvent extends CustomEvent<{ cid: ComponentID }> {
	constructor(cid: ComponentID) {
		super('lower-unit-selection', { bubbles: true, cancelable: true, detail: { cid } });
	}
}

export type UnitSelectionListener = (cid: ComponentID) => void;


/**
 * Primary class to handle unit selection request from the game.
 * Performs additional gate-keeping based on user interface mode.
 */
class UnitSelectionSingleton {
	//@ts-ignore : remove if not use but there was an edge case there was necessary for mode changes (FTUE?)
	private trySelectUnitID: ComponentID | null = null;
	private currentVFXUnitID: ComponentID | null = null;
	private selectionVFXModelGroup: WorldUI.ModelGroup | null = null;
	private lowerEvent = new LiteEvent<ComponentID>();
	private raiseEvent = new LiteEvent<ComponentID>();
	private onUnitHotkeyListener = this.onUnitHotkey.bind(this);

	constructor() {
		engine.whenReady.then(() => { this.onReady(); });
	}

	private updateGate: UpdateGate = new UpdateGate(() => { this.onUpdate(); });

	/** Debug only: (this part of the) DOM is reloading. */
	private onUnload = () => {
		this.cleanup();
	}

	private cleanup() {
		this.selectionVFXModelGroup?.destroy();
	}

	private onReady() {
		this.selectionVFXModelGroup = WorldUI.createModelGroup("selectionVFXModelGroup");
		engine.on('PlayerTurnActivated', this.onPlayerTurnActivated);
		engine.on('UnitSelectionChanged', this.onUnitSelectionChanged);
		engine.on('UnitMoveComplete', this.onUnitMoveComplete);
		engine.on('BeforeUnload', this.onUnload);
		window.addEventListener('ui-hide-plot-vfx', (_event: CustomEvent) => { this.onUIHidePlotVFX() });
		window.addEventListener('ui-show-plot-vfx', (_event: CustomEvent) => { this.onUIShowPlotVFX() });
		window.addEventListener('ui-show-unit-info-panel', this.onGlobalShow);
		window.addEventListener('ui-hide-unit-info-panel', this.onGlobalHide);
		window.addEventListener('unit-hotkey', this.onUnitHotkeyListener);
		this.updateGate.call('onReady');
	}

	private onUpdate() {
		if (!ViewManager.isUnitSelectingAllowed) {
			return;
		}

		// if we're in the loading screen, don't do this yet
		const curtain: HTMLElement | null = document.getElementById('loading-curtain');
		if (curtain) {
			if (!curtain.classList.contains('curtain-opened')) {
				window.requestAnimationFrame(() => { this.updateGate.call('deferredReady') });
				return;
			}
		}

		this.update();
	}

	/**
	 * If an update is requested and the engine shows a unit is selected then
	 * switch to the unit selected mode.
	 */
	private update() {
		const cid: ComponentID | null = UI.Player.getHeadSelectedUnit();
		if (cid) {
			if (ComponentID.isInvalid(cid)) {
				console.error(`Request to update unit on selection but invalid cid '${cid}' passed in.`);
				return;
			}
			const unit: Unit | null = Units.get(cid);
			if (unit != null) {
				if (this.trySwitchToUnitSelectedMode(unit.id)) {
					this.realizeVFX(unit);
					//TODO: failing? window.dispatchEvent(new RaiseUnitSelectionEvent(cid));		// Signal to UI
					this.raiseEvent.trigger(cid);
				}
			} else {
				console.error(`Request to update unit on selection but no unit exists for cid '${cid}'.`);
			}
		}
	}

	private realizeVFX(unit: Unit) {
		this.currentVFXUnitID = unit.id;
		WorldUI.triggerVFXAtPlot("VFX_UnitSelection_Ground_Burst_01", unit.location, { x: 0, y: 0, z: 0 });
		this.selectionVFXModelGroup?.clear();
		this.selectionVFXModelGroup?.addVFXAtPlot("VFX_3dUI_Unit_Selected_01", unit.location, { x: 0, y: 0, z: 0 });
	}

	private trySwitchToUnitSelectedMode(unitID: ComponentID): boolean {
		if (Units.get(unitID)?.owner != GameContext.localPlayerID) {
			// For now we don't want to see unit selection on enemy units.
			return false;
		}
		else if (InterfaceMode.isInInterfaceMode('INTERFACEMODE_UNIT_SELECTED')) {
			return true;	// Already in mode.
		}
		if (!InterfaceMode.switchTo('INTERFACEMODE_UNIT_SELECTED', { UnitID: unitID })) {
			console.warn(`Unable to switch interface mode to selecte unit for ${ComponentID.toLogString(unitID)}`);
			this.trySelectUnitID = unitID;
			return false;
		}
		this.trySelectUnitID = null;
		return true;
	}

	// Events
	get onRaise(): ILiteEvent<ComponentID> {
		return this.raiseEvent.expose();
	}

	get onLower(): ILiteEvent<ComponentID> {
		return this.lowerEvent.expose();
	}



	// Event Handlers

	private onUnitSelectionChanged = (data: UnitSelectionChangedData) => {
		if (data.selected) {
			this.updateGate.call('onUnitSelectionChanged');
		} else {
			this.currentVFXUnitID = null;
			// TODO: failing? window.dispatchEvent(new LowerUnitSelectionEvent(data.unit));		// Signal to UI
			this.lowerEvent.trigger(data.unit);
			// If there are no head selected units, is a complete deselection.
			const selectedUnit: ComponentID | null = UI.Player.getHeadSelectedUnit();
			if (!selectedUnit || !ComponentID.isValid(selectedUnit)) {
				this.selectionVFXModelGroup?.clear();
			}
		}
	}

	private onPlayerTurnActivated = (data: PlayerTurnActivated_EventData) => {
		const localPlayerID: PlayerId = GameContext.localPlayerID;
		if (data.player == localPlayerID) {
			this.updateGate.call('onPlayerTurnActivated');
		}
	}

	private onUIHidePlotVFX() {
		this.selectionVFXModelGroup?.clear();
	}

	private onUIShowPlotVFX() {
		// this.update();		// TODO: re-evaluate as this is doesn't just show VFX but can change interface mode
		const cid: ComponentID | null = UI.Player.getHeadSelectedUnit();
		if (cid) {
			if (ComponentID.isInvalid(cid)) {
				console.error(`Request to update unit on selection but invalid cid '${cid}' passed in.`);
				return;
			}
			const unit: Unit | null = Units.get(cid);
			if (unit != null) {
				this.realizeVFX(unit);
			} else {
				console.error(`Request to update unit on selection but no unit exists for cid '${cid}'.`);
			}
		}
		else {
			console.error(`Request to update unit on selection but invalid cid '${cid}' passed in.`);
		}
	}

	private onGlobalShow = () => {
		this.update();
	}

	// using view rules allows us to know when to lower instead of checking the interfaceMode's view
	private onGlobalHide = () => {
		const selectedUnit: ComponentID | null = UI.Player.getHeadSelectedUnit();
		if (selectedUnit) {
			this.lowerEvent.trigger(selectedUnit);
		}
	}

	private onUnitMoveComplete = (data: UnitMoveComplete_EventData) => {
		if (this.currentVFXUnitID && ComponentID.isMatch(this.currentVFXUnitID, data.unit)) {
			const unit: Unit | null = Units.get(this.currentVFXUnitID);
			if (unit != null) {
				this.trySwitchToUnitSelectedMode(unit.id);
				this.realizeVFX(unit);
			}
		}
	}

	/**
	 * Allow a KBM next/previous to raise the unit selection.
	 * @param hotkey, the hotkey based event.
	 */
	private onUnitHotkey(hotkey: UnitHotkeyEvent) {
		// If in any mode but default, or if game is active, ignore this.
		if (!InterfaceMode.isInDefaultMode || ActionHandler.isGamepadActive) {
			return;
		}

		switch (hotkey.detail.name) {
			case 'cycle-prev':
				UI.Player.selectPreviousUnit();
				return;
			case 'cycle-next':
				UI.Player.selectNextUnit();
				return;
		}

	}

}



const UnitSelection: UnitSelectionSingleton = new UnitSelectionSingleton();
export { UnitSelection as default };
