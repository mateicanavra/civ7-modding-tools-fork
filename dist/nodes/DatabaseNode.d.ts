import { BaseNode } from "./BaseNode";
import { TypeTagNode } from "./TypeTagNode";
import { TypeNode } from "./TypeNode";
import { ConstructibleNode } from "./ConstructibleNode";
import { UnitNode } from "./UnitNode";
import { TagNode } from "./TagNode";
import { UnitStatNode } from "./UnitStatNode";
import { UnitCostNode } from "./UnitCostNode";
import { VisualRemapNode } from "./VisualRemapNode";
import { UnitReplaceNode } from "./UnitReplaceNode";
import { EnglishTextNode } from "./EnglishTextNode";
import { CivilizationNode } from "./CivilizationNode";
import { TraitNode } from "./TraitNode";
import { CivilizationTraitNode } from "./CivilizationTraitNode";
import { CivilizationTagNode } from "./CivilizationTagNode";
import { LegacyCivilizationNode } from "./LegacyCivilizationNode";
import { LegacyCivilizationTraitNode } from "./LegacyCivilizationTraitNode";
import { IconDefinitionNode } from "./IconDefinitionNode";
import { CivilizationItemNode } from "./CivilizationItemNode";
import { ConstructibleValidDistrictNode } from "./ConstructibleValidDistrictNode";
import { ConstructibleMaintenanceNode } from "./ConstructibleMaintenanceNode";
import { ConstructibleYieldChangeNode } from "./ConstructibleYieldChangeNode";
import { BuildingNode } from "./BuildingNode";
import { ShellCivilizationNodeSlice } from "./slices/ShellCivilizationNodeSlice";
import { GameCivilizationNodeSlice } from "./slices/GameCivilizationNodeSlice";
import { TraitModifierNode } from "./TraitModifierNode";
import { CivilizationUnlockNode } from "./CivilizationUnlockNode";
import { KindNode } from "./KindNode";
import { UnlockNode } from "./UnlockNode";
import { UnlockRewardNode } from "./UnlockRewardNode";
import { RequirementSetNode } from "./RequirementSetNode";
import { RequirementNode } from "./RequirementNode";
import { RequirementArgumentNode } from "./RequirementArgumentNode";
import { RequirementSetRequirementNode } from "./RequirementSetRequirementNode";
import { UnlockRequirementNode } from "./UnlockRequirementNode";
import { UnlockConfigurationValueNode } from "./UnlockConfigurationValueNode";
import { AdjacencyYieldChangeNode } from "./AdjacencyYieldChangeNode";
import { ConstructibleAdjacencyNode } from "./ConstructibleAdjacencyNode";
import { WarehouseYieldChangeNode } from "./WarehouseYieldChangeNode";
import { ConstructibleWarehouseYieldNode } from "./ConstructibleWarehouseYieldNode";
import { ProgressionTreeAdvisoryNode } from "./ProgressionTreeAdvisoryNode";
import { ProgressionTreeNode } from "./ProgressionTreeNode";
import { ProgressionTreeNodeNode } from "./ProgressionTreeNodeNode";
import { ProgressionTreeNodeUnlockNode } from "./ProgressionTreeNodeUnlockNode";
import { ProgressionTreePrereqNode } from "./ProgressionTreePrereqNode";
import { TraditionNode } from "./TraditionNode";
import { TraditionModifierNode } from "./TraditionModifierNode";
import { DistrictFreeConstructibleNode } from "./DistrictFreeConstructibleNode";
import { ImprovementNode } from "./ImprovementNode";
import { ConstructibleValidBiomeNode } from "./ConstructibleValidBiomeNode";
import { ConstructibleValidFeatureNode } from "./ConstructibleValidFeatureNode";
import { ConstructibleValidTerrainNode } from "./ConstructibleValidTerrainNode";
import { ConstructibleValidResourceNode } from "./ConstructibleValidResourceNode";
import { ConstructiblePlunderNode } from "./ConstructiblePlunderNode";
import { StartBiasBiomeNode } from "./StartBiasBiomeNode";
import { StartBiasTerrainNode } from "./StartBiasTerrainNode";
import { StartBiasRiverNode } from "./StartBiasRiverNode";
import { StartBiasFeatureClassNode } from "./StartBiasFeatureClassNode";
import { StartBiasAdjacentToCoastNode } from "./StartBiasAdjacentToCoastNode";
import { VisArtCivilizationBuildingCultureNode } from "./VisArtCivilizationBuildingCultureNode";
import { VisArtCivilizationUnitCultureNode } from "./VisArtCivilizationUnitCultureNode";
import { StartBiasResourceNode } from "./StartBiasResourceNode";
import { UniqueQuarterNode } from "./UniqueQuarterNode";
import { UniqueQuarterModifierNode } from "./UniqueQuarterModifierNode";
import { GameModifierNode } from "./GameModifierNode";
import { UnitUpgradeNode } from "./UnitUpgradeNode";
import { UnitAdvisoryNode } from "./UnitAdvisoryNode";
export type TDatabase = Pick<DatabaseNode, "civilizationItems" | "civilizationTags" | "civilizationTraits" | "civilizations" | "constructibleMaintenances" | "constructibleValidDistricts" | "constructibleYieldChanges" | "constructibles" | "englishText" | "iconDefinitions" | "legacyCivilizationTraits" | "legacyCivilizations" | "civilizationUnlocks" | "tags" | "traitModifiers" | "traits" | "typeTags" | "kinds" | "types" | "unitCosts" | "buildings" | "unitReplaces" | "unitStats" | "units" | "unitUpgrades" | "unitAdvisories" | "unlocks" | "unlockRequirements" | "unlockConfigurationValues" | "requirementSets" | "requirements" | "requirementArguments" | "requirementSetRequirements" | "unlockRewards" | "adjacencyYieldChanges" | "constructibleAdjacencies" | "warehouseYieldChanges" | "progressionTreeAdvisories" | "progressionTrees" | "progressionTreeNodes" | "progressionTreeNodeUnlocks" | "traditions" | "traditionModifiers" | "progressionTreePrereqs" | "constructibleWarehouseYields" | "districtFreeConstructibles" | "constructibleValidBiomes" | "constructibleValidFeatures" | "constructibleValidTerrains" | "constructibleValidResources" | "constructiblePlunders" | "improvements" | "startBiasBiomes" | "startBiasTerrains" | "startBiasRivers" | "startBiasResources" | "startBiasFeatureClasses" | "startBiasAdjacentToCoasts" | "visArtCivilizationBuildingCultures" | "visArtCivilizationUnitCultures" | "uniqueQuarters" | "uniqueQuarterModifiers" | "gameModifiers" | "visualRemaps">;
export declare class DatabaseNode extends BaseNode<TDatabase> {
    _name: string;
    kinds: KindNode[];
    types: TypeNode[];
    tags: TagNode[];
    typeTags: TypeTagNode[];
    traits: TraitNode[];
    traitModifiers: TraitModifierNode[];
    civilizations: CivilizationNode[] | ShellCivilizationNodeSlice[] | GameCivilizationNodeSlice[];
    civilizationItems: CivilizationItemNode[];
    civilizationTags: CivilizationTagNode[];
    civilizationTraits: CivilizationTraitNode[];
    civilizationUnlocks: CivilizationUnlockNode[];
    legacyCivilizationTraits: LegacyCivilizationTraitNode[];
    legacyCivilizations: LegacyCivilizationNode[];
    buildings: BuildingNode[];
    improvements: ImprovementNode[];
    constructibles: ConstructibleNode[];
    constructibleMaintenances: ConstructibleMaintenanceNode[];
    constructibleValidDistricts: ConstructibleValidDistrictNode[];
    constructibleValidBiomes: ConstructibleValidBiomeNode[];
    constructibleValidFeatures: ConstructibleValidFeatureNode[];
    constructibleValidTerrains: ConstructibleValidTerrainNode[];
    constructibleValidResources: ConstructibleValidResourceNode[];
    constructibleYieldChanges: ConstructibleYieldChangeNode[];
    adjacencyYieldChanges: AdjacencyYieldChangeNode[];
    constructibleAdjacencies: ConstructibleAdjacencyNode[];
    warehouseYieldChanges: WarehouseYieldChangeNode[];
    constructibleWarehouseYields: ConstructibleWarehouseYieldNode[];
    constructiblePlunders: ConstructiblePlunderNode[];
    districtFreeConstructibles: DistrictFreeConstructibleNode[];
    progressionTreeAdvisories: ProgressionTreeAdvisoryNode[];
    progressionTrees: ProgressionTreeNode[];
    progressionTreeNodes: ProgressionTreeNodeNode[];
    progressionTreeNodeUnlocks: ProgressionTreeNodeUnlockNode[];
    progressionTreePrereqs: ProgressionTreePrereqNode[];
    traditions: TraditionNode[];
    traditionModifiers: TraditionModifierNode[];
    units: UnitNode[];
    unitCosts: UnitCostNode[];
    unitReplaces: UnitReplaceNode[];
    unitUpgrades: UnitUpgradeNode[];
    unitStats: UnitStatNode[];
    unitAdvisories: UnitAdvisoryNode[];
    englishText: EnglishTextNode[];
    iconDefinitions: IconDefinitionNode[];
    visualRemaps: VisualRemapNode[];
    uniqueQuarters: UniqueQuarterNode[];
    uniqueQuarterModifiers: UniqueQuarterModifierNode[];
    gameModifiers: GameModifierNode[];
    unlocks: UnlockNode[];
    unlockRewards: UnlockRewardNode[];
    unlockRequirements: UnlockRequirementNode[];
    unlockConfigurationValues: UnlockConfigurationValueNode[];
    requirementSets: RequirementSetNode[];
    requirements: RequirementNode[];
    requirementArguments: RequirementArgumentNode[];
    requirementSetRequirements: RequirementSetRequirementNode[];
    startBiasBiomes: StartBiasBiomeNode[];
    startBiasResources: StartBiasResourceNode[];
    startBiasTerrains: StartBiasTerrainNode[];
    startBiasRivers: StartBiasRiverNode[];
    startBiasFeatureClasses: StartBiasFeatureClassNode[];
    startBiasAdjacentToCoasts: StartBiasAdjacentToCoastNode[];
    visArtCivilizationBuildingCultures: VisArtCivilizationBuildingCultureNode[];
    visArtCivilizationUnitCultures: VisArtCivilizationUnitCultureNode[];
    constructor(payload?: Partial<TDatabase>);
    toXmlElement(): {
        Database: {};
    } | null;
}
