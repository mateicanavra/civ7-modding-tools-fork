/**
 * @file attribute-small-card.ts
 * @copyright 2024, Firaxis Games
 * @description This component is a small version for the nodes on the attributes tree
 */
import FxsActivatable from "/core/ui/components/fxs-activatable.js";
// TODO: Ask design if a new version for the attribute tree nodes is on plans after the last tech/civics tree skinning update 
export class AttributeSmallCard extends FxsActivatable {
    constructor() {
        super(...arguments);
        this.imagePath = 'fs://game/radial_tech.png';
        this.iconContent = true;
    }
    get repeatable() {
        return this.Root.getAttribute("repeatable") == "true";
    }
    get completed() {
        return this.Root.getAttribute("completed") == "true";
    }
    get disabled() {
        return this.Root.getAttribute("disabled") == "true";
    }
    onInitialize() {
        super.onInitialize();
        this.render();
    }
    render() {
        if (this.Root.getAttribute("hover-only-trigger") == null) {
            this.Root.setAttribute('hover-only-trigger', "true");
        }
        this.Root.classList.add("attribute-small-card", "relative", "group");
        this.container = document.createElement("div");
        this.container.classList.add("absolute", "inset-0", "pointer-events-none");
        this.idle = document.createElement("div");
        this.idle.classList.add("absolute", "img-sub-circle", "inset-0", "pointer-events-none");
        this.highlight = document.createElement("div");
        this.highlight.classList.add("absolute", "inset-0", "group-focus\\:opacity-100", "group-hover\\:opacity-100", "opacity-0", "img-circle-selected");
        this.disabledDiv = document.createElement("div");
        this.disabledDiv.classList.add("absolute", "inset-0", "img-sub-circle-disabled");
        this.container.appendChild(this.idle);
        this.container.appendChild(this.disabledDiv);
        this.container.appendChild(this.highlight);
        this.Root.insertAdjacentElement('afterbegin', this.container);
        if (this.iconContent) {
            this.icon = document.createElement('div');
            this.icon.classList.add("absolute", "inset-0", "bg-contain", "bg-center", "bg-no-repeat", "m-6", "pointer-events-none");
            this.icon.style.backgroundImage = `url(${this.imagePath})`;
        }
        this.Root.appendChild(this.icon);
    }
    addLockStyling() {
        this.Root.style.filter = "grayscale(0.5)";
        this.Root.classList.add("opacity-40");
        this.idle.classList.add("hidden");
        this.disabledDiv?.classList.remove("hidden");
    }
    removeLockStyling() {
        this.Root.style.filter = "none";
        this.Root.classList.remove("opacity-40");
        this.idle.classList.remove("hidden");
        this.disabledDiv?.classList.add("hidden");
    }
    onAttributeChanged(name, oldValue, newValue) {
        switch (name) {
            case 'icon-content':
                this.iconContent = newValue == "true";
                break;
            case 'image-path':
                if (newValue != oldValue && newValue != null) {
                    this.imagePath = this.completed ? 'fs://game/check.png' : this.repeatable ? 'fs://game/renew.png' : newValue;
                    this.icon.style.backgroundImage = `url(${this.imagePath})`;
                }
                break;
            case 'completed':
                if (this.completed) {
                    this.imagePath = 'fs://game/check.png';
                    this.icon.style.backgroundImage = `url(${this.imagePath})`;
                }
                else {
                    this.icon.style.backgroundImage = `url(${this.imagePath})`;
                }
                break;
            case 'repeatable':
                if (this.repeatable) {
                    this.imagePath = 'fs://game/renew.png';
                    this.icon.style.backgroundImage = `url(${this.imagePath})`;
                }
                else {
                    this.icon.style.backgroundImage = `url(${this.imagePath})`;
                }
                break;
            case 'disabled':
                if (this.disabled) {
                    this.addLockStyling();
                }
                else {
                    this.removeLockStyling();
                }
                super.onAttributeChanged(name, oldValue, newValue);
                break;
            default:
                super.onAttributeChanged(name, oldValue, newValue);
        }
    }
}
Controls.define('attribute-small-card', {
    createInstance: AttributeSmallCard,
    description: 'A item to be used with the attribute card',
    attributes: [
        { name: 'icon-content' },
        { name: 'image-path' },
        { name: 'completed' },
        { name: 'repeatable' },
        { name: 'focus-disabled' },
        { name: 'disabled' },
        { name: 'disabled-cursor-allowed' },
    ]
});

//# sourceMappingURL=file:///base-standard/ui/attribute-trees/attribute-small-card.js.map
