/**
 * @file panel-unit-city-list.ts
 * @copyright 2020-2021, Firaxis Games
 */
import UnitCityListModel from '/base-standard/ui/unit-city-list/model-unit-city-list.js';
import { databindComponentID, databindRetrieveComponentID, databindRetrieveComponentIDSerial } from '/core/ui/utilities/utilities-databinding.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import Panel from '/core/ui/panel-support.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import PlotCursor from '/core/ui/input/plot-cursor.js';
import ActionHandler from '/core/ui/input/action-handler.js';
/**
 * Area for city and unit button icons.
 */
class PanelUnitCityList extends Panel {
    // If not world focused and the focus manager has a focus within this panel, it has focus.
    get weHaveFocus() {
        return (!FocusManager.isWorldFocused() && this.Root.contains(FocusManager.getFocus()));
    }
    ;
    constructor(root) {
        super(root);
        this.focusOutListener = () => { this.onBlur(); };
        this.focusUnitCityListener = () => { this.focusUnitCityList(); };
        this.isFilterUp = false;
        this.animateInType = this.animateOutType = 15 /* AnchorType.Auto */;
    }
    onAttach() {
        super.onAttach();
        this.onUpdate();
        // TODO: @kvanauken : what events should we hook in to for other input like gamepad? :Focus"-related maybe? -bsteiner
        this.Root.addEventListener('mouseover', (event) => {
            if (event.target instanceof HTMLElement) {
                this.displayCityInspector(event.target);
                //TODO: set up a separate unit inspector 
            }
        });
        this.Root.addEventListener('mouseout', () => {
            this.hideInspector();
        });
        window.addEventListener('focus-unit-city', this.focusUnitCityListener);
        window.addEventListener('action-cancel', () => {
            this.dropGamepadFocus();
        });
        this.Root.addEventListener("focusout", this.focusOutListener);
    }
    focusUnitCityList() {
        // make sure nobody else has the focus (e.g. the diplo ribbon)
        if (FocusManager.isWorldFocused()) {
            // if we don't already have focus
            if (!this.weHaveFocus) {
                // get the top-level container
                const container = this.Root.querySelector('.item-container');
                if (container) {
                    // find the first selectable/focusable item (which will be the 'bg' div in an item)
                    const firstFocus = container.querySelector('[tabindex]');
                    if (firstFocus) {
                        // focus the 'bg' element
                        FocusManager.setFocus(firstFocus);
                        // get the bg's parent, which is the item container
                        const targetElement = firstFocus.parentElement;
                        if (targetElement) {
                            this.highlightItem(firstFocus);
                        }
                    }
                }
            }
        }
    }
    onUpdate() {
        this.itemContainer = document.createElement("fxs-vslot");
        this.itemContainer.classList.add("item-container");
        this.itemContainer.style.flexDirection = "column"; // set this style here to avoid the css rule on bottom harness to take priority
        const item = document.createElement('fxs-activatable');
        item.classList.add("item");
        item.classList.add("unit-city-list-item");
        Databind.for(item, 'g_UnitCityList.items', 'index,item');
        { //for each databound item... 
            Databind.attribute(item, 'innerHTML', "item.name");
            Databind.attribute(item, 'data-tooltip-style', "item.tooltipStyle");
            Databind.attribute(item, 'data-tooltip-content', "item.tooltip");
            Databind.attribute(item, 'data-is-city', "item.isCityOrTown");
            databindComponentID(item, `item.hashedID`);
            item.setAttribute("tabindex", "-1");
            const inspectorContainer = document.createElement("div");
            Databind.if(inspectorContainer, `item.isCityOrTown`);
            inspectorContainer.classList.add("city-inspector-container");
            item.appendChild(inspectorContainer);
            const shadow = document.createElement('div');
            shadow.classList.add('unit-city-list-item-shadow');
            item.appendChild(shadow);
            const focusOutline = document.createElement('div');
            focusOutline.classList.add("unit-city-list-item-focus-outline");
            item.appendChild(focusOutline);
            const bg = document.createElement('div');
            bg.classList.add("bg");
            item.appendChild(bg);
            const icon = document.createElement("img");
            icon.setAttribute('data-bind-attributes', '{src:{{item.icon}}}');
            bg.appendChild(icon);
            const labelC = document.createElement("div");
            labelC.classList.add("label");
            labelC.setAttribute('data-bind-value', '{{item.name}}');
            bg.appendChild(labelC);
            item.setAttribute(`data-bind-style-opacity`, `{{item.isDisabled}}?0.5:1.0`);
        }
        item.addEventListener('action-activate', (event) => {
            this.playActivateSound();
            this.onActionActivate(event);
        }, { capture: false });
        item.addEventListener('mouseenter', () => {
            this.playMouseOverSound();
        });
        item.addEventListener('focus', (event) => {
            if (ActionHandler.isGamepadActive && event.target instanceof HTMLElement) {
                this.displayCityInspector(event.target);
                let location = null;
                const componentID = databindRetrieveComponentID(event.target);
                const isCity = event.target.getAttribute('data-is-city');
                if (isCity && isCity == 'true') {
                    const city = Cities.get(componentID);
                    if (city) {
                        location = city.location;
                    }
                }
                else {
                    const unit = Units.get(componentID);
                    if (unit) {
                        location = unit.location;
                    }
                }
                if (location) {
                    const offset = 2;
                    // look at the plot on the left so the unit/city is not hidden with the radial selection
                    Camera.lookAtPlot({ x: (location.x - offset < 0 ? GameplayMap.getGridWidth() + location.x : location.x) - offset, y: location.y }, { zoom: 0.3 });
                    PlotCursor.plotCursorCoords = location;
                    const colorfilter = { saturation: 0.6, brightness: 0.3 };
                    WorldUI.pushRegionColorFilter([GameplayMap.getIndexFromLocation(location)], {}, colorfilter);
                    window.dispatchEvent(new CustomEvent('minimap-show-highlight', { detail: { x: location.x, y: location.y } }));
                    this.isFilterUp = true;
                }
            }
        });
        item.addEventListener('blur', () => {
            if (this.isFilterUp) {
                window.dispatchEvent(new CustomEvent('minimap-hide-highlight'));
                WorldUI.popFilter();
                this.isFilterUp = false;
            }
        });
        this.itemContainer.appendChild(item);
        this.Root.appendChild(this.itemContainer);
    }
    displayCityInspector(targetElement) {
        const targetHashedID = databindRetrieveComponentIDSerial(targetElement);
        if (targetHashedID != "") {
            const inspectorContainer = targetElement.querySelector('.city-inspector-container');
            if (inspectorContainer) {
                this.dropGamepadFocus();
                this.showInspector(inspectorContainer, targetHashedID);
            }
        }
    }
    dropGamepadFocus() {
        if (this.weHaveFocus) {
            this.hideInspector();
        }
    }
    highlightItem(targetElement) {
        this.hideInspector();
        this.selected = targetElement;
        const targetHashedID = databindRetrieveComponentIDSerial(targetElement);
        if (targetHashedID != "") {
            const inspectorContainer = targetElement.querySelector('.city-inspector-container');
            if (inspectorContainer) {
                this.showInspector(inspectorContainer, targetHashedID);
            }
        }
    }
    showInspector(attachTarget, serializedID = "") {
        if (this.inspector) {
            this.hideInspector();
        }
        //TODO: update this to be detach/ reattach / update data 
        this.inspectorContainer = attachTarget;
        if (this.inspector == undefined) {
            this.inspector = document.createElement("panel-city-inspector");
        }
        Databind.clearAttributes(this.inspector);
        this.inspector.setAttribute('componentid', serializedID);
        this.inspectorContainer.appendChild(this.inspector);
    }
    hideInspector() {
        //TODO: update this to be detach/ reattach / update data 
        if (this.inspectorContainer && this.inspector) {
            this.inspectorContainer.removeChild(this.inspector);
            this.inspectorContainer = undefined;
        }
    }
    onDetach() {
        window.removeEventListener('focus-unit-city', this.focusUnitCityListener);
        super.onDetach();
    }
    /**
     * Child button pressed so close the panel.
     */
    onActionActivate(event) {
        let targetElement = event.currentTarget;
        // is the gamepad selecting?
        if ((this.weHaveFocus) && (this.selected)) {
            // do a sanity check to ensure we have something selected
            const currentFocus = FocusManager.getFocus();
            targetElement = currentFocus;
            this.dropGamepadFocus();
        }
        if (targetElement) {
            const targetComponentID = databindRetrieveComponentID(targetElement);
            UnitCityListModel.inspect(targetComponentID);
        }
        event.stopPropagation();
        event.preventDefault();
    }
    onBlur() {
        requestAnimationFrame(() => {
            const currentFocus = FocusManager.getFocus();
            if (!currentFocus.classList.contains('item')) {
                this.dropGamepadFocus();
            }
        });
    }
}
Controls.define('panel-unit-city-list', {
    createInstance: PanelUnitCityList,
    description: 'Area for city and unit button icons.',
    classNames: ['unit-city-list', 'allowCameraMovement'],
    styles: ["fs://game/base-standard/ui/unit-city-list/panel-unit-city-list.css"],
    attributes: []
});

//# sourceMappingURL=file:///base-standard/ui/unit-city-list/panel-unit-city-list.js.map
