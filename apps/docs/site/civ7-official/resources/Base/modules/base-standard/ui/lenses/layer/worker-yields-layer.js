/**
 * @file worker-yields-layer
 * @copyright 2022-2024, Firaxis Games
 * @description Lens layer to show yields from each plot during city tile acquisition and worker placement
 */
import LensManager from '/core/ui/lenses/lens-manager.js';
import PlotWorkersManager, { PlotWorkersUpdatedEventName } from '/base-standard/ui/plot-workers/plot-workers-manager.js';
class WorkerYieldsLensLayer {
    constructor() {
        this.yieldSpritePadding = 11;
        this.yieldSpriteGrid = WorldUI.createSpriteGrid("WorkerYields_SpriteGroup", true);
        this.fontData = { fonts: ["TitleFont"], fontSize: 5, faceCamera: true };
        this.yieldIcons = new Map();
        this.plotSpriteScale = 1.0;
        this.specialistFontSize = 8;
        this.specialistIconHeight = 24;
        this.specialistIconXOffset = 5;
        this.iconZOffset = 5;
        this.blockedSpecialistSpriteOffset = { x: 0, y: 0, z: this.iconZOffset };
        this.plotWorkerUpdatedListener = this.onPlotWorkerUpdate.bind(this);
    }
    cacheIcons() {
        for (const y of GameInfo.Yields) {
            let icons = [];
            for (let i = 1; i < 6; ++i) {
                const icon = UI.getIconBLP(`${y.YieldType}_${i}`);
                icons.push(icon);
            }
            this.yieldIcons.set(y.$hash, icons);
        }
    }
    initLayer() {
        this.cacheIcons();
        this.yieldSpriteGrid.setVisible(false);
    }
    applyLayer() {
        this.realizeGrowthPlots();
        this.realizeWorkablePlots();
        this.realizeBlockedPlots();
        this.yieldSpriteGrid.setVisible(true);
        window.addEventListener(PlotWorkersUpdatedEventName, this.plotWorkerUpdatedListener);
    }
    removeLayer() {
        this.yieldSpriteGrid.clear();
        this.yieldSpriteGrid.setVisible(false);
        window.removeEventListener(PlotWorkersUpdatedEventName, this.plotWorkerUpdatedListener);
    }
    onPlotWorkerUpdate(event) {
        if (event.detail.location) {
            this.yieldSpriteGrid.clearPlot(event.detail.location);
            const info = PlotWorkersManager.allWorkerPlots.find((element) => {
                if (event.detail.location) {
                    return element.PlotIndex == GameplayMap.getIndexFromLocation(event.detail.location);
                }
                return undefined;
            });
            if (!info) {
                console.error("worker-yields-layer: onWorkerAdded() - failed to find workable plot for location " + event.detail.location);
                return;
            }
            this.updateWorkablePlot(info);
        }
        else {
            // If no location sent, update all plots
            this.realizeWorkablePlots();
        }
    }
    realizeGrowthPlots() {
        let plotsToCheck = null;
        if (PlotWorkersManager.cityID) {
            const city = Cities.get(PlotWorkersManager.cityID);
            if (city) {
                const excludeHidden = true;
                plotsToCheck = city.Growth?.getGrowthDomain(excludeHidden);
            }
        }
        if (plotsToCheck == null) {
            // INVESTIGATE - This may not be necessary.  Would we never have a city?
            const width = GameplayMap.getGridWidth();
            const height = GameplayMap.getGridHeight();
            plotsToCheck = [];
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    const revealedState = GameplayMap.getRevealedState(GameContext.localPlayerID, x, y);
                    if (revealedState != RevealedStates.HIDDEN) {
                        plotsToCheck.push(GameplayMap.getIndexFromXY(x, y));
                    }
                }
            }
        }
        this.yieldSpriteGrid.clear();
        for (let plotIndex of plotsToCheck) {
            if (plotIndex !== null) {
                this.updatePlot(plotIndex);
            }
        }
    }
    realizeWorkablePlots() {
        for (let plot of PlotWorkersManager.workablePlots) {
            this.updateWorkablePlot(plot);
        }
    }
    updateWorkablePlot(info) {
        if (info.IsBlocked) {
            const location = GameplayMap.getLocationFromIndex(info.PlotIndex);
            this.yieldSpriteGrid.addSprite(location, "city_special_base", this.blockedSpecialistSpriteOffset, { scale: this.plotSpriteScale });
            this.yieldSpriteGrid.addText(location, info.NumWorkers.toString(), this.blockedSpecialistSpriteOffset, {
                fonts: ["TitleFont"],
                fontSize: this.specialistFontSize,
                faceCamera: true
            });
        }
        else {
            const yieldsToAdd = [];
            const maintenancesToAdd = [];
            info.NextYields.forEach((yieldNum, i) => {
                const netYieldChange = Math.round((yieldNum - info.CurrentYields[i]) * 10) / 10;
                if (netYieldChange != 0) {
                    const iconURL = PlotWorkersManager.getYieldPillIcon(GameInfo.Yields[i].YieldType, netYieldChange);
                    yieldsToAdd.push({ iconURL: iconURL, yieldDelta: netYieldChange });
                }
            });
            info.NextMaintenance.forEach((yieldNum, i) => {
                const netYieldChange = Math.round((-yieldNum + info.CurrentMaintenance[i]) * 10) / 10;
                if (netYieldChange != 0) {
                    const iconURL = PlotWorkersManager.getYieldPillIcon(GameInfo.Yields[i].YieldType, netYieldChange);
                    maintenancesToAdd.push({ iconURL: iconURL, yieldDelta: netYieldChange });
                }
            });
            const location = GameplayMap.getLocationFromIndex(info.PlotIndex);
            if (info.NumWorkers) {
                this.yieldSpriteGrid.addSprite(location, "city_special_base", { x: -this.specialistIconXOffset, y: this.specialistIconHeight, z: this.iconZOffset }, { scale: this.plotSpriteScale });
                this.yieldSpriteGrid.addText(location, info.NumWorkers.toString(), { x: -this.specialistIconXOffset, y: this.specialistIconHeight, z: this.iconZOffset }, {
                    fonts: ["TitleFont"],
                    fontSize: this.specialistFontSize,
                    faceCamera: true
                });
            }
            this.yieldSpriteGrid.addSprite(location, "city_special_empty", { x: info.NumWorkers ? this.specialistIconXOffset : 0, y: this.specialistIconHeight, z: this.iconZOffset }, { scale: this.plotSpriteScale });
            // Add yields to sprite grid
            yieldsToAdd.forEach((yieldPillData, i) => {
                const groupWidth = (yieldsToAdd.length - 1) * this.yieldSpritePadding;
                const xPos = (i * this.yieldSpritePadding) + (groupWidth / 2) - groupWidth;
                const yPos = maintenancesToAdd.length > 0 ? 4 : 0;
                this.yieldSpriteGrid.addSprite(location, yieldPillData.iconURL, { x: xPos, y: yPos, z: this.iconZOffset });
                this.yieldSpriteGrid.addText(location, "+" + yieldPillData.yieldDelta.toString(), { x: xPos, y: (yPos - 3), z: this.iconZOffset }, {
                    fonts: ["TitleFont"],
                    fontSize: 4,
                    faceCamera: true
                });
            });
            // Add yields to sprite grid
            maintenancesToAdd.forEach((yieldPillData, i) => {
                const groupWidth = (maintenancesToAdd.length - 1) * this.yieldSpritePadding;
                const xPos = (i * this.yieldSpritePadding) + (groupWidth / 2) - groupWidth;
                const yPos = yieldsToAdd.length > 0 ? -16 : 0;
                this.yieldSpriteGrid.addSprite(location, yieldPillData.iconURL, { x: xPos, y: yPos, z: this.iconZOffset });
                this.yieldSpriteGrid.addText(location, yieldPillData.yieldDelta.toString(), { x: xPos, y: (yPos - 3), z: this.iconZOffset }, {
                    fonts: ["TitleFont"],
                    fontSize: 4,
                    faceCamera: true
                });
            });
        }
    }
    realizeBlockedPlots() {
        PlotWorkersManager.blockedPlots.forEach(info => {
            const location = GameplayMap.getLocationFromIndex(info.PlotIndex);
            this.yieldSpriteGrid.addSprite(location, "city_special_base", this.blockedSpecialistSpriteOffset, { scale: this.plotSpriteScale });
            this.yieldSpriteGrid.addText(location, info.NumWorkers.toString(), this.blockedSpecialistSpriteOffset, {
                fonts: ["TitleFont"],
                fontSize: this.specialistFontSize,
                faceCamera: true
            });
        });
    }
    updatePlot(location) {
        let yieldsToAdd = [];
        for (const workablePlotIndex of PlotWorkersManager.allWorkerPlotIndexes) {
            if (workablePlotIndex == location) {
                // Don't add normal plot yields for workable plots so we only show what will change with specialists
                return;
            }
        }
        // Clear previous yields from plot
        this.yieldSpriteGrid.clearPlot(location);
        const yields = (PlotWorkersManager.cityID) ? GameplayMap.getYieldsWithCity(location, PlotWorkersManager.cityID) : GameplayMap.getYields(location, GameContext.localPlayerID);
        for (let [yieldType, amount] of yields) {
            const yieldDef = GameInfo.Yields.lookup(yieldType);
            if (yieldDef) {
                const icons = this.yieldIcons.get(yieldType);
                if (icons) {
                    if (amount >= 5) {
                        yieldsToAdd.push({ icon: icons[4], amount });
                    }
                    else {
                        yieldsToAdd.push({ icon: icons[amount - 1], amount });
                    }
                }
            }
        }
        // Add yields to sprite grid
        const groupWidth = (yieldsToAdd.length - 1) * this.yieldSpritePadding;
        const groupOffset = (groupWidth * 0.5) - groupWidth;
        const iconOffset = {
            x: 0,
            y: 0,
            z: this.iconZOffset
        };
        yieldsToAdd.forEach((yieldData, i) => {
            const xPos = (i * this.yieldSpritePadding) + groupOffset;
            iconOffset.x = xPos;
            if (yieldData.amount >= 5) {
                this.yieldSpriteGrid.addSprite(location, yieldData.icon, iconOffset);
                this.yieldSpriteGrid.addText(location, yieldData.amount.toString(), iconOffset, this.fontData);
            }
            else {
                this.yieldSpriteGrid.addSprite(location, yieldData.icon, iconOffset);
            }
        });
    }
}
LensManager.registerLensLayer('fxs-worker-yields-layer', new WorkerYieldsLensLayer());

//# sourceMappingURL=file:///base-standard/ui/lenses/layer/worker-yields-layer.js.map
