/**
 * @file interface-mode-ranged-attack.ts
 * @copyright 2021, Firaxis Games
 * @description Handles the overlay and action calls for the ranged attack operation
 */

import { Audio } from '/core/ui/audio-base/audio-support.js';
import ChoosePlotInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-choose-plot.js'
import { HighlightColors } from '/core/ui/utilities/utilities-color.js'
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';


interface RangedAttackInterfaceModeContext extends InterfaceMode.Context {
	UnitID: ComponentID;
}

/**
 * Handler for INTERFACEMODE_MOVE_TO.
 */
class RangedAttackInterfaceMode extends ChoosePlotInterfaceMode {

	private validPlots = new Set<PlotIndex>();

	initialize(): boolean {
		const context = this.Context as RangedAttackInterfaceModeContext;
		const args: any = {};
		const result = Game.UnitOperations.canStart(context.UnitID, UnitOperationTypes.RANGE_ATTACK, args, false);
		if (result.Success == false) {
			return false;
		}

		const unit: Unit | null = Units.get(this.Context.UnitID);
		if (!unit) {
			console.error("Failed to find unit for range attack interface mode");
			return false;
		}

		const unitMovement: UnitMovement | undefined = unit.Movement;
		if (unitMovement && unitMovement.movementMovesRemaining > 0) {

			const unitCombat = unit.Combat;
			let isShowingTarget: boolean = false;
			if (unitCombat && unitCombat.attacksRemaining > 0) { isShowingTarget = true; }

			// Possible targets
			if (isShowingTarget && result.Plots != null && result.Plots.length > 0) {
				// The Plots are all the plots the unit can strike
				// The Modifiers is a parallel array, that says what is in the plot
				if (result.Modifiers != null && result.Modifiers.length == result.Plots.length) {
					let length = result.Plots.length;
					for (let i = 0; i < length; ++i) {
						let modifier = result.Modifiers[i];
						// Put all the plots that have some type of target in validPlots.  Maybe have a separate array for indirect-fire plots, so we can highlight them differently?						
						if (modifier != OperationPlotModifiers.NONE) {
							this.validPlots.add(result.Plots[i]);
						}
					}
				}
			}
		}

		if (result.Success) {
			window.dispatchEvent(new CustomEvent('ranged-attack-started'));
		}
		return result.Success == true;
	}

	reset() {
		window.dispatchEvent(new CustomEvent('ranged-attack-finished'));
		this.validPlots.clear();
	}

	decorate(overlayGroup: WorldUI.OverlayGroup, _modelGroup: WorldUI.ModelGroup) {
		const plotOverlay: WorldUI.PlotOverlay = overlayGroup.addPlotOverlay();
		const plots: PlotIndex[] = [];
		this.validPlots.forEach(p => plots.push(p));
		plotOverlay.addPlots(plots, { edgeColor: HighlightColors.unitAttack })
		Audio.playSound("data-audio-plot-select-overlay", "interact-unit");
	}

	decorateHover(plotCoord: PlotCoord, _overlay: WorldUI.OverlayGroup, modelGroup: WorldUI.ModelGroup) {
		modelGroup.clear();
		const plotIndex = GameplayMap.getIndexFromLocation(plotCoord);

		const unit: Unit | null = Units.get(this.Context.UnitID);
		if (unit) {
			// for the targetting VFX we need to pass it actual world space positions
			const target_position = WorldUI.getPlotLocation(plotCoord, { x: 0, y: 0, z: 0 }, PlacementMode.TERRAIN);
			const source_position = WorldUI.getPlotLocation(unit.location, { x: 0, y: 0, z: 0 }, PlacementMode.TERRAIN);

			if (this.validPlots.has(plotIndex)) {
				modelGroup.addVFXAtPlot('VFX_3DUI_Ranged_Attack_Preview', { i: plotCoord.x, j: plotCoord.y }, { x: 0, y: 0, z: 0 }, { angle: 0, constants: { "target_position": [target_position.x, target_position.y, target_position.z], "source_position": [source_position.x, source_position.y, source_position.z] } })
			}
		}
	}

	proposePlot(_plot: PlotCoord, accept: () => void, _reject: () => void) {
		accept();
	}

	commitPlot(plot: PlotCoord) {
		const context = this.Context as RangedAttackInterfaceModeContext
		let args: any = {};
		args.X = plot.x;
		args.Y = plot.y;
		Game.UnitOperations.sendRequest(context.UnitID, UnitOperationTypes.RANGE_ATTACK, args);
		UI.sendAudioEvent(Audio.getSoundTag('data-audio-unit-combat-confirmed', 'interact-unit'));

		window.dispatchEvent(new CustomEvent('ranged-attack-finished'));
	}
}

InterfaceMode.addHandler('INTERFACEMODE_RANGE_ATTACK', new RangedAttackInterfaceMode());