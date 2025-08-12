/// <reference path="../themes/default/global-scaling.ts" />
/**
 * @file fxs-hof-chart.ts
 * @copyright 2021-2022, Firaxis Games
 * @description Icon Primitive
 */

// Chart-JS lacks proper declarations at the moment.  
// @ts-nocheck

import { ComponentID } from '/core/ui/utilities/utilities-component-id.js'
import { Layout } from '/core/ui/utilities/utilities-layout.js';

// Statically set defaults for the chart-js component.
if (typeof Chart != 'undefined') {
	Chart.defaults.maintainAspectRatio = false;
	Chart.defaults.font.size = Layout.textSizeToScreenPixels('lg');
	Chart.defaults.font.family = BODY_FONTS.join(', ');
	Chart.defaults.color = '#E5E5E5';
}

interface ChartOptions {
	title?: string;
	subTitle?: string;
	dataSetID?: string;
	dataPointID?: string;
	ownerTypeFilter?: string;
	ownerPlayerFilter?: PlayerId;
	componentIDFilter?: ComponentID;
	xAxisLabel?: string;
	yAxisLabel?: string;
	hideLegend?: boolean;
	chartHint?: string;
}

class FxsHofChart extends Component {
	private refreshId: number;
	private canvas: HTMLCanvasElement;
	private chartData: any;

	constructor(root: ComponentRoot) {
		super(root);
		this.refreshId = 0;
		this.canvas = document.createElement('canvas');
		this.Root.appendChild(this.canvas);
	}

	onAttach() {
		super.onAttach();

		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				this.refreshChart();
			});
		});
	}

	onDetach() {
		if (this.refreshId != 0) {
			cancelAnimationFrame(this.refreshId);
			this.refreshId = 0;
		}

		if (this.chartData) {
			this.chartData.destroy();
		}

		super.onDetach();
	}

	onAttributeChanged(_name: string, _oldValue: string, _newValue: string) {
		// Since icon data can depend on multiple fields, rather than refresh 3 times, queue a refresh for the following frame.
		if (this.refreshId == 0) {
			this.refreshId = requestAnimationFrame(() => {
				this.refreshId = 0;
				this.refreshChart();
			})
		}
	}

	private getBoolAttribute(name: string): boolean | undefined {
		const attrValue = this.Root.getAttribute(name);
		if (attrValue != null) {
			if (attrValue == '1' || attrValue == 'true') {
				return true;
			}
			else {
				return false;
			}
		}

		return undefined;
	}

	private getPlayerIDAttribute(name: string): PlayerId | undefined {
		const attrValue = this.Root.getAttribute(name);
		if (attrValue) {
			if (attrValue == 'local-player') {
				return GameContext.localPlayerID;
			}
			else {
				const id = parseInt(attrValue);
				if (!isNaN(id)) {
					return id;
				}
			}
		}

		return undefined;
	}

	private getComponentIDAttribute(name: string): ComponentID | undefined {
		const attrValue = this.Root.getAttribute(name);
		if (attrValue) {
			return ComponentID.fromString(attrValue);
		}
		else {
			return undefined;
		}
	}

	private refreshChart() {
		if (typeof Chart != 'undefined') {
			Chart.defaults.font.size = Layout.textSizeToScreenPixels("lg");
		}

		const options: ChartOptions = {
			dataSetID: this.Root.getAttribute('data-dataset-id') ?? '',
			dataPointID: this.Root.getAttribute('data-datapoint-id') ?? '',
			title: this.Root.getAttribute('data-title') ?? '',
			subTitle: this.Root.getAttribute('data-subtitle') ?? '',
			xAxisLabel: this.Root.getAttribute('data-label-x-axis') ?? '',
			yAxisLabel: this.Root.getAttribute('data-label-y-axis') ?? '',
			ownerTypeFilter: this.Root.getAttribute('data-filter-owner-type') ?? '',
			ownerPlayerFilter: this.getPlayerIDAttribute('data-filter-owner-player'),
			componentIDFilter: this.getComponentIDAttribute('data-filter-component-ID'),
			chartHint: this.Root.getAttribute('data-chart-hint') ?? '',
			hideLegend: this.getBoolAttribute('data-hide-legend'),
		}

		const config = this.createChartData(options);
		if (config) {

			if (this.chartData != null) {
				this.chartData.destroy();
				this.chartData = null;
			}

			const ctx = this.canvas.getContext('2d');
			if (ctx) {
				this.chartData = new Chart(ctx, config);
			}
		}
	}

	private getObjectName(object: GameCore.GameSummary.Object) {
		if (object.name) {
			return Locale.compose(object.name);
		}
		else {
			// Try and derive the object name.
			if (object.type == 'Player') {
				const player = Players.get(object.ownerPlayer);
				if (player) {
					return Locale.compose(player.leaderName);
				}
				else {
					// TODO - Localize this fragment.
					return `Player ${object.ownerPlayer}`;
				}
			}
			else if (object.type == 'City') {
				const city = Cities.get(object.componentID);
				if (city) {
					return Locale.compose(city.name);
				}
				else {
					return `City ${JSON.stringify(object.componentID)}`;
				}
			}
		}

		return 'Unknown';
	}

	private getRandomColor() {
		var letters = '0123456789ABCDEF';
		var color = '#';
		for (var i = 0; i < 6; i++) {
			color += letters[Math.floor(Math.random() * 16)];
		}
		return color;
	}

	private getObjectColors(object: GameCore.GameSummary.Object): string[] {
		if (object.type == "Player") {
			return [
				UI.Player.getPrimaryColorValueAsString(object.ownerPlayer),
			];
		}
		else {
			return [
				this.getRandomColor()
			];
		}
	}

	private determineChartType(options: ChartOptions, datasetCount: number) {
		if (options.dataSetID) {
			return 'line';
		}
		else {
			if (datasetCount == 1) {
				if (options.chartHint == 'doughnut') {
					return 'doughnut';
				}
				else {
					return 'pie';
				}
			}
			else {
				return 'bar';
			}
		}
	}

	private createChartData(options: ChartOptions) {
		const localPlayerID = GameContext.localPlayerID;
		const localPlayer = Players.get(localPlayerID);
		if (!localPlayer) {
			console.error("victory-manager: Unable to get local player!");
			return;
		}
		const localPlayerDiplomacy = localPlayer.Diplomacy;
		if (localPlayerDiplomacy === undefined) {
			console.error("victory-manager: Unable to get local player diplomacy!");
			return;
		}
		const chartDatasets: any[] = [];

		// Preferably filter on the native side.

		const objects = Game.Summary.getObjects();
		const objectMap = new Map<number, GameCore.GameSummary.Object>();
		objects.forEach(o => {
			objectMap.set(o.ID, o);
		});

		let labels: string[] = [];

		if (options.dataSetID) {
			const dataSets = Game.Summary.getDataSets();
			dataSets.forEach((ds) => {
				if (ds.ID != options.dataSetID) {
					return;
				}

				let ownerObject = (ds.owner) ? objectMap.get(ds.owner) : null;
				if (options.ownerTypeFilter != null || options.ownerPlayerFilter != null) {
					if (!ownerObject) {
						return;
					}

					if (options.ownerTypeFilter != null && ownerObject.type != options.ownerTypeFilter) {
						return;
					}

					if (options.ownerPlayerFilter != null && ownerObject.ownerPlayer != options.ownerPlayerFilter) {
						return;
					}
				}
				// show only data of players that have been met by local player
				if (ownerObject.ownerPlayer && (!localPlayerDiplomacy.hasMet(ownerObject.ownerPlayer) || localPlayerID == ownerObject.ownerPlayer)) {
					return;
				}
				let name = '';
				let colors = [
					'black',
					'grey'
				];

				if (ownerObject) {
					name = this.getObjectName(ownerObject);
					colors = this.getObjectColors(ownerObject);
				}


				chartDatasets.push({
					label: name,
					parsing: false,
					data: ds.values,
					backgroundColor: colors[0],
					borderColor: colors[0],
					pointRadius: 0,
				})
			});
		}
		else if (options.dataPointID) {
			let dataPoints = Game.Summary.getDataPoints();
			dataPoints = dataPoints.filter((dp) => {
				if (dp.ID != options.dataPointID) {
					return false;
				}

				let ownerObject = (dp.owner) ? objectMap.get(dp.owner) : null;

				if (options.ownerTypeFilter != null || options.ownerPlayerFilter != null) {
					if (!ownerObject) {
						return false;
					}

					if (options.ownerTypeFilter != null && ownerObject.type != options.ownerTypeFilter) {
						return false;
					}

					if (options.ownerPlayerFilter != null && ownerObject.ownerPlayer != options.ownerPlayerFilter) {
						return false;
					}
					// show only data of players that have been met by local player
					if (ownerObject.ownerPlayer && (!localPlayerDiplomacy.hasMet(ownerObject.ownerPlayer) || localPlayerID == ownerObject.ownerPlayer)) {
						return false; ``
					}
				}

				return true;
			});

			const labelIndex: string[] = [];
			const valuesByOwner = new Map<number, { x: number, y: number }[]>();

			dataPoints.forEach((dp) => {
				// Not sure how we can chart the data points that use string/object values so ignore them for now.
				if (dp.value.numeric != null) {
					if (dp.type) {
						// Partition by Type.
						let values = valuesByOwner.get(dp.owner ?? -1);
						if (values == null) {
							values = [];
							valuesByOwner.set(dp.owner ?? -1, values);
						}

						let index = labelIndex.findIndex(t => t == dp.type);
						if (index == -1) {
							const unitName = GameInfo.Units.lookup(dp.type)?.Name;
							labelIndex.push(dp.type);
							labels.push(Locale.compose(unitName));
							index = labelIndex.length - 1;
						}
						values.push({ x: index, y: dp.value.numeric ?? 0 });
					}
					else {
						// Partition by player??.
					}
				}
			});

			valuesByOwner.forEach((values, ownerID) => {
				let name = '';
				let colors = [
					'black',
					'grey'
				];
				const ownerObject = objectMap.get(ownerID);
				if (ownerObject) {
					name = this.getObjectName(ownerObject);
					colors = this.getObjectColors(ownerObject);
				}

				if (valuesByOwner.size == 1) {
					colors = [];
					for (let i = 0; i < values.length; ++i) {
						colors.push(this.getRandomColor());
					}
				}

				chartDatasets.push({
					label: name,
					parsing: false,
					data: (valuesByOwner.size == 1) ? values.map(v => v.y) : values,
					backgroundColor: (valuesByOwner.size == 1) ? colors : colors[0],
					borderColor: (valuesByOwner.size == 1) ? colors : colors[0],
				})
			})


		}

		const chartType = this.determineChartType(options, chartDatasets.length);
		let scales = {};
		if (chartType == 'line') {
			scales = {
				y: {
					grid: {
						color: '#85878C'
					},
					type: 'linear',
					title: {
						display: (options.yAxisLabel != null),
						text: options.yAxisLabel ?? '',
					}
				},
				x: {
					grid: {
						color: '#85878C'
					},
					type: 'linear',
					title: {
						display: (options.xAxisLabel != null),
						text: options.xAxisLabel ?? '',
					}
				}
			}
		}
		else if (chartType == 'bar') {
			scales = {
				y: {
					type: 'linear',
					title: {
						display: (options.yAxisLabel != null),
						text: options.yAxisLabel ?? ''
					}
				},
				x: {
					type: 'category',
					title: {
						display: (options.xAxisLabel != null),
						text: options.xAxisLabel ?? ''
					}
				}
			}
		}
		else if (chartType == 'pie' || chartType == 'doughnut') {

		}

		const config: any = {
			type: chartType,
			data: {
				labels: (labels.length > 0) ? labels : undefined,
				datasets: chartDatasets,
			},
			options: {
				scales: scales,
				plugins: {
					legend: {
						display: !options.hideLegend
					},
					title: {
						display: (options.title != null),
						text: options.title,
					},
					subtitle: {
						display: (options.subTitle != null),
						text: options.subTitle,
					}
				}
			}
		};
		return config;
	}
}

Controls.define('fxs-hof-chart', {
	createInstance: FxsHofChart,
	description: 'An chart-js component for visualizing GameSummary/HoF data.',
	classNames: [],
	attributes: [
		{
			name: "data-title",
			description: "The title of the chart."
		},
		{
			name: "data-subtitle",
			description: "The title of the chart."
		},
		{
			name: "data-dataset-id",
			description: "The dataset ID to use. Results in line charts.  Mutually exclusive with 'data-datapoint-id'."
		},
		{
			name: "data-datapoint-id",
			description: "The datapoint ID to use. Results in bar or pie charts.  Mutually exclusive with 'data-dataset-id'."
		},
		{
			name: "data-label-x-axis",
			description: "The optional label for the x-axis when used in line graphs.  This is typically the game turn."
		},
		{
			name: "data-label-y-axis",
			description: "The optional label for the y-axis when used in line grahs and bar charts."
		},
		{
			name: "data-filter-owner-type",
			description: "Only grab datasets or datapoints in which the owner object is of a certain type."
		},
		{
			name: "data-filter-owner-player",
			description: "Only grab datasets or datapoints in which the owner player is set.  Use 'local-player' to denote the local player."
		},
		{
			name: "data-filter-component-ID",
			description: "Only grab datasets or datapoints in which the owner object component ID matches the one supplied."
		},
		{
			name: "data-chart-hint",
			description: "Suggest a certain type of chart.  This is primarily used to decide between pie or doughnuts. I prefer cake."
		},
		{
			name: "data-hide-legend",
			description: "Optional boolean to hide the legend."
		},
	]
});

export { FxsHofChart as default }