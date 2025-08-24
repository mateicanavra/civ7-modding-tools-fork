/**
 * @file Unit Map Decoration support
 * @copyright 2021, Firaxis Games
 * @description Unit Map Decoration support for interface modes (unit-select, unit-move)
 */
import ActionHandler from '/core/ui/input/action-handler.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import Cursor from '/core/ui/input/cursor.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';
export var UnitMapDecorationSupport;
(function (UnitMapDecorationSupport) {
    let OverlayGroups;
    (function (OverlayGroups) {
        OverlayGroups[OverlayGroups["selected"] = 0] = "selected";
        OverlayGroups[OverlayGroups["possibleMovement"] = 1] = "possibleMovement";
        OverlayGroups[OverlayGroups["zoc"] = 2] = "zoc";
        OverlayGroups[OverlayGroups["attack"] = 3] = "attack";
        OverlayGroups[OverlayGroups["commandRadius"] = 4] = "commandRadius";
        OverlayGroups[OverlayGroups["blocking"] = 5] = "blocking";
    })(OverlayGroups || (OverlayGroups = {}));
    let Mode;
    (function (Mode) {
        Mode[Mode["selection"] = 0] = "selection";
        Mode[Mode["movement"] = 1] = "movement";
        Mode[Mode["both"] = 2] = "both";
    })(Mode = UnitMapDecorationSupport.Mode || (UnitMapDecorationSupport.Mode = {}));
    class Instance {
        constructor() {
            this.unitID = ComponentID.getInvalidID();
            this.mode = Mode.both;
            // The colors need to come from the color manager
            // Note: the MovementRange style asset does not currently use 'secondaryColor'
            this.unitSelectedOverlayDefaultStyle = { style: "MovementRange", primaryColor: Color.convertToLinear([0, 253, 229, 255]) };
            this.unitSelectedOverlayPossibleMovementStyle = { style: "MovementRange", primaryColor: Color.convertToLinear([0, 253, 229, 255]) };
            this.unitSelectedOverlayZoCStyle = { style: "MovementRange", primaryColor: { x: 1.0, y: 0.91, z: 0.0, w: 1.0 } };
            this.unitSelectedOverlayAttackStyle = { style: "MovementRange", primaryColor: { x: 1.0, y: 0.02, z: 0.08, w: 1.0 } };
            this.unitSelectedCommandRadiusStyle = { style: "CommanderRadius", primaryColor: Color.convertToLinear([255, 255, 255, 255]) };
            this.unitSelectedOverlayGroup = WorldUI.createOverlayGroup("UnitSelectedOverlayGroup", OVERLAY_PRIORITY.UNIT_MOVEMENT_SKIRT, { x: 1, y: 1, z: 1 });
            this.commandRadiusOverlayGroup = WorldUI.createOverlayGroup("commandRadiusOverlayGroup", OVERLAY_PRIORITY.UNIT_ABILITY_RADIUS, { x: 1, y: 1, z: 1 });
            this.unitSelectedOverlay = this.unitSelectedOverlayGroup.addBorderOverlay(this.unitSelectedOverlayDefaultStyle);
            this.commandRadiusOverlay = this.commandRadiusOverlayGroup.addBorderOverlay(this.unitSelectedCommandRadiusStyle);
            this.unitSelectedModelGroup = WorldUI.createModelGroup("UnitSelectedModelGroup");
            // Unit movement model group that only gets setup once when unit pathing is showing
            this.unitMovementStaticModelGroup = WorldUI.createModelGroup("UnitMovementStaticModelGroup");
            // Unit movement model group that gets updated every time the destination plot is changed when unit pathing is showing
            this.unitMovementDynamicModelGroup = WorldUI.createModelGroup("UnitMovementDynamicModelGroup");
            // Map of plot indexes to parameters to track which path VFX need to be updated or removed
            this.movePathModelMap = new Map();
            this.turnCounterModelMap = new Map();
            // Color for the movement arrows in linear space
            this.movementPathColor = [1.3, 0.7, 0.1];
            this.queuedPathColor = [0.9, 0.8, 0.7];
            this.movementPathLastVisibleHeight = 0;
            this.movementCounterLastVisibleHeight = 0;
            this.desiredDestination = undefined;
            this._showDesiredDestination = false;
        }
        set showDesiredDestination(shouldShow) {
            this._showDesiredDestination = shouldShow;
        }
        get showDesiredDestination() {
            // Always show the desired destination for gamepad or touch
            return this._showDesiredDestination || (ActionHandler.isGamepadActive || ActionHandler.deviceType == InputDeviceType.Touch && !Configuration.getXR());
        }
        activate(unitID, mode) {
            this.commandRadiusOverlay.clear();
            this.unitSelectedOverlay.clear();
            this.clearVisualizations();
            this.unitID = unitID;
            this.mode = mode;
            this.updateRanges();
            engine.on('UnitMoveComplete', this.onUnitMoveComplete, this);
            const plotCoords = Camera.pickPlotFromPoint(Cursor.position.x, Cursor.position.y);
            if (plotCoords && !ActionHandler.isGamepadActive) {
                this.update(plotCoords);
            }
            else {
                this.update();
            }
        }
        updateRanges() {
            this.commandRadiusOverlay.clear();
            this.unitSelectedOverlay.clear();
            const unit = Units.get(this.unitID);
            if (!unit) {
                console.error(`UnitMapDecorationManager: Failed to find unit (${ComponentID.toLogString(this.unitID)})!`);
                return;
            }
            const unitMovement = unit.Movement;
            const unitCombat = unit.Combat;
            if (unitMovement && unitMovement.movementMovesRemaining > 0) {
                const kAttackPlots = Units.getReachableTargets(unit.id);
                let movePlots = null;
                let zocPlots = null;
                if (unitCombat?.hasMovedIntoZOC == false) {
                    movePlots = Units.getReachableMovement(unit.id);
                    zocPlots = Units.getReachableZonesOfControl(unit.id, true); // Only plots visible to the unit.
                }
                else {
                    let plotIndex = GameplayMap.getIndexFromLocation(unit.location);
                    movePlots = [plotIndex];
                }
                let isShowingTarget = false;
                if (unitCombat && unitCombat.attacksRemaining > 0) {
                    isShowingTarget = true;
                }
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
                let commandRadiusPlots = null;
                commandRadiusPlots = Units.getCommandRadiusPlots(unit.id);
                if (commandRadiusPlots.length > 0) {
                    this.commandRadiusOverlay.setPlotGroups(commandRadiusPlots, OverlayGroups.commandRadius);
                    this.commandRadiusOverlay.setGroupStyle(OverlayGroups.commandRadius, this.unitSelectedCommandRadiusStyle);
                }
            }
        }
        setMode(mode) {
            this.mode = mode;
        }
        update(newDestination) {
            if (ComponentID.isInvalid(this.unitID)) {
                console.warn("UnitMapDecorationSupport - Invalid unit ID in update()");
                return;
            }
            // Kept track of the desired destination if we're given one
            this.desiredDestination = newDestination ? newDestination : undefined;
            this.unitMovementDynamicModelGroup.clear();
            if (this.desiredDestination && this.showDesiredDestination) {
                const result = Units.getPathTo(this.unitID, this.desiredDestination);
                this.updateVisualization(result, this.movementPathColor);
                if (result.plots && result.plots.length > 0) {
                    const start = result.plots[0];
                    const end = result.plots[result.plots.length - 1];
                    this.unitMovementDynamicModelGroup.addVFXAtPlot('FX_3dUI_Movement_Marker_01', end, { x: 0, y: 0, z: this.movementCounterLastVisibleHeight }, { angle: 0, constants: { "Color3": this.movementPathColor }, placement: PlacementMode.FIXED });
                    // We only update the static group once in the case that it is empty
                    if (this.unitMovementStaticModelGroup.vfxCount == 0) {
                        this.unitMovementStaticModelGroup.addVFXAtPlot('VFX_3dUI_Movement_Marker_Start_01', start, { x: 0, y: 0, z: 0 }, { angle: 0, constants: { "Color3": this.movementPathColor } });
                    }
                    return;
                }
            }
            else if (this.mode == Mode.selection || this.mode == Mode.both) {
                // In the selection mode, show any queued path.
                const destination = Units.getQueuedOperationDestination(this.unitID);
                if (destination) {
                    const result = Units.getPathTo(this.unitID, destination);
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
        updateVisualization(results, linearColor) {
            this.visualizeMovePath(results, linearColor);
            this.visualizeTurnCounter(results);
        }
        clearVisualizations() {
            // Turn Counter
            this.turnCounterModelMap.forEach((params) => {
                if (params.modelGroup) {
                    params.modelGroup.clear();
                    params.modelGroup.destroy();
                }
            });
            this.turnCounterModelMap.clear();
            // Movement Path
            this.movePathModelMap.forEach((params) => {
                if (params.modelGroup) {
                    params.modelGroup.clear();
                    params.modelGroup.destroy();
                }
            });
            this.movePathModelMap.clear();
        }
        visualizeTurnCounter(results) {
            let plotIndexesToRemove = [];
            this.turnCounterModelMap.forEach((params) => {
                const resultIndex = results.plots.findIndex(plotIndex => plotIndex == params.plotIndex);
                if (resultIndex == -1) {
                    plotIndexesToRemove.push(params.plotIndex);
                    return;
                }
                const resultTurn = results.turns[resultIndex];
                if (resultTurn != params.plotTurn) {
                    plotIndexesToRemove.push(params.plotIndex);
                    return;
                }
            });
            plotIndexesToRemove.forEach((plotIndex) => {
                this.removeTurnCounterVFX(plotIndex);
            });
            results.plots.forEach((plotIndex, i) => {
                // We hold on to the height of the last visible tile and use that height for counter pucks in the fog
                const plotLocation = GameplayMap.getLocationFromIndex(plotIndex);
                const isVisible = GameplayMap.getRevealedState(GameContext.localPlayerID, plotLocation.x, plotLocation.y) != RevealedStates.HIDDEN;
                if (isVisible) {
                    this.movementCounterLastVisibleHeight = WorldUI.getPlotLocation(plotLocation, { x: 0, y: 0, z: 0 }, PlacementMode.WATER).z;
                }
                // Skip plots that already have valid entries
                if (this.turnCounterModelMap.has(plotIndex)) {
                    return;
                }
                const thisTurn = results.turns[i];
                const nextTurn = results.turns[i + 1] ? results.turns[i + 1] : -1;
                if (thisTurn != nextTurn) {
                    this.addTurnCounterVFX(plotIndex, thisTurn, this.movementCounterLastVisibleHeight);
                }
            });
        }
        addTurnCounterVFX(plotIndex, turn, height) {
            // Remove other counters for this turn
            let plotIndexesToRemove = [];
            this.turnCounterModelMap.forEach((params) => {
                if (params.plotTurn == turn) {
                    plotIndexesToRemove.push(params.plotIndex);
                    return;
                }
            });
            plotIndexesToRemove.forEach((plotIndex) => {
                this.removeTurnCounterVFX(plotIndex);
            });
            // Add the new counter
            const params = {
                plotIndex: plotIndex,
                plotTurn: turn,
                modelGroup: WorldUI.createModelGroup(`TurnCounter_${plotIndex}`)
            };
            let counterScale = 1.0;
            params.modelGroup.addVFXAtPlot("VFX_3dUI_TurnCount_01", plotIndex, { x: 0, y: 0, z: height }, { constants: { "turn": turn, "scale": counterScale }, placement: PlacementMode.FIXED });
            this.turnCounterModelMap.set(plotIndex, params);
        }
        removeTurnCounterVFX(plotIndex) {
            const params = this.turnCounterModelMap.get(plotIndex);
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
        getDirectionsFromPath(results, fromPlotIndex) {
            const resultIndex = results.plots.findIndex(plotIndex => plotIndex == fromPlotIndex);
            if (resultIndex == -1) {
                console.error(`support-unit-map-decoration: getDirectionsFromPath failed to plotIndex ${fromPlotIndex}`);
                return [-1, -1];
            }
            const previousPlot = results.plots[resultIndex - 1];
            const nextPlot = results.plots[resultIndex + 1];
            let prevDirection = 0;
            let nextDirection = 0;
            const thisPlotCoord = GameplayMap.getLocationFromIndex(fromPlotIndex);
            // Find the direction to the previous plot
            if (previousPlot != undefined) {
                const prevPlotCoord = GameplayMap.getLocationFromIndex(previousPlot);
                prevDirection = this.getDirectionNumberFromDirectionType(GameplayMap.getDirectionToPlot(thisPlotCoord, prevPlotCoord));
            }
            // Find the direction to the next plot
            if (nextPlot != undefined) {
                const nextPlotCoord = GameplayMap.getLocationFromIndex(nextPlot);
                nextDirection = this.getDirectionNumberFromDirectionType(GameplayMap.getDirectionToPlot(thisPlotCoord, nextPlotCoord));
            }
            return [prevDirection, nextDirection];
        }
        visualizeMovePath(results, linearColor) {
            let plotIndexesToRemove = [];
            this.movePathModelMap.forEach((params) => {
                const resultIndex = results.plots.findIndex(plotIndex => plotIndex == params.plotIndex);
                if (resultIndex == -1) {
                    plotIndexesToRemove.push(params.plotIndex);
                    return;
                }
                const directions = this.getDirectionsFromPath(results, params.plotIndex);
                if (directions[0] != params.start || directions[1] != params.end) {
                    plotIndexesToRemove.push(params.plotIndex);
                    return;
                }
            });
            plotIndexesToRemove.forEach((plotIndex) => {
                this.removeMovePathVFX(plotIndex);
            });
            UI.sendAudioEvent(Audio.getSoundTag('data-audio-unit-move-hovered', 'interact-unit'));
            results.plots.forEach((plotIndex) => {
                // We hold on to the height of the last visible tile and use that height for arrows in the fog
                const plotLocation = GameplayMap.getLocationFromIndex(plotIndex);
                const isVisible = GameplayMap.getRevealedState(GameContext.localPlayerID, plotLocation.x, plotLocation.y) != RevealedStates.HIDDEN;
                if (isVisible) {
                    this.movementPathLastVisibleHeight = WorldUI.getPlotLocation(plotLocation, { x: 0, y: 0, z: 0 }, PlacementMode.WATER).z;
                }
                // Skip plots that already have valid entries
                if (this.movePathModelMap.has(plotIndex)) {
                    return;
                }
                const directions = this.getDirectionsFromPath(results, plotIndex);
                let movementColor = linearColor;
                const arrowHeight = isVisible ? 0 : this.movementPathLastVisibleHeight;
                this.addMovePathVFX(plotIndex, directions[0], directions[1], movementColor, arrowHeight);
            });
        }
        addMovePathVFX(plotIndex, start, end, linearColor, height) {
            const params = {
                plotIndex: plotIndex,
                start: start,
                end: end,
                modelGroup: WorldUI.createModelGroup(`MovePath_${plotIndex}`)
            };
            params.modelGroup.addVFXAtPlot(this.getPathVFXforPlot(), plotIndex, { x: 0, y: 0, z: 0 }, { constants: { "start": start, "end": end, "Color3": linearColor, "height": height } });
            this.movePathModelMap.set(plotIndex, params);
        }
        removeMovePathVFX(plotIndex) {
            const params = this.movePathModelMap.get(plotIndex);
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
        getDirectionNumberFromDirectionType(direction) {
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
        getPathVFXforPlot() {
            return "VFX_3dUI_MovePip_01";
        }
        onUnitMoveComplete(data) {
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
    UnitMapDecorationSupport.manager = new Instance();
})(UnitMapDecorationSupport || (UnitMapDecorationSupport = {}));

//# sourceMappingURL=file:///base-standard/ui/interface-modes/support-unit-map-decoration.js.map
