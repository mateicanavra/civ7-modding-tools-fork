import {
  FOUNDATION_CONFIG_ARTIFACT_TAG,
  FOUNDATION_DIAGNOSTICS_ARTIFACT_TAG,
  FOUNDATION_DYNAMICS_ARTIFACT_TAG,
  FOUNDATION_PLATES_ARTIFACT_TAG,
  FOUNDATION_SEED_ARTIFACT_TAG,
} from "@swooper/mapgen-core";

export const M3_DEPENDENCY_TAGS = {
  artifact: {
    foundationPlatesV1: FOUNDATION_PLATES_ARTIFACT_TAG,
    foundationDynamicsV1: FOUNDATION_DYNAMICS_ARTIFACT_TAG,
    foundationSeedV1: FOUNDATION_SEED_ARTIFACT_TAG,
    foundationDiagnosticsV1: FOUNDATION_DIAGNOSTICS_ARTIFACT_TAG,
    foundationConfigV1: FOUNDATION_CONFIG_ARTIFACT_TAG,
    heightfield: "artifact:heightfield",
    climateField: "artifact:climateField",
    storyOverlays: "artifact:storyOverlays",
    riverAdjacency: "artifact:riverAdjacency",
    narrativeCorridorsV1: "artifact:narrative.corridors@v1",
    narrativeMotifsMarginsV1: "artifact:narrative.motifs.margins@v1",
    narrativeMotifsHotspotsV1: "artifact:narrative.motifs.hotspots@v1",
    narrativeMotifsRiftsV1: "artifact:narrative.motifs.rifts@v1",
    narrativeMotifsOrogenyV1: "artifact:narrative.motifs.orogeny@v1",
    placementInputsV1: "artifact:placementInputs@v1",
    placementOutputsV1: "artifact:placementOutputs@v1",
  },
  field: {
    terrainType: "field:terrainType",
    elevation: "field:elevation",
    rainfall: "field:rainfall",
    biomeId: "field:biomeId",
    featureType: "field:featureType",
  },
} as const;
