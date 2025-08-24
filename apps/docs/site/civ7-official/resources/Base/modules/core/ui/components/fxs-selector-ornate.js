/**
 * @file fxs-selector-ornate.ts
 * @copyright 2024, Firaxis Games
 * @description A UI selector control primitive for selecting an option from a list of options using a gamepad.
 * Used as a drop-in replacement for the dropdown component.  Enhanced to support a background image.
 */
import FxsActivatable from '/core/ui/components/fxs-activatable.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { DropdownSelectionChangeEvent, DropdownSelectionChangeEventName } from '/core/ui/components/fxs-dropdown.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
export class FxsSelectorOrnate extends FxsActivatable {
    get selectedIndex() {
        return parseInt(this.Root.getAttribute("selected-item-index") ?? "-1");
    }
    set selectedIndex(index) {
        this.Root.setAttribute("selected-item-index", index.toString());
    }
    get isNoSelection() {
        return this.selectedIndex == -1;
    }
    get directEdit() {
        // Default value is true if unset
        return (this.Root.getAttribute("direct-edit") ?? "true") === "true";
    }
    ;
    set directEdit(value) {
        this.Root.setAttribute("direct-edit", value.toString());
    }
    ;
    get defaultImage() {
        return this.Root.getAttribute("default-image");
    }
    get label() {
        return this.Root.getAttribute("label") ?? "";
    }
    get enableShellNavControls() {
        return this.Root.getAttribute("enable-shell-nav") == "true";
    }
    get showPips() {
        return (this.Root.getAttribute("show-pips") ?? "true") == "true";
    }
    get wrapSelections() {
        return (this.Root.getAttribute("wrap-selections") == "true");
    }
    constructor(root) {
        super(root);
        this.noSelectionCaption = 'LOC_UI_DROPDOWN_NO_SELECTION';
        this.isEditing = false;
        this.selectorItems = [];
        this.selectorElements = [];
        this.pipElements = [];
        this.activateListener = this.onActivate.bind(this);
        this.navigateInputListener = this.onNavigateInput.bind(this);
        this.engineInputListener = this.onEngineInput.bind(this);
        /**
         * ToggleOpen edit mode on the selector.
         *
         * @param force If set, forces the selector to edit mode or not. If not set, toggles the selector based on its current state.
         */
        this.toggleEdit = (force) => {
            const isEditing = (force ?? !this.isEditing) || this.directEdit;
            if (this.isEditing === isEditing) {
                return;
            }
            this.isEditing = isEditing;
        };
        this.render();
    }
    onAttributeChanged(name, oldValue, newValue) {
        switch (name) {
            case 'selected-item-index': {
                const index = parseInt(newValue);
                this.onItemSelected(index);
                return;
            }
            case 'no-selection-caption': {
                this.noSelectionCaption = newValue;
                this.updateNoSelectionElement();
                return;
            }
            case 'label':
                this.updateLabel();
                return;
            case 'dropdown-items': {
                if (newValue && newValue !== oldValue) {
                    let selectorItems;
                    try {
                        selectorItems = JSON.parse(newValue);
                    }
                    catch (e) {
                        console.error(`fxs-selector: invalid dropdown-items attribute value: ${newValue} `, e);
                        return;
                    }
                    this.updateSelectorItems(selectorItems);
                }
                else if (!newValue) {
                    this.updateSelectorItems([]);
                }
                return;
            }
            case 'direct-edit': {
                this.toggleEdit(this.directEdit);
                return;
            }
            case 'disabled': {
                this.updateDisabled(newValue == "true");
                break;
            }
            case 'enable-shell-nav': {
                this.updateNavVisiblity();
                break;
            }
            case 'show-pips': {
                this.pipsContainer.classList.toggle("hidden", newValue != "true");
                break;
            }
        }
        super.onAttributeChanged(name, oldValue, newValue);
    }
    onInitialize() {
        super.onInitialize();
        this.Root.role = "select";
    }
    onAttach() {
        super.onAttach();
        this.leftArrow.setAttribute("data-audio-group-ref", "audio-pager");
        this.leftArrow.setAttribute("data-audio-focus-ref", "data-audio-arrow-focus");
        this.leftArrow.setAttribute("data-audio-activate-ref", "none");
        this.rightArrow.setAttribute("data-audio-group-ref", "audio-pager");
        this.rightArrow.setAttribute("data-audio-focus-ref", "data-audio-arrow-focus");
        this.rightArrow.setAttribute("data-audio-activate-ref", "none");
        this.Root.addEventListener('action-activate', this.activateListener);
        this.Root.addEventListener('navigate-input', this.navigateInputListener);
        this.Root.addEventListener('engine-input', this.engineInputListener);
        this.Root.setAttribute("data-audio-group-ref", "audio-pager");
    }
    onDetach() {
        this.Root.removeEventListener('engine-input', this.engineInputListener);
        this.Root.removeEventListener('navigate-input', this.navigateInputListener);
        this.Root.removeEventListener('action-activate', this.activateListener);
        super.onDetach();
    }
    onActivatableEngineInput(inputEvent) {
        // Do not process input events when in direct edit mode
        if (this.directEdit) {
            return;
        }
        else {
            super.onActivatableEngineInput(inputEvent);
        }
    }
    updateDisabled(value) {
        if (this.isEditing) {
            this.toggleEdit(false);
        }
        this.Root.classList.toggle("disabled", value);
        this.leftArrow.classList.toggle("hidden", value);
        this.rightArrow.classList.toggle("hidden", value);
        this.updateNavVisiblity();
        for (const pip of this.pipElements) {
            if (value) {
                pip.setAttribute("disabled", "true");
            }
            else {
                pip.removeAttribute("disabled");
            }
        }
    }
    /**
     * UpdateSelectorItems updates the list of items in the selector.
     *
     * @param items The list of items to display in the selector.
     */
    updateSelectorItems(items) {
        this.selectorItems = items;
        this.createListItems();
    }
    selectNext() {
        if (!this.disabled) {
            this.onItemSelected(this.selectedIndex + 1);
        }
    }
    selectPrevious() {
        if (!this.disabled) {
            this.onItemSelected(this.selectedIndex - 1);
        }
    }
    /**
     * Called when a new item is added to the selector.
     *
     * Override this method to customize the appearance of selector items.
     */
    createListItemElement(item) {
        const newListItem = document.createElement('div');
        newListItem.classList.add("flex", "flex-col", "items-center", "justify-center", "leading-none", "my-5");
        if (item.disabled || this.disabled) {
            newListItem.setAttribute('disabled', 'true');
        }
        let tooltip = "";
        if (item.label) {
            Locale.compose(item.label) + "[N]";
        }
        if (item.tooltip) {
            tooltip = tooltip + Locale.compose(item.tooltip);
        }
        newListItem.setAttribute("data-tooltip-content", tooltip);
        const title = document.createElement('div');
        title.classList.add("text-center", "font-title-lg", "font-bold", "text-accent-2", "uppercase", "text-shadow-br");
        title.setAttribute("data-l10n-id", item.label);
        newListItem.appendChild(title);
        if (item.description) {
            const description = document.createElement('div');
            description.classList.add("text-center", "font-body-base", "text-accent-2", "text-shadow-br");
            description.setAttribute("data-l10n-id", item.description);
            newListItem.appendChild(description);
        }
        return newListItem;
    }
    /**
     * Called when a new item is added to the selector to create a pip for it.
     *
     * Override this method to customize the appearance of pip items.
     */
    createPipElement(item) {
        const pipElement = document.createElement("fxs-radio-button");
        pipElement.role = "option";
        pipElement.classList.add("m-1");
        pipElement.setAttribute("is-tiny", "true");
        if (item.tooltip) {
            let tooltip = "";
            if (item.label) {
                tooltip = Locale.compose(item.label) + "[N]";
            }
            tooltip = tooltip + item.tooltip;
            pipElement.setAttribute("data-tooltip-content", tooltip);
        }
        else {
            pipElement.setAttribute("data-tooltip-content", item.label);
        }
        pipElement.setAttribute("value", item.label);
        if (this.disabled) {
            pipElement.setAttribute("disabled", "true");
        }
        return pipElement;
    }
    /**
     * Called when an item is selected from the selector.
     *
     * Override this method to customize item selection.
     *
     * @param index The index of the selected item.
     */
    onItemSelected(index) {
        if (this.disabled) {
            return;
        }
        const numItems = this.selectorItems.length;
        if (numItems <= 0) {
            index = -1;
        }
        if (index < 0) {
            index = this.wrapSelections ? numItems - 1 : 0;
        }
        else if (index >= numItems) {
            index = this.wrapSelections ? 0 : numItems - 1;
        }
        if (index === this.selectedIndex) {
            return;
        }
        const detail = this.isNoSelection
            ? { selectedIndex: -1, selectedItem: null }
            : { selectedIndex: index, selectedItem: this.selectorItems[index] };
        // event can be canceled to prevent selection
        const canceled = !this.Root.dispatchEvent(new DropdownSelectionChangeEvent(detail));
        if (canceled) {
            return;
        }
        this.selectedIndex = index;
        Audio.playSound("data-audio-activate", "audio-pager");
        this.updateElementSelections();
    }
    onActivate(_event) {
        this.toggleEdit();
    }
    onEngineInput(event) {
        if (!this.isEditing || !this.directEdit) {
            return;
        }
        if (event.detail.name === 'cancel') {
            if (event.detail.status === InputActionStatuses.FINISH) {
                this.toggleEdit(false);
                FocusManager.setFocus(this.Root);
            }
            event.preventDefault();
            event.stopPropagation();
        }
    }
    onNavigateInput(event) {
        if (!this.isEditing && !this.directEdit) {
            return;
        }
        const isFinished = event.detail.status === InputActionStatuses.FINISH;
        const direction = event.getDirection();
        switch (direction) {
            case InputNavigationAction.UP:
            case InputNavigationAction.DOWN: {
                if (!this.directEdit) {
                    event.stopPropagation();
                }
                break;
            }
            // Disable left and right navigation when a selector is active
            case InputNavigationAction.LEFT:
                if (isFinished) {
                    this.selectPrevious();
                }
                event.stopPropagation();
                break;
            case InputNavigationAction.SHELL_PREVIOUS:
                if (this.enableShellNavControls) {
                    if (isFinished) {
                        this.selectPrevious();
                    }
                    event.stopPropagation();
                }
                break;
            case InputNavigationAction.RIGHT:
                if (isFinished) {
                    this.selectNext();
                }
                event.stopPropagation();
                break;
            case InputNavigationAction.SHELL_NEXT:
                if (this.enableShellNavControls) {
                    if (isFinished) {
                        this.selectNext();
                    }
                    event.stopPropagation();
                }
                break;
        }
    }
    updateNavVisiblity() {
        const isInvisible = !this.enableShellNavControls || this.disabled;
        this.leftNavHelp?.classList.toggle("invisible", isInvisible);
        this.rightNavHelp?.classList.toggle("invisible", isInvisible);
    }
    createListItems() {
        for (const element of this.selectorElements) {
            element.remove();
        }
        for (const pip of this.pipElements) {
            pip.remove();
        }
        this.selectorElements.length = 0;
        this.pipElements.length = 0;
        for (let i = 0; i < this.selectorItems.length; i++) {
            const item = this.selectorItems[i];
            const newElement = this.createListItemElement(item);
            this.selectorElements.push(newElement);
            const pip = this.createPipElement(item);
            if (UI.getViewExperience() == UIViewExperience.Mobile) {
                pip.setAttribute("disabled", "true");
            }
            pip.addEventListener("action-activate", () => this.onItemSelected(i));
            this.pipsContainer.appendChild(pip);
            this.pipElements.push(pip);
        }
        this.updateElementSelections();
    }
    updateLabel() {
        this.labelElement.setAttribute('data-l10n-id', this.label);
    }
    updateElementSelections() {
        const index = this.selectedIndex;
        if (index === -1) {
            this.selectedItemContainer.appendChild(this.noSelectionElement);
            this.Root.ariaValueText = this.noSelectionCaption;
            const image = this.defaultImage ?? "";
            this.Root.style.backgroundImage = image;
        }
        else {
            this.noSelectionElement.remove();
        }
        if (!this.wrapSelections) {
            if (index === 0) {
                this.leftArrow.classList.remove("img-arrow-hover");
                this.leftArrow.classList.add("img-arrow-disabled");
            }
            else {
                this.leftArrow.classList.add("img-arrow-hover");
                this.leftArrow.classList.remove("img-arrow-disabled");
            }
            if (index === this.selectorItems.length - 1) {
                this.rightArrow.classList.remove("img-arrow-hover");
                this.rightArrow.classList.add("img-arrow-disabled");
            }
            else {
                this.rightArrow.classList.add("img-arrow-hover");
                this.rightArrow.classList.remove("img-arrow-disabled");
            }
            this.leftArrow.setAttribute("disabled", (index == 0).toString());
            this.rightArrow.setAttribute("disabled", (index == this.selectorItems.length - 1).toString());
        }
        for (let i = 0; i < this.selectorItems.length; i++) {
            const selectedElement = this.selectorElements[i];
            const selectedPip = this.pipElements[i];
            selectedPip.setAttribute("selected", (i === index).toString());
            if (i === index) {
                this.selectedItemContainer.appendChild(selectedElement);
                const selectedInfo = this.selectorItems[i];
                this.Root.ariaValueText = selectedInfo.label;
                const image = selectedInfo.image ?? this.defaultImage ?? "";
                this.Root.style.backgroundImage = image;
            }
            else {
                selectedElement.remove();
            }
        }
    }
    updateNoSelectionElement() {
        const newNoSelectionElement = this.createListItemElement({ disabled: this.disabled, label: this.noSelectionCaption, tooltip: this.noSelectionCaption });
        if (this.noSelectionElement && this.isNoSelection) {
            this.noSelectionElement.remove();
            this.selectedItemContainer.appendChild(newNoSelectionElement);
        }
        this.noSelectionElement = newNoSelectionElement;
    }
    render() {
        const fragment = document.createDocumentFragment();
        const darkener = document.createElement('div');
        darkener.classList.add("fxs-selector-ornate-darkener", "size-full", "flex", "flex-row", "justify-center", "items-center");
        fragment.appendChild(darkener);
        this.labelElement = document.createElement('div');
        this.labelElement.classList.add("font-body-base", "text-accent-2", "uppercase", "absolute", "text-shadow-br", "top-2", "left-3");
        darkener.appendChild(this.labelElement);
        this.updateLabel();
        this.leftArrow = document.createElement('fxs-activatable');
        this.leftArrow.classList.add("image-arrow-hover", "ml-2");
        this.leftArrow.addEventListener("action-activate", this.selectPrevious.bind(this));
        darkener.appendChild(this.leftArrow);
        this.leftNavHelp = document.createElement('fxs-nav-help');
        this.leftNavHelp.setAttribute("action-key", "inline-nav-shell-previous");
        darkener.appendChild(this.leftNavHelp);
        this.selectedItemContainer = document.createElement("div");
        this.selectedItemContainer.classList.add("flex-auto");
        darkener.appendChild(this.selectedItemContainer);
        this.rightNavHelp = document.createElement('fxs-nav-help');
        this.rightNavHelp.setAttribute("action-key", "inline-nav-shell-next");
        darkener.appendChild(this.rightNavHelp);
        this.rightArrow = document.createElement('fxs-activatable');
        this.rightArrow.classList.add("img-arrow-hover", "-scale-x-100", "mr-2");
        this.rightArrow.addEventListener("action-activate", this.selectNext.bind(this));
        darkener.appendChild(this.rightArrow);
        this.pipsContainer = document.createElement("div");
        this.pipsContainer.classList.add("absolute", "bottom-0", "flex", "flex-row", "w-full", "items-center", "justify-center");
        this.pipsContainer.classList.toggle("hidden", !this.showPips);
        darkener.appendChild(this.pipsContainer);
        this.updateNoSelectionElement();
        this.updateNavVisiblity();
        this.Root.appendChild(fragment);
    }
}
Controls.define('fxs-selector-ornate', {
    createInstance: FxsSelectorOrnate,
    description: 'A UI selector control for selecting an option from a list of options.',
    classNames: ['fxs-selector-ornate', "relative", "flex"],
    tabIndex: -1,
    attributes: [
        {
            name: "dropdown-items",
            description: "The list of items to display in the selector."
        },
        {
            name: "selected-item-index",
            description: "The index of the selected item."
        },
        {
            name: "no-selection-caption",
            description: "The text label of the button when there is no valid selection."
        },
        {
            name: "label",
            description: "The label of the selector."
        },
        {
            name: "disabled",
            description: "Whether the selector is disabled."
        },
        {
            name: "direct-edit",
            description: "Whether the selector is always in edit mode, or if it has to be toggled."
        },
        {
            name: "default-image",
            description: "The image to use if none is defined for a given dropdown item."
        },
        {
            name: "enable-shell-nav",
            description: "Should shell nav controls and navigation helpers be used?"
        },
        {
            name: "show-pips",
            description: "Should pips representing the options be shown at the bottom of the control?"
        },
        {
            name: "wrap-selections",
            description: "If set to 'true' selections will wrap when they go out of bounds, otherwise they will clamp."
        }
    ]
});

//# sourceMappingURL=file:///core/ui/components/fxs-selector-ornate.js.map
