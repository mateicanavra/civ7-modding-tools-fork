/**
 * @file operation-target-layer.ts
 * @copyright 2025, Firaxis Games
 * @description Layer that lets the UI highlight unit operation targets when selecting/hovering over unit actions
 */

import LensManager, { ILensLayer } from '/core/ui/lenses/lens-manager.js';

export const UpdateOperationTargetEventName: string = 'update-operation-target' as const;
export class UpdateOperationTargetEvent extends CustomEvent<{ plots: PlotIndex[], canStart: boolean }> {
	constructor(plots: PlotIndex[], canStart: boolean) {
		super(UpdateOperationTargetEventName, {
			bubbles: false,
			cancelable: false,
			detail: { plots, canStart }
		});
	}
}

const HexToFloat4 = (hex: number, alpha = 1): float4 => {
	const r = (hex >> 16) & 0xff;
	const g = (hex >> 8) & 0xff;
	const b = hex & 0xff;
	return { x: r / 255, y: g / 255, z: b / 255, w: Math.min(1, Math.max(0, alpha)) };
}

const EXCLUSION_TEST = HexToFloat4(0x690909, .6);
const CAN_START = HexToFloat4(0x28EEBE, .45);

class OperationTargetLensLayer implements ILensLayer {

	private overlayGroup = WorldUI.createOverlayGroup("OperationTargetLensLayer", 1);
	private plotOverlay = this.overlayGroup.addPlotOverlay();

	private updateOperationTargetListener = this.onUpdateOperationTarget.bind(this);
	private unitSelectionChangedListener = this.onUnitSelectionChanged.bind(this);

	initLayer() {

	}

	applyLayer() {
		engine.on('UnitSelectionChanged', this.unitSelectionChangedListener);
		window.addEventListener(UpdateOperationTargetEventName, this.updateOperationTargetListener);
	}

	removeLayer() {
		engine.off('UnitSelectionChanged', this.unitSelectionChangedListener);
		window.removeEventListener(UpdateOperationTargetEventName, this.updateOperationTargetListener);
	}

	private onUnitSelectionChanged() {
		this.plotOverlay.clear();
	}

	private onUpdateOperationTarget(event: UpdateOperationTargetEvent) {
		this.plotOverlay.clear();

		if (event.detail.plots.length > 0) {
			this.plotOverlay.addPlots(event.detail.plots, { fillColor: event.detail.canStart ? CAN_START : EXCLUSION_TEST });
		}
	}
}

declare global {
	interface LensLayerTypeMap {
		'fxs-operation-target-layer': OperationTargetLensLayer
	}
}

LensManager.registerLensLayer('fxs-operation-target-layer', new OperationTargetLensLayer());
