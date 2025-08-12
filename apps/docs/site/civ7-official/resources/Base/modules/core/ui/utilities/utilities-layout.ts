/// <reference path="../themes/default/global-scaling.ts" />

const COMPACT_HEIGHT_THRESHOLD = 1000;

export namespace Layout {
	export function pixels(pxValue: number) {
		return `${pixelsValue(pxValue)}rem`;
	}

	export function isCompact() {
		return window.innerHeight < pixelsToScreenPixels(COMPACT_HEIGHT_THRESHOLD);
	}

	export const pixelsValue = (px: number) => GlobalScaling.pixelsToRem(px);

	export const pixelsText = (px: number) => GlobalScaling.createPixelsTextClass(px);

	export function textSizeToScreenPixels(fontSizeName: "2xs" | "xs" | "sm" | "base" | "lg" | "xl" | "2xl") {
		return pixelsToScreenPixels(GlobalScaling.getFontSizePx(fontSizeName));
	}

	export function pixelsToScreenPixels(pxValue: number) {
		return GlobalScaling.remToScreenPixels(GlobalScaling.pixelsToRem(pxValue));
	}
}