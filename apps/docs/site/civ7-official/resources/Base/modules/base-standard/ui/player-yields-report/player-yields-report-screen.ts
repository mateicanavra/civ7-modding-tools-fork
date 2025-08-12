/**
 * @file player-yields-report-screen.ts
 * @copyright 2020-2024, Firaxis Games
 * @description Breakdown of each of the yields available in game.
 */

import FocusManager from '/core/ui/input/focus-manager.js';
import YieldReportData, { YieldIncomeRow } from './model-yields-report.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import { MustGetElement, MustGetElements } from '/core/ui/utilities/utilities-dom.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';

interface CellProperties {
	content: string | number | undefined;
	className: string;
	icon?: string;
	textColor?: string;
	tabbed?: boolean;
	noPlus?: boolean;
}

class PlayerYieldsReportScreen extends Panel {

	private collapseToggleActivatedListener = this.onCollapseToggleActivated.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);

	private frame!: HTMLElement;
	private closeButton!: HTMLElement;
	private collapseToggleButton!: HTMLElement;
	private collapseToggleText!: HTMLElement;

	private cityDataContainer!: HTMLElement;
	private otherDataContainer!: HTMLElement;
	private unitDataContainer!: HTMLElement;

	onInitialize(): void {
		this.collapseToggleButton = MustGetElement(".yield-report__collapse-toggle-button", this.Root);
		this.collapseToggleText = MustGetElement(".yield-report__collapse-toggle-text", this.Root);
		this.cityDataContainer = MustGetElement(".yield-report__city-data", this.Root);
		this.otherDataContainer = MustGetElement(".yield-report__other-data", this.Root);
		this.unitDataContainer = MustGetElement(".yield-report__unit-data", this.Root);
		this.frame = MustGetElement("fxs-frame", this.Root);
		this.closeButton = MustGetElement("fxs-close-button", this.Root);
		this.enableOpenSound = true;
		this.enableCloseSound = true;
		this.Root.setAttribute("data-audio-group-ref", "audio-yields-report");
	}

	onAttach() {
		super.onAttach();

		this.closeButton.addEventListener('action-activate', () => {
			this.close();
		});

		YieldReportData.update();

		const isMobileViewExperience = UI.getViewExperience() == UIViewExperience.Mobile;
		this.collapseToggleButton.addEventListener("action-activate", this.collapseToggleActivatedListener);
		this.collapseToggleButton.setAttribute("data-audio-activate-ref", "data-audio-dropdown-close");
		if (isMobileViewExperience) {
			this.frame.setAttribute("outside-safezone-mode", "full");
			this.frame.removeAttribute("override-styling");
			this.frame.removeAttribute("filigree-class");
			this.frame.removeAttribute("frame-style");
			this.frame.removeAttribute("top-border-style");
			this.closeButton.classList.add("top-14", "right-10");
		}

		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);

		this.buildCityData();
		this.buildOther();
		this.buildUnitData();
		this.buildSummary();
	}

	onDetach() {
		this.collapseToggleButton.removeEventListener("action-activate", this.collapseToggleActivatedListener);
		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		const yieldSlot = MustGetElement(".yield-report-vslot", this.Root);
		FocusManager.setFocus(yieldSlot);

		NavTray.clear();
		NavTray.addOrUpdateGenericBack();
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	private onCollapseToggle(container: HTMLElement, collapsible: HTMLElement) {
		if (container.classList.toggle("hidden")) {
			Audio.playSound("data-audio-dropdown-close", "audio-base");
		}
		else {
			Audio.playSound("data-audio-dropdown-open", "audio-base");
		}
		const collapsibleArrow: HTMLElement = MustGetElement(".img-arrow", collapsible);
		collapsibleArrow.classList.toggle("rotate-90");
		collapsibleArrow.classList.toggle("-rotate-90");

		if (this.allSectionsAreCollapsed()) {
			this.enableExpandAllButton();
		}
		else {
			this.enableCollapseAllButton();
		}
	}

	private enableExpandAllButton() {
		this.collapseToggleText.setAttribute("data-l10n-id", "LOC_UI_QUEUE_FILTER_SHOW_ALL");
		this.collapseToggleButton.setAttribute("data-audio-activate-ref", "data-audio-dropdown-open");
	}

	private enableCollapseAllButton() {
		this.collapseToggleText.setAttribute("data-l10n-id", "LOC_GLOBAL_YIELDS_COLLAPSE_ALL");
		this.collapseToggleButton.setAttribute("data-audio-activate-ref", "data-audio-dropdown-close");
	}

	private buildCityData() {
		const yieldCityData: YieldIncomeRow[] = YieldReportData.yieldCity;

		for (const yieldRow of yieldCityData) {
			this.cityDataContainer.appendChild(this.createStandardRow(yieldRow));
		}
		const collapseButton = MustGetElement(".yield-report__city-collapsible", this.Root);
		collapseButton.addEventListener("action-activate", () => this.onCollapseToggle(this.cityDataContainer, collapseButton));
		collapseButton.setAttribute("data-audio-group-ref", "audio-yields-report");
		collapseButton.setAttribute("data-audio-activate-ref", "none");

	}

	private buildUnitData() {
		const yieldUnitData: YieldIncomeRow[] = YieldReportData.yieldUnits;
		const yieldUnitTitleContainer = document.createElement("div");
		yieldUnitTitleContainer.classList.value = "flex";
		yieldUnitTitleContainer.appendChild(this.createCell({
			content: "LOC_GLOBAL_YIELDS_UNIT_NAME",
			className: `bg-primary-3 w-96 items-center mr-1`,
		}));
		yieldUnitTitleContainer.appendChild(this.createCell({
			content: "LOC_GLOBAL_YIELDS_NUMBER_OF_UNITS",
			className: `bg-primary-3 w-44 items-center justify-center mr-1`,
		}));
		yieldUnitTitleContainer.appendChild(this.createCell({
			content: YieldReportData.netUnitGold,
			className: `bg-primary-3 w-44 items-center justify-center`,
			icon: "YIELD_GOLD"
		}));
		this.unitDataContainer.appendChild(yieldUnitTitleContainer);

		for (const yieldRow of yieldUnitData) {
			const yieldRowContainer = document.createElement("div");
			yieldRowContainer.classList.value = "flex w-full";

			const yieldRowTitle = this.createCell({
				content: yieldRow.rowLabel,
				tabbed: yieldRow.rowLabelTabbed,
				icon: yieldRow.rowIcon,
				className: `bg-primary-5 w-96 items-center justify-left mr-1`,
			});
			yieldRowContainer.appendChild(yieldRowTitle);

			const yieldRowNumUnits = this.createCell({
				content: yieldRow.yieldNumbers[YieldTypes.NO_YIELD],
				className: `bg-primary-5 w-44 items-center justify-center mr-1`,
			});
			yieldRowContainer.appendChild(yieldRowNumUnits);

			const yieldRowNumGold = this.createCell({
				content: yieldRow.yieldNumbers[YieldTypes.YIELD_GOLD],
				className: `bg-primary-5 w-44 items-center justify-center`,
			});
			yieldRowContainer.appendChild(yieldRowNumGold);

			this.unitDataContainer.appendChild(yieldRowContainer);
		}
		const collapseButton = MustGetElement(".yield-report__unit-collapsible", this.Root);
		collapseButton.addEventListener("action-activate", () => this.onCollapseToggle(this.unitDataContainer, collapseButton));
		collapseButton.setAttribute("data-audio-group-ref", "audio-yields-report");
		collapseButton.setAttribute("data-audio-activate-ref", "none");

		const goldFromUnitsElement = MustGetElement(".yield-report__unit-gold-total", this.Root);
		goldFromUnitsElement.innerHTML = this.formatNumber(YieldReportData.netUnitGold);
	}

	private buildSummary() {
		const summaryContainer = MustGetElement(".yield-report__summary", this.Root);
		const yieldSummaryData: YieldIncomeRow[] = YieldReportData.yieldSummary;

		for (const yieldRow of yieldSummaryData) {
			const yieldRowContainer = document.createElement("div");
			yieldRowContainer.classList.value = "flex w-full";

			const bgColorClass: string = yieldRow.isTitle ? "bg-primary-3" : "bg-primary-5";

			const yieldRowTitle = this.createCell({
				content: yieldRow.rowLabel,
				className: `${bgColorClass} yield-report-title-cell items-center justify-end mr-1`,
			});
			yieldRowContainer.appendChild(yieldRowTitle);

			const yieldRowFood = this.createCell({
				content: yieldRow.yieldNumbers[YieldTypes.YIELD_FOOD],
				className: `${bgColorClass} grow items-center justify-center mr-1`,
				icon: yieldRow.isTitle ? "YIELD_FOOD" : ""
			});
			yieldRowContainer.appendChild(yieldRowFood);

			const yieldRowProduction = this.createCell({
				content: yieldRow.yieldNumbers[YieldTypes.YIELD_PRODUCTION],
				className: `${bgColorClass} grow items-center justify-center mr-1`,
				icon: yieldRow.isTitle ? "YIELD_PRODUCTION" : ""
			});
			yieldRowContainer.appendChild(yieldRowProduction);

			const yieldRowGold = this.createCell({
				content: yieldRow.yieldNumbers[YieldTypes.YIELD_GOLD],
				className: `${bgColorClass} grow items-center justify-center mr-1`,
				icon: yieldRow.isTitle ? "YIELD_GOLD" : ""
			});
			yieldRowContainer.appendChild(yieldRowGold);

			const yieldRowScience = this.createCell({
				content: yieldRow.yieldNumbers[YieldTypes.YIELD_SCIENCE],
				className: `${bgColorClass} grow items-center justify-center mr-1`,
				icon: yieldRow.isTitle ? "YIELD_SCIENCE" : ""
			});
			yieldRowContainer.appendChild(yieldRowScience);

			const yieldRowCulture = this.createCell({
				content: yieldRow.yieldNumbers[YieldTypes.YIELD_CULTURE],
				className: `${bgColorClass} grow items-center justify-center mr-1`,
				icon: yieldRow.isTitle ? "YIELD_CULTURE" : ""
			});
			yieldRowContainer.appendChild(yieldRowCulture);

			const yieldRowHappiness = this.createCell({
				content: yieldRow.yieldNumbers[YieldTypes.YIELD_HAPPINESS],
				className: `${bgColorClass} grow items-center justify-center mr-1`,
				icon: yieldRow.isTitle ? "YIELD_HAPPINESS" : ""
			});
			yieldRowContainer.appendChild(yieldRowHappiness);

			const yieldRowInfluence = this.createCell({
				content: yieldRow.yieldNumbers[YieldTypes.YIELD_DIPLOMACY],
				className: `${bgColorClass} grow items-center justify-center`,
				icon: yieldRow.isTitle ? "YIELD_DIPLOMACY" : ""
			});
			yieldRowContainer.appendChild(yieldRowInfluence);

			summaryContainer.appendChild(yieldRowContainer);
		}
		const yieldRowTreasuryContainer = document.createElement("div");
		yieldRowTreasuryContainer.classList.value = "flex w-full";

		yieldRowTreasuryContainer.appendChild(this.createCell({
			content: "LOC_GLOBAL_YIELDS_SUMMARY_SURPLUS",
			className: `bg-primary-5 items-center yield-report-title-cell justify-end mr-1`,
		}));

		yieldRowTreasuryContainer.appendChild(this.createCell({
			content: "",
			className: `bg-primary-5 grow items-center justify-center mr-1`,
		}));
		yieldRowTreasuryContainer.appendChild(this.createCell({
			content: "",
			className: `bg-primary-5 grow items-center justify-center mr-1`,
		}));
		yieldRowTreasuryContainer.appendChild(this.createCell({
			content: YieldReportData.currentGoldBalance,
			noPlus: true,
			className: `bg-primary-5 grow items-center justify-center mr-1`,
		}));
		yieldRowTreasuryContainer.appendChild(this.createCell({
			content: "",
			className: `bg-primary-5 grow items-center justify-center mr-1`,
		}));
		yieldRowTreasuryContainer.appendChild(this.createCell({
			content: "",
			className: `bg-primary-5 grow items-center justify-center mr-1`,
		}));
		yieldRowTreasuryContainer.appendChild(this.createCell({
			content: "",
			className: `bg-primary-5 grow items-center justify-center mr-1`,
		}));
		yieldRowTreasuryContainer.appendChild(this.createCell({
			content: YieldReportData.currentInfluenceBalance,
			noPlus: true,
			className: `bg-primary-5 grow items-center justify-center`,
		}));
		summaryContainer.appendChild(yieldRowTreasuryContainer);
	}

	private buildOther() {
		const yieldOtherData: YieldIncomeRow[] = YieldReportData.yieldOther;
		for (const yieldRow of yieldOtherData) {
			this.otherDataContainer.appendChild(this.createStandardRow(yieldRow));
		}

		const collapseButton = MustGetElement(".yield-report__other-collapsible", this.Root);
		collapseButton.addEventListener("action-activate", () => this.onCollapseToggle(this.otherDataContainer, collapseButton));
		collapseButton.setAttribute("data-audio-group-ref", "audio-yields-report");
		collapseButton.setAttribute("data-audio-activate-ref", "none");
	}

	private createCell(properties: CellProperties): HTMLElement {
		const cell = document.createElement("div");
		cell.classList.value = `${properties.className} h-10 flex relative px-2 py-1`;

		const cellContent = document.createElement("div");
		cellContent.classList.value = "flex items-center absolute grow ml-4 h-full w-full";
		if (properties.tabbed) {
			cellContent.classList.add("pl-4");
		}
		cell.appendChild(cellContent);

		if (properties.icon && properties.icon.length > 0) {
			const cellIcon = document.createElement("fxs-icon");
			cellIcon.setAttribute("data-icon-id", properties.icon);
			cellIcon.setAttribute("data-icon-context", "DEFAULT");
			cellIcon.classList.add("size-8", "mr-1");
			cellContent.appendChild(cellIcon);
		}

		const cellText = document.createElement("div");
		cellText.classList.value = "font-body-base mr-1 flex-auto h-full font-fit-shrink";
		let cellTextContent: string = "";
		if (typeof properties.content === "number") {
			cellTextContent = properties.noPlus ?
				Locale.compose("LOC_UI_YIELD_ONE_DECIMAL_NO_PLUS", properties.content)
				: this.formatNumber(properties.content);
			if (properties.content < 0) {
				cellText.classList.add("text-negative");
			}
			else {
				cellText.classList.add("text-accent-4");
			}
		}
		else if (typeof properties.content === "string") {
			cellText.classList.add("text-accent-4");
			cellTextContent = properties.content;
		}
		else {
			cellText.classList.add("text-accent-4");
			cellTextContent = "0";
		}
		cellText.setAttribute("data-l10n-id", cellTextContent);
		cellContent.appendChild(cellText);

		return cell;
	}

	private createStandardRow(yieldRow: YieldIncomeRow): HTMLElement {
		const yieldRowContainer = document.createElement("div");
		yieldRowContainer.classList.value = "flex w-full";

		const bgColorClass: string = yieldRow.isTitle ? "bg-primary-3" : "bg-primary-5";

		const yieldRowTitle = this.createCell({
			content: yieldRow.rowLabel,
			tabbed: yieldRow.rowLabelTabbed,
			className: `${bgColorClass} yield-report-title-cell items-center justify-left mr-1`,
			icon: yieldRow.rowIcon
		});

		const yieldRowFood = this.createCell({
			content: yieldRow.yieldNumbers[YieldTypes.YIELD_FOOD],
			className: `${bgColorClass} grow items-center justify-center mr-1`,
			icon: yieldRow.isTitle ? "YIELD_FOOD" : ""
		});
		const yieldRowProduction = this.createCell({
			content: yieldRow.yieldNumbers[YieldTypes.YIELD_PRODUCTION],
			className: `${bgColorClass} grow items-center justify-center mr-1`,
			icon: yieldRow.isTitle ? "YIELD_PRODUCTION" : ""
		});
		const yieldRowGold = this.createCell({
			content: yieldRow.yieldNumbers[YieldTypes.YIELD_GOLD],
			className: `${bgColorClass} grow items-center justify-center mr-1`,
			icon: yieldRow.isTitle ? "YIELD_GOLD" : ""
		});
		const yieldRowScience = this.createCell({
			content: yieldRow.yieldNumbers[YieldTypes.YIELD_SCIENCE],
			className: `${bgColorClass} grow items-center justify-center mr-1`,
			icon: yieldRow.isTitle ? "YIELD_SCIENCE" : ""
		});
		const yieldRowCulture = this.createCell({
			content: yieldRow.yieldNumbers[YieldTypes.YIELD_CULTURE],
			className: `${bgColorClass} grow items-center justify-center mr-1`,
			icon: yieldRow.isTitle ? "YIELD_CULTURE" : ""
		});
		const yieldRowHappiness = this.createCell({
			content: yieldRow.yieldNumbers[YieldTypes.YIELD_HAPPINESS],
			className: `${bgColorClass} grow items-center justify-center mr-1`,
			icon: yieldRow.isTitle ? "YIELD_HAPPINESS" : ""
		});
		const yieldRowInfluence = this.createCell({
			content: yieldRow.yieldNumbers[YieldTypes.YIELD_DIPLOMACY],
			className: `${bgColorClass} grow items-center justify-center`,
			icon: yieldRow.isTitle ? "YIELD_DIPLOMACY" : ""
		});

		yieldRowContainer.appendChild(yieldRowTitle);
		yieldRowContainer.appendChild(yieldRowFood);
		yieldRowContainer.appendChild(yieldRowProduction);
		yieldRowContainer.appendChild(yieldRowGold);
		yieldRowContainer.appendChild(yieldRowScience);
		yieldRowContainer.appendChild(yieldRowCulture);
		yieldRowContainer.appendChild(yieldRowHappiness);
		yieldRowContainer.appendChild(yieldRowInfluence);

		return yieldRowContainer;
	}

	private onCollapseToggleActivated() {
		const allSectionsCollapsed: boolean = this.allSectionsAreCollapsed();

		const collapseArrows = MustGetElements(".collapse-arrow", this.Root);

		for (const arrow of collapseArrows) {
			if (allSectionsCollapsed) {
				arrow.classList.replace("-rotate-90", "rotate-90");
			}
			else {
				arrow.classList.replace("rotate-90", "-rotate-90");
			}
		}

		if (allSectionsCollapsed) {
			Audio.playSound("data-audio-dropdown-open");
			this.enableCollapseAllButton();
		}
		else {
			Audio.playSound("data-audio-dropdown-close");
			this.enableExpandAllButton();
		}

		this.cityDataContainer.classList.toggle("hidden", !allSectionsCollapsed);
		this.unitDataContainer.classList.toggle("hidden", !allSectionsCollapsed);
		//this.totalDataContainer.classList.toggle("hidden", !allSectionsCollapsed);
		this.otherDataContainer.classList.toggle("hidden", !allSectionsCollapsed);
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
			super.close();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}

		if (inputEvent.detail.name == "shell-action-1") {
			this.onCollapseToggleActivated();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private formatNumber(num: number | undefined): string {
		if (num === undefined || num === 0) {
			return "0";
		}

		return Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", num);
	}

	private allSectionsAreCollapsed(): boolean {
		return this.cityDataContainer.classList.contains("hidden") &&
			this.otherDataContainer.classList.contains("hidden") &&
			this.unitDataContainer.classList.contains("hidden");
	}
}

Controls.define('player-yields-report-screen', {
	createInstance: PlayerYieldsReportScreen,
	description: 'Breakdown of each of the yields available in game',
	classNames: ['player-yields-report', 'absolute', "flex", "items-center", "justify-center"],
	styles: ['fs://game/base-standard/ui/player-yields-report/player-yields-report-screen.css'],
	content: ['fs://game/base-standard/ui/player-yields-report/player-yields-report-screen.html']
});