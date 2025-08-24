/**
 * @file lens-manager.ts
 * @copyright 2022-2024, Firaxis Games
 * @description Central manager object for lenses used by other scripts to toggles lenses and layers
 */

declare global {
	/** 
	 * Lenses need to define a new entry for each lens
	 * 
	 * Example: 'fxs-default-layer' : DefaultLens
	 * 
	 * !DON'T FORGET to also include the reference in globals.d.ts!
	 * */
	interface LensTypeMap { }
}

// Alias for LensLayerTypeMap key
export type LensName = keyof LensTypeMap extends never ? string : keyof LensTypeMap;

export interface ILens {
	/** Type enum for the layers this lens activates */
	activeLayers: Set<LensLayerName>;

	/** Type enum for the layers this lens allows to be enabled while it's active */
	allowedLayers: Set<LensLayerName>;

	/** Flag whether to skip caching enabled layers, in cases where this may be different from active layers. */
	ignoreEnabledLayers?: boolean;

	/** Stores the layers that were enabled last time this lens was active so we can enable those layers again */
	lastEnabledLayers?: Set<LensLayerName>;
}

declare global {
	/** 
	 * Lens layers need to define a new entry for each layer
	 * 
	 * Example: 'fxs-hexgrid-layer' : HexGridLensLayer
	 * 
	 * !DON'T FORGET to also include the reference in globals.d.ts!
	 * */
	interface LensLayerTypeMap { }
}

// Alias for LensLayerTypeMap key
export type LensLayerName = keyof LensLayerTypeMap

export interface ILensLayer {
	/** Called when a layer is first registered */
	initLayer(): void;

	/** Called when a layer is applied */
	applyLayer(): void;

	/** Called when a layer is removed */
	removeLayer(): void;
}

export class SpriteGridInitItem {
	public handle: number = -1;
	public name: string = ""; //used for debugging
	public spriteMode: SpriteMode = SpriteMode.Default;
}


/// Special value meaning the entire grid of values.
const AllGridHandle = Number.MAX_VALUE;

export abstract class BaseSpriteGridLensLayer implements ILensLayer {
	abstract initLayer(): void;

	protected spriteGrids = new Map<number, WorldUI.SpriteGrid>();
	private upscaleMultiplier = 1;
	private resizeListener = this.onResize.bind(this);

	constructor(spriteGridInitItems: SpriteGridInitItem[]) {
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

	private onResize() {
		const oldMultiplier = this.upscaleMultiplier;
		const newMultiplier = GlobalScaling.getCurrentScale() / 100;

		const ajdustementScaleValue = newMultiplier / oldMultiplier;
		this.spriteGrids.forEach(grid => grid.updateSpritesScale(ajdustementScaleValue));

		this.upscaleMultiplier = newMultiplier;
	}

	public addSprite(gridHandle: number, plot: WorldUI.Plot, asset: string, offset: float3, params?: WorldUI.SpriteParams) {
		const spriteGrid = this.spriteGrids.get(gridHandle);
		if (spriteGrid == undefined) {
			console.error(`lens-manager - addSprite: handle ${gridHandle} cannot be found`);
			return;
		}

		params = this.applyScalingToParams(params);
		spriteGrid.addSprite(plot, asset, offset, params);
	}

	public addSpriteFOW(gridHandle: number, plot: WorldUI.Plot, asset: string, fowAsset: string, offset: float3, params?: WorldUI.SpriteParams) {
		const spriteGrid = this.spriteGrids.get(gridHandle);
		if (spriteGrid == undefined) {
			console.error(`lens-manager - addSpriteFOW: handle ${gridHandle} cannot be found`);
			return;
		}

		params = this.applyScalingToParams(params);
		spriteGrid.addSpriteFOW(plot, asset, fowAsset, offset, params);
	}

	public addText(gridHandle: number, plot: WorldUI.Plot, text: string, offset: float3, params?: WorldUI.TextParams) {
		const spriteGrid = this.spriteGrids.get(gridHandle);
		if (spriteGrid == undefined) {
			console.error(`lens-manager - addText: handle ${gridHandle} cannot be found`);
			return;
		}

		spriteGrid.addText(plot, text, offset, params);
	}

	private applyScalingToParams(params?: WorldUI.SpriteParams): WorldUI.SpriteParams | undefined {
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

	public setVisible(gridHandle: number, value: boolean) {
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

	public clearPlot(gridHandle: number, plot: WorldUI.Plot) {
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

	public clear(gridHandle: number) {
		const spriteGrid = this.spriteGrids.get(gridHandle);
		if (spriteGrid == undefined) {
			console.error(`lens-manager - clear: handle ${gridHandle} cannot be found`);
			return;
		}

		spriteGrid.clear();
	}
}

export const LensLayerEnabledEventName = 'lens-event-layer-enabled' as const;
export const LensLayerDisabledEventName = 'lens-event-layer-disabled' as const;
type LensLayerEventName = typeof LensLayerEnabledEventName | typeof LensLayerDisabledEventName;

/**
 * LensLayerEvent is fired when a lens layer is enabled or disabled
 */
export class LensLayerEvent extends CustomEvent<{ layer: LensLayerName }> {
	constructor(name: LensLayerEventName, layer: LensLayerName) {
		super(name, {
			bubbles: false,
			cancelable: false,
			detail: { layer }
		});
	}
}

export const LensActivationEventName = 'lens-event-active-lens' as const;
export type LensActivationEventDetail = { prevLens: LensName | undefined, activeLens: LensName }
/**
 * LensActivationEvent is fired when a lens is activated
 */
export class LensActivationEvent extends CustomEvent<LensActivationEventDetail> {
	constructor(prevLens: LensActivationEventDetail['prevLens'], activeLens: LensActivationEventDetail['activeLens']) {
		super(LensActivationEventName, {
			detail: {
				activeLens,
				prevLens
			}
		});
	}
}

class LensManagerSingleton {

	private showDebugInfo = false;

	private lenses = new Map<LensName, ILens>();

	private layers = new Map<LensLayerName, ILensLayer>();

	private activeLens: LensName | undefined;

	private enabledLayers = new Set<LensLayerName>();

	registerLens(lensType: LensName, lens: ILens) {
		if (this.lenses.has(lensType)) {
			console.error(`lens-manager: Attempted to add duplicate lens type: ${lensType}`);
			return;
		}

		this.lenses.set(lensType, lens);
	}

	registerLensLayer(layerType: LensLayerName, layer: ILensLayer) {
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
		} else if (this.showDebugInfo) {
			console.log(`lens-manager: Failed to find '${this.activeLens}' during registerLensLayer.`);
		}
	}

	getActiveLens() {
		if (this.activeLens === undefined) {
			console.error(`lens-manager: No active lens has been set yet`);
		}

		return this.activeLens as LensName;
	}

	setActiveLens(type: LensName): boolean {
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
					prevLens.lastEnabledLayers = new Set<LensLayerName>(this.enabledLayers);
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

	enableLayers(layerTypes: Set<LensLayerName>) {
		for (const layerType of layerTypes) {
			this.enableLayer(layerType);
		}
	}

	enableLayer(layerType: LensLayerName): boolean {

		const layer: ILensLayer | undefined = this.layers.get(layerType);
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

	disableLayer(layerType: LensLayerName): boolean {

		const layer: ILensLayer | undefined = this.layers.get(layerType);
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

		this.enabledLayers.delete(layerType)
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
	toggleLayer(layerType: LensLayerName, force: boolean | undefined = undefined): boolean {
		const layer: ILensLayer | undefined = this.layers.get(layerType);
		if (layer == undefined) {
			console.error(`lens-manager: toggleLayer failed to find lens layer for type '${layerType}'`);
			return false;
		}

		const enable = force ?? !this.enabledLayers.has(layerType);
		if (enable) {
			return this.enableLayer(layerType);
		} else {
			return this.disableLayer(layerType);
		}
	}

	isLayerEnabled(layerType: LensLayerName): boolean {

		const layer: ILensLayer | undefined = this.layers.get(layerType);
		if (layer == undefined) {
			console.error(`lens-manager: isLayerEnabled failed to find lens layer for type '${layerType}'`);
			return false;
		}

		return this.enabledLayers.has(layerType);
	}
}

const LensManager = new LensManagerSingleton();
export default LensManager