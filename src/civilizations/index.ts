/**
 * Exports all civilizations using the CivilizationPackage pattern.
 */

// Export everything from individual files
export * from './dacia';

// Import packages for collection
import { dacia } from './dacia';
import { extractComponents } from '../utils';

// Collect all civilization packages
export const civilizationPackages = [dacia];

// Extract and export components
const { 
    entities: allCivilizations, 
    abilities: civilizationAbilities, 
    modifiers: civilizationModifiers, 
    imports: civilizationImports 
} = extractComponents(civilizationPackages, 'civilization');

export { allCivilizations, civilizationAbilities, civilizationModifiers, civilizationImports };