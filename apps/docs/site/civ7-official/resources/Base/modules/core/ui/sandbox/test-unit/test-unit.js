class TestScroll extends Component {
    constructor(root) {
        super(root);
    }
    onAttach() {
        super.onAttach();
        console.error(`${24 % 18}`);
        const sliderData = {
            id: 'Test UI Scale (0.5 - 2.0)',
            currentValue: '1',
            min: '0.5',
            max: '2',
            steps: '18',
        };
        const slider = this.createSlider(sliderData);
        waitUntilValue(() => { return this.Root.querySelector('.test-scroll-control-container'); }).then(() => {
            const component = this.Root.querySelector('.test-scroll-control-container');
            if (component) {
                component.appendChild(slider);
            }
        });
    }
    createSlider(data) {
        let sliderContainer = document.createElement('div');
        sliderContainer.classList.add('slider');
        let sliderLabel = document.createElement('span');
        sliderLabel.classList.add('slider__label');
        sliderLabel.innerHTML = data.id;
        let sliderValue = document.createElement('span');
        sliderValue.classList.add('slider__value');
        sliderValue.innerHTML = data.currentValue;
        let slider = document.createElement("fxs-slider");
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
        const componentRoot = slider;
        waitUntilValue(() => { return componentRoot.component; }).then(() => {
            const component = componentRoot.component;
            if (component) {
                component.Root.addEventListener("component-value-changed", () => {
                    const value = component.value;
                    sliderValue.innerHTML = `${value}`;
                    this.updateValue(component.Root, data.id, value);
                });
                component.setValueChangeListener(componentRoot);
            }
        });
        return sliderContainer;
    }
    updateValue(slider, id, value) {
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

//# sourceMappingURL=file:///core/ui/sandbox/test-unit/test-unit.js.map
