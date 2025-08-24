/**
 * World VFX Manager
 * @copyright 2020-2023, Firaxis Games
 *
 * Handles ambient and game event based VFX.
  */
class WorldVFXManager {
    constructor() {
        this.ambientVfxModelGroup = null;
        this.discoveryHashes = [];
        if (WorldVFXManager.instance) {
            console.error("Only one instance of the World VFX manager class exist at a time, second attempt to create one.");
        }
        WorldVFXManager.instance = this;
        engine.whenReady.then(() => { this.onReady(); });
    }
    onReady() {
        this.ambientVfxModelGroup = WorldUI.createModelGroup("ambientVfxModelGroup");
        let ambientVfxMarker = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });
        if (ambientVfxMarker != null && this.ambientVfxModelGroup != null) {
            this.ambientVfxModelGroup?.addVFX("VFX_TEST_World_Ambient_VFX_Dust", { marker: ambientVfxMarker, offset: { x: 0, y: 0, z: 0 } }, { angle: 0, scale: 1 });
        }
        engine.on('DistrictAddedToMap', this.onDistrictAddedToMap, this);
        engine.on('ConstructibleAddedToMap', this.onConstructibleAddedToMap, this);
        //engine.on('ConstructibleRemovedFromMap', this.onConstructibleRemovedFromMap, this);
        //engine.on('ConstructibleVisibilityChanged', this.onConstructibleVisibilityChanged, this)
        engine.on('PlotEffectAddedToMap', this.onPlotEffectAddedToMap, this);
        engine.on('PlotEffectRemovedFromMap', this.onPlotEffectRemovedFromMap, this);
        engine.on('RouteAddedToMap', this.onRouteAddedToMap, this);
        this.discoveryHashes = [];
        // Keep the hashes of the valid things we care about for fast lookups
        for (const key in DiscoveryVisualTypes) {
            this.discoveryHashes.push(DiscoveryVisualTypes[key]);
        }
    }
    onDistrictAddedToMap(data) {
        if (Players.isParticipant(GameContext.localPlayerID)
            && GameplayMap.getRevealedState(GameContext.localPlayerID, data.location.x, data.location.y) == RevealedStates.VISIBLE
            && !Automation.isActive) {
            WorldUI.triggerVFXAtPlot("VFX_District_Added_To_Map", data.location, { x: 0, y: 0, z: 0 }, { angle: 0, scale: 1 });
        }
    }
    onConstructibleAddedToMap(data) {
        const improvement = GameInfo.Constructibles.lookup(data.constructibleType);
        if (improvement == null)
            return;
        const vfxName = "VFX_ADDED_TO_MAP_" + improvement.ConstructibleType;
        if (Players.isParticipant(GameContext.localPlayerID)
            && GameplayMap.getRevealedState(GameContext.localPlayerID, data.location.x, data.location.y) == RevealedStates.VISIBLE
            && !Automation.isActive) {
            WorldUI.triggerVFXAtPlot(vfxName, data.location, { x: 0, y: 0, z: 0 }, { angle: 0, scale: 1 });
        }
    }
    // private onConstructibleVisibilityChanged(_data: ConstructibleVisibilityChanged_EventData) {
    // 	//TO DO: show a VFX whenever a discovery is first revealed
    // 	if (Players.isParticipant(GameContext.localPlayerID)
    // 		&& GameplayMap.getRevealedState(GameContext.localPlayerID, data.location.x, data.location.y) == RevealedStates.VISIBLE
    // 		&& !Automation.isActive) {
    // 		if (this.discoveryHashes.find(element => element == data.constructibleType.valueOf())) {
    // 			WorldUI.triggerVFXAtPlot("VFX_District_Added_To_Map", data.location, { x: 0, y: 0, z: 0 }, { angle: 0, scale: 1 });
    // 		}
    // 	}
    // }
    // private onConstructibleRemovedFromMap(data: ConstructibleRemovedFromMap_EventData) {
    // 	//TO DO: show a VFX whenever a discovery is first revealed
    // 	if (Players.isParticipant(GameContext.localPlayerID)
    // 		&& GameplayMap.getRevealedState(GameContext.localPlayerID, data.location.x, data.location.y) == RevealedStates.VISIBLE
    // 		&& !Automation.isActive) {
    // 		if (this.discoveryHashes.find(element => element == data.constructibleType.valueOf())) {
    // 			WorldUI.triggerVFXAtPlot("VFX_District_Added_To_Map", data.location, { x: 0, y: 0, z: 0 }, { angle: 0, scale: 1 });
    // 		}
    // 	}
    // }
    onPlotEffectAddedToMap(data) {
        const plotEffect = GameInfo.PlotEffects.lookup(data.effectType);
        if (plotEffect == null)
            return;
        const vfxName = "VFX_ADDED_TO_MAP_" + plotEffect.PlotEffectType;
        if (Players.isParticipant(GameContext.localPlayerID)
            && GameplayMap.getRevealedState(GameContext.localPlayerID, data.location.x, data.location.y) == RevealedStates.VISIBLE
            && !Automation.isActive) {
            if (plotEffect.PlotEffectType == "PLOTEFFECT_FLOODED") {
                let inflowEdges = data.floodConnectivity;
                var outflowEdge = data.floodConnectivity & 7;
                //outflow effect
                this.ambientVfxModelGroup?.addVFXAtPlot(vfxName + "_OUTFLOW", data.location, { x: 0, y: 0, z: 0 }, { angle: (-60 * outflowEdge), scale: 1 });
                //inflow effect
                var i = 0;
                inflowEdges = inflowEdges >> 3; //get rid of outflow bits
                for (i; i < 6; i++) {
                    if (inflowEdges & 1) {
                        this.ambientVfxModelGroup?.addVFXAtPlot(vfxName + "_INFLOW", data.location, { x: 0, y: 0, z: 0 }, { angle: (-60 * i), scale: 1 });
                    }
                    inflowEdges = inflowEdges >> 1;
                }
            }
            else {
                WorldUI.triggerVFXAtPlot(vfxName, data.location, { x: 0, y: 0, z: 0 }, { angle: 0, scale: 1 });
            }
        }
    }
    onPlotEffectRemovedFromMap(data) {
        const plotEffect = GameInfo.PlotEffects.lookup(data.effectType);
        if (plotEffect == null)
            return;
        const vfxName = "VFX_REMOVED_FROM_MAP_" + plotEffect.PlotEffectType;
        if (Players.isParticipant(GameContext.localPlayerID)
            && GameplayMap.getRevealedState(GameContext.localPlayerID, data.location.x, data.location.y) == RevealedStates.VISIBLE
            && !Automation.isActive) {
            WorldUI.triggerVFXAtPlot(vfxName, data.location, { x: 0, y: 0, z: 0 }, { angle: 0, scale: 1 });
        }
    }
    onRouteAddedToMap(data) {
        const vfxName = "VFX_ADDED_TO_MAP_ROUTE";
        if (Players.isParticipant(GameContext.localPlayerID)
            && GameplayMap.getRevealedState(GameContext.localPlayerID, data.location.x, data.location.y) == RevealedStates.VISIBLE
            && !Automation.isActive
            && !data.isDistrict) {
            // TODO double check this works after the connectivity mask changes
            var i = 0;
            let adjacentRouteMask = data.adjacentRouteMask;
            let tradeRouteMask = data.tradeRouteMask;
            for (i; i < 6; i++) {
                if (adjacentRouteMask & 1) {
                    WorldUI.triggerVFXAtPlot(vfxName, data.location, { x: 0, y: 0, z: 0 }, { angle: (-60 * i), scale: 1 });
                }
                adjacentRouteMask = adjacentRouteMask >> 1;
            }
            for (i = 0; i < 6; i++) {
                if (tradeRouteMask & 1) {
                    WorldUI.triggerVFXAtPlot(vfxName, data.location, { x: 0, y: 0, z: 0 }, { angle: (-60 * i), scale: 1 });
                }
                tradeRouteMask = tradeRouteMask >> 1;
            }
        }
    }
}
WorldVFXManager.instance = null;
const WorldVfx = new WorldVFXManager();
export { WorldVfx as default };

//# sourceMappingURL=file:///base-standard/ui/world-vfx/world-vfx.js.map
