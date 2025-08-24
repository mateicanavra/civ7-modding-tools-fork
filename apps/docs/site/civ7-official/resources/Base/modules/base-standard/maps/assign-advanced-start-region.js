import * as globals from '/base-standard/maps/map-globals.js';
const g_StartingScore = 20;
const g_BadTerrainScore = 1;
const g_GoodTerrainScore = 10;
const g_TooCloseToOtherPlayerPenalty = -3;
const g_TooCloseDistance = 10;
class AdvancedStartRegion {
    constructor(inPlayer) {
        this.claimedPlots = [];
        this.player = inPlayer;
        this.startPlot = { x: -1, y: -1 };
        this.potentialPlots = new Map();
    }
}
export function assignAdvancedStartRegions() {
    const playerIds = Players.getAliveIds();
    let playerRegions = [];
    let playerStartPositions = [];
    for (let playerId of playerIds) {
        let region = new AdvancedStartRegion(playerId);
        initializeRegion(region);
        playerStartPositions.push(region.startPlot);
        playerRegions.push(region);
    }
    let maxRegionSize = 0;
    const advStartParams = GameInfo.AdvancedStartParameters.lookup(Game.age);
    if (advStartParams !== null) {
        maxRegionSize = advStartParams.MaxRegionPlots;
    }
    let minRange = 3;
    let minRangeDef = GameInfo.GlobalParameters.lookup("CITY_MIN_RANGE");
    if (minRangeDef !== null) {
        minRange = parseInt(minRangeDef.Value);
    }
    for (let plotCount = 0; plotCount < maxRegionSize; plotCount++) {
        // Claim plots one player at a time, so all regions get a fair chance
        for (let i = 0; i < playerRegions.length; i++) {
            // Claim the next plot
            const plotIndex = claimPlot(playerRegions[i], playerStartPositions);
            if (plotIndex !== -1) {
                // Let other player regions know this plot is no longer available, and also anything within X tiles of it, depending on how close you can settle (normally 3)
                const plot = GameplayMap.getLocationFromIndex(plotIndex);
                let claimedPlots = GameplayMap.getPlotIndicesInRadius(plot.x, plot.y, minRange);
                for (let j = 0; j < playerRegions.length; j++) {
                    if (i !== j) {
                        for (let claimedPlot of claimedPlots) {
                            playerRegions[j].potentialPlots.set(claimedPlot, -1);
                        }
                    }
                }
            }
        }
    }
    for (let i = 0; i < playerRegions.length; i++) {
        StartPositioner.setAdvancedStartRegion(playerRegions[i].player, playerRegions[i].claimedPlots);
    }
    dumpAdvancedStartRegions(playerRegions);
}
function initializeRegion(region) {
    let startPosition = StartPositioner.getStartPosition(region.player);
    if (startPosition === -1) {
        return;
    }
    region.startPlot = GameplayMap.getLocationFromIndex(startPosition);
    region.potentialPlots.set(startPosition, g_StartingScore + g_GoodTerrainScore);
}
function claimPlot(region, playerStartPositions) {
    // Find the best plot to include
    let chosenPlot = -1;
    let maxScore = -1;
    for (const [potentialPlot, score] of region.potentialPlots.entries()) {
        if (score > maxScore) {
            maxScore = score;
            chosenPlot = potentialPlot;
        }
    }
    if (chosenPlot !== -1) {
        // First, include this in our region
        region.claimedPlots.push(chosenPlot);
        // Second, set the score of this plot to -1 to indicate it is no longer a valid choice
        region.potentialPlots.set(chosenPlot, -1);
        // Lastly, adjust the score of surrounding plots, or add them as potential plots
        let plot = GameplayMap.getLocationFromIndex(chosenPlot);
        let adjacentPlots = GameplayMap.getPlotIndicesInRadius(plot.x, plot.y, 1);
        for (let i = 0; i < adjacentPlots.length; i++) {
            let adjacentPlotIndex = adjacentPlots[i];
            if (region.potentialPlots.has(adjacentPlotIndex) == false) {
                // This is a new plot. Initialize it based on terrain type
                const adjPlot = GameplayMap.getLocationFromIndex(adjacentPlotIndex);
                const terrainType = GameplayMap.getTerrainType(adjPlot.x, adjPlot.y);
                if (terrainType == globals.g_OceanTerrain) {
                    // No ocean
                    region.potentialPlots.set(adjacentPlotIndex, -1);
                }
                else if (terrainType == globals.g_MountainTerrain || terrainType == globals.g_CoastTerrain) {
                    // Mountains and coasts are not ideal as you cannot actually settle there, so we would like to only include them if we have to get to the other side
                    region.potentialPlots.set(adjacentPlotIndex, g_BadTerrainScore);
                }
                else {
                    // This should be fine terrain to include. Even if this is a river we can't settle on, we want to include it in the settlement area
                    region.potentialPlots.set(adjacentPlotIndex, g_GoodTerrainScore);
                }
                // If we are including this plot as a potential, weight it based on how far it is away from the start position
                let score = region.potentialPlots.get(adjacentPlotIndex);
                if (score) { // We just set it above, but test it anyway
                    if (score > 0) {
                        let distScore = g_StartingScore - GameplayMap.getPlotDistance(region.startPlot.x, region.startPlot.y, adjPlot.x, adjPlot.y);
                        if (distScore < 0) {
                            distScore = 0;
                        }
                        score += distScore;
                    }
                    // Bias the player away from being too close to another player unless they can't help it. Should help with locations where the start locations are too close, and should spred away from each other instead.
                    for (let playerPos of playerStartPositions) {
                        const dist = GameplayMap.getPlotDistance(playerPos.x, playerPos.y, adjPlot.x, adjPlot.y);
                        if (dist < g_TooCloseDistance) {
                            score += g_TooCloseToOtherPlayerPenalty;
                        }
                    }
                    region.potentialPlots.set(adjacentPlotIndex, score);
                }
            }
            else {
                let score = region.potentialPlots.get(adjacentPlotIndex);
                if (score && score > 0) {
                    // As long as we haven't ruled out this tile already, increase it's score for having an included surrounding tile
                    region.potentialPlots.set(adjacentPlotIndex, score + 1);
                }
            }
        }
    }
    return chosenPlot;
}
function dumpAdvancedStartRegions(playerRegions) {
    console.log("AdvancedStartRegions");
    let iHeight = GameplayMap.getGridHeight();
    let iWidth = GameplayMap.getGridWidth();
    for (let iY = iHeight - 1; iY >= 0; iY--) {
        let str = '';
        if (iY % 2 == 1) {
            str += ' ';
        }
        for (let iX = 0; iX < iWidth; iX++) {
            let terrain = GameplayMap.getTerrainType(iX, iY);
            let terrainString = " ";
            if (terrain == globals.g_FlatTerrain) {
                terrainString = '.';
            }
            else if (terrain == globals.g_HillTerrain) {
                terrainString = "^";
            }
            else if (terrain == globals.g_MountainTerrain) {
                terrainString = "M";
            }
            else if (terrain == globals.g_OceanTerrain) {
                terrainString = "~";
            }
            str += terrainString;
            const plotIndex = GameplayMap.getIndexFromXY(iX, iY);
            const player = findPlotOwner(playerRegions, plotIndex);
            if (player !== -1) {
                str += player;
            }
            else {
                str += ' ';
            }
        }
        console.log(str);
    }
}
function findPlotOwner(playerRegions, plot) {
    for (let player = 0; player < playerRegions.length; player++) {
        if (playerRegions[player].claimedPlots.indexOf(plot) !== -1) {
            return player;
        }
    }
    return -1;
}
// function debugPrint(playerRegions: AdvancedStartRegion[], player: PlayerId) {
// 	console.log(playerRegions[player].claimedPlots.toString());
// 	let iHeight = GameplayMap.getGridHeight();
// 	let iWidth = GameplayMap.getGridWidth();
// 	for (let iY: number = iHeight - 1; iY >= 0; iY--) {
// 		let str: string = '';
// 		if (iY % 2 == 1) {
// 			str += ' ';
// 		}
// 		for (let iX: number = 0; iX < iWidth; iX++) {
// 			const plotIndex: number = GameplayMap.getIndexFromXY(iX, iY);
// 			const plotScore: number = playerRegions[player].potentialPlots[plotIndex];
// 			if (plotScore !== undefined) {
// 				if (plotScore >= 0 && plotScore < 10) {
// 					str += ' ';
// 				}
// 				str += plotScore;
// 			}
// 			else {
// 				str += "  ";
// 			}
// 		}
// 		console.log(str);
// 	}
// }

//# sourceMappingURL=file:///base-standard/maps/assign-advanced-start-region.js.map
