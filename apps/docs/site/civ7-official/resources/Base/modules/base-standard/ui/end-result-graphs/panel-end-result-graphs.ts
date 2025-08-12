/**
 * @file panel-end-result-graphs.ts
 * @copyright 2024, Firaxis Games
 * @description Displays graphs with relvant scores and information
 */

import { DropdownItem, DropdownSelectionChangeEvent, DropdownSelectionChangeEventName } from '/core/ui/components/fxs-dropdown.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import Panel from "/core/ui/panel-support.js";

interface ChartOption {
	title: string;
	subtitle: string;
	xAxisLabel: string;
	yAxisLabel: string;
	dataSetID?: string;
	dataPointID?: string;
	ownerTypeFilter: string;
	ownerPlayerFilter?: string;
}

class PanelEndResultGraphs extends Panel {
	private hofChart: HTMLElement | null = null;

	onAttach() {
		super.onAttach();
		this.render();
		this.Root.addEventListener("focus", this.onFocus);
	}

	onDetach(): void {
		this.Root.removeEventListener("focus", this.onFocus);
		super.onDetach()
	}

	private onFocus = () => {
		const firstFocusable = this.Root.querySelector(".graph-container");
		if (firstFocusable) {
			FocusManager.setFocus(firstFocusable);
		}
	}

	private render() {
		while (this.Root.lastChild) {
			this.Root.removeChild(this.Root.lastChild);
		}

		const graphsContent: HTMLElement = document.createElement('fxs-vslot');
		graphsContent.classList.add("flex", "flex-auto");
		graphsContent.setAttribute('tabid', 'screen-endgame__graphs');
		this.buildGraphsContent(graphsContent);
		this.setChartOption(0);
		this.Root.appendChild(graphsContent);
	}

	private getChartOptions(): ChartOption[] {
		const options = [
			{
				title: Locale.compose('LOC_VICTORY_GRAPH_TOTAL_GOLD_NAME'),
				subtitle: Locale.compose('LOC_VICTORY_GRAPH_TOTAL_GOLD_DESCRIPTION'),
				xAxisLabel: Locale.compose('LOC_VICTORY_GRAPH_TURN'),
				yAxisLabel: Locale.compose('LOC_VICTORY_GRAPH_GOLD'),
				dataSetID: 'Gold',
				ownerTypeFilter: 'Player'
			},
			{
				title: Locale.compose('LOC_VICTORY_GRAPH_PLAYER_GOLD_NAME'),
				subtitle: Locale.compose('LOC_VICTORY_GRAPH_PLAYER_GOLD_DESCRIPTION'),
				xAxisLabel: Locale.compose('LOC_VICTORY_GRAPH_TURN'),
				yAxisLabel: Locale.compose('LOC_VICTORY_GRAPH_GOLD'),
				dataSetID: 'Gold',
				ownerTypeFilter: 'City',
				ownerPlayerFilter: 'local-player'
			},
			{
				title: Locale.compose('LOC_VICTORY_GRAPH_TOTAL_SCIENCE_NAME'),
				subtitle: Locale.compose('LOC_VICTORY_GRAPH_TOTAL_SCIENCE_DESCRIPTION'),
				xAxisLabel: Locale.compose('LOC_VICTORY_GRAPH_TURN'),
				yAxisLabel: Locale.compose('LOC_VICTORY_GRAPH_SCIENCE'),
				dataSetID: 'Science',
				ownerTypeFilter: 'Player'
			},
			{
				title: Locale.compose('LOC_VICTORY_GRAPH_CITIES_FOUNDED_NAME'),
				subtitle: Locale.compose('LOC_VICTORY_GRAPH_CITIES_FOUNDED_DESCRIPTION'),
				xAxisLabel: Locale.compose('LOC_VICTORY_GRAPH_TURN'),
				yAxisLabel: Locale.compose('LOC_VICTORY_GRAPH_CITY'),
				dataSetID: 'CitiesFounded',
				ownerTypeFilter: 'Player'
			},
			{
				title: Locale.compose('LOC_VICTORY_GRAPH_WONDERS_CONTRUCTED_NAME'),
				subtitle: Locale.compose('LOC_VICTORY_GRAPH_WONDERS_CONTRUCTED_DESCRIPTION'),
				xAxisLabel: Locale.compose('LOC_VICTORY_GRAPH_TURN'),
				yAxisLabel: Locale.compose('LOC_VICTORY_GRAPH_WONDER'),
				dataSetID: 'WondersConstructed',
				ownerTypeFilter: 'Player'
			},
			{
				title: Locale.compose('LOC_VICTORY_GRAPH_UNITS_TRAINED_NAME'),
				subtitle: '',
				xAxisLabel: Locale.compose('LOC_VICTORY_GRAPH_UNIT'),
				yAxisLabel: Locale.compose('LOC_VICTORY_GRAPH_TRAINED'),
				dataPointID: 'UnitsTrainedByType',
				ownerTypeFilter: 'Player'
			},
			{
				title: Locale.compose('LOC_VICTORY_GRAPH_PLAYER_UNITS_NAME'),
				subtitle: '',
				xAxisLabel: Locale.compose('LOC_VICTORY_GRAPH_UNIT'),
				yAxisLabel: Locale.compose('LOC_VICTORY_GRAPH_TRAINED'),
				dataPointID: 'UnitsTrainedByType',
				ownerTypeFilter: 'Player',
				ownerPlayerFilter: 'local-player'
			}
		];
		return options;
	}

	private setChartOption(index: number) {
		if (!this.hofChart) {
			console.error('screen-endgame: setChartOption(): Failed to find fxs-hof-chart!');
			return;
		}

		const options: ChartOption[] = this.getChartOptions();

		this.hofChart.setAttribute('data-title', options[index].title);
		this.hofChart.setAttribute('data-subtitle', options[index].subtitle);
		this.hofChart.setAttribute('data-label-x-axis', options[index].xAxisLabel);
		this.hofChart.setAttribute('data-label-y-axis', options[index].yAxisLabel);
		this.hofChart.setAttribute('data-dataset-id', options[index].dataSetID ?? '');
		this.hofChart.setAttribute('data-datapoint-id', options[index].dataPointID ?? '');
		this.hofChart.setAttribute('data-filter-owner-type', options[index].ownerTypeFilter);

		const playerFilter: string | undefined = options[index].ownerPlayerFilter;
		if (playerFilter != null) {
			this.hofChart.setAttribute('data-filter-owner-player', playerFilter);
		}
		else {
			this.hofChart.removeAttribute('data-filter-owner-player');
		}
	}

	private buildGraphsContent(victoriesContentWrapper: HTMLElement) {
		// Setup rankings panel
		const chartContent: HTMLElement = document.createElement('fxs-vslot');
		chartContent.classList.add('endgame__panel-rankings');
		chartContent.classList.add("flex", "flex-auto", 'items-center');
		chartContent.setAttribute('tabid', 'endgame__panel-rankings');

		const dropdownContainer = document.createElement('div');
		dropdownContainer.classList.add('graph-dropwdown__container', 'h-13', 'w-full');

		const chartOptions: HTMLElement = document.createElement('fxs-dropdown');
		chartOptions.classList.add('graph-dropdown', 'self-center', 'w-full', 'm-px');
		chartOptions.setAttribute('container-class', 'bg-primary-3');
		chartOptions.setAttribute('action-key', 'inline-shell-action-2');
		const options: ChartOption[] = this.getChartOptions();
		const actionsList: DropdownItem[] = options.map((option: ChartOption) => {
			return { label: option.title };
		});

		chartOptions.setAttribute('dropdown-items', JSON.stringify(actionsList));
		chartOptions.setAttribute('selected-item-index', '0');
		dropdownContainer.appendChild(chartOptions);
		const chartScrollable = document.createElement('fxs-scrollable');
		chartScrollable.setAttribute("handle-gamepad-pan", "true");
		chartScrollable.classList.add('graph-scrollable', 'mb-13');
		this.hofChart = document.createElement('fxs-hof-chart');
		this.hofChart.classList.add('graph-container', 'self-center', 'pointer-events-auto', 'm-4', 'h-3\\/4');
		this.hofChart.setAttribute('tabindex', '-1');
		chartOptions.addEventListener(DropdownSelectionChangeEventName, (event: DropdownSelectionChangeEvent) => {
			const index = event.detail.selectedIndex;
			this.setChartOption(index);
		});
		chartScrollable.appendChild(this.hofChart);
		chartContent.appendChild(dropdownContainer);
		chartContent.appendChild(chartScrollable);
		victoriesContentWrapper.appendChild(chartContent);
	}
}

Controls.define('panel-end-result-graphs', {
	createInstance: PanelEndResultGraphs,
	description: 'Panel which displays graphs with relevant scores for age transition',
	classNames: ['panel-end-result-graphs', 'flex-auto', 'h-auto'],
	styles: ['fs://game/base-standard/ui/end-result-graphs/panel-end-result-graphs.css'],
	tabIndex: -1
});