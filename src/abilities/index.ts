import { 
    createClaimResourceAbilities, 
    createUnitAbilityBinding, 
    createClaimResourceLocalizations 
} from './claim-resource';

// Create the resource claim ability for the Murus Engineer unit
export const claimResourceAbilityFiles = [
    ...createClaimResourceAbilities(),
    createUnitAbilityBinding("UNIT_MURUS_ENGINEER"),
    createClaimResourceLocalizations()
];

// Export all abilities for the build file
export const allAbilities = [
    ...claimResourceAbilityFiles
]; 