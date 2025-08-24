"use strict";
/**
 * Tuner Input support.
 * @copyright 2020-2022, Firaxis Games
 *
 * Handles reacting to input on behalf of the Tuner scripts.
 */
class Tuner_MapPanel {
    constructor() {
        this.previewModelGroup = null;
    }
    getPreviewModelGroup() {
        if (this.previewModelGroup == null) {
            this.previewModelGroup = WorldUI.createModelGroup("tunerPreview");
        }
        return this.previewModelGroup;
    }
    // returns true if we didn't use the event, and false if we did.
    onActionA(loc) {
        if (g_TunerState.MapPanel) {
            if (g_TunerState.MapPanel.placementMode == 'Unit') {
                const localPlayerID = GameContext.localPlayerID;
                let args = {};
                args.Kind = 'UNIT';
                args.Type = g_TunerState.MapPanel.placementType.Unit;
                args.Location = loc;
                let selectedPlayer = localPlayerID;
                if (g_TunerState.MapPanel.selectedPlayer) {
                    selectedPlayer = g_TunerState.MapPanel.selectedPlayer;
                }
                args.Owner = selectedPlayer; // This is debug, so we are going to use the local player for the request, but let them create units for other players.
                const player = Players.get(selectedPlayer);
                let selectedIndependent = -1;
                if ((player?.isIndependent) && (g_TunerState.MapPanel.selectedIndependent >= 0)) {
                    selectedIndependent = g_TunerState.MapPanel.selectedIndependent;
                }
                args.IndependentIndex = selectedIndependent;
                Game.PlayerOperations.sendRequest(localPlayerID, 'CREATE_ELEMENT', args);
                return false;
            }
            if (g_TunerState.MapPanel.placementMode == 'Town') {
                const localPlayerID = GameContext.localPlayerID;
                let args = {};
                args.Kind = 'CITY';
                args.Location = loc;
                let selectedPlayer = localPlayerID;
                if (g_TunerState.MapPanel.selectedPlayer) {
                    selectedPlayer = g_TunerState.MapPanel.selectedPlayer;
                }
                args.Owner = selectedPlayer; // This is debug, so we are going to use the local player for the request, but let them create towns for other players.
                Game.PlayerOperations.sendRequest(localPlayerID, 'CREATE_ELEMENT', args);
                return false;
            }
            if (g_TunerState.MapPanel.placementMode == 'Feature') {
                WorldBuilder.MapPlots.setFeature(g_TunerState.MapPanel.placementType.Feature, loc);
                return false;
            }
            if (g_TunerState.MapPanel.placementMode == 'Terrain') {
                WorldBuilder.MapPlots.setTerrain(g_TunerState.MapPanel.placementType.Terrain, loc);
                return false;
            }
            if (g_TunerState.MapPanel.placementMode == 'Resource') {
                WorldBuilder.MapPlots.setResource(g_TunerState.MapPanel.placementType.Resource, loc, g_TunerState.MapPanel.placementType.ResourceAmount);
                return false;
            }
            if (g_TunerState.MapPanel.placementMode == 'Fertility') {
                WorldBuilder.MapPlots.setFertility(g_TunerState.MapPanel.placementType.Fertility, loc);
                return false;
            }
            if (g_TunerState.MapPanel.placementMode == 'District') {
                // Improvement that is not attached to a city, just the player.
                const localPlayerID = GameContext.localPlayerID;
                let args = {};
                args.Kind = 'DISTRICT';
                args.Type = g_TunerState.MapPanel.placementType.District;
                args.Location = loc;
                let selectedPlayer = localPlayerID;
                if (g_TunerState.MapPanel.selectedPlayer) {
                    selectedPlayer = g_TunerState.MapPanel.selectedPlayer;
                }
                args.Owner = selectedPlayer; // This is debug, so we are going to use the local player for the request, but let them create units for other players.
                Game.PlayerOperations.sendRequest(localPlayerID, 'CREATE_ELEMENT', args);
                return false;
            }
            if (g_TunerState.MapPanel.placementMode == 'Improvement') {
                // Improvement that is not attached to a city, just the player.
                const localPlayerID = GameContext.localPlayerID;
                let args = {};
                args.Kind = 'CONSTRUCTIBLE';
                args.Type = g_TunerState.MapPanel.placementType.Improvement;
                args.Location = loc;
                let selectedPlayer = localPlayerID;
                if (g_TunerState.MapPanel.selectedPlayer) {
                    selectedPlayer = g_TunerState.MapPanel.selectedPlayer;
                }
                args.Owner = selectedPlayer; // This is debug, so we are going to use the local player for the request, but let them create units for other players.
                Game.PlayerOperations.sendRequest(localPlayerID, 'CREATE_ELEMENT', args);
                return false;
            }
            if (g_TunerState.MapPanel.placementMode == 'PlotOwnership') {
                WorldBuilder.MapPlots.setOwnership(g_TunerState.MapPanel.selectedPlayer, loc);
                return false;
            }
            if (g_TunerState.MapPanel.placementMode == 'Route') {
                // Route that is not attached to a city, just the player.
                MapConstructibles.addRoute(loc.x, loc.y, Database.makeHash(g_TunerState.MapPanel.placementType.Route));
                return false;
            }
            if (g_TunerState.MapPanel.placementMode == 'Biome') {
                WorldBuilder.MapPlots.setBiome(g_TunerState.MapPanel.placementType.Biome, loc);
                return false;
            }
            if (g_TunerState.MapPanel.placementMode == 'Discovery') {
                MapConstructibles.addDiscoveryType(Database.makeHash(g_TunerState.MapPanel.placementType.Discovery), loc.x, loc.y);
                return false;
            }
            if (g_TunerState.MapPanel.placementMode == 'Independent') {
                MapConstructibles.addIndependentType(loc.x, loc.y);
                return false;
            }
        }
        if (g_TunerState.WorldUIModels) {
            if (g_TunerState.WorldUIModels.placementMode == 'VFX') {
                if (g_TunerState.WorldUIModels.selectedVFXName) {
                    const previewGroup = this.getPreviewModelGroup();
                    if (previewGroup) {
                        let offset = { x: 0, y: 0, z: 0 };
                        let params = { placement: PlacementMode.TERRAIN };
                        previewGroup.addVFXAtPlot(g_TunerState.WorldUIModels.selectedVFXName, loc, offset, params);
                        return false;
                    }
                }
            }
        }
        return true;
    }
    // returns true if we didn't use the event, and false if we did.
    onActionB(loc) {
        if (g_TunerState.MapPanel) {
            if (g_TunerState.MapPanel.placementMode == 'Unit') {
                let plotUnits = MapUnits.getUnits(loc.x, loc.y);
                if (plotUnits && plotUnits.length > 0) {
                    const localPlayerID = GameContext.localPlayerID;
                    let args = {};
                    args.Kind = 'UNIT';
                    args.Owner = plotUnits[0].owner;
                    args.LocalID = plotUnits[0].id;
                    Game.PlayerOperations.sendRequest(localPlayerID, 'DESTROY_ELEMENT', args);
                    return false;
                }
            }
            if (g_TunerState.MapPanel.placementMode == 'Town') {
                let plotCity = MapCities.getCity(loc.x, loc.y);
                if (plotCity) {
                    const localPlayerID = GameContext.localPlayerID;
                    let args = {};
                    args.Kind = 'CITY';
                    args.Owner = plotCity.owner;
                    args.LocalID = plotCity.id;
                    Game.PlayerOperations.sendRequest(localPlayerID, 'DESTROY_ELEMENT', args);
                    return false;
                }
            }
            if (g_TunerState.MapPanel.placementMode == 'Route') {
                MapConstructibles.removeRoute(loc.x, loc.y);
                return false;
            }
            if (g_TunerState.MapPanel.placementMode == 'Feature') {
                WorldBuilder.MapPlots.setFeature(FeatureTypes.NO_FEATURE, loc);
                return false;
            }
            if (g_TunerState.MapPanel.placementMode == 'Resource') {
                WorldBuilder.MapPlots.setResource(ResourceTypes.NO_RESOURCE, loc, 0);
                return false;
            }
            if (g_TunerState.MapPanel.placementMode == 'Fertility') {
                WorldBuilder.MapPlots.setFertility(FertilityTypes.NO_FERTILITY, loc);
                return false;
            }
            if (g_TunerState.MapPanel.placementMode == 'District') {
                const districtId = Districts.getIdAtLocation(loc);
                if (districtId && districtId.owner != -1 && districtId.id != -1) {
                    const localPlayerID = GameContext.localPlayerID;
                    let args = {};
                    args.Kind = 'DISTRICT';
                    args.Owner = districtId.owner;
                    args.LocalID = districtId.id;
                    Game.PlayerOperations.sendRequest(localPlayerID, 'DESTROY_ELEMENT', args);
                    return false;
                }
            }
            if (g_TunerState.MapPanel.placementMode == 'Improvement') {
                const district = Districts.getAtLocation(loc);
                if (district) {
                    // Removing all the Improvements, since there should only be one
                    const localPlayerID = GameContext.localPlayerID;
                    let constructibleIds = district.getConstructibleIdsOfClass(ConstructibleClasses.IMPROVEMENT);
                    constructibleIds.forEach((elem) => {
                        let args = {};
                        args.Kind = 'CONSTRUCTIBLE';
                        args.Owner = elem.owner;
                        args.LocalID = elem.id;
                        Game.PlayerOperations.sendRequest(localPlayerID, 'DESTROY_ELEMENT', args);
                        return false;
                    });
                }
            }
            if (g_TunerState.MapPanel.placementMode == 'PlotOwnership') {
                WorldBuilder.MapPlots.setOwnership(PlayerIds.NO_PLAYER, loc);
                return false;
            }
        }
        return true;
    }
}
class Tuner_CityPanel {
    constructor() {
    }
    // returns true if we didn't use the event, and false if we did.
    onActionA(loc) {
        if (g_TunerState.CityPanel) {
            if (g_TunerState.CityPanel.placementMode == 'District') {
                if (g_TunerState.CityPanel.selectedCity) {
                    const localPlayerID = GameContext.localPlayerID;
                    let args = {};
                    args.Kind = 'DISTRICT';
                    args.Type = g_TunerState.CityPanel.placementType.District;
                    args.Location = loc;
                    args.Parent = g_TunerState.CityPanel.selectedCity;
                    Game.PlayerOperations.sendRequest(localPlayerID, 'CREATE_ELEMENT', args);
                    return false;
                }
            }
            else {
                if (g_TunerState.CityPanel.placementMode == 'Improvement') {
                    if (g_TunerState.CityPanel.selectedCity) {
                        const localPlayerID = GameContext.localPlayerID;
                        let constructibleDef = GameInfo.Constructibles.lookup(g_TunerState.CityPanel.placementType.Improvement);
                        if (constructibleDef) {
                            let args = {};
                            args.Kind = 'CONSTRUCTIBLE';
                            args.Type = constructibleDef.$index;
                            args.Location = loc;
                            args.Parent = g_TunerState.CityPanel.selectedCity;
                            Game.PlayerOperations.sendRequest(localPlayerID, 'CREATE_ELEMENT', args);
                            return false;
                        }
                    }
                }
                else {
                    if (g_TunerState.CityPanel.placementMode == 'Building') {
                        if (g_TunerState.CityPanel.selectedCity) {
                            const localPlayerID = GameContext.localPlayerID;
                            let args = {};
                            args.Kind = 'CONSTRUCTIBLE';
                            args.Type = g_TunerState.CityPanel.placementType.Building;
                            args.Location = loc;
                            args.Parent = g_TunerState.CityPanel.selectedCity;
                            Game.PlayerOperations.sendRequest(localPlayerID, 'CREATE_ELEMENT', args);
                            return false;
                        }
                    }
                    else {
                        if (g_TunerState.CityPanel.placementMode == 'Wonder') {
                            if (g_TunerState.CityPanel.selectedCity) {
                                const localPlayerID = GameContext.localPlayerID;
                                const district = Districts.getAtLocation(loc);
                                // Create the Wonder District if not there
                                if (district == null) {
                                    let args = {};
                                    args.Kind = 'DISTRICT';
                                    args.Type = 'DISTRICT_WONDER';
                                    args.Location = loc;
                                    args.Parent = g_TunerState.CityPanel.selectedCity;
                                    Game.PlayerOperations.sendRequest(localPlayerID, 'CREATE_ELEMENT', args);
                                    return false;
                                }
                                let args = {};
                                args.Kind = 'CONSTRUCTIBLE';
                                args.Type = g_TunerState.CityPanel.placementType.Wonder;
                                args.Location = loc;
                                args.Parent = g_TunerState.CityPanel.selectedCity;
                                if (g_TunerState.CityPanel.wonderProgress) {
                                    args.Progress = g_TunerState.CityPanel.wonderProgress;
                                }
                                Game.PlayerOperations.sendRequest(localPlayerID, 'CREATE_ELEMENT', args);
                                return false;
                            }
                        }
                        else {
                            if (g_TunerState.CityPanel.placementMode == 'PurchasePlot') {
                                if (g_TunerState.CityPanel.selectedCity) {
                                    const city = Cities.get(g_TunerState.CityPanel.selectedCity);
                                    if (city) {
                                        city.purchasePlot(loc);
                                        return false;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    // returns true if we didn't use the event, and false if we did.
    onActionB(loc) {
        if (g_TunerState.CityPanel) {
            if (g_TunerState.CityPanel.placementMode == 'District') {
                const districtId = Districts.getIdAtLocation(loc);
                if (districtId && districtId.owner != -1 && districtId.id != -1) {
                    const localPlayerID = GameContext.localPlayerID;
                    let args = {};
                    args.Kind = 'DISTRICT';
                    args.Owner = districtId.owner;
                    args.LocalID = districtId.id;
                    Game.PlayerOperations.sendRequest(localPlayerID, 'DESTROY_ELEMENT', args);
                    return false;
                }
            }
            else {
                if (g_TunerState.CityPanel.placementMode == 'Improvement') {
                    const district = Districts.getAtLocation(loc);
                    if (district) {
                        // Removing all the Improvements, since there should only be one
                        const localPlayerID = GameContext.localPlayerID;
                        let constructibleIds = district.getConstructibleIdsOfClass(ConstructibleClasses.IMPROVEMENT);
                        constructibleIds.forEach((elem) => {
                            let args = {};
                            args.Kind = 'CONSTRUCTIBLE';
                            args.Owner = elem.owner;
                            args.LocalID = elem.id;
                            Game.PlayerOperations.sendRequest(localPlayerID, 'DESTROY_ELEMENT', args);
                        });
                        return false;
                    }
                }
                else {
                    if (g_TunerState.CityPanel.placementMode == 'Building') {
                        const district = Districts.getAtLocation(loc);
                        if (district) {
                            const localPlayerID = GameContext.localPlayerID;
                            // Since there can be more than one building, lets first see if the select building type is in the district
                            // and if it is, remove that one, else just remove the first one.
                            let constructibleIds = district.getConstructibleIdsOfType(g_TunerState.CityPanel.placementType.Building);
                            if (constructibleIds.length > 0) {
                                constructibleIds.forEach((elem) => {
                                    let args = {};
                                    args.Kind = 'CONSTRUCTIBLE';
                                    args.Owner = elem.owner;
                                    args.LocalID = elem.id;
                                    Game.PlayerOperations.sendRequest(localPlayerID, 'DESTROY_ELEMENT', args);
                                });
                                return false;
                            }
                            else {
                                let constructibleIds = district.getConstructibleIds();
                                if (constructibleIds.length > 0) {
                                    let args = {};
                                    args.Kind = 'CONSTRUCTIBLE';
                                    args.Owner = constructibleIds[0].owner;
                                    args.LocalID = constructibleIds[0].id;
                                    Game.PlayerOperations.sendRequest(localPlayerID, 'DESTROY_ELEMENT', args);
                                    return false;
                                }
                                ;
                            }
                        }
                    }
                    else {
                        if (g_TunerState.CityPanel.placementMode == 'Wonder') {
                            // Just get the Wonder district and destroy it.
                            const district = Districts.getAtLocation(loc);
                            if (district && district.type == DistrictTypes.WONDER) {
                                const localPlayerID = GameContext.localPlayerID;
                                let args = {};
                                args.Kind = 'DISTRICT';
                                args.Owner = district.owner;
                                args.LocalID = district.localId;
                                Game.PlayerOperations.sendRequest(localPlayerID, 'DESTROY_ELEMENT', args);
                                return false;
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
}
class Tuner_WorldUIPanel {
    constructor() {
        this.previewModelGroup = null;
    }
    getPreviewModelGroup() {
        if (this.previewModelGroup == null) {
            this.previewModelGroup = WorldUI.createModelGroup("tunerPreview");
        }
        return this.previewModelGroup;
    }
    // returns true if we didn't use the event, and false if we did.
    onActionA(loc) {
        if (g_TunerState.WorldUIModels) {
            if (g_TunerState.WorldUIModels.placementMode == 'VFX') {
                if (g_TunerState.WorldUIModels.selectedVFXName) {
                    const previewGroup = this.getPreviewModelGroup();
                    if (previewGroup) {
                        let offset = { x: 0, y: 0, z: 0 };
                        let params = { placement: PlacementMode.TERRAIN };
                        previewGroup.addVFXAtPlot(g_TunerState.WorldUIModels.selectedVFXName, loc, offset, params);
                        return false;
                    }
                }
            }
            if (g_TunerState.WorldUIModels.placementMode == 'Model') {
                if (g_TunerState.WorldUIModels.selectedAssetName) {
                    const previewGroup = this.getPreviewModelGroup();
                    if (previewGroup) {
                        let offset = { x: 0, y: 0, z: 0 };
                        let params = { placement: PlacementMode.TERRAIN };
                        previewGroup.addModelAtPlot(g_TunerState.WorldUIModels.selectedAssetName, loc, offset, params);
                        return false;
                    }
                }
            }
        }
        return true;
    }
    // returns true if we didn't use the event, and false if we did.
    onActionB(_loc) {
        if (g_TunerState.WorldUIModels) {
            if (g_TunerState.WorldUIModels.placementMode == 'VFX') {
                if (g_TunerState.WorldUIModels.selectedVFXName) {
                    const previewGroup = this.getPreviewModelGroup();
                    if (previewGroup) {
                    }
                }
            }
            if (g_TunerState.WorldUIModels.placementMode == 'Model') {
                if (g_TunerState.WorldUIModels.selectedAssetName) {
                    const previewGroup = this.getPreviewModelGroup();
                    if (previewGroup) {
                    }
                }
            }
        }
        return true;
    }
}
class Tuner_AdvancedStartPanel {
    constructor() {
    }
    onActionA(loc) {
        if (g_TunerState.AdvancedStartPanel) {
            if (g_TunerState.AdvancedStartPanel.placementMode == "settlement") {
                const effectId = g_TunerState.AdvancedStartPanel.effectSelected;
                let args = { ID: effectId, X: loc.x, Y: loc.y };
                const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.ADVANCED_START_PLACE_SETTLEMENT, args, false);
                if (result.Success) {
                    Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.ADVANCED_START_PLACE_SETTLEMENT, args);
                }
                g_TunerState.AdvancedStartPanel.placementMode = '';
                return false;
            }
        }
        return true;
    }
    onActionB(_loc) {
        return true;
    }
}
var ShowingOverlayType;
(function (ShowingOverlayType) {
    ShowingOverlayType[ShowingOverlayType["NONE"] = 0] = "NONE";
    ShowingOverlayType[ShowingOverlayType["AREAS"] = 1] = "AREAS";
    ShowingOverlayType[ShowingOverlayType["REGIONS"] = 2] = "REGIONS";
})(ShowingOverlayType || (ShowingOverlayType = {}));
;
const AREA_HIGHLIGHT_COLOR = { x: 0, y: 0.671, z: 0, w: 0.75 };
const REGION_HIGHLIGHT_COLOR = { x: 0, y: 0.671, z: 0, w: 0.75 };
class Tuner_MapAreasPanel {
    constructor() {
        this.overlayGroup = null; // = WorldUI.createOverlayGroup("AppealOverlayGroup", OVERLAY_PRIORITY.PLOT_HIGHLIGHT);
        this.overlay = null; // = this.appealOverlayGroup.addPlotOverlay();
        this.showing = ShowingOverlayType.NONE;
        this.showingId = -1;
    }
    onActionA(loc) {
        if (g_TunerState.MapAreasPanel) {
            g_TunerState.MapAreasPanel.lastLeftClickPlotIndex = GameplayMap.getIndexFromXY(loc.x, loc.y);
            if (g_TunerState.MapAreasPanel.placementMode == "Area") {
                const id = GameplayMap.getAreaId(loc.x, loc.y);
                g_TunerState.MapAreasPanel.lastClickAreaId = id;
                this.showMapArea(id);
                return false;
            }
            else if (g_TunerState.MapAreasPanel.placementMode == "Region") {
                const id = GameplayMap.getRegionId(loc.x, loc.y);
                g_TunerState.MapAreasPanel.lastClickRegionId = id;
                this.showMapRegion(id);
                return false;
            }
        }
        return true;
    }
    onActionB(loc) {
        if (g_TunerState.MapAreasPanel) {
            g_TunerState.MapAreasPanel.lastRgihtClickPlotIndex = GameplayMap.getIndexFromXY(loc.x, loc.y);
            if (g_TunerState.MapAreasPanel.placementMode == "Area") {
                this.clearOverlay();
                return false;
            }
            else if (g_TunerState.MapAreasPanel.placementMode == "Region") {
                this.clearOverlay();
                return false;
            }
        }
        return true;
    }
    clearOverlay() {
        if (this.overlayGroup == null) {
            this.overlayGroup = WorldUI.createOverlayGroup("TunerMapAreasGroup", 1);
        }
        if (this.overlay == null) {
            this.overlay = this.overlayGroup.addPlotOverlay();
        }
        this.overlayGroup.clearAll();
        this.overlay.clear();
        this.showing = ShowingOverlayType.NONE;
    }
    showMapArea(areaId) {
        if (this.showing != ShowingOverlayType.AREAS || this.showingId != areaId) {
            this.clearOverlay();
            this.showingId = areaId;
            this.showing = ShowingOverlayType.AREAS;
            const plots = MapAreas.getAreaPlots(this.showingId);
            if (plots.length > 0) {
                this.overlay?.addPlots(plots, { fillColor: AREA_HIGHLIGHT_COLOR });
            }
        }
    }
    showMapRegion(regionId) {
        if (this.showing != ShowingOverlayType.REGIONS || this.showingId != regionId) {
            this.clearOverlay();
            this.showingId = regionId;
            this.showing = ShowingOverlayType.REGIONS;
            const plots = MapRegions.getRegionPlots(this.showingId);
            if (plots.length > 0) {
                this.overlay?.addPlots(plots, { fillColor: REGION_HIGHLIGHT_COLOR });
            }
        }
    }
}
class TunerInput {
    constructor() {
        this.panels = {};
        engine.whenReady.then(() => { this.onReady(); });
        this.panels['MapPanel'] = new Tuner_MapPanel;
        this.panels['CityPanel'] = new Tuner_CityPanel;
        this.panels['WorldUIModels'] = new Tuner_WorldUIPanel;
        this.panels['AdvancedStartPanel'] = new Tuner_AdvancedStartPanel;
        this.panels['MapAreasPanel'] = new Tuner_MapAreasPanel;
    }
    onReady() {
        window.addEventListener('tuner-user-action-a', (event) => {
            if (!this.onUserActionA(event)) {
                event.stopImmediatePropagation();
                event.preventDefault();
            }
        }, true); // Action A, usually left-click
        window.addEventListener('tuner-user-action-b', (event) => {
            if (!this.onUserActionB(event)) {
                event.stopImmediatePropagation();
                event.preventDefault();
            }
        }, true); // Action B, usually right-click
    }
    // returns true if we didn't use the event, and false if we did.
    onActionA(loc) {
        if (typeof g_TunerState != 'undefined') {
            if (g_TunerState.openPanel) {
                let panelHandler = this.panels[g_TunerState.openPanel];
                if (panelHandler) {
                    if (panelHandler.onActionA) {
                        return panelHandler.onActionA(loc);
                    }
                }
            }
        }
        return true;
    }
    onUserActionA(event) {
        if (event.detail.plotCoords != undefined) {
            return this.onActionA(event.detail.plotCoords);
        }
        return true;
    }
    // returns true if we didn't use the event, and false if we did.
    onActionB(loc) {
        if (typeof g_TunerState != 'undefined') {
            if (g_TunerState.openPanel) {
                let panelHandler = this.panels[g_TunerState.openPanel];
                if (panelHandler) {
                    if (panelHandler.onActionB) {
                        return panelHandler.onActionB(loc);
                    }
                }
            }
        }
        return true;
    }
    onUserActionB(event) {
        if (event.detail.plotCoords != undefined) {
            return this.onActionB(event.detail.plotCoords);
        }
        return true;
    }
}
var g_TunerInput = new TunerInput();
console.log("tunerInput active"); // TODO: remove?
//# sourceMappingURL=file:///base-standard/ui/tuner-input/tuner-input.js.map
