/**
 * @file fxs-chooser-item.ts
 * @copyright 2024, Firaxis Games
 */
import FxsActivatable from "/core/ui/components/fxs-activatable.js";
/**
 * A chooser item to be used with the tech or civic choosers
 */
export class ChooserItem extends FxsActivatable {
    constructor() {
        super(...arguments);
        this.isSelectHighlight = false;
        this.canFocusOnDisabled = false;
        this._chooserNode = null;
    }
    get chooserNode() {
        return this._chooserNode;
    }
    set chooserNode(value) {
        this._chooserNode = value;
    }
    onInitialize() {
        super.onInitialize();
        this.render();
    }
    render() {
        this.Root.setAttribute('tabindex', "-1");
        if (this.Root.getAttribute("hover-only-trigger") == null) {
            this.Root.setAttribute('hover-only-trigger', "true");
        }
        this.Root.classList.add("chooser-item", "relative", "group", "z-0");
        this.container = document.createElement("div");
        this.container.classList.add("absolute", "hud_sidepanel_list-bg", "inset-0", "pointer-events-none");
        this.selectedBorder = document.createElement("div");
        this.selectedBorder.classList.add("absolute", "size-full", "flex", "img-list-focus-frame", "opacity-0");
        this.highlight = document.createElement("div");
        this.highlight.classList.add("absolute", "inset-0", "group-focus\\:opacity-100", "group-hover\\:opacity-100", "opacity-0", "img-list-focus-frame_highlight");
        this.selectHighlight = document.createElement("div");
        this.selectHighlight.classList.add("absolute", "inset-0", "hidden", "img-list-focus-frame_highlight");
        this.container.appendChild(this.highlight);
        this.container.appendChild(this.selectHighlight);
        this.container.appendChild(this.selectedBorder);
        this.Root.insertAdjacentElement('afterbegin', this.container);
    }
    createChooserIcon(iconStr) {
        const container = document.createElement('div');
        container.classList.value = "chooser-item__icon relative flex self-center items-center justify-center pointer-events-none";
        const image = document.createElement('div');
        image.classList.value = "chooser-item__icon-image relative flex flex-col items-center";
        image.style.setProperty("background-image", `url(${iconStr})`);
        container.appendChild(image);
        const lock_image = document.createElement('div');
        lock_image.classList.value = "chooser-item__icon_gradient absolute inset-0";
        image.appendChild(lock_image);
        if (this.chooserNode?.isLocked) {
            const lock_image = document.createElement('div');
            lock_image.classList.value = "chooser-item__lock-image absolute bg-cover";
            image.appendChild(lock_image);
            image.classList.add("opacity-50");
        }
        return container;
    }
    addLockStyling() {
        if (!this.disabledDiv) {
            this.disabledDiv = document.createElement("div");
            this.disabledDiv.classList.value = "chooser-item_locked-shadow absolute inset-0 pointer-events-none";
            this.Root.appendChild(this.disabledDiv);
            if (this.canFocusOnDisabled && !this.focusOutline) {
                this.focusOutline = document.createElement("div");
                this.focusOutline.classList.add("absolute", "size-full", "flex", "img-list-focus-frame", "pointer-events-none", "group-focus\\:opacity-100", "group-hover\\:opacity-100", "opacity-0");
                this.Root.appendChild(this.focusOutline);
            }
        }
        else {
            this.disabledDiv.classList.remove("hidden");
        }
    }
    removeLockStyling() {
        this.disabledDiv?.classList.add("hidden");
        if (!this.canFocusOnDisabled) {
            this.focusOutline?.classList.add("hidden");
        }
    }
    /**
     * @override
     */
    addOrRemoveNavHelpElement(parent, value) {
        super.addOrRemoveNavHelpElement(parent, value);
        this.navHelp?.classList.add("z-1");
    }
    onAttributeChanged(name, oldValue, newValue) {
        switch (name) {
            case 'disabled':
                if (newValue != oldValue && newValue == 'true') {
                    this.addLockStyling();
                }
                else if (newValue != oldValue && newValue == 'false') {
                    this.removeLockStyling();
                }
                this.highlight.classList.toggle('hidden', newValue == 'true');
                this.selectedBorder.classList.toggle('hidden', newValue == 'true');
                super.onAttributeChanged(name, oldValue, newValue);
                break;
            case 'no-border':
                this.container.classList.toggle('hud_sidepanel_list-bg', newValue != 'true');
                this.container.classList.toggle('hud_sidepanel_list-bg_no-border', newValue == 'true');
                this.highlight.classList.toggle('img-list-focus-frame_highlight', newValue != 'true');
                this.highlight.classList.toggle('img-list-focus-frame_highlight_no-border', newValue == 'true');
                this.selectHighlight.classList.toggle('img-list-focus-frame_highlight', newValue != 'true');
                this.selectHighlight.classList.toggle('img-list-focus-frame_highlight_no-border', newValue == 'true');
                this.selectedBorder.classList.toggle('img-list-focus-frame', newValue != 'true');
                this.selectedBorder.classList.toggle('img-list-focus-frame_no-border', newValue == 'true');
                break;
            case 'selected':
                this.selectedBorder.classList.toggle('opacity-100', newValue == 'true');
                this.selectedBorder.classList.toggle('opacity-0', newValue != 'true');
                if (this.isSelectHighlight) {
                    this.selectHighlight.classList.toggle('hidden', newValue != 'true');
                    this.highlight.classList.toggle('hidden', newValue == 'true');
                }
                break;
            case 'select-highlight':
                this.isSelectHighlight = newValue == 'true';
                break;
            case 'focus-disabled':
                this.canFocusOnDisabled = newValue == 'true';
                break;
            default:
                super.onAttributeChanged(name, oldValue, newValue);
        }
    }
}
Controls.define('chooser-item', {
    createInstance: ChooserItem,
    description: 'A chooser item to be used with the tech or civic choosers',
    styles: ['fs://game/base-standard/ui/chooser-item/chooser-item.css'],
    images: ['fs://game/hud_sidepanel_list-bg.png', 'fs://game/hud_list-focus_frame.png', 'fs://game/hud_turn-timer.png', 'fs://game/hud_civics-icon_frame.png'],
    attributes: [
        { name: 'reveal' },
        { name: 'focus-disabled' },
        { name: 'disabled' },
        { name: 'disabled-cursor-allowed' },
        { name: 'no-border' },
        { name: 'selected' },
        { name: 'select-highlight' },
        { name: 'action-key' },
        { name: 'play-error-sound' }
    ]
});
//# sourceMappingURL=file:///base-standard/ui/chooser-item/chooser-item.js.map
