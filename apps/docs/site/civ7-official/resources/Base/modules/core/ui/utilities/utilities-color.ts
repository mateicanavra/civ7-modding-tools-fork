/**
 * @file utililties-color.ts
 * @copyright 2021 - 2023, Firaxis Games
 */

import { utils } from '/core/ui/graph-layout/utils.js';
import { Icon } from '/core/ui/utilities/utilities-image.js'

// TODO: Pull from assets/engine so there is an opportunity to get color correct values (HDR, colorblind, etc...)
export enum HighlightColors {
	unitSelection = 0xFFDBA613,
	unitPossibleMovement = 0xFFC69C11,
	unitAttack = 0xFF2D1EFF,
	unitMovementZOC = 0xFF00E9FF,
}

/**
 * HSL-format color
 * @param {number} h Hue
 * @param {number} s Saturation
 * @param {number} l Luminence
 */
export interface HSLColor {
	h: number,
	s: number,
	l: number
}

/**
 * The variants of a color 
 * @param {string} mainColor The root color
 * @param {string} textColor Body text color (has the most contrast against other colors in the color scheme)
 * @param {string} accentColor Decorative color (has the least contrast against other colors in the color scheme)
 */
export interface ColorVariants {
	mainColor: string,
	textColor: string,
	accentColor: string,
	moreColor: string,
	lessColor: string,
	tintColor: string
}

/**
 * Variants of the colors used for the player
 * @param {ColorVariants} primaryColor The primary color and its text and accent variants
 * @param {ColorVariants} secondaryColor The secondary color and its text and accent variants
 * @param {boolean} isPrimaryLighter True if the primary color's luminence is lighter than the secondary color
 */
export interface PlayerColorVariants {
	primaryColor: ColorVariants,
	secondaryColor: ColorVariants,
	isPrimaryLighter: boolean
}

class PlayerColors {

	// Color offsets for calculating color variations

	// Factor to offset the accent colors by
	private static accentOffset: number = .416;
	// Factor to offset the text colors by
	private static textOffset: number = .666;
	// Offset to increase the color's direction (darker dark color or lighter light color)
	private static moreOffset: number = .25;
	// Offset to decrease the color's direction (lighter dark color or darker light color)
	private static lessOffset: number = .25;
	// Tint offsets for fxs-color-tint version of color (dark needs more brightness to compensate)
	private static darkTintOffset: number = -.5;
	private static lightTintOffset: number = .167;
	// White point
	private static whiteColor: SRGBColor = { r: 255, g: 255, b: 255, a: 1 };
	// Black point
	private static blackColor: SRGBColor = { r: 0, g: 0, b: 0, a: 1 };

	/**
	 * Converts an rgb string color to RGB
	 * @param {string} color Must be format 'rgb(R,G,B)'
	 */
	private static stringRGBtoRGB(color: string): SRGBColor {
		if (color.substring(0, 3) != "rgb") {
			console.error("Input color for stringRGBtoRGB is not in format 'rgb(R,G,B)'");
			return { r: 0, g: 0, b: 0, a: 1 }
		}
		const br: number = !isNaN(parseInt(color.charAt(0))) ? 0 : 4;
		const sep: string = color.indexOf(",") > -1 ? "," : " ";
		let rgb: number[] = color.substr(br).split(")")[0].split(sep).map(Number);
		const sRGB: SRGBColor = { r: rgb[0], g: rgb[1], b: rgb[2], a: 1 };
		return sRGB
	}

	/**
	 * Converts an rgb string color to HSL
	 * @param {string} color Must be format 'rgb(R,G,B)'
	 */
	private static stringRGBtoHSL(color: string): HSLColor {
		let rgb: SRGBColor = this.stringRGBtoRGB(color);
		let hsl: HSLColor = Color.convertToHSL(rgb);
		return hsl
	}

	/**
	 * Converts an SRGBColor to an rgb string
	 * @param {SRGBColor} srgb The HSLColor to convert
	 */
	private static SRGBtoString(srgb: SRGBColor): string {
		return `rgb(${srgb.r}, ${srgb.g}, ${srgb.b})`
	}

	/**
	 * Finds an accent variant of two blended SRGBColors, given an offset
	 * @param {SRGBColor} priColor The primary color
	 * @param {SRGBColor} secColor The secondary color
	 * @param {number} offset The offset
	 */
	private static findVariantSRGBColor(priColor: SRGBColor, secColor: SRGBColor, offset: number) {
		const newColor: SRGBColor = {
			r: utils.clamp(Math.round(priColor.r + (offset * (secColor.r - priColor.r))), 0, 255),
			g: utils.clamp(Math.round(priColor.g + (offset * (secColor.g - priColor.g))), 0, 255),
			b: utils.clamp(Math.round(priColor.b + (offset * (secColor.b - priColor.b))), 0, 255),
			a: (priColor.a + secColor.a) * .5
		}
		return newColor
	}

	/**
	 * Creates color variations based on the two provided colors
	 * @param {string} priColor The primary player color
	 * @param {string} secColor The secondary player color
	 */
	static createPlayerColorVariants(priColor: string, secColor: string): PlayerColorVariants {
		// Convert the player colors to local sRGB
		let priRGB: SRGBColor = this.stringRGBtoRGB(priColor);
		let secRGB: SRGBColor = this.stringRGBtoRGB(secColor);

		// Convert the player colors to HSLColor
		let priHSL: HSLColor = this.stringRGBtoHSL(priColor);
		let secHSL: HSLColor = this.stringRGBtoHSL(secColor);

		// Figure out which color is lighter
		let priColorIsLighter: boolean = priHSL.l >= secHSL.l;

		let newColors: PlayerColorVariants = {
			primaryColor: {
				mainColor: priColor,
				textColor: this.SRGBtoString(this.findVariantSRGBColor(priRGB, priColorIsLighter ? this.whiteColor : this.blackColor, this.textOffset)),
				accentColor: this.SRGBtoString(this.findVariantSRGBColor(priRGB, secRGB, this.accentOffset)),
				moreColor: this.SRGBtoString(this.findVariantSRGBColor(priRGB, priColorIsLighter ? this.whiteColor : this.blackColor, this.moreOffset)),
				lessColor: this.SRGBtoString(this.findVariantSRGBColor(priRGB, secRGB, this.lessOffset)),
				tintColor: this.SRGBtoString(this.findVariantSRGBColor(priRGB, priColorIsLighter ? this.whiteColor : this.blackColor, priColorIsLighter ? this.lightTintOffset : this.darkTintOffset))
			},
			secondaryColor: {
				mainColor: secColor,
				textColor: this.SRGBtoString(this.findVariantSRGBColor(secRGB, !priColorIsLighter ? this.whiteColor : this.blackColor, this.textOffset)),
				accentColor: this.SRGBtoString(this.findVariantSRGBColor(secRGB, priRGB, this.accentOffset)),
				moreColor: this.SRGBtoString(this.findVariantSRGBColor(secRGB, !priColorIsLighter ? this.whiteColor : this.blackColor, this.moreOffset)),
				lessColor: this.SRGBtoString(this.findVariantSRGBColor(secRGB, priRGB, this.lessOffset)),
				tintColor: this.SRGBtoString(this.findVariantSRGBColor(secRGB, !priColorIsLighter ? this.whiteColor : this.blackColor, !priColorIsLighter ? this.lightTintOffset : this.darkTintOffset))
			},
			isPrimaryLighter: priColorIsLighter
		}
		return newColors
	}
}

/**
 * Converts an hex number color to a RGB string
 * @param {number} hex
 */
export const numberHexToStringRGB = (hex: number): string => {
	return `rgb(${(hex >> 0) & 0xff},${(hex >> 8) & 0xff},${(hex >> 16) & 0xff})`;
}

/**
 * realizePlayerColor sets the player colors as CSS variables onto a given element based on the playerId
 * 
 * @param element HTMLElement to set css variables on
 * @param playerId ID of the player (determines which colors are used)
 * @param heraldry Whether or not to set civ heraldry icon CSS variables
 */
export const realizePlayerColors = (element: HTMLElement, playerId: PlayerId) => {
	const playerColor: PlayerColor | null = UI.Color.getPlayerColors(playerId);
	if (playerColor) {
		const colorVariants: PlayerColorVariants = UI.Color.createPlayerColorVariants(playerColor);
		element.style.setProperty('--player-color-primary', colorVariants.primaryColor.mainColor);
		element.style.setProperty('--player-color-primary-more', colorVariants.primaryColor.moreColor);
		element.style.setProperty('--player-color-primary-text', colorVariants.primaryColor.textColor);
		element.style.setProperty('--player-color-primary-less', colorVariants.primaryColor.lessColor);
		element.style.setProperty('--player-color-primary-accent', colorVariants.primaryColor.accentColor);

		element.style.setProperty('--player-color-secondary', colorVariants.secondaryColor.mainColor);
		element.style.setProperty('--player-color-secondary-more', colorVariants.secondaryColor.moreColor);
		element.style.setProperty('--player-color-secondary-less', colorVariants.secondaryColor.lessColor);
		element.style.setProperty('--player-color-secondary-text', colorVariants.secondaryColor.textColor);
		element.style.setProperty('--player-color-secondary-accent', colorVariants.secondaryColor.accentColor);

		element.classList.toggle("primary-color-is-lighter", colorVariants.isPrimaryLighter);
	}
}

/**
 * getPlayerColorValues outputs the combined player colors as a string for use with the *style* attribute
 * 
 * @param playerId ID of the player (determines which colors are used)
 */
export const getPlayerColorValues = (playerId: PlayerId): string => {
	let playerColorValues: string = '';
	const playerColor: PlayerColor | null = UI.Color.getPlayerColors(playerId);
	if (playerColor) {
		const colorVariants: PlayerColorVariants = UI.Color.createPlayerColorVariants(playerColor);
		playerColorValues = `
		--player-color-primary: ${colorVariants.primaryColor.mainColor};
		--player-color-primary-more: ${colorVariants.primaryColor.moreColor};
		--player-color-primary-text: ${colorVariants.primaryColor.textColor};
		--player-color-primary-less: ${colorVariants.primaryColor.lessColor};
		--player-color-primary-accent: ${colorVariants.primaryColor.accentColor};

		--player-color-secondary: ${colorVariants.secondaryColor.mainColor};
		--player-color-secondary-more: ${colorVariants.secondaryColor.moreColor};
		--player-color-secondary-text: ${colorVariants.secondaryColor.textColor};
		--player-color-secondary-less: ${colorVariants.secondaryColor.lessColor};
		--player-color-secondary-accent: ${colorVariants.secondaryColor.accentColor};`;
	}
	return playerColorValues;
}

/**
 * isPrimaryColorLighter outputs a boolean tha tis true if the primary color is a lighter value than the secondary color
 * 
 * @param playerId ID of the player (determines which colors are used)
 */
export const isPrimaryColorLighter = (playerId: PlayerId): boolean => {
	const playerColor: PlayerColor | null = UI.Color.getPlayerColors(playerId);
	if (!playerColor) {
		return false
	}
	const colorVariants: PlayerColorVariants = UI.Color.createPlayerColorVariants(playerColor);
	return colorVariants.isPrimaryLighter
}

/**
 * realizeCivHeraldry sets the civ heraldry icon and player color CSS variables onto a given element based on the playerId
 */
export const realizeCivHeraldry = (element: HTMLElement, playerId: PlayerId) => {
	const localPlayer: PlayerLibrary | null = Players.get(playerId);

	realizePlayerColors(element, playerId);

	if (localPlayer) {
		element.style.setProperty('--civ-pattern', Icon.getCivLineCSSFromCivilizationType(localPlayer.civilizationType));
		element.style.setProperty('--civ-symbol', Icon.getCivSymbolCSSFromCivilizationType(localPlayer.civilizationType));
	}
}

export { PlayerColors as default };
