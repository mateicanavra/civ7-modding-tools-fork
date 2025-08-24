/**
 * @file resource-layer
 * @copyright 2022-2025, Firaxis Games
 * @description Lens layer to show resource icons on the map
 */

import LensManager, { BaseSpriteGridLensLayer } from '/core/ui/lenses/lens-manager.js';
import { LayerHotkeyEvent } from '/core/ui/input/hotkey-manager.js';

interface PlotResource {
	location: PlotCoord,
	resource: string,
	class: string,
	canCreatetreasureFleet: boolean
};

const SPRITE_PLOT_POSITION = { x: 0, y: 25, z: 5 };
const RESOURCE_SIZE = 42; // pixels wide
const TYPE_SIZE = 20; // pixels wide
const TYPE_OFFSET: float2 = { x: -12, y: -12 };
const TREASURE_FLEET_TYPE_SIZE = 42; // pixels wide
const TREASURE_FLEET_TYPE_OFFSET: float2 = { x: -5, y: -12 };

enum SpriteGroup {
	All_Resources = 0,
	All_Resources_Class_Type = 1,
	All = Number.MAX_VALUE
}

class ResourceLensLayer extends BaseSpriteGridLensLayer {
	private resourceAddedToMapListener = (data: ResourceAddedToMap_EventData) => { this.onResourceAddedToMap(data); }
	private resourceRemovedFromMapListener = (data: ResourceChanged_EventData) => { this.onResourceRemovedFromMap(data); }

	private onLayerHotkeyListener = this.onLayerHotkey.bind(this);

	constructor() {
		super([
			{ handle: SpriteGroup.All_Resources, name: "AllResources_SpriteGroup", spriteMode: SpriteMode.FixedBillboard },
			{ handle: SpriteGroup.All_Resources_Class_Type, name: "AllResourcesClassType_SpriteGroup", spriteMode: SpriteMode.FixedBillboard }
		]);
	}

	/**
	 * @implements ILensLayer
	 */
	initLayer() {
		engine.on('ResourceAddedToMap', this.resourceAddedToMapListener);
		engine.on('ResourceRemovedFromMap', this.resourceRemovedFromMapListener);

		const player = Players.get(GameContext.localPlayerID);
		if (!player) {
			console.log(`resource-layer: initLayer() Failed to find player for ${GameContext.localPlayerID}`);
			return;
		}

		const width: number = GameplayMap.getGridWidth();
		const height: number = GameplayMap.getGridHeight();
		for (let x: number = 0; x < width; x++) {
			for (let y: number = 0; y < height; y++) {
				const resource: ResourceType = GameplayMap.getResourceType(x, y);
				if (resource == ResourceTypes.NO_RESOURCE) {
					continue;
				}
				const resourceDefinition: ResourceDefinition | null = GameInfo.Resources.lookup(resource);
				if (resourceDefinition) {
					// If we're a treasure resource in a distant land we can create treasure fleets
					if (resourceDefinition.ResourceClassType == "RESOURCECLASS_TREASURE" && player.isDistantLands({ x: x, y: y })) {
						this.addResourceSprites({ location: { x: x, y: y }, resource: resourceDefinition.ResourceType, class: resourceDefinition.ResourceClassType, canCreatetreasureFleet: true });
					} else {
						this.addResourceSprites({ location: { x: x, y: y }, resource: resourceDefinition.ResourceType, class: resourceDefinition.ResourceClassType, canCreatetreasureFleet: false });
					}
				}
				else {
					console.error(`Could not find resource with type ${resource}.`);
				}
			}
		}
		this.spriteGrids.forEach(grid => grid.setVisible(false));	// Not shown until requested to be visible.

		window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
	}


	private addResourceSprites(entry: PlotResource) {
		const asset = UI.getIconBLP(entry.resource);
		const assetFow = UI.getIconBLP(entry.resource, "FOW");
		this.addSpriteFOW(SpriteGroup.All_Resources, entry.location, asset, assetFow, SPRITE_PLOT_POSITION, { scale: RESOURCE_SIZE });

		const blpName = entry.canCreatetreasureFleet ? "RESOURCECLASS_TREASURE_FLEET" : entry.class;
		const scale = entry.canCreatetreasureFleet ? TREASURE_FLEET_TYPE_SIZE : TYPE_SIZE;
		const offset = entry.canCreatetreasureFleet ? TREASURE_FLEET_TYPE_OFFSET : TYPE_OFFSET;

		const typeasset = UI.getIconBLP(blpName);
		const typeassetFow = UI.getIconBLP(blpName, "FOW");

		this.addSpriteFOW(
			SpriteGroup.All_Resources_Class_Type,
			entry.location,
			typeasset,
			typeassetFow,
			SPRITE_PLOT_POSITION,
			{ scale: scale, offset: offset });
	}

	private onResourceAddedToMap(data: ResourceAddedToMap_EventData) {
		const player = Players.get(GameContext.localPlayerID);
		if (!player) {
			console.log(`resource-layer: onResourceAddedToMap() Failed to find player for ${GameContext.localPlayerID}`);
			return;
		}

		const resourceDefinition = GameInfo.Resources.lookup(data.resourceType);
		if (resourceDefinition) {
			// There are sometimes ResourceAddedToMap events on visibility changes that already have
			// FoW sprite icons from initLayer(), clear old icons to avoid stacking duplicates
			this.clearPlot(SpriteGroup.All, data.location);

			if (resourceDefinition.ResourceClassType == "RESOURCECLASS_TREASURE" && player.isDistantLands({ x: data.location.x, y: data.location.y })) {
				this.addResourceSprites({ location: data.location, resource: resourceDefinition.ResourceType, class: resourceDefinition.ResourceClassType, canCreatetreasureFleet: true });
			} else {
				this.addResourceSprites({ location: data.location, resource: resourceDefinition.ResourceType, class: resourceDefinition.ResourceClassType, canCreatetreasureFleet: false });
			}
		}
		else {
			console.error(`Could not find resource with type ${data.resourceType}.`);
		}
	}

	private onResourceRemovedFromMap(data: ResourceChanged_EventData) {
		this.clearPlot(SpriteGroup.All, data.location);
	}

	private onLayerHotkey(hotkey: LayerHotkeyEvent) {
		if (hotkey.detail.name == 'toggle-resources-layer') {
			LensManager.toggleLayer('fxs-resource-layer');
		}
	}
}

declare global {
	interface LensLayerTypeMap {
		'fxs-resource-layer': ResourceLensLayer
	}
}

LensManager.registerLensLayer('fxs-resource-layer', new ResourceLensLayer());