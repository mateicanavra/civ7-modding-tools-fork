/**
 * @file utilities-overlay.ts			// TODO: Re-evaluate what is a generic text provider and what is specific for a type of file (e.g., trees), break out functions.
 * @copyright 2020-2025, Firaxis Games
 *
 * Helpful Constants that are used with overlays.
 */
/**
 * This enum is used to centralize the render piority for all of the overlays in the UI system.
 * that way if we need to change the render order for the overlays it can be done in one placed based on the category to each overlay.
 * If you are adding a new overlay please add its priority to this enum, or use one of the existing priority values.
 *
 */
export var OVERLAY_PRIORITY;
(function (OVERLAY_PRIORITY) {
    OVERLAY_PRIORITY[OVERLAY_PRIORITY["MIN_PRIORITY"] = 0] = "MIN_PRIORITY";
    OVERLAY_PRIORITY[OVERLAY_PRIORITY["HEX_GRID"] = 1] = "HEX_GRID";
    OVERLAY_PRIORITY[OVERLAY_PRIORITY["CONTINENT_LENS"] = 2] = "CONTINENT_LENS";
    OVERLAY_PRIORITY[OVERLAY_PRIORITY["SETTLER_LENS"] = 3] = "SETTLER_LENS";
    OVERLAY_PRIORITY[OVERLAY_PRIORITY["PLOT_HIGHLIGHT"] = 4] = "PLOT_HIGHLIGHT";
    OVERLAY_PRIORITY[OVERLAY_PRIORITY["CULTURE_BORDER"] = 5] = "CULTURE_BORDER";
    OVERLAY_PRIORITY[OVERLAY_PRIORITY["UNIT_ABILITY_RADIUS"] = 6] = "UNIT_ABILITY_RADIUS";
    OVERLAY_PRIORITY[OVERLAY_PRIORITY["UNIT_MOVEMENT_SKIRT"] = 7] = "UNIT_MOVEMENT_SKIRT";
    OVERLAY_PRIORITY[OVERLAY_PRIORITY["CURSOR"] = 8] = "CURSOR";
    OVERLAY_PRIORITY[OVERLAY_PRIORITY["MAX_PRIORITY"] = 9] = "MAX_PRIORITY";
})(OVERLAY_PRIORITY || (OVERLAY_PRIORITY = {}));
//# sourceMappingURL=file:///base-standard/ui/utilities/utilities-overlay.js.map

//# sourceMappingURL=file:///base-standard/ui/utilities/utilities-overlay.js.map
