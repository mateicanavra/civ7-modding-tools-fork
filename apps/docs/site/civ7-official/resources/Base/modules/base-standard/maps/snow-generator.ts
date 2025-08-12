import * as globals from '/base-standard/maps/map-globals.js';

/** This function generates "permanent" snow effects on the map.
 * 
*/
export function generateSnow(mapWidth: number, mapHeight: number): void {

	console.log("Generating permanent snow");

	let mapHalfHeight = GameplayMap.getGridHeight() / 2;
	// Find the row that equals the desired latitude of the snow line
	const snowLatitudeEnd = 60;
	let snowRowEnd = Math.ceil(mapHalfHeight * ((90 - snowLatitudeEnd) / 90));
	// The starting row delta for the snow.  This skips the ice bands.  Should we 'search' for them instead?
	const snowRowStarts: number[] = [globals.g_PolarWaterRows, globals.g_PolarWaterRows];
	// Rows from the northern and southern starts, to apply snow to.
	const snowRowLimits: number[] = [snowRowEnd > snowRowStarts[0] ? snowRowEnd - snowRowStarts[0] : 0, snowRowEnd > snowRowStarts[1] ? snowRowEnd - snowRowStarts[1] : 0];
	// How to get to the next row
	const snowRowDeltas: number[] = [-1, 1];

	console.log("Snow latitude:" + snowLatitudeEnd.toString() + ", rows:" + snowRowStarts[0].toString() + " to " + (snowRowStarts[0] + snowRowLimits[0]).toString());

	// Find our available snow effects.  These are arrays, but there is usually only one entry
	// And we are only going to support 1 or 0, for now.  We will let the app side do the variations, if any
	const aLightSnowEffects = MapPlotEffects.getPlotEffectTypesContainingTags(["SNOW", "LIGHT", "PERMANENT"]);
	const aMediumSnowEffects = MapPlotEffects.getPlotEffectTypesContainingTags(["SNOW", "MEDIUM", "PERMANENT"]);
	const aHeavySnowEffects = MapPlotEffects.getPlotEffectTypesContainingTags(["SNOW", "HEAVY", "PERMANENT"]);

	// For a first pass, we are going to do something simple, and just go along each row and plop some snow in it.
	const weightRange: number = 3;	// 0 == LIGHT, 1 == MEDIUM, 2 == HEAVY

	// Total adjustment for chances, over the range we will place snow.
	const changeTotalAdjustment: number = 60;

	let aWeightEffect: PlotEffectType[] = [-1, -1, -1];
	aWeightEffect[0] = (aLightSnowEffects ? aLightSnowEffects[0] : -1);
	aWeightEffect[1] = (aMediumSnowEffects ? aMediumSnowEffects[0] : -1);
	aWeightEffect[2] = (aHeavySnowEffects ? aHeavySnowEffects[0] : -1);

	let colEnd = mapWidth;
	// Get the rows of where the snow starts for each pole
	let rowStart: number[] = [(mapHeight - 1) - snowRowStarts[0], snowRowStarts[1]];
	for (let pole = 0; pole != 2; ++pole) {

		let rowCount = snowRowLimits[pole];
		if (rowCount > 0) {
			let nextRowDelta = snowRowDeltas[pole];
			let rowEnd = rowStart[pole] + (rowCount * nextRowDelta);

			// Adjuting the chances down by 
			let chanceAdjustment: number = Math.ceil(changeTotalAdjustment / rowCount);
			let aWeightChance: number[] = [10, 30, 60];
			let chanceForAny: number = 90;			// Starting chance that a plot has any snow

			for (let row: number = rowStart[pole]; row != rowEnd; row += nextRowDelta) {
				for (let col: number = 0; col < colEnd; ++col) {
					if (GameplayMap.isWater(col, row) == false) {
						let rndVal: number = TerrainBuilder.getRandomNumber(100, "Any Snow");
						if (rndVal <= chanceForAny) {
							rndVal = TerrainBuilder.getRandomNumber(100, "Snow Weight");
							for (let weight = weightRange - 1; weight >= 0; --weight) {
								if (rndVal < aWeightChance[weight]) {
									MapPlotEffects.addPlotEffect(GameplayMap.getIndexFromXY(col, row), aWeightEffect[weight])
									break;
								} else {
									rndVal -= aWeightChance[weight];
								}
							}
						}
					}
				}

				// Chance for any snow goes down (maybe not do this, since we are adjusting the weight distribution below?)
				chanceForAny -= chanceAdjustment;
				// Adjust the chances for the different weights of snow
				let adjustBy = chanceAdjustment;
				aWeightChance[2] -= adjustBy;		// Heavy goes down by this amount
				// Then add the chance to the other weights
				for (let weight = weightRange - 2; weight >= 0; --weight) {
					aWeightChance[weight] += adjustBy;
				}
			}
		}
	}
}
/** Debug function to display the snow distribution to the log */
export function dumpPermanentSnow(iWidth: number, iHeight: number): void {
	console.log("Permanent Snow");
	console.log("@ = heavy");
	console.log("# = medium");
	console.log("* = light");
	console.log(". = no-snow");

	const aLightSnowEffects = MapPlotEffects.getPlotEffectTypesContainingTags(["SNOW", "LIGHT", "PERMANENT"]);
	const aMediumSnowEffects = MapPlotEffects.getPlotEffectTypesContainingTags(["SNOW", "MEDIUM", "PERMANENT"]);
	const aHeavySnowEffects = MapPlotEffects.getPlotEffectTypesContainingTags(["SNOW", "HEAVY", "PERMANENT"]);

	const eLightPlotEffect = (aLightSnowEffects ? aLightSnowEffects[0] : -1);
	const eMediumPlotEffect = (aMediumSnowEffects ? aMediumSnowEffects[0] : -1);
	const eHeavyPlotEffect = (aHeavySnowEffects ? aHeavySnowEffects[0] : -1);

	for (let iY: number = iHeight - 1; iY >= 0; iY--) {
		let str: string = '';
		if (iY % 2 == 1) {
			str += ' ';
		}
		for (let iX: number = 0; iX < iWidth; iX++) {
			let effectString: string = " ";
			if (GameplayMap.isWater(iX, iY) == false) {
				const iIndex = GameplayMap.getIndexFromXY(iX, iY);
				if (MapPlotEffects.hasPlotEffect(iIndex, eLightPlotEffect)) {
					effectString = "*";
				} else if (MapPlotEffects.hasPlotEffect(iIndex, eMediumPlotEffect)) {
					effectString = "#";
				} else if (MapPlotEffects.hasPlotEffect(iIndex, eHeavyPlotEffect)) {
					effectString = "@";
				} else {
					effectString = '.';
				}
			}
			str += effectString + ' ';
		}
		console.log(str);
	}
}
