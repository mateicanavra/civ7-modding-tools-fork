/**
 * @file Unit Map Decoration support
 * @copyright 2021, Firaxis Games
 * @description Unit Map Decoration support for interface modes (unit-select, unit-move)
 */

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

export namespace ReinforcementMapDecorationSupport {

	class Instance {
		// Map of plot indexes to parameters to track which path VFX need to be updated or removed
		private movePathModelMap: Map<number, movePathParams> = new Map<number, movePathParams>();
		private turnCounterModelMap: Map<number, turnCounterParams> = new Map<number, turnCounterParams>();
		private reinforcementPathColor: number[] = [1.1, 1.1, 1.1];

		updateVisualization(results: UnitGetPathToResults) {
			// TODO: Change VFX for 2D path and turn counter
			this.clearVisualizations();
			this.visualizeMovePath(results);
			this.visualizeTurnCounter(results);
		}

		private clearVisualizations() {
			// Turn Counter
			this.turnCounterModelMap.forEach((params: turnCounterParams) => {
				if (params.modelGroup) {
					params.modelGroup.clear();
				}
			})

			this.turnCounterModelMap.clear();

			// Movement Path
			this.movePathModelMap.forEach((params: movePathParams) => {
				if (params.modelGroup) {
					params.modelGroup.clear();
				}
			})

			this.movePathModelMap.clear();
		}

		private visualizeTurnCounter(results: UnitGetPathToResults) {
			const maxTurn: number = Math.max(...results.turns, 0); // Default to 0 if it is negative
			const centerPlot: number = Math.floor(results.plots.length / 2);
			const plotIndex: number = results.plots[centerPlot];

			this.addTurnCounterVFX(plotIndex, maxTurn);
		}


		private addTurnCounterVFX(plotIndex: number, turn: number) {
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
			params.modelGroup.addVFXAtPlot("VFX_3dUI_TurnCount_01", plotIndex, { x: 0, y: 0, z: 0.1 }, { constants: { "turn": turn, "scale": counterScale } });

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

		private visualizeMovePath(results: UnitGetPathToResults) {
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

			results.plots.forEach((plotIndex: number) => {
				// Skip plots that already have valid entries
				if (this.movePathModelMap.has(plotIndex)) {
					return;
				}

				const directions: [number, number] = this.getDirectionsFromPath(results, plotIndex);

				this.addMovePathVFX(plotIndex, directions[0], directions[1]);
			});
		}

		private addMovePathVFX(plotIndex: number, start: number, end: number) {
			const params: movePathParams = {
				plotIndex: plotIndex,
				start: start,
				end: end,
				modelGroup: WorldUI.createModelGroup(`MovePath_${plotIndex}`)
			}

			params.modelGroup.addVFXAtPlot(this.getPathVFXforPlot(), plotIndex, { x: 0, y: 0, z: 0 }, { constants: { "start": start, "end": end, "Color3": this.reinforcementPathColor } });

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
			return "VFX_3dUI_Reinforcement_Arrow";
		}

		deactivate() {
			this.clearVisualizations();
		}
	}

	export const manager = new Instance();
}