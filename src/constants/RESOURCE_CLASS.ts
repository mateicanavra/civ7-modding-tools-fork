/**
 * Resource class constants from the game files
 * These are used to categorize resources by their function and effects
 */
export const RESOURCE_CLASS = {
  /**
   * Basic resources that provide standard yields
   */
  BONUS: 'RESOURCECLASS_BONUS',
  
  /**
   * Resources that primarily benefit city development
   */
  CITY: 'RESOURCECLASS_CITY',
  
  /**
   * Resources that provide empire-wide benefits
   */
  EMPIRE: 'RESOURCECLASS_EMPIRE',
  
  /**
   * Exploration Age treasure resources
   */
  TREASURE: 'RESOURCECLASS_TREASURE',
  
  /**
   * Placeholder for no resource class
   */
  NONE: 'NO_RESOURCECLASS'
} as const;

export type ResourceClass = typeof RESOURCE_CLASS[keyof typeof RESOURCE_CLASS];

export default RESOURCE_CLASS; 