/**
 * @file lens-manager.ts
 * @copyright 2022-2024, Firaxis Games
 * @description Central manager object for lenses used by other scripts to toggles lenses and layers
 */
export class SpriteGridInitItem {
    constructor() {
        this.handle = -1;
        this.name = ""; //used for debugging
        this.spriteMode = SpriteMode.Default;
    }
}
/// Special value meaning the entire grid of values.
const AllGridHandle = Number.MAX_VALUE;
export class BaseSpriteGridLensLayer {
    constructor(spriteGridInitItems) {
        this.spriteGrids = new Map();
        this.upscaleMultiplier = 1;
        this.resizeListener = this.onResize.bind(this);
        spriteGridInitItems.forEach(item => this.spriteGrids.set(item.handle, WorldUI.createSpriteGrid(item.name, item.spriteMode)));
        window.addEventListener('resize', this.resizeListener);
        this.upscaleMultiplier = GlobalScaling.getCurrentScale() / 100;
    }
    /**
     * @implements ILensLayer
     */
    applyLayer() {
        this.setVisible(AllGridHandle, true);
    }
    /**
     * @implements ILensLayer
     */
    removeLayer() {
        this.setVisible(AllGridHandle, false);
    }
    onResize() {
        const oldMultiplier = this.upscaleMultiplier;
        const newMultiplier = GlobalScaling.getCurrentScale() / 100;
        const ajdustementScaleValue = newMultiplier / oldMultiplier;
        this.spriteGrids.forEach(grid => grid.updateSpritesScale(ajdustementScaleValue));
        this.upscaleMultiplier = newMultiplier;
    }
    addSprite(gridHandle, plot, asset, offset, params) {
        const spriteGrid = this.spriteGrids.get(gridHandle);
        if (spriteGrid == undefined) {
            console.error(`lens-manager - addSprite: handle ${gridHandle} cannot be found`);
            return;
        }
        params = this.applyScalingToParams(params);
        spriteGrid.addSprite(plot, asset, offset, params);
    }
    addSpriteFOW(gridHandle, plot, asset, fowAsset, offset, params) {
        const spriteGrid = this.spriteGrids.get(gridHandle);
        if (spriteGrid == undefined) {
            console.error(`lens-manager - addSpriteFOW: handle ${gridHandle} cannot be found`);
            return;
        }
        params = this.applyScalingToParams(params);
        spriteGrid.addSpriteFOW(plot, asset, fowAsset, offset, params);
    }
    addText(gridHandle, plot, text, offset, params) {
        const spriteGrid = this.spriteGrids.get(gridHandle);
        if (spriteGrid == undefined) {
            console.error(`lens-manager - addText: handle ${gridHandle} cannot be found`);
            return;
        }
        spriteGrid.addText(plot, text, offset, params);
    }
    applyScalingToParams(params) {
        if (!params) {
            return undefined;
        }
        if (params.scale) {
            params.scale *= this.upscaleMultiplier;
        }
        else {
            params.scale = this.upscaleMultiplier;
        }
        if (params.offset) {
            params.offset.x *= this.upscaleMultiplier;
            params.offset.y *= this.upscaleMultiplier;
        }
        return params;
    }
    setVisible(gridHandle, value) {
        if (gridHandle == AllGridHandle) {
            this.spriteGrids.forEach(grid => grid.setVisible(value));
        }
        else {
            const spriteGrid = this.spriteGrids.get(gridHandle);
            if (spriteGrid == undefined) {
                console.error(`lens-manager - SetVisibile: handle ${gridHandle} cannot be found`);
                return;
            }
            spriteGrid.setVisible(value);
        }
    }
    clearPlot(gridHandle, plot) {
        if (gridHandle == AllGridHandle) {
            this.spriteGrids.forEach(grid => grid.clearPlot(plot));
        }
        else {
            const spriteGrid = this.spriteGrids.get(gridHandle);
            if (spriteGrid == undefined) {
                console.error(`lens-manager - clearPlot: handle ${gridHandle} cannot be found`);
                return;
            }
            spriteGrid.clearPlot(plot);
        }
    }
    clear(gridHandle) {
        const spriteGrid = this.spriteGrids.get(gridHandle);
        if (spriteGrid == undefined) {
            console.error(`lens-manager - clear: handle ${gridHandle} cannot be found`);
            return;
        }
        spriteGrid.clear();
    }
}
export const LensLayerEnabledEventName = 'lens-event-layer-enabled';
export const LensLayerDisabledEventName = 'lens-event-layer-disabled';
/**
 * LensLayerEvent is fired when a lens layer is enabled or disabled
 */
export class LensLayerEvent extends CustomEvent {
    constructor(name, layer) {
        super(name, {
            bubbles: false,
            cancelable: false,
            detail: { layer }
        });
    }
}
export const LensActivationEventName = 'lens-event-active-lens';
/**
 * LensActivationEvent is fired when a lens is activated
 */
export class LensActivationEvent extends CustomEvent {
    constructor(prevLens, activeLens) {
        super(LensActivationEventName, {
            detail: {
                activeLens,
                prevLens
            }
        });
    }
}
class LensManagerSingleton {
    constructor() {
        this.showDebugInfo = false;
        this.lenses = new Map();
        this.layers = new Map();
        this.enabledLayers = new Set();
    }
    registerLens(lensType, lens) {
        if (this.lenses.has(lensType)) {
            console.error(`lens-manager: Attempted to add duplicate lens type: ${lensType}`);
            return;
        }
        this.lenses.set(lensType, lens);
    }
    registerLensLayer(layerType, layer) {
        if (this.layers.has(layerType)) {
            console.error(`lens-manager: Attempted to add duplicate layer type: ${layerType}`);
            return;
        }
        layer.initLayer();
        this.layers.set(layerType, layer);
        // Check to see if our active lens was waiting for this layer to enable it
        // Mainly for 'fxs-default-lens' while all lenses and layers are getting loaded
        const lens = this.activeLens ? this.lenses.get(this.activeLens) : undefined;
        if (lens) {
            if (lens.activeLayers.has(layerType)) {
                this.enableLayer(layerType);
            }
        }
        else if (this.showDebugInfo) {
            console.log(`lens-manager: Failed to find '${this.activeLens}' during registerLensLayer.`);
        }
    }
    getActiveLens() {
        if (this.activeLens === undefined) {
            console.error(`lens-manager: No active lens has been set yet`);
        }
        return this.activeLens;
    }
    setActiveLens(type) {
        if (type === this.activeLens) {
            return true;
        }
        const lens = this.lenses.get(type);
        if (lens == undefined) {
            console.error(`lens-manager: Failed to find lens for type ${type}`);
            return false;
        }
        if (this.activeLens !== undefined) {
            const prevLens = this.lenses.get(this.activeLens);
            if (prevLens != undefined) {
                // Cache the enabled layers in the previous lens so we can transition back to those when we return
                if (!prevLens.ignoreEnabledLayers) { //Only cache layers for lenses with this tag off
                    prevLens.lastEnabledLayers = new Set(this.enabledLayers);
                }
            }
        }
        // Set active lens
        const prevLensString = this.activeLens;
        this.activeLens = type;
        if (this.showDebugInfo) {
            console.info(`lens-manager: Leaving '${prevLensString}' lens.`);
            console.info(`lens-manager: Entering '${this.activeLens}' lens.`);
        }
        // Use previously enabled layers if available, otherwise use the default active layers
        const nextLensLayers = lens.lastEnabledLayers ?? lens.activeLayers;
        const nextAllowedLayers = lens.allowedLayers;
        // Disable any layer not active
        for (const type of this.enabledLayers) {
            const layer = this.layers.get(type);
            if (layer == undefined) {
                console.error(`lens-manager: Failed to find '${type}' while trying to disable inactive layers`);
                continue;
            }
            if (!nextLensLayers.has(type) && !nextAllowedLayers.has(type)) {
                this.disableLayer(type);
            }
        }
        this.enableLayers(nextLensLayers);
        window.dispatchEvent(new LensActivationEvent(prevLensString, this.activeLens));
        return true;
    }
    enableLayers(layerTypes) {
        for (const layerType of layerTypes) {
            this.enableLayer(layerType);
        }
    }
    enableLayer(layerType) {
        const layer = this.layers.get(layerType);
        if (layer == undefined) {
            console.error(`lens-manager: enableLayer failed to find lens layer for type '${layerType}'`);
            return false;
        }
        if (this.showDebugInfo && this.enabledLayers.has(layerType)) {
            console.info(`lens-manager: Lens layer '${layerType}' is already enabled!`);
            return false;
        }
        if (this.showDebugInfo) {
            console.info(`lens-manager: Enabling '${layerType}' layer`);
        }
        this.enabledLayers.add(layerType);
        layer.applyLayer();
        window.dispatchEvent(new LensLayerEvent(LensLayerEnabledEventName, layerType));
        return true;
    }
    disableLayer(layerType) {
        const layer = this.layers.get(layerType);
        if (layer == undefined) {
            console.error(`lens-manager: disableLayer failed to find lens layer for type '${layerType}'`);
            return false;
        }
        if (this.enabledLayers.has(layerType) == false) {
            console.warn(`lens-manager: Lens layer '${layerType}' is already disabled!`);
            return false;
        }
        if (this.showDebugInfo) {
            console.info(`lens-manager: Disabling '${layerType}' layer`);
        }
        this.enabledLayers.delete(layerType);
        layer.removeLayer();
        window.dispatchEvent(new LensLayerEvent(LensLayerDisabledEventName, layerType));
        return true;
    }
    /**
     * toggleLayer toggles a layer on or off
     *
     * @param layerType The name of layer to toggle
     * @param force If true, forces the layer to be enabled. If false, forces the layer to be disabled. If undefined, toggles the layer.
     *
     * @returns true if the layer was toggled, false if the layer was already in the desired state
     */
    toggleLayer(layerType, force = undefined) {
        const layer = this.layers.get(layerType);
        if (layer == undefined) {
            console.error(`lens-manager: toggleLayer failed to find lens layer for type '${layerType}'`);
            return false;
        }
        const enable = force ?? !this.enabledLayers.has(layerType);
        if (enable) {
            return this.enableLayer(layerType);
        }
        else {
            return this.disableLayer(layerType);
        }
    }
    isLayerEnabled(layerType) {
        const layer = this.layers.get(layerType);
        if (layer == undefined) {
            console.error(`lens-manager: isLayerEnabled failed to find lens layer for type '${layerType}'`);
            return false;
        }
        return this.enabledLayers.has(layerType);
    }
}
const LensManager = new LensManagerSingleton();
export default LensManager;

//# sourceMappingURL=file:///core/ui/lenses/lens-manager.js.map
