/**
 * archeology-tooltip.ts
 * @copyright 2024, Firaxis Gmaes
 * @description The tooltip for showing the status of archeology at a location.
 */

import ActionHandler from '/core/ui/input/action-handler.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
import TooltipManager, { PlotTooltipPriority, TooltipType } from '/core/ui/tooltips/tooltip-manager.js';

class ArcheologyTooltipType implements TooltipType<HTMLElement | PlotCoord> {
	private hoveredX = -1;
	private hoveredY = -1;
	private shownByPlot = false;

	private constructibleInfo?: ConstructibleDefinition;
	private isNaturalWonder = false;

	private titleText: string = "";
	private descriptionText: string = "";

	private readonly tooltip = document.createElement('fxs-tooltip')
	private readonly titleRow = document.createElement('div');
	private readonly descriptionColumn = document.createElement('div');

	constructor() {
		const container = document.createElement('div');
		container.classList.value = 'flex flex-col text-accent-2 max-w-96';
		this.tooltip.appendChild(container);
		this.titleRow.classList.value = 'flex flex-row justify-left text-sm font-bold tooltip-title';
		container.appendChild(this.titleRow);
		this.descriptionColumn.classList.value = 'flex flex-col justify-around text-sm';
		container.appendChild(this.descriptionColumn);
	}

	getHTML() {
		return this.tooltip;
	}

	reset(): void {
		this.titleRow.innerHTML = '';
		this.descriptionColumn.innerHTML = '';
	}

	private getCoordsFromTarget(target: HTMLElement | PlotCoord) {
		if (target instanceof HTMLElement) {
			const xAttr = target.getAttribute('x');
			const yAttr = target.getAttribute('y');
			if (xAttr !== null && yAttr !== null) {
				return {
					x: parseInt(xAttr),
					y: parseInt(yAttr)
				};
			} else {
				return { x: -1, y: -1 };
			}
		} else {
			return target;
		}
	}

	private getInfoFromConstructible(construct: ComponentID): ConstructibleDefinition | undefined {
		let info: ConstructibleDefinition | undefined = undefined;
		const instance = Constructibles.getByComponentID(construct);
		if (instance) {
			info = GameInfo.Constructibles.lookup(instance.type) || undefined;
		}
		return info;
	}

	isUpdateNeeded(target: HTMLElement | PlotCoord): boolean {
		
		this.shownByPlot = !(target instanceof HTMLElement);
		const { x, y } = this.getCoordsFromTarget(target);
		if (x != this.hoveredX || y != this.hoveredY) {
			this.constructibleInfo = undefined;
			this.isNaturalWonder = false;
			this.hoveredX = x;
			this.hoveredY = y;
			const constructibles = MapConstructibles.getConstructibles(this.hoveredX, this.hoveredY);
			const filteredConstructibles = constructibles.filter(construct => ["IMPROVEMENT_RUINS", "BUILDING_MUSEUM", "BUILDING_UNIVERSITY"].includes(this.getInfoFromConstructible(construct)?.ConstructibleType ?? ""))
			filteredConstructibles.forEach(construct => {
				this.constructibleInfo = this.getInfoFromConstructible(construct);
			})
			this.isNaturalWonder = GameplayMap.isNaturalWonder(this.hoveredX, this.hoveredY);
			return true;
		}

		return false;
	}

	update(): void {
		if (!this.constructibleInfo) {
			return;
		}

		this.setTipText();

		let titleElement = document.createElement('span');
		titleElement.setAttribute('data-l10n-id', this.titleText);
		this.titleRow.appendChild(titleElement);

		if (this.descriptionText) {
			let descriptionElement = document.createElement('span');
			descriptionElement.setAttribute('data-l10n-id', this.descriptionText);
			this.descriptionColumn.appendChild(descriptionElement);
		}
	}

	isBlank(): boolean {
		return (!this.constructibleInfo && !this.isNaturalWonder)
			|| (this.shownByPlot && !ActionHandler.isGamepadActive) 
			|| LensManager.getActiveLens() !== "fxs-continent-lens"
	}

	private setTipText() {
		const research = Players.get(GameContext.localPlayerID)?.Culture?.getContinentResearchStatus(GameplayMap.getContinentType(this.hoveredX, this.hoveredY));
		this.descriptionText = research ? research : "";

		if (this.constructibleInfo?.ConstructibleType == "IMPROVEMENT_RUINS") {
			this.titleText = "LOC_PLOT_TOOLTIP_EXCAVATE_TITLE";
			this.descriptionText = "LOC_PLOT_TOOLTIP_EXCAVATE_RUINS_DESCRIPTION";
		}
		else if (this.isNaturalWonder)
		{
			this.titleText = "LOC_PLOT_TOOLTIP_STUDY_NATURAL_WONDER";
			this.descriptionText = "LOC_PLOT_TOOLTIP_NATURAL_WONDER_RESEARCH_DESCRIPTION";
		}
		else {
			const research = Players.get(GameContext.localPlayerID)?.Culture?.getContinentResearchStatus(GameplayMap.getContinentType(this.hoveredX, this.hoveredY));
			if (this.constructibleInfo?.ConstructibleType == "BUILDING_MUSEUM") {
				this.titleText = "LOC_PLOT_TOOLTIP_RESEARCH_TITLE";
				this.descriptionText = research ?? "";
			}
			else if (this.constructibleInfo?.ConstructibleType == "BUILDING_UNIVERSITY") {
				this.titleText = "LOC_PLOT_TOOLTIP_RESEARCH_TITLE";
				this.descriptionText = research ?? "";
			}
		} 
		
	}
}

const instance = new ArcheologyTooltipType();
TooltipManager.registerType('archeology', instance)
TooltipManager.registerPlotType('archeology', PlotTooltipPriority.HIGH, instance)