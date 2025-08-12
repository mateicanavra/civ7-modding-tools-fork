/**
 * @file fxs-progress-bar.ts
 * @copyright 2022, Firaxis Games
 * @description Progress bar component definition.
 */
/** @description Represents a progress towards a goal or number. */
class FxsProgressBar extends Component {
    constructor(root) {
        super(root);
        this.bar = null;
        this.caption = null;
        this.stepIconContainer = null;
        this._stepData = [];
        this.buildProgressBar();
    }
    onAttach() {
        super.onAttach();
        if (this.Root.getAttribute("value") == null) {
            this.Root.setAttribute("value", "0"); // Default value to 0
        }
    }
    /** @description Override to establish a custom look for the progress bar.  */
    buildProgressBar() {
        const frag = document.createDocumentFragment();
        const bg = document.createElement("div");
        bg.classList.value = "progress-bar-background w-full";
        frag.appendChild(bg);
        const border = document.createElement("div");
        border.classList.value = "progress-bar-border w-fullp-px";
        bg.appendChild(border);
        this.bar = document.createElement("div");
        this.bar.classList.value = "progress-bar-tracker flex items-center h-full";
        border.appendChild(this.bar);
        const trackerBorder = document.createElement("div");
        trackerBorder.classList.value = "progress-bar-border w-full h-full";
        this.bar.appendChild(trackerBorder);
        this.stepIconContainer = document.createElement("div");
        this.stepIconContainer.classList.add("step-icon-container");
        border.appendChild(this.stepIconContainer);
        this.caption = document.createElement("div");
        this.caption.classList.add("bar-caption");
        border.appendChild(this.caption);
        this.Root.appendChild(frag);
    }
    set stepData(stepData) {
        this._stepData = stepData;
        this.realizeStepIcons();
    }
    realizeStepIcons() {
        if (this._stepData.length <= 0) {
            return;
        }
        if (!this.stepIconContainer) {
            console.error("fxs-progress-bar: Attempting to realizeStepIcons with no valid stepIconContainer!");
            return;
        }
        while (this.stepIconContainer.hasChildNodes()) {
            this.stepIconContainer.removeChild(this.stepIconContainer.lastChild);
        }
        const currentProgressString = this.Root.getAttribute("value");
        const currentProgress = currentProgressString ? Math.min(Math.max(0, parseFloat(currentProgressString)), 1) : 0;
        this._stepData.forEach(stepData => {
            const stepIconBg = document.createElement("div");
            stepIconBg.setAttribute("tabindex", "-1");
            stepIconBg.classList.value = "step-icon-bg -top-1 size-11";
            // Add special classes to this step
            stepData.classes?.forEach((className) => {
                stepIconBg.classList.add(className);
            });
            stepIconBg.style.setProperty("--step-offset", ((stepData.progressAmount * 100) - 5).toString() + "%");
            // Icon
            const stepIcon = document.createElement("div");
            stepIcon.classList.value = "step-icon size-11 absolute top-0 left-0 bg-center bg-contain bg-no-repeat pointer-events-auto";
            if (stepData == this._stepData[this._stepData.length - 1]) {
                stepIcon.classList.add("final-stage");
            }
            else {
                stepIcon.style.backgroundImage = stepData.icon;
            }
            if (stepData.description) {
                stepIcon.setAttribute("data-tooltip-content", stepData.description);
            }
            stepIconBg.appendChild(stepIcon);
            if (stepData.progressAmount < currentProgress) {
                // Checkmark
                const checkMark = document.createElement('div');
                checkMark.classList.value = 'absolute self-center size-6 progress-bar-check-icon bg-contain bg-center -bottom-7';
                stepIconBg.appendChild(checkMark);
            }
            else {
                // Turn container
                const stepTurnContainer = document.createElement('div');
                stepTurnContainer.classList.value = "absolute flex flex-row self-center justify-center -bottom-7";
                const stepTurnNumber = document.createElement('div');
                stepTurnNumber.classList.value = 'font-body text-sm';
                const turnString = (stepData.progressUntilThisStep && stepData.progressUntilThisStep < 0) ? '--' : `${stepData.progressUntilThisStep}`;
                stepTurnNumber.innerHTML = turnString;
                stepTurnContainer.appendChild(stepTurnNumber);
                const stepTurnIcon = document.createElement('div');
                stepTurnIcon.classList.value = 'ml-2 size-5 bg-contain bg-center step-turn-icon';
                stepTurnContainer.appendChild(stepTurnIcon);
                stepIconBg.appendChild(stepTurnContainer);
            }
            this.stepIconContainer?.appendChild(stepIconBg);
        });
    }
    onAttributeChanged(name, _oldValue, newValue) {
        super.onAttributeChanged(name, _oldValue, newValue);
        switch (name) {
            case "value":
                if (!this.bar) {
                    console.error("fxs-progress-bar: Invalid bar element!");
                    break;
                }
                // Constrain the value to [0-1] and then convert it to a percentage for the width.
                const parsedValue = parseFloat(newValue);
                if (Number.isNaN(parsedValue)) {
                    console.error("fxs-progress-bar: Can't parse value attribute!");
                    break;
                }
                const normalizedValue = Math.min(Math.max(0, parsedValue), 1);
                this.bar.style.width = (normalizedValue * 100).toString() + "%";
                this.realizeStepIcons();
                break;
            case "caption":
                if (this.caption) {
                    this.caption.style.visibility = "visible";
                    this.caption.innerHTML = newValue;
                }
                break;
            case "caption-color":
                if (this.caption) {
                    this.caption.style.color = newValue;
                }
        }
    }
}
Controls.define('fxs-progress-bar', {
    createInstance: FxsProgressBar,
    description: 'A basic progress bar',
    classNames: ['fxs-progress-bar'],
    attributes: [
        {
            name: "value",
            description: "The normalized value of the progress bar."
        },
        {
            name: "caption",
            description: "The text to display over the progress bar."
        },
        {
            name: "caption-color",
            description: "The color of the caption text."
        }
    ],
});
export { FxsProgressBar as default };

//# sourceMappingURL=file:///core/ui/components/fxs-progress-bar.js.map
