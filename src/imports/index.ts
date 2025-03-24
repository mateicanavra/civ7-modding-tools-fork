import { ImportFileBuilder } from "civ7-modding-tools";
import { ACTION_GROUP_BUNDLE } from "../config";
import { mod } from "../config";

// Civilization icon
export const civilizationIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: "./assets/Dacia_alt.png",
    name: "civ_sym_dacia",
});

// Falxman unit icon
export const falxmanUnitIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: "blp:unitflag_swordsman",
    name: "falxman",
});

// Murus Engineer unit icon
export const murusEngineerIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: "blp:unitflag_builder",
    name: "murus_engineer",
});

// Export all imports as an array for easy addition to the mod
export const allImports = [
    civilizationIcon,
    falxmanUnitIcon,
    murusEngineerIcon
]; 