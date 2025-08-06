/**
 * Resource class constants from the game files
 * These are used to categorize resources by their function and effects
 */
export declare const RESOURCE_CLASS: {
    /**
     * Basic resources that provide standard yields
     */
    readonly BONUS: "RESOURCECLASS_BONUS";
    /**
     * Resources that primarily benefit city development
     */
    readonly CITY: "RESOURCECLASS_CITY";
    /**
     * Resources that provide empire-wide benefits
     */
    readonly EMPIRE: "RESOURCECLASS_EMPIRE";
    /**
     * Exploration Age treasure resources
     */
    readonly TREASURE: "RESOURCECLASS_TREASURE";
    /**
     * Placeholder for no resource class
     */
    readonly NONE: "NO_RESOURCECLASS";
};
export type ResourceClass = typeof RESOURCE_CLASS[keyof typeof RESOURCE_CLASS];
export default RESOURCE_CLASS;
