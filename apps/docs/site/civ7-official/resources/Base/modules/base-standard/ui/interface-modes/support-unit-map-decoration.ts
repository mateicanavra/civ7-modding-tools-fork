/**
 * @file Unit Map Decoration support
 * @copyright 2021, Firaxis Games
 * @description Unit Map Decoration support for interface modes (unit-select, unit-move)
 */

import ActionHandler from '/core/ui/input/action-handler.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import Cursor from '/core/ui/input/cursor.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js'
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';

interface turnCounterParams {
	plotIndex: number
	plotTurn: number;
	modelGroup: WorldUI.ModelGroup;
}

interface movePathParams {
	plotIndex: number;
	start: number;
	end: number;
	modelGroup: WorldUI.ModelGroup;
}

export namespace UnitMapDecorationSupport {

	enum OverlayGroups {
		selected = 0,
		possibleMovement = 1,
		zoc = 2,
		attack = 3,
		commandRadius = 4,
		blocking
	}

	export enum Mode {
		selection = 0,
		movement = 1,
		both = 2,
	}

	class Instance {

		private unitID: ComponentID = ComponentID.getInvalidID();
		private mode: Mode = Mode.both;

		// The colors need to come from the color manager
		// Note: the MovementRange style asset does not currently use 'secondaryColor'
		private unitSelectedOverlayDefaultStyle: WorldUI.BorderStyle = { style: "MovementRange", primaryColor: Color.convertToLinear([0, 253, 229, 255]) };
		private unitSelectedOverlayPossibleMovementStyle: WorldUI.BorderStyle = { style: "MovementRange", primaryColor: Color.convertToLinear([0, 253, 229, 255]) };
		private unitSelectedOverlayZoCStyle: WorldUI.BorderStyle = { style: "MovementRange", primaryColor: { x: 1.0, y: 0.91, z: 0.0, w: 1.0 } };
		private unitSelectedOverlayAttackStyle: WorldUI.BorderStyle = { style: "MovementRange", primaryColor: { x: 1.0, y: 0.02, z: 0.08, w: 1.0 } };
		private unitSelectedCommandRadiusStyle: WorldUI.BorderStyle = { style: "CommanderRadius", primaryColor: Color.convertToLinear([255, 255, 255, 255]) };
		private unitSelectedOverlayGroup: WorldUI.OverlayGroup = WorldUI.createOverlayGroup("UnitSelectedOverlayGroup", OVERLAY_PRIORITY.UNIT_MOVEMENT_SKIRT, { x: 1, y: 1, z: 1 });
		private commandRadiusOverlayGroup: WorldUI.OverlayGroup = WorldUI.createOverlayGroup("commandRadiusOverlayGroup", OVERLAY_PRIORITY.UNIT_ABILITY_RADIUS, { x: 1, y: 1, z: 1 });
		private unitSelectedOverlay: WorldUI.BorderOverlay = this.unitSelectedOverlayGroup.addBorderOverlay(this.unitSelectedOverlayDefaultStyle);
		private commandRadiusOverlay: WorldUI.BorderOverlay = this.commandRadiusOverlayGroup.addBorderOverlay(this.unitSelectedCommandRadiusStyle);

		protected unitSelectedModelGroup: WorldUI.ModelGroup = WorldUI.createModelGroup("UnitSelectedModelGroup");

		// Unit movement model group that only gets setup once when unit pathing is showing
		private unitMovementStaticModelGroup: WorldUI.ModelGroup = WorldUI.createModelGroup("UnitMovementStaticModelGroup");

		// Unit movement model group that gets updated every time the destination plot is changed when unit pathing is showing
		private unitMovementDynamicModelGroup: WorldUI.ModelGroup = WorldUI.createModelGroup("UnitMovementDynamicModelGroup");

		// Map of plot indexes to parameters to track which path VFX need to be updated or removed
		private movePathModelMap: Map<number, movePathParams> = new Map<number, movePathParams>();
		private turnCounterModelMap: Map<number, turnCounterParams> = new Map<number, turnCounterParams>();

		// Color for the movement arrows in linear space
		private movementPathColor: number[] = [1.3, 0.7, 0.1];
		private queuedPathColor: number[] = [0.9, 0.8, 0.7];

		private movementPathLastVisibleHeight: number = 0;
		private movementCounterLastVisibleHeight: number = 0;

		private desiredDestination: PlotCoord | undefined = undefined;

		private _showDesiredDestination: boolean = false;

		set showDesiredDestination(shouldShow: boolean) {
			this._showDesiredDestination = shouldShow;
		}

		get showDesiredDestination(): boolean {
			// Always show the desired destination for gamepad or touch
			return this._showDesiredDestination || (ActionHandler.isGamepadActive || ActionHandler.deviceType == InputDeviceType.Touch && !Configuration.getXR());
		}

		activate(unitID: ComponentID, mode: Mode) {
			this.commandRadiusOverlay.clear();
			this.unitSelectedOverlay.clear();
			this.clearVisualizations();

			this.unitID = unitID;
			this.mode = mode;

			this.updateRanges();

			engine.on('UnitMoveComplete', this.onUnitMoveComplete, this);

			const plotCoords: PlotCoord | null = Camera.pickPlotFromPoint(Cursor.position.x, Cursor.position.y);
			if (plotCoords && !ActionHandler.isGamepadActive) {
				this.update(plotCoords);
			} else {
				this.update();
			}
		}

		private updateRanges() {
			this.commandRadiusOverlay.clear();
			this.unitSelectedOverlay.clear();

			const unit: Unit | null = Units.get(this.unitID);
			if (!unit) {
				console.error(`UnitMapDecorationManager: Failed to find unit (${ComponentID.toLogString(this.unitID)})!`);
				return;
			}

			const unitMovement: UnitMovement | undefined = unit.Movement;
			const unitCombat = unit.Combat;
			if (unitMovement && unitMovement.movementMovesRemaining > 0) {

				const kAttackPlots = Units.getReachableTargets(unit.id);
				let movePlots: number[] | null = null;
				let zocPlots: number[] | null = null;
				if (unitCombat?.hasMovedIntoZOC == false) {
					movePlots = Units.getReachableMovement(unit.id);
					zocPlots = Units.getReachableZonesOfControl(unit.id, true); // Only plots visible to the unit.
				}
				else {
					let plotIndex = GameplayMap.getIndexFromLocation(unit.location);
					movePlots = [plotIndex];
				}

				let isShowingTarget: boolean = false;
				if (unitCombat && unitCombat.attacksRemaining > 0) { isShowingTarget = true; }

				// ZOC
				if (zocPlots != null && zocPlots.length > 0) {
					this.unitSelectedOverlay.setPlotGroups(zocPlots, OverlayGroups.zoc);
					this.unitSelectedOverlay.setGroupStyle(OverlayGroups.zoc, this.unitSelectedOverlayZoCStyle);
				}

				// Possible movement, with no restrictions.
				if (movePlots != null && movePlots.length > 0) {
					this.unitSelectedOverlay.setPlotGroups(movePlots, OverlayGroups.possibleMovement);
					this.unitSelectedOverlay.setGroupStyle(OverlayGroups.possibleMovement, this.unitSelectedOverlayPossibleMovementStyle);
				}
				// Possible movement, with attacking.
				if (isShowingTarget && kAttackPlots != null && kAttackPlots.length > 0) {
					this.unitSelectedOverlay.setPlotGroups(kAttackPlots, OverlayGroups.attack);
					this.unitSelectedOverlay.setGroupStyle(OverlayGroups.attack, this.unitSelectedOverlayAttackStyle);
				}
			}

			//Command Radius
			if (unit.isCommanderUnit) {
				let commandRadiusPlots: number[] | null = null;
				commandRadiusPlots = Units.getCommandRadiusPlots(unit.id);
				if (commandRadiusPlots.length > 0) {
					this.commandRadiusOverlay.setPlotGroups(commandRadiusPlots, OverlayGroups.commandRadius);
					this.commandRadiusOverlay.setGroupStyle(OverlayGroups.commandRadius, this.unitSelectedCommandRadiusStyle);
				}
			}
		}

		setMode(mode: Mode) {
			this.mode = mode;
		}

		update(newDestination?: PlotCoord) {

			if (ComponentID.isInvalid(this.unitID)) {
				console.warn("UnitMapDecorationSupport - Invalid unit ID in update()");
				return;
			}

			// Kept track of the desired destination if we're given one
			this.desiredDestination = newDestination ? newDestination : undefined;

			this.unitMovementDynamicModelGroup.clear();

			if (this.desiredDestination && this.showDesiredDestination) {
				const result: UnitGetPathToResults = Units.getPathTo(this.unitID, this.desiredDestination);
				this.updateVisualization(result, this.movementPathColor);

				if (result.plots && result.plots.length > 0) {
					const start: number = result.plots[0];
					const end: number = result.plots[result.plots.length - 1];

					this.unitMovementDynamicModelGroup.addVFXAtPlot('FX_3dUI_Movement_Marker_01', end, { x: 0, y: 0, z: this.movementCounterLastVisibleHeight }, { angle: 0, constants: { "Color3": this.movementPathColor }, placement: PlacementMode.FIXED });

					// We only update the static group once in the case that it is empty
					if (this.unitMovementStaticModelGroup.vfxCount == 0) {
						this.unitMovementStaticModelGroup.addVFXAtPlot('VFX_3dUI_Movement_Marker_Start_01', start, { x: 0, y: 0, z: 0 }, { angle: 0, constants: { "Color3": this.movementPathColor } });
					}

					return;
				}
			} else if (this.mode == Mode.selection || this.mode == Mode.both) {
				// In the selection mode, show any queued path.
				const destination: float2 | null = Units.getQueuedOperationDestination(this.unitID);
				if (destination) {
					const result: UnitGetPathToResults = Units.getPathTo(this.unitID, destination);
					if (result.plots && result.plots.length > 0) {
						const end = result.plots[result.plots.length - 1];
						this.updateVisualization(result, this.queuedPathColor);

						if (this.unitSelectedModelGroup.vfxCount == 0) {
							this.unitSelectedModelGroup.addVFXAtPlot('FX_3dUI_Movement_Marker_01', end, { x: 0, y: 0, z: 0 }, { angle: 0, constants: { "Color3": this.queuedPathColor } });
						}

						return;
					}
				}
			}

			// If we failed to show anything make sure old fxs are cleared up
			this.clearVisualizations();
		}

		private updateVisualization(results: UnitGetPathToResults, linearColor: number[]) {
			this.visualizeMovePath(results, linearColor);
			this.visualizeTurnCounter(results);
		}

		private clearVisualizations() {
			// Turn Counter
			this.turnCounterModelMap.forEach((params: turnCounterParams) => {
				if (params.modelGroup) {
					params.modelGroup.clear();
					params.modelGroup.destroy();
				}
			})

			this.turnCounterModelMap.clear();

			// Movement Path
			this.movePathModelMap.forEach((params: movePathParams) => {
				if (params.modelGroup) {
					params.modelGroup.clear();
					params.modelGroup.destroy();
				}
			})

			this.movePathModelMap.clear();
		}

		private visualizeTurnCounter(results: UnitGetPathToResults) {
			let plotIndexesToRemove: number[] = [];
			this.turnCounterModelMap.forEach((params: turnCounterParams) => {
				const resultIndex: number = results.plots.findIndex(plotIndex => plotIndex == params.plotIndex);
				if (resultIndex == -1) {
					plotIndexesToRemove.push(params.plotIndex);
					return;
				}

				const resultTurn: number = results.turns[resultIndex];
				if (resultTurn != params.plotTurn) {
					plotIndexesToRemove.push(params.plotIndex);
					return;
				}
			});

			plotIndexesToRemove.forEach((plotIndex: number) => {
				this.removeTurnCounterVFX(plotIndex);
			})

			results.plots.forEach((plotIndex: number, i: number) => {
				// We hold on to the height of the last visible tile and use that height for counter pucks in the fog
				const plotLocation = GameplayMap.getLocationFromIndex(plotIndex);
				const isVisible = GameplayMap.getRevealedState(GameContext.localPlayerID, plotLocation.x, plotLocation.y) != RevealedStates.HIDDEN
				if (isVisible) {
					this.movementCounterLastVisibleHeight = WorldUI.getPlotLocation(plotLocation, { x: 0, y: 0, z: 0 }, PlacementMode.WATER).z;
				}

				// Skip plots that already have valid entries
				if (this.turnCounterModelMap.has(plotIndex)) {
					return;
				}

				const thisTurn: number = results.turns[i];
				const nextTurn: number = results.turns[i + 1] ? results.turns[i + 1] : -1;
				if (thisTurn != nextTurn) {
					this.addTurnCounterVFX(plotIndex, thisTurn, this.movementCounterLastVisibleHeight);
				}
			});
		}

		private addTurnCounterVFX(plotIndex: number, turn: number, height: number) {
			// Remove other counters for this turn
			let plotIndexesToRemove: number[] = [];
			this.turnCounterModelMap.forEach((params: turnCounterParams) => {
				if (params.plotTurn == turn) {
					plotIndexesToRemove.push(params.plotIndex);
					return;
				}
			});

			plotIndexesToRemove.forEach((plotIndex: number) => {
				this.removeTurnCounterVFX(plotIndex);
			});

			// Add the new counter
			const params: turnCounterParams = {
				plotIndex: plotIndex,
				plotTurn: turn,
				modelGroup: WorldUI.createModelGroup(`TurnCounter_${plotIndex}`)
			}

			let counterScale = 1.0;
			params.modelGroup.addVFXAtPlot("VFX_3dUI_TurnCount_01", plotIndex, { x: 0, y: 0, z: height }, { constants: { "turn": turn, "scale": counterScale }, placement: PlacementMode.FIXED });

			this.turnCounterModelMap.set(plotIndex, params);
		}

		private removeTurnCounterVFX(plotIndex: number) {
			const params: turnCounterParams | undefined = this.turnCounterModelMap.get(plotIndex)
			if (!params) {
				console.error(`support-unit-map-decoration: removeTurnCounterVFX failed to find index ${plotIndex}`);
				return;
			}

			if (params.modelGroup) {
				params.modelGroup.clear();
				params.modelGroup.destroy();
			}

			this.turnCounterModelMap.delete(plotIndex);
		}

		private getDirectionsFromPath(results: UnitGetPathToResults, fromPlotIndex: number): [number, number] {
			const resultIndex: number = results.plots.findIndex(plotIndex => plotIndex == fromPlotIndex);
			if (resultIndex == -1) {
				console.error(`support-unit-map-decoration: getDirectionsFromPath failed to plotIndex ${fromPlotIndex}`);
				return [-1, -1];
			}

			const previousPlot: number | undefined = results.plots[resultIndex - 1];
			const nextPlot: number | undefined = results.plots[resultIndex + 1];

			let prevDirection: number = 0;
			let nextDirection: number = 0;
			const thisPlotCoord: PlotCoord = GameplayMap.getLocationFromIndex(fromPlotIndex);

			// Find the direction to the previous plot
			if (previousPlot != undefined) {
				const prevPlotCoord: PlotCoord = GameplayMap.getLocationFromIndex(previousPlot);
				prevDirection = this.getDirectionNumberFromDirectionType(GameplayMap.getDirectionToPlot(thisPlotCoord, prevPlotCoord));
			}

			// Find the direction to the next plot
			if (nextPlot != undefined) {
				const nextPlotCoord: PlotCoord = GameplayMap.getLocationFromIndex(nextPlot);
				nextDirection = this.getDirectionNumberFromDirectionType(GameplayMap.getDirectionToPlot(thisPlotCoord, nextPlotCoord));
			}

			return [prevDirection, nextDirection];
		}

		private visualizeMovePath(results: UnitGetPathToResults, linearColor: number[]) {
			let plotIndexesToRemove: number[] = [];
			this.movePathModelMap.forEach((params: movePathParams) => {
				const resultIndex: number = results.plots.findIndex(plotIndex => plotIndex == params.plotIndex);
				if (resultIndex == -1) {
					plotIndexesToRemove.push(params.plotIndex);
					return;
				}

				const directions: [number, number] = this.getDirectionsFromPath(results, params.plotIndex);

				if (directions[0] != params.start || directions[1] != params.end) {
					plotIndexesToRemove.push(params.plotIndex);
					return;
				}
			});

			plotIndexesToRemove.forEach((plotIndex: number) => {
				this.removeMovePathVFX(plotIndex);
			})

			UI.sendAudioEvent(Audio.getSoundTag('data-audio-unit-move-hovered', 'interact-unit'));

			results.plots.forEach((plotIndex: number) => {

				// We hold on to the height of the last visible tile and use that height for arrows in the fog
				const plotLocation = GameplayMap.getLocationFromIndex(plotIndex);
				const isVisible = GameplayMap.getRevealedState(GameContext.localPlayerID, plotLocation.x, plotLocation.y) != RevealedStates.HIDDEN
				if (isVisible) {
					this.movementPathLastVisibleHeight = WorldUI.getPlotLocation(plotLocation, { x: 0, y: 0, z: 0 }, PlacementMode.WATER).z;
				}

				// Skip plots that already have valid entries
				if (this.movePathModelMap.has(plotIndex)) {
					return;
				}

				const directions: [number, number] = this.getDirectionsFromPath(results, plotIndex);

				let movementColor: number[] = linearColor;
				const arrowHeight = isVisible ? 0 : this.movementPathLastVisibleHeight;

				this.addMovePathVFX(plotIndex, directions[0], directions[1], movementColor, arrowHeight);
			});
		}

		private addMovePathVFX(plotIndex: number, start: number, end: number, linearColor: number[], height: number) {
			const params: movePathParams = {
				plotIndex: plotIndex,
				start: start,
				end: end,
				modelGroup: WorldUI.createModelGroup(`MovePath_${plotIndex}`)
			}

			params.modelGroup.addVFXAtPlot(this.getPathVFXforPlot(), plotIndex, { x: 0, y: 0, z: 0 }, { constants: { "start": start, "end": end, "Color3": linearColor, "height": height } });

			this.movePathModelMap.set(plotIndex, params);
		}

		private removeMovePathVFX(plotIndex: number) {
			const params: movePathParams | undefined = this.movePathModelMap.get(plotIndex)
			if (!params) {
				console.error(`support-unit-map-decoration: removeMovePathVFX failed to find index ${plotIndex}`);
				return;
			}

			if (params.modelGroup) {
				params.modelGroup.clear();
				params.modelGroup.destroy();
			}

			this.movePathModelMap.delete(plotIndex);
		}

		private getDirectionNumberFromDirectionType(direction: DirectionTypes): number {
			switch (direction) {
				case DirectionTypes.DIRECTION_EAST:
					return 1;
				case DirectionTypes.DIRECTION_SOUTHEAST:
					return 2;
				case DirectionTypes.DIRECTION_SOUTHWEST:
					return 3;
				case DirectionTypes.DIRECTION_WEST:
					return 4;
				case DirectionTypes.DIRECTION_NORTHWEST:
					return 5;
				case DirectionTypes.DIRECTION_NORTHEAST:
					return 6;
			}

			return 0;
		}

		private getPathVFXforPlot(): string {
			return "VFX_3dUI_MovePip_01";
		}

		private onUnitMoveComplete(data: UnitMoveComplete_EventData) {
			if (ComponentID.isMatch(this.unitID, data.unit)) {
				if (this.unitMovementStaticModelGroup.vfxCount > 0) {
					this.unitMovementStaticModelGroup.clear();
					this.unitMovementStaticModelGroup.addVFXAtPlot('VFX_3dUI_Movement_Marker_Start_01', data.location, { x: 0, y: 0, z: 0 }, { angle: 0, constants: { "tintColor1": this.movementPathColor } });

					this.updateRanges();
				}
			}
		}

		deactivate() {
			this.unitID = ComponentID.getInvalidID();
			this.commandRadiusOverlay.clear();
			this.unitSelectedOverlay.clear();
			this.unitSelectedModelGroup.clear();
			this.unitMovementStaticModelGroup.clear();
			this.unitMovementDynamicModelGroup.clear();
			this.clearVisualizations();
			this.showDesiredDestination = false;
			engine.off('UnitMoveComplete', this.onUnitMoveComplete, this);
		}
	}

	export const manager = new Instance();
}