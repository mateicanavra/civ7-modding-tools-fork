import { ChooserItem } from "/base-standard/ui/chooser-item/chooser-item.js";
import { FxsTextboxValidateVirtualKeyboard } from "/core/ui/components/fxs-textbox.js";
import { Layout } from "/core/ui/utilities/utilities-layout.js";
export const ActionConfirmEventName = "action-confirm";
export class ActionConfirmEvent extends CustomEvent {
    constructor() {
        super('action-confirm', { bubbles: true, cancelable: true });
    }
}
var SaveLoadChooserType;
(function (SaveLoadChooserType) {
    SaveLoadChooserType["LOAD"] = "load";
    SaveLoadChooserType["SAVE"] = "save";
})(SaveLoadChooserType || (SaveLoadChooserType = {}));
export class SaveLoadChooserItem extends ChooserItem {
    constructor() {
        super(...arguments);
        this.SMALL_SCREEN_MODE_MAX_HEIGHT = 768;
        this.type = null;
        this.textboxValidateVirtualKeyboardListener = this.onTextboxValidateVirtualKeyboard.bind(this);
        this.textboxValueChangeListener = this.onTextboxValueChange.bind(this);
        this.handleDoubleClick = this.onDoubleClick.bind(this);
        this.handleFocusIn = this.onFocusIn.bind(this);
        this.resizeListener = this.onResize.bind(this);
        this.iconContainer = null;
        this.textbox = null;
        this.leaderIcon = null;
        this.civIcon = null;
        this.header = null;
        this.description1 = null;
        this.description2 = null;
        this.time = null;
        this.hour = null;
    }
    get saveloadChooserNode() {
        return this._chooserNode;
    }
    set saveloadChooserNode(value) {
        this._chooserNode = value;
    }
    onInitialize() {
        super.onInitialize();
    }
    onAttach() {
        super.onAttach();
        window.addEventListener('resize', this.resizeListener);
        this.Root.ondblclick = this.handleDoubleClick;
        this.Root.addEventListener("focusin", this.handleFocusIn);
    }
    onDetach() {
        window.removeEventListener("resize", this.resizeListener);
    }
    render() {
        if (!this.saveloadChooserNode || !this.type) {
            // only render if all parameter are set
            return;
        }
        this.Root.innerHTML = "";
        super.render();
        const content = document.createElement("div");
        content.classList.add("relative", "flow-row", "min-h-24", "p-3\\.5");
        switch (this.type) {
            case SaveLoadChooserType.LOAD:
                if (!this.saveloadChooserNode) {
                    return;
                }
                const { primaryIcon, secondaryIcon, primaryColor, secondaryColor, name, description1, description2, time, hour, } = this.saveloadChooserNode;
                if (primaryIcon && secondaryIcon) {
                    this.iconContainer = document.createElement("div");
                    this.iconContainer.classList.add("flow-row", "items-center");
                    this.civIcon = document.createElement("civ-icon");
                    this.civIcon.setAttribute("icon-url", primaryIcon);
                    this.civIcon.setAttribute("fg-color", primaryColor);
                    this.civIcon.setAttribute("bg-color", secondaryColor);
                    this.iconContainer.appendChild(this.civIcon);
                    this.leaderIcon = document.createElement("leader-icon");
                    this.leaderIcon.classList.add("ml-2", "w-16", "h-16");
                    this.leaderIcon.setAttribute("leader", secondaryIcon);
                    this.leaderIcon.setAttribute("bg-color", secondaryColor);
                    this.iconContainer.appendChild(this.leaderIcon);
                    content.appendChild(this.iconContainer);
                }
                const infoContainer = document.createElement("div");
                infoContainer.classList.add("flex-auto", "flow-row", "items-end", "pt-1");
                content.appendChild(infoContainer);
                const leftContainer = document.createElement("div");
                leftContainer.classList.add("flow-column", "flex-auto", "justify-between", "h-full", "mr-2");
                infoContainer.appendChild(leftContainer);
                this.header = document.createElement("div");
                this.header.classList.add("font-title-xl", "text-gradient-accent-2", "truncate");
                this.header.setAttribute("filigree-style", "none");
                this.header.setAttribute("truncate", "true");
                this.header.setAttribute("data-l10n-id", name);
                leftContainer.appendChild(this.header);
                const metadataContainer = document.createElement("div");
                metadataContainer.classList.add("flow-row-wrap");
                leftContainer.appendChild(metadataContainer);
                this.description1 = document.createElement("div");
                this.description1.classList.add("pr-8", "font-body", "text-sm", "text-accent-4", "flex-auto");
                this.description1.style.maxWidth = `calc(8rem + ${Layout.pixels(235)})`;
                this.description1.innerHTML = description1;
                metadataContainer.appendChild(this.description1);
                this.description2 = document.createElement("div");
                this.description2.classList.add("pr-8", "font-body", "text-sm", "text-accent-4", "save-load-chooser-item-description2");
                this.description2.innerHTML = description2;
                metadataContainer.appendChild(this.description2);
                const rightContainer = document.createElement("div");
                rightContainer.classList.add("flow-row", "h-full", "items-end");
                infoContainer.appendChild(rightContainer);
                const timeContainer = document.createElement("div");
                timeContainer.classList.add("save-load-chooser-item-time-container", "flow-row", "justify-end", "flex-wrap-reverse");
                rightContainer.appendChild(timeContainer);
                this.time = document.createElement("div");
                this.time.classList.add("font-body", "text-sm", "text-accent-4");
                this.time.innerHTML = time;
                timeContainer.appendChild(this.time);
                const timeSeparator = document.createElement("div");
                timeSeparator.classList.add("save-load-chooser-item-time-separator", "font-body", "text-sm", "text-accent-4", "mr-1");
                timeSeparator.innerHTML = ',';
                timeContainer.appendChild(timeSeparator);
                this.hour = document.createElement("div");
                this.hour.classList.add("font-body", "text-sm", "text-accent-4");
                this.hour.innerHTML = hour;
                timeContainer.appendChild(this.hour);
                break;
            case SaveLoadChooserType.SAVE:
                const { initialValue } = this.saveloadChooserNode;
                const container = document.createElement("div");
                container.classList.add("flex", "flow-row", "flex-auto", "items-center", "pl-3", "pr-3");
                const headerContainer = document.createElement("div");
                headerContainer.classList.add("max-w-64");
                const header = document.createElement("fxs-header");
                header.classList.add("mr-5", "text-accent-2", "font-title-xl");
                header.setAttribute("filigree-style", "none");
                header.setAttribute("font-fit-mode", "shrink");
                header.setAttribute("title", "LOC_SAVE_LOAD_NEW_SAVE");
                headerContainer.appendChild(header);
                container.appendChild(headerContainer);
                this.textbox = document.createElement("fxs-textbox");
                this.textbox.classList.add("flex-auto", "text-lg");
                this.textbox.setAttribute("value", initialValue);
                container.appendChild(this.textbox);
                this.textbox.addEventListener("component-value-changed", this.textboxValueChangeListener);
                this.textbox.addEventListener("fxs-textbox-validate-virtual-keyboard", this.textboxValidateVirtualKeyboardListener);
                content.appendChild(container);
                break;
        }
        this.Root.appendChild(content);
        this.updateIconContainer();
    }
    updateData() {
        switch (this.type) {
            case SaveLoadChooserType.LOAD:
                const { primaryIcon, secondaryIcon, primaryColor, secondaryColor, name, description1, description2, time, hour, } = this.saveloadChooserNode;
                this.civIcon?.setAttribute("icon-url", primaryIcon);
                this.civIcon?.setAttribute("fg-color", primaryColor);
                this.civIcon?.setAttribute("bg-color", secondaryColor);
                this.leaderIcon?.setAttribute("icon-url", secondaryIcon);
                this.leaderIcon?.setAttribute("bg-color", secondaryColor);
                this.header.setAttribute("data-l10n-id", name);
                this.description1.innerHTML = description1;
                this.description2.innerHTML = description2;
                this.time.innerHTML = time;
                this.hour.innerHTML = hour;
                break;
            case SaveLoadChooserType.SAVE:
                const { initialValue } = this.saveloadChooserNode;
                this.textbox.setAttribute("value", initialValue);
                break;
        }
    }
    updateIconContainer() {
        this.iconContainer?.classList.toggle("mr-10", window.innerHeight > Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_HEIGHT));
        this.iconContainer?.classList.toggle("mr-5", window.innerHeight <= Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_HEIGHT));
    }
    onAttributeChanged(name, oldValue, newValue) {
        super.onAttributeChanged(name, oldValue, newValue);
        switch (name) {
            case 'node':
                const firstNode = this.saveloadChooserNode == null;
                this.saveloadChooserNode = newValue ? JSON.parse(newValue) : null;
                if (firstNode) {
                    this.render();
                }
                else {
                    this.updateData();
                }
                break;
            case 'type':
                this.type = newValue;
                this.render();
                break;
            case 'disabled':
                if (this.type == SaveLoadChooserType.SAVE) {
                    this.textbox?.setAttribute("enabled", newValue === "false" ? "true" : "false");
                }
                break;
        }
    }
    onTextboxValidateVirtualKeyboard({ detail: { value } }) {
        this.Root.dispatchEvent(new FxsTextboxValidateVirtualKeyboard({ value }));
    }
    onTextboxValueChange({ detail: { value } }) {
        this.Root.setAttribute("value", value);
    }
    onFocusIn(_event) {
        this.Root.dispatchEvent(new FocusEvent("focus"));
    }
    onDoubleClick() {
        if (this.Root.getAttribute("disabled") != "true") {
            this.Root.dispatchEvent(new ActionConfirmEvent());
        }
    }
    onResize() {
        this.updateIconContainer();
    }
}
Controls.define('save-load-chooser-item', {
    createInstance: SaveLoadChooserItem,
    description: 'A chooser item to be used with the save-load screen',
    classNames: ['save-load-chooser-item', "chooser-item_unlocked", "grow", "relative", "group"],
    styles: [
        'fs://game/base-standard/ui/chooser-item/chooser-item.css',
        'fs://game/core/ui/save-load/save-load-chooser-item.css'
    ],
    attributes: [{ name: 'node' }, { name: 'type' }, { name: "value" }, { name: "disabled" }, { name: "selected" }, { name: "no-border" }, { name: 'select-highlight' }]
});

//# sourceMappingURL=file:///core/ui/save-load/save-load-chooser-item.js.map
