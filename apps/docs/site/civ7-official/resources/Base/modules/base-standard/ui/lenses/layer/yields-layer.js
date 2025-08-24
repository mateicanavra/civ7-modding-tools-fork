/**
 * @file yields-layer
 * @copyright 2022-2024, Firaxis Games
 * @description Lens layer to show yields from each plot
 */
import LensManager, { BaseSpriteGridLensLayer } from '/core/ui/lenses/lens-manager.js';
var ConstructibleYieldState;
(function (ConstructibleYieldState) {
    ConstructibleYieldState[ConstructibleYieldState["NOT_PRODUCING"] = 0] = "NOT_PRODUCING";
    ConstructibleYieldState[ConstructibleYieldState["PRODUCING"] = 1] = "PRODUCING";
})(ConstructibleYieldState || (ConstructibleYieldState = {}));
var SpriteGroup;
(function (SpriteGroup) {
    SpriteGroup[SpriteGroup["All_Yields"] = 0] = "All_Yields";
})(SpriteGroup || (SpriteGroup = {}));
class YieldsLensLayer extends BaseSpriteGridLensLayer {
    constructor() {
        super([
            { handle: SpriteGroup.All_Yields, name: "AllYields_SpriteGroup", spriteMode: SpriteMode.Billboard }
        ]);
        this.yieldSpritePadding = 12;
        this.yieldIcons = new Map();
        this.plotStates = [];
        this.revealedStates = [];
        this.plotsNeedingUpdate = [];
        this.constructibleStates = [];
        this.fontData = { fonts: ["TitleFont"], fontSize: 5, faceCamera: true };
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
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
        this.revealedStates = GameplayMap.getRevealedStates(GameContext.localPlayerID);
        const revealedStatesLength = this.revealedStates.length;
        for (let i = 0; i < revealedStatesLength; ++i) {
            this.constructibleStates[i] = this.calculateConstructibleState(i);
            this.plotStates.push({
                revealedState: RevealedStates.HIDDEN,
                yields: new Map(),
                constructibleState: ConstructibleYieldState.NOT_PRODUCING
            });
            this.updatePlotState(i, this.revealedStates[i], this.constructibleStates[i]);
        }
        this.setVisible(SpriteGroup.All_Yields, false);
        engine.on('PlotVisibilityChanged', this.onPlotVisibilityChanged, this);
        engine.on('PlotYieldChanged', this.onPlotYieldChanged, this);
        engine.on('ConstructibleAddedToMap', this.onConstructibleChange, this);
        engine.on('ConstructibleRemovedFromMap', this.onConstructibleChange, this);
        engine.on('DistrictDamageChanged', this.onConstructibleChange, this);
        engine.on('GameCoreEventPlaybackComplete', this.applyYieldChanges, this);
        window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
    }
    calculateConstructibleState(plotIndex) {
        const location = GameplayMap.getLocationFromIndex(plotIndex);
        const constructibles = MapConstructibles
            .getHiddenFilteredConstructibles(location.x, location.y)
            .map(id => Constructibles.getByComponentID(id))
            .filter(c => c && c.complete && c.owner != PlayerIds.WORLD_PLAYER);
        return constructibles.length > 0 ? ConstructibleYieldState.PRODUCING : ConstructibleYieldState.NOT_PRODUCING;
    }
    onPlotVisibilityChanged(data) {
        const plotIndex = data.location.x + (GameplayMap.getGridWidth() * data.location.y);
        this.revealedStates[plotIndex] = data.visibility;
        if (this.plotsNeedingUpdate.indexOf(plotIndex) != null) {
            this.plotsNeedingUpdate.push(plotIndex);
        }
    }
    onPlotYieldChanged(data) {
        const plotIndex = data.location.x + (GameplayMap.getGridWidth() * data.location.y);
        if (this.plotsNeedingUpdate.indexOf(plotIndex) != null) {
            this.plotsNeedingUpdate.push(plotIndex);
        }
    }
    onConstructibleChange(data) {
        const plotIndex = data.location.x + (GameplayMap.getGridWidth() * data.location.y);
        this.constructibleStates[plotIndex] = this.calculateConstructibleState(plotIndex);
        if (this.plotsNeedingUpdate.indexOf(plotIndex) != null) {
            this.plotsNeedingUpdate.push(plotIndex);
        }
    }
    applyYieldChanges() {
        for (const plotIndex of this.plotsNeedingUpdate) {
            this.updatePlotState(plotIndex, this.revealedStates[plotIndex], this.constructibleStates[plotIndex]);
        }
        this.plotsNeedingUpdate.length = 0;
    }
    updatePlotState(plotIndex, revealedState, constructibleState) {
        let state = this.plotStates[plotIndex];
        const oldRevealedState = state.revealedState;
        const oldConstructibleState = state.constructibleState;
        if (!revealedState) {
            revealedState = oldRevealedState;
        }
        if (!constructibleState) {
            constructibleState = oldConstructibleState;
        }
        // Fast path to handle hidden state and avoid fetching yields.
        if (revealedState == RevealedStates.HIDDEN) {
            if (revealedState != oldRevealedState) {
                this.clearPlot(SpriteGroup.All_Yields, plotIndex);
                state.revealedState = revealedState;
                state.yields.clear();
            }
        }
        else {
            let needsRefresh = false;
            const yields = GameplayMap.getYields(plotIndex, GameContext.localPlayerID);
            // If the revealed states diff, we have to refresh.
            if (oldRevealedState != revealedState) {
                needsRefresh = true;
            }
            // If the constructibles diff, we have to refreash.
            else if (oldConstructibleState != constructibleState) {
                needsRefresh = true;
            }
            else {
                // Revealed states are the same, compare yields.
                if (state.yields.size != yields.length) {
                    needsRefresh = true;
                }
                else {
                    for (const [yieldType, yieldAmount] of yields) {
                        if (state.yields.get(yieldType) != yieldAmount) {
                            needsRefresh = true;
                            break;
                        }
                    }
                }
            }
            if (needsRefresh) {
                // Reset plot state.	
                state.yields.clear();
                state.revealedState = revealedState;
                state.constructibleState = constructibleState;
                // Add yield icons and amounts to sprite grid
                let position = { x: 0, y: 0, z: 5 };
                const groupWidth = (yields.length - 1) * this.yieldSpritePadding;
                const groupOffset = (groupWidth / 2) - groupWidth;
                const scale = constructibleState == ConstructibleYieldState.PRODUCING ? 1.0 : 0.7;
                this.clearPlot(SpriteGroup.All_Yields, plotIndex);
                let count = 0;
                for (const [yieldType, yieldAmount] of yields) {
                    state.yields.set(yieldType, yieldAmount);
                    const yieldDef = GameInfo.Yields.lookup(yieldType);
                    if (yieldDef) {
                        position.x = (count * this.yieldSpritePadding * (scale / 0.7)) + groupOffset;
                        const icons = this.yieldIcons.get(yieldType);
                        if (icons) {
                            if (yieldAmount >= 4.5) {
                                this.addSprite(SpriteGroup.All_Yields, plotIndex, icons[4], position, { scale: scale });
                                this.addText(SpriteGroup.All_Yields, plotIndex, yieldAmount.toString(), position, this.fontData);
                            }
                            else if (yieldAmount >= 1) {
                                const rounded = Math.round(yieldAmount);
                                this.addSprite(SpriteGroup.All_Yields, plotIndex, icons[rounded - 1], position, { scale: scale });
                            }
                            else if (yieldAmount >= 0) {
                                // Show  the '1' version of the icons since we do not have partial yield icons.
                                this.addSprite(SpriteGroup.All_Yields, plotIndex, icons[0], position, { scale: scale });
                            }
                            ++count;
                        }
                    }
                }
            }
        }
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-yields-layer') {
            LensManager.toggleLayer('fxs-yields-layer');
        }
    }
}
LensManager.registerLensLayer('fxs-yields-layer', new YieldsLensLayer());

//# sourceMappingURL=file:///base-standard/ui/lenses/layer/yields-layer.js.map
