/**
 * @file Unit Map Decoration support
 * @copyright 2021, Firaxis Games
 * @description Unit Map Decoration support for interface modes (unit-select, unit-move)
 */
export var ReinforcementMapDecorationSupport;
(function (ReinforcementMapDecorationSupport) {
    class Instance {
        constructor() {
            // Map of plot indexes to parameters to track which path VFX need to be updated or removed
            this.movePathModelMap = new Map();
            this.turnCounterModelMap = new Map();
            this.reinforcementPathColor = [1.1, 1.1, 1.1];
        }
        updateVisualization(results) {
            // TODO: Change VFX for 2D path and turn counter
            this.clearVisualizations();
            this.visualizeMovePath(results);
            this.visualizeTurnCounter(results);
        }
        clearVisualizations() {
            // Turn Counter
            this.turnCounterModelMap.forEach((params) => {
                if (params.modelGroup) {
                    params.modelGroup.clear();
                }
            });
            this.turnCounterModelMap.clear();
            // Movement Path
            this.movePathModelMap.forEach((params) => {
                if (params.modelGroup) {
                    params.modelGroup.clear();
                }
            });
            this.movePathModelMap.clear();
        }
        visualizeTurnCounter(results) {
            const maxTurn = Math.max(...results.turns, 0); // Default to 0 if it is negative
            const centerPlot = Math.floor(results.plots.length / 2);
            const plotIndex = results.plots[centerPlot];
            this.addTurnCounterVFX(plotIndex, maxTurn);
        }
        addTurnCounterVFX(plotIndex, turn) {
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
            params.modelGroup.addVFXAtPlot("VFX_3dUI_TurnCount_01", plotIndex, { x: 0, y: 0, z: 0.1 }, { constants: { "turn": turn, "scale": counterScale } });
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
        visualizeMovePath(results) {
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
            results.plots.forEach((plotIndex) => {
                // Skip plots that already have valid entries
                if (this.movePathModelMap.has(plotIndex)) {
                    return;
                }
                const directions = this.getDirectionsFromPath(results, plotIndex);
                this.addMovePathVFX(plotIndex, directions[0], directions[1]);
            });
        }
        addMovePathVFX(plotIndex, start, end) {
            const params = {
                plotIndex: plotIndex,
                start: start,
                end: end,
                modelGroup: WorldUI.createModelGroup(`MovePath_${plotIndex}`)
            };
            params.modelGroup.addVFXAtPlot(this.getPathVFXforPlot(), plotIndex, { x: 0, y: 0, z: 0 }, { constants: { "start": start, "end": end, "Color3": this.reinforcementPathColor } });
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
            return "VFX_3dUI_Reinforcement_Arrow";
        }
        deactivate() {
            this.clearVisualizations();
        }
    }
    ReinforcementMapDecorationSupport.manager = new Instance();
})(ReinforcementMapDecorationSupport || (ReinforcementMapDecorationSupport = {}));

//# sourceMappingURL=file:///base-standard/ui/interface-modes/support-reinforcement-map-decoration.js.map
