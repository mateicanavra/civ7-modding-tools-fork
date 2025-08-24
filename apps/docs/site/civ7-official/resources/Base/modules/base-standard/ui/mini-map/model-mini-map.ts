/**
 * @file model-mini-map.ts
 * @copyright 2024, Firaxis Games
 * @description Data for the mini map
 */

class MiniMapModel {
	private static _Instance: MiniMapModel;

	static getInstance() {

		if (!MiniMapModel._Instance) {
			MiniMapModel._Instance = new MiniMapModel();
		}
		return MiniMapModel._Instance;
	}

	setLensDisplayOption(lens: string, value: string) {
		UI.setOption("user", "Interface", lens, value);
	}

	getLensDisplayOption(lens: string): string {
		return UI.getOption("user", "Interface", lens);
	}

	setDecorationOption(decorLayer: string, value: boolean) {
		UI.setOption("user", "Interface", decorLayer, value);
	}

	getDecorationOption(decorLayer: string): boolean {
		return UI.getOption("user", "Interface", decorLayer);
	}
}

const MiniMapData = MiniMapModel.getInstance();
export { MiniMapData as default };

engine.whenReady.then(() => {
	engine.createJSModel('g_MiniMap', MiniMapData);
});