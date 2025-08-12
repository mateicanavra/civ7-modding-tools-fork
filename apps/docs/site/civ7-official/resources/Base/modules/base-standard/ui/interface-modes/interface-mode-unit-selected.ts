/**
 * @file interface-mode-unit-selected.ts
 * @copyright 2021-2022, Firaxis Games
 * @description Interface mode to handle visualization when a unit is selected
 */

import { ComponentID } from '/core/ui/utilities/utilities-component-id.js'
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'
import { UnitMapDecorationSupport } from '/base-standard/ui/interface-modes/support-unit-map-decoration.js'
import LensManager from '/core/ui/lenses/lens-manager.js'
import { PlotCursorUpdatedEvent, PlotCursorUpdatedEventName } from '/core/ui/input/plot-cursor.js'

interface UnitSelectedInterfaceModeContext extends InterfaceMode.Context {
	UnitID: ComponentID;
}

class UnitSelectedInterfaceMode implements InterfaceMode.Handler {

	private unitSelectionChangedListener = this.onUnitSelectionChanged.bind(this);
	private playerTurnActivatedListener = this.onPlayerTurnActivated.bind(this);
	private plotCursorCoordsUpdatedListener = this.onPlotCursorCoordsUpdated.bind(this);


	/** @interface Handler */
	transitionTo(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId, context?: object) {
		UnitMapDecorationSupport.manager.deactivate();

		const unitSelectedContext = context as UnitSelectedInterfaceModeContext;
		if (unitSelectedContext == undefined) {
			console.error("Failed to pass context object into the UnitSelectedInterfaceMode context!");
			return;
		}
		if (unitSelectedContext.UnitID == undefined) {
			console.error("Failed to pass UnitID into the UnitSelectedInterfaceMode context!");
			return;
		}

		const unit: Unit | null = Units.get(unitSelectedContext.UnitID);
		if (!unit) {
			console.error(`UnitSelectedInterfaceMode: transitionTo failed to find unit (${ComponentID.toLogString(unitSelectedContext.UnitID)})!`);
			return;
		}

		UnitMapDecorationSupport.manager.activate(unitSelectedContext.UnitID, UnitMapDecorationSupport.Mode.both);

		this.setUnitLens(unitSelectedContext.UnitID);

		// Listen for message that occur now that the mode has already been selected.
		engine.on('UnitSelectionChanged', this.unitSelectionChangedListener);
		engine.on('PlayerTurnActivated', this.playerTurnActivatedListener);
		window.addEventListener(PlotCursorUpdatedEventName, this.plotCursorCoordsUpdatedListener);

		waitForLayout(() => {
			// give focus to the unit panel
			const unitInfoPanel = document.querySelector('unit-actions');

			if (unitInfoPanel) {
				unitInfoPanel.dispatchEvent(new CustomEvent('view-received-focus'));
			}
		});
	}

	/** @interface Handler */
	transitionFrom(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId) {
		// Normally we want to change to the default lens when entering move mode, unless this unit is a settler type
		let shouldChangeLens = true;
		const unitID: ComponentID | null = UI.Player.getHeadSelectedUnit();
		if (unitID) {
			const unit: Unit | null = Units.get(unitID);
			if (unit) {
				const unitDef: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
				if (unitDef) {
					const activeLens = LensManager.getActiveLens();
					const isSettlerLens = !unitDef.FoundCity && activeLens == "fxs-settler-lens";
					const isTradeLens = !unitDef.MakeTradeRoute && activeLens == "fxs-trade-lens";
					shouldChangeLens = (isSettlerLens || isTradeLens) && _newMode == 'INTERFACEMODE_MOVE_TO';
				}
			}
			else {
				console.warn(`UnitSelectedInterfaceMode: transitionFrom looking for unit but failed to find unit (${ComponentID.toLogString(unitID)})!`);
			}
		}
		else {
			console.warn(`UnitSelectedInterfaceMode: transitionFrom looking for unitID but failed to find head selected unit id!`);
		}

		if (shouldChangeLens) {
			LensManager.setActiveLens('fxs-default-lens');
		}
		UnitMapDecorationSupport.manager.deactivate();
		engine.off('UnitSelectionChanged', this.unitSelectionChangedListener);
		engine.off('PlayerTurnActivated', this.playerTurnActivatedListener);
		window.removeEventListener(PlotCursorUpdatedEventName, this.plotCursorCoordsUpdatedListener);
	}

	/** @interface Handler  */
	canEnterMode(parameters: any): boolean {
		const unitID: ComponentID = parameters?.UnitID;
		return (unitID && ComponentID.isValid(unitID));
	}

	/** @interface Handler  */
	canLeaveMode(_newMode: InterfaceMode.ModeId): boolean {
		return true;
	}

	// When the mode is active, it will handle any selection changed messages
	private onUnitSelectionChanged(data: UnitSelectionChangedData) {
		// KWG: It would probably be better to set some dirty flags and just wait update pass.  Do 'modes' have a reliable update call?
		if (!data.selected) {
			UnitMapDecorationSupport.manager.deactivate();
		}
		else {
			UnitMapDecorationSupport.manager.activate(data.unit, UnitMapDecorationSupport.Mode.both);
			this.setUnitLens(data.unit);
		}
	}

	private setUnitLens(unitID: ComponentID) {
		const unit: Unit | null = Units.get(unitID);
		if (!unit) {
			console.error(`UnitSelectedInterfaceMode: setUnitLens failed to find unit (${ComponentID.toLogString(unitID)})!`);
			return;
		}

		const unitDef: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
		if (unitDef) {
			if (unitDef.FoundCity) {
				switch (unitDef.UnitType) {
					case "UNIT_FOUNDER":
						LensManager.setActiveLens('fxs-founder-lens');
						break;
					default:
						LensManager.setActiveLens('fxs-settler-lens');
						break;
				}
			} else if (unitDef.MakeTradeRoute) {
				LensManager.setActiveLens('fxs-trade-lens');
			} else if (unitDef.ExtractsArtifacts && GameInfo.Ages.lookup(Game.age)!.AgeType == "AGE_MODERN") {
				LensManager.setActiveLens('fxs-continent-lens');
			} else {
				LensManager.setActiveLens('fxs-default-lens');
			}
		}
	}

	// Since this listener only occurs if in unit selection mode, it means a unit was already selected and
	// now a new turn is beginning; update that unit's decoration.
	private onPlayerTurnActivated(data: PlayerTurnActivated_EventData) {
		if (GameContext.localPlayerID === data.player) {
			const selectedUnitID: ComponentID | null = UI.Player.getHeadSelectedUnit();
			if (ComponentID.isValid(selectedUnitID)) {
				UnitMapDecorationSupport.manager.activate(selectedUnitID, UnitMapDecorationSupport.Mode.both);
			} else {
				console.error("Player's turn started while in unit seleted mode but there is no head selected unit!")
				InterfaceMode.switchToDefault();
			}
		}
	}

	private onPlotCursorCoordsUpdated(event: PlotCursorUpdatedEvent) {
		if (event.detail.plotCoords) {
			UnitMapDecorationSupport.manager.update({ x: event.detail.plotCoords.x, y: event.detail.plotCoords.y });
		}
	}

	allowsHotKeys(): boolean {
		return true;
	}
}

InterfaceMode.addHandler('INTERFACEMODE_UNIT_SELECTED', new UnitSelectedInterfaceMode());