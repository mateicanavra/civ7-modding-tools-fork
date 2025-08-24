/**
 * @file utility-plotcoord.ts
 * @copyright 2021, Firaxis Games
 */

export namespace PlotCoord {
	enum Range {
		INVALID_X = -9999,
		INVALID_Y = -9999
	};

	export function toString(loc: PlotCoord | null): string {
		if (loc) {
			let str: string = loc.x + ";" + loc.y;
			return str;
		}
		else {
			return "";
		}
	}

	export function fromString(str: string): PlotCoord | null {
		let retVal: PlotCoord | null = null;
		if (str) {
			let strs = str.split(';');
			if (strs.length >= 2) {
				retVal = { x: Range.INVALID_X, y: Range.INVALID_Y };
				retVal.x = parseInt(strs[0]);
				retVal.y = parseInt(strs[1]);
			}
		}
		return retVal;
	}

	export function isInvalid(loc: PlotCoord | null): boolean {
		if (loc) {
			if (loc.x <= Range.INVALID_X && loc.y <= Range.INVALID_Y) {
				return true;
			}
		}
		return false;
	}

	export function isValid(loc: PlotCoord | null): boolean {
		if (loc) {
			if (loc.x > Range.INVALID_X && loc.y > Range.INVALID_Y) {
				return true;
			}
		}
		return false;
	}
}
