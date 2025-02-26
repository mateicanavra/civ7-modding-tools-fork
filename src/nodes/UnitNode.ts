import { TObjectValues } from "../types";
import { CORE_CLASS, DOMAIN, FORMATION_CLASS, UNIT_MOVEMENT_CLASS } from "../constants";

import { BaseNode } from "./BaseNode";

type TUnitNode = Pick<UnitNode,
    "unitType" |
    "baseMoves" |
    "baseSightRange" |
    "name" |
    "coreClass" |
    "domain" |
    "formationClass" |
    "unitMovementClass" |
    "airSlots" |
    "allowBarbarians" |
    "allowTeleportToOtherPlayerCapitals" |
    "antiAirCombat" |
    "buildCharges" |
    "canBeDamaged" |
    "canCapture" |
    "canEarnExperience" |
    "canPurchase" |
    "canRetreatWhenCaptured" |
    "canTargetAir" |
    "canTrain" |
    "canTriggerDiscovery" |
    "costProgressionModel" |
    "costProgressionParam1" |
    "description" |
    "enabledByReligion" |
    "evangelizeBelief" |
    "extractsArtifacts" |
    "foundCity" |
    "foundReligion" |
    "ignoreMoves" |
    "initialLevel" |
    "launchInquisition" |
    "maintenance" |
    "makeTradeRoute" |
    "mustPurchase" |
    "numRandomChoices" |
    "prereqPopulation" |
    "promotionClass" |
    "pseudoYieldType" |
    "purchaseYield" |
    "religionEvictPercent" |
    "religiousHealCharges" |
    "religiousStrength" |
    "requiresInquisition" |
    "spreadCharges" |
    "spy" |
    "stackable" |
    "strategicResource" |
    "teamVisibility" |
    "teleport" |
    "tier" |
    "trackReligion" |
    "traitType" |
    "victoryType" |
    "victoryUnit" |
    "wmdCapable" |
    "zoneOfControl"
>;

export class UnitNode extends BaseNode<TUnitNode> {
    unitType: string = 'UNIT_TYPE';
    baseMoves: number = 1;
    baseSightRange: number = 1;
    name: string = 'UNIT_NAME';

    coreClass: TObjectValues<typeof CORE_CLASS> = CORE_CLASS.MILITARY;
    domain: TObjectValues<typeof DOMAIN> = DOMAIN.LAND;
    formationClass: TObjectValues<typeof FORMATION_CLASS> = FORMATION_CLASS.LAND_COMBAT;
    unitMovementClass: TObjectValues<typeof UNIT_MOVEMENT_CLASS> = UNIT_MOVEMENT_CLASS.FOOT;

    airSlots: number | null = null;
    allowBarbarians: boolean | null = null;
    allowTeleportToOtherPlayerCapitals: boolean | null = null;
    antiAirCombat: number | null = null;
    buildCharges: number | null = null;
    canBeDamaged: boolean | null = null;
    canCapture: boolean | null = null;
    canEarnExperience: boolean | null = null;
    canPurchase: boolean | null = null;
    canRetreatWhenCaptured: boolean | null = null;
    canTargetAir: boolean | null = null;
    canTrain: boolean | null = null;
    canTriggerDiscovery: boolean | null = null;
    costProgressionModel: string | null = null;
    costProgressionParam1: number | null = null;
    description: string | null = null;
    enabledByReligion: boolean | null = null;
    evangelizeBelief: boolean | null = null;
    extractsArtifacts: boolean | null = null;
    foundCity: boolean | null = null;
    foundReligion: boolean | null = null;
    ignoreMoves: boolean | null = null;
    initialLevel: number | null = null;
    launchInquisition: boolean | null = null;
    maintenance: number | null = null;
    makeTradeRoute: boolean | null = null;
    mustPurchase: boolean | null = null;
    numRandomChoices: number | null = null;
    prereqPopulation: number | null = null;
    promotionClass: string | null = null;
    pseudoYieldType: string | null = null;
    purchaseYield: string | null = null;
    religionEvictPercent: number | null = null;
    religiousHealCharges: number | null = null;
    religiousStrength: number | null = null;
    requiresInquisition: boolean | null = null;
    spreadCharges: number | null = null;
    spy: boolean | null = null;
    stackable: boolean | null = null;
    strategicResource: string | null = null;
    teamVisibility: boolean | null = null;
    teleport: boolean | null = null;
    tier: number | null = null;
    trackReligion: boolean | null = null;
    traitType: string | null = null;
    victoryType: string | null = null;
    victoryUnit: boolean | null = null;
    wmdCapable: boolean | null = null;
    zoneOfControl: boolean | null = null;

    constructor(payload: Partial<TUnitNode> = {}) {
        super();
        this.fill(payload);
    }
}