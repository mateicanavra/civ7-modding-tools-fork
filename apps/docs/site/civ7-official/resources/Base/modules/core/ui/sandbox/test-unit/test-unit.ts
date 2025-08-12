// @ts-nocheck
import { FxsSlider } from '/core/ui/components/fxs-slider.js'

interface TestScrollSlider {
	id: string;
	currentValue: string;
	min: string;
	max: string;
	steps: string;
	callback?: Function;
}

class TestScroll extends Component {

	constructor(root: ComponentRoot) {
		super(root);
	}

	onAttach() {
		super.onAttach();

		console.error(`${24 % 18}`);

		const sliderData: TestScrollSlider = {
			id: 'Test UI Scale (0.5 - 2.0)',
			currentValue: '1',
			min: '0.5',
			max: '2',
			steps: '18',
		}
		const slider: HTMLElement = this.createSlider(sliderData);
		waitUntilValue(() => { return this.Root.querySelector('.test-scroll-control-container'); }).then(() => {
			const component: HTMLElement | null = this.Root.querySelector('.test-scroll-control-container');
			if (component) {
				component.appendChild(slider);
			}
		})
	}

	createSlider(data: TestScrollSlider): HTMLElement {
		let sliderContainer: HTMLElement = document.createElement('div');
		sliderContainer.classList.add('slider');
		let sliderLabel: HTMLElement = document.createElement('span');
		sliderLabel.classList.add('slider__label');
		sliderLabel.innerHTML = data.id;
		let sliderValue: HTMLElement = document.createElement('span');
		sliderValue.classList.add('slider__value');
		sliderValue.innerHTML = data.currentValue;
		let slider: HTMLElement = document.createElement("fxs-slider");
		slider.setAttribute("optionID", `${data.id}`);
		slider.setAttribute("value", `${data.currentValue ?? 0}`);
		slider.setAttribute("min", `${data.min ?? 0}`);
		slider.setAttribute("max", `${data.max ?? 1}`);
		slider.setAttribute("steps", `${data.steps ?? 0}`);

		let prop = data.id.split('_');
		if (prop[1] == "hue") {
			let colorContainer = document.createElement('div');
			colorContainer.classList.add('slider');
			colorContainer.id = `${prop[0]}-color-container`;
		}

		sliderContainer.appendChild(sliderLabel);
		sliderContainer.appendChild(slider);
		sliderContainer.appendChild(sliderValue);

		const componentRoot: ComponentRoot = (slider as ComponentRoot);

		waitUntilValue(() => { return componentRoot.component; }).then(() => {
			const component: FxsSlider | null = (componentRoot.component as FxsSlider);
			if (component) {
				component.Root.addEventListener("component-value-changed", () => {
					const value: number = component.value;
					sliderValue.innerHTML = `${value}`;
					this.updateValue(component.Root, data.id, value);
				})
				component.setValueChangeListener(componentRoot);
			}
		})
		return sliderContainer;
	}

	updateValue(slider: HTMLElement, id: string, value: number) {

		this.Root.style.setProperty('--local-ui-scale', `${value}`);
	}
}

export { TestScroll as default };

Controls.define('test-scroll', {
	createInstance: TestScroll,
	description: '[TEST] Cascading color scheme.',
	classNames: ['test-scroll'],
	styles: ["fs://game/core/ui/sandbox/test-scroll/test-scroll.css"],
	attributes: []
});