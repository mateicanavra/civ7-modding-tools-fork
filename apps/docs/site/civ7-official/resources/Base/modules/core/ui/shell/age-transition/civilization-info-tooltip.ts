/**
 * @file civilization-tooltip.ts
 * @copyright 2024, Firaxis Games
 * @description Shows civilization tooltip info
 */

import { CivData } from "/core/ui/shell/create-panels/age-civ-select-model.js";
import TooltipManager, { TooltipType } from "/core/ui/tooltips/tooltip-manager.js";
import { RecursiveGetAttribute } from "/core/ui/utilities/utilities-dom.js";

export class CivilizationInfoTooltipModelImpl {
	private _civData: CivData[] = [];

	public get civData() {
		return this._civData;
	}

	public set civData(value: CivData[]) {
		this._civData = value;
	}

	public clear() {
		this._civData = [];
	}

}

export class CivilizationInfoTooltip implements TooltipType {
	private tooltip = document.createElement("fxs-tooltip");
	private tooltipContents = document.createElement("div");
	private civIndex = "";

	private civIcon = document.createElement("div");
	private civName = document.createElement("fxs-header");
	private civTraits = document.createElement("div");
	private historicalReason = document.createElement("div");
	private lockedInfo = document.createElement("div");

	constructor() {
		this.tooltip.classList.add("flex", "flex-col", "p-3");
		this.tooltip.appendChild(this.tooltipContents);

		const header = document.createElement("div");
		header.classList.add("flex", "flex-row", "items-center");
		this.tooltip.appendChild(header);

		this.civIcon.classList.add("size-12", "bg-contain", "mr-2");
		header.appendChild(this.civIcon);

		const civInfo = document.createElement("div");
		civInfo.classList.add("flex", "flex-col");
		header.appendChild(civInfo);

		this.civName.setAttribute("filigree-style", "none");
		this.civName.classList.add("font-title-lg", "uppercase");
		civInfo.appendChild(this.civName);

		this.civTraits.classList.add("font-body-base", "text-accent-1");
		civInfo.appendChild(this.civTraits);

		this.historicalReason.classList.add("font-body-base", "text-accent-1", "max-w-72", "mt-2");
		this.tooltip.appendChild(this.historicalReason);

		this.lockedInfo.classList.add("flex", "flex-row", "mt-2", "items-center");
		this.tooltip.appendChild(this.lockedInfo);

		const lockIcon = document.createElement("div");
		lockIcon.classList.add("img-lock", "size-8");
		this.lockedInfo.appendChild(lockIcon);

		const lockText = document.createElement("div");
		lockText.classList.add("font-body-base");
		lockText.setAttribute("data-l10n-id", "LOC_AGE_TRANSITION_CIV_LOCKED")
		this.lockedInfo.appendChild(lockText);
	}

	getHTML() {
		return this.tooltip;
	}

	reset(): void {
		this.tooltipContents.innerHTML = "";
	}

	isUpdateNeeded(target: HTMLElement): boolean {
		const newIndex = RecursiveGetAttribute(target, "data-civ-info-index") ?? "";
		const updateRequired = newIndex != this.civIndex;
		this.civIndex = newIndex;

		return updateRequired;
	}

	update(): void {
		const civData = CivilizationInfoTooltipModel.civData[Number.parseInt(this.civIndex)];

		if (civData) {
			this.civIcon.style.backgroundImage = `url("${civData.icon}")`;
			this.civName.setAttribute("title", civData.name);
			this.civTraits.innerHTML = civData.tags.join(", ");
			this.historicalReason.classList.toggle("hidden", !civData.isHistoricalChoice);
			this.historicalReason.innerHTML = Locale.stylize(civData.historicalChoiceReason ?? "");
			this.lockedInfo.classList.toggle("hidden", !civData.isLocked);
		}
	}

	isBlank(): boolean {
		return false;
	}
}

export const CivilizationInfoTooltipModel = new CivilizationInfoTooltipModelImpl();

TooltipManager.registerType('civilization-info', new CivilizationInfoTooltip());
