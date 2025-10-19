import { g_PolarWaterRows } from './map-globals.js';

function generateSnow(mapWidth, mapHeight) {
  console.log("Generating permanent snow");
  const mapHalfHeight = GameplayMap.getGridHeight() / 2;
  const snowLatitudeEnd = 60;
  const snowRowEnd = Math.ceil(mapHalfHeight * ((90 - snowLatitudeEnd) / 90));
  const snowRowStarts = [g_PolarWaterRows, g_PolarWaterRows];
  const snowRowLimits = [
    snowRowEnd > snowRowStarts[0] ? snowRowEnd - snowRowStarts[0] : 0,
    snowRowEnd > snowRowStarts[1] ? snowRowEnd - snowRowStarts[1] : 0
  ];
  const snowRowDeltas = [-1, 1];
  console.log(
    "Snow latitude:" + snowLatitudeEnd.toString() + ", rows:" + snowRowStarts[0].toString() + " to " + (snowRowStarts[0] + snowRowLimits[0]).toString()
  );
  const aLightSnowEffects = MapPlotEffects.getPlotEffectTypesContainingTags(["SNOW", "LIGHT", "PERMANENT"]);
  const aMediumSnowEffects = MapPlotEffects.getPlotEffectTypesContainingTags(["SNOW", "MEDIUM", "PERMANENT"]);
  const aHeavySnowEffects = MapPlotEffects.getPlotEffectTypesContainingTags(["SNOW", "HEAVY", "PERMANENT"]);
  const weightRange = 3;
  const changeTotalAdjustment = 60;
  const aWeightEffect = [-1, -1, -1];
  aWeightEffect[0] = aLightSnowEffects ? aLightSnowEffects[0] : -1;
  aWeightEffect[1] = aMediumSnowEffects ? aMediumSnowEffects[0] : -1;
  aWeightEffect[2] = aHeavySnowEffects ? aHeavySnowEffects[0] : -1;
  const colEnd = mapWidth;
  const rowStart = [mapHeight - 1 - snowRowStarts[0], snowRowStarts[1]];
  for (let pole = 0; pole != 2; ++pole) {
    const rowCount = snowRowLimits[pole];
    if (rowCount > 0) {
      const nextRowDelta = snowRowDeltas[pole];
      const rowEnd = rowStart[pole] + rowCount * nextRowDelta;
      const chanceAdjustment = Math.ceil(changeTotalAdjustment / rowCount);
      const aWeightChance = [10, 30, 60];
      let chanceForAny = 90;
      for (let row = rowStart[pole]; row != rowEnd; row += nextRowDelta) {
        for (let col = 0; col < colEnd; ++col) {
          if (GameplayMap.isWater(col, row) == false) {
            let rndVal = TerrainBuilder.getRandomNumber(100, "Any Snow");
            if (rndVal <= chanceForAny) {
              rndVal = TerrainBuilder.getRandomNumber(100, "Snow Weight");
              for (let weight = weightRange - 1; weight >= 0; --weight) {
                if (rndVal < aWeightChance[weight]) {
                  MapPlotEffects.addPlotEffect(
                    GameplayMap.getIndexFromXY(col, row),
                    aWeightEffect[weight]
                  );
                  break;
                } else {
                  rndVal -= aWeightChance[weight];
                }
              }
            }
          }
        }
        chanceForAny -= chanceAdjustment;
        const adjustBy = chanceAdjustment;
        aWeightChance[2] -= adjustBy;
        for (let weight = weightRange - 2; weight >= 0; --weight) {
          aWeightChance[weight] += adjustBy;
        }
      }
    }
  }
}
function dumpPermanentSnow(iWidth, iHeight) {
  console.log("Permanent Snow");
  console.log("@ = heavy");
  console.log("# = medium");
  console.log("* = light");
  console.log(". = no-snow");
  const aLightSnowEffects = MapPlotEffects.getPlotEffectTypesContainingTags(["SNOW", "LIGHT", "PERMANENT"]);
  const aMediumSnowEffects = MapPlotEffects.getPlotEffectTypesContainingTags(["SNOW", "MEDIUM", "PERMANENT"]);
  const aHeavySnowEffects = MapPlotEffects.getPlotEffectTypesContainingTags(["SNOW", "HEAVY", "PERMANENT"]);
  const eLightPlotEffect = aLightSnowEffects ? aLightSnowEffects[0] : -1;
  const eMediumPlotEffect = aMediumSnowEffects ? aMediumSnowEffects[0] : -1;
  const eHeavyPlotEffect = aHeavySnowEffects ? aHeavySnowEffects[0] : -1;
  for (let iY = iHeight - 1; iY >= 0; iY--) {
    let str = "";
    if (iY % 2 == 1) {
      str += " ";
    }
    for (let iX = 0; iX < iWidth; iX++) {
      let effectString = " ";
      if (GameplayMap.isWater(iX, iY) == false) {
        const iIndex = GameplayMap.getIndexFromXY(iX, iY);
        if (MapPlotEffects.hasPlotEffect(iIndex, eLightPlotEffect)) {
          effectString = "*";
        } else if (MapPlotEffects.hasPlotEffect(iIndex, eMediumPlotEffect)) {
          effectString = "#";
        } else if (MapPlotEffects.hasPlotEffect(iIndex, eHeavyPlotEffect)) {
          effectString = "@";
        } else {
          effectString = ".";
        }
      }
      str += effectString + " ";
    }
    console.log(str);
  }
}

export { dumpPermanentSnow, generateSnow };
//# sourceMappingURL=snow-generator.js.map
