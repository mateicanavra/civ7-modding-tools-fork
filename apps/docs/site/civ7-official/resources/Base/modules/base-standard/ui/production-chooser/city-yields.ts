import CityYieldsEngine, { CityYieldData } from '/base-standard/ui/utilities/utilities-city-yields.js'
import { FxsIcon } from '/core/ui/components/fxs-icon.js'
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js'
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js'

export class CityYieldsBar extends Component {
	private cityID: ComponentID | null = null;

	private yieldElements = new Map<string, { text: Node, icon: ComponentRoot<FxsIcon> }>();

	onInitialize() {
		super.onInitialize();

		this.Root.classList.add('flex', 'flex-row', 'items-center', 'text-sm');
		this.cityID = UI.Player.getHeadSelectedCity();
	}

	onAttach(): void {
		this.refresh.call("onAttach");// refresh here so if we're reattaching we're up to date

		this.Root.listenForEngineEvent('CityYieldChanged', this.onCityYieldChanged, this);
		this.Root.listenForEngineEvent('CityPopulationChanged', this.onCityPopulationChanged, this);
		this.Root.listenForEngineEvent('CitySelectionChanged', this.onCitySelectionChanged, this);
		this.Root.listenForEngineEvent('CityGrowthModeChanged', this.onCityGrowthModeChanged, this);
	}

	onDetach(): void {

	}

	private onCityYieldChanged({ cityID }: CityYieldChanged_EventData) {
		if (!ComponentID.isMatch(this.cityID, cityID)) {
			// We only care about events for the selected city
			return;
		}

		this.refresh.call("onCityYieldChanged");
	}

	private onCityPopulationChanged({ cityID }: CityPopulationChanged_EventData) {
		if (!ComponentID.isMatch(this.cityID, cityID)) {
			// We only care about events for the selected city
			return;
		}

		this.refresh.call("onCityPopulationChanged");
	}

	private onCityGrowthModeChanged({ cityID }: CityGrowthModeChanged_EventData) {
		if (!ComponentID.isMatch(this.cityID, cityID)) {
			// We only care about events for the selected city
			return;
		}

		this.refresh.call("onCityGrowthModeChanged");
	}

	private onCitySelectionChanged({ cityID }: CitySelectionChangedData) {
		if (ComponentID.isMatch(this.cityID, cityID)) {
			return;
		}

		this.cityID = cityID;
		this.refresh.call("onCitySelectionChanged");
	}

	private createOrUpdateYieldEntry({ type, valueNum, label }: CityYieldData) {
		if (!type) {
			console.error('city-yields: invalid yield type');
			return;
		}

		const yieldElements = this.yieldElements.get(type);
		const truncValue: string = (valueNum > 100 ? Math.trunc(valueNum) : Math.trunc(valueNum * 10) / 10).toString();

		if (!yieldElements) {
			const icon = document.createElement('fxs-icon');
			icon.classList.add('size-8', 'bg-no-repeat', 'bg-center');
			icon.setAttribute('data-icon-id', type);
			icon.setAttribute('data-icon-context', 'YIELD');

			const text = document.createTextNode(truncValue);

			const container = document.createElement('div');
			container.role = "paragraph"
			container.className = 'min-w-0 w-12 px-1 flex-initial flex flex-col items-center pointer-events-auto';
			container.ariaLabel = `${truncValue} ${label}`;
			container.append(icon, text);
			this.Root.appendChild(container);
			this.yieldElements.set(type, { text, icon });
		} else {
			yieldElements.text.nodeValue = truncValue;
		}
	}

	private refresh = new UpdateGate(() => {
		const cityId = this.cityID;
		if (!cityId || !ComponentID.isValid(cityId)) {
			console.error('city-yields: invalid city id');
			return;
		}

		const yields = CityYieldsEngine.getCityYieldDetails(cityId);
		for (const yieldData of yields) {
			this.createOrUpdateYieldEntry(yieldData);
		}
	});
}

Controls.define('city-yields', {
	createInstance: CityYieldsBar
});