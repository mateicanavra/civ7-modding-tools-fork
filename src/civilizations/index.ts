import { civilization } from "./dacia";
import { falxmanUnit, murusEngineerUnit } from "../units";
import { mountainSanctuaryConstructible } from "../constructibles";
import { allModifiers } from "../modifiers";
import { allUnlocks } from "../unlocks";

// Bind components to civilization
civilization.bind([
    falxmanUnit,
    murusEngineerUnit,
    mountainSanctuaryConstructible,
    ...allUnlocks,
    ...allModifiers,
]);

export const allCivilizations = [
    civilization
];

export { civilization }; 