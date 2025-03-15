import { TObjectValues } from "../types";
import { AGE } from "./AGE";
export declare const CIVILIZATION_DOMAIN: {
    readonly AntiquityAgeCivilizations: "AntiquityAgeCivilizations";
    readonly ExplorationAgeCivilizations: "ExplorationAgeCivilizations";
    readonly ModernAgeCivilizations: "ModernAgeCivilizations";
    readonly from: (age: TObjectValues<typeof AGE>) => "AntiquityAgeCivilizations" | "ExplorationAgeCivilizations" | "ModernAgeCivilizations";
};
