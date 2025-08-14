/**
 * @file model-mini-map.ts
 * @copyright 2024, Firaxis Games
 * @description Data for the mini map
 */
class MiniMapModel {
    static getInstance() {
        if (!MiniMapModel._Instance) {
            MiniMapModel._Instance = new MiniMapModel();
        }
        return MiniMapModel._Instance;
    }
    setLensDisplayOption(lens, value) {
        UI.setOption("user", "Interface", lens, value);
    }
    getLensDisplayOption(lens) {
        return UI.getOption("user", "Interface", lens);
    }
    setDecorationOption(decorLayer, value) {
        UI.setOption("user", "Interface", decorLayer, value);
    }
    getDecorationOption(decorLayer) {
        return UI.getOption("user", "Interface", decorLayer);
    }
}
const MiniMapData = MiniMapModel.getInstance();
export { MiniMapData as default };
engine.whenReady.then(() => {
    engine.createJSModel('g_MiniMap', MiniMapData);
});

//# sourceMappingURL=file:///base-standard/ui/mini-map/model-mini-map.js.map
