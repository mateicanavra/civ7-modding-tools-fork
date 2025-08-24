/**
 * @file panel-place-building.ts
 * @copyright 2023-2024, Firaxis Games
 * @description Displays all the useful information when attempting to place a building on a plot
 */
import { InterfaceMode, InterfaceModeChangedEventName } from '/core/ui/interface-modes/interface-modes.js';
import { MustGetElement } from "/core/ui/utilities/utilities-dom.js";
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
class PlaceBuildingPanel extends Panel {
    constructor(root) {
        super(root);
        this.content = null;
        this.subsystemFrame = document.createElement("fxs-subsystem-frame");
        this.onInterfaceModeChanged = () => {
            switch (InterfaceMode.getCurrent()) {
                case "INTERFACEMODE_PLACE_BUILDING":
                    this.setHidden(false);
                    break;
                default:
                    this.setHidden(true);
                    break;
            }
        };
        this.animateInType = this.animateOutType = AnchorType.RelativeToLeft;
        this.inputContext = InputContext.Shell;
    }
    onInitialize() {
        this.Root.setAttribute("tabindex", "-1");
        this.Root.classList.add("panel-place-building", "flex-auto", "font-body", "text-base", "pt-12", "pl-6", "h-screen", "relative");
        this.buildView();
        this.setHidden(true);
    }
    onAttach() {
        super.onAttach();
        window.addEventListener(InterfaceModeChangedEventName, this.onInterfaceModeChanged);
        this.subsystemFrame.addEventListener('subsystem-frame-close', this.requestClose);
    }
    onDetach() {
        window.removeEventListener(InterfaceModeChangedEventName, this.onInterfaceModeChanged);
        this.subsystemFrame.removeEventListener('subsystem-frame-close', this.requestClose);
        super.onDetach();
    }
    onReceiveFocus() {
        if (this.content) {
            FocusManager.setFocus(this.content);
        }
        else {
            waitForLayout(() => {
                this.content = MustGetElement(".subsystem-frame__content", this.subsystemFrame);
                FocusManager.setFocus(this.content);
            });
        }
    }
    buildView() {
        const fragment = document.createDocumentFragment();
        const container = document.createElement('div');
        container.classList.add('flex', 'flex-col', 'w-128', 'pointer-events-none', 'mr-6', 'top-10', 'bottom-20', 'absolute');
        this.buildMainPanel();
        container.appendChild(this.subsystemFrame);
        fragment.appendChild(container);
        this.Root.appendChild(fragment);
    }
    buildMainPanel() {
        this.subsystemFrame.innerHTML = `
			<div class="max-w-96 self-center" data-slot="header">
				<fxs-header class="uppercase tracking-100 m-2" font-fit-mode="shrink" truncate="true" data-bind-attr-title='{{g_PlaceBuilding.cityName}}'></fxs-header>
			</div>
			<div class="flex flex-col mx-2 mb-8">
				<yield-bar></yield-bar>
				<fxs-header class="uppercase tracking-100 mt-2" title="LOC_UI_CITY_VIEW_BUILDING_PLACEMENT" filigree-style="small"></fxs-header>
				<div class="uppercase font-title text-secondary text-xl self-center" data-bind-attr-data-l10n-id="{{g_PlaceBuilding.selectedConstructibleInfo.name}}"></div>
				<div class="flex items-center m-1">
					<fxs-icon class="size-20 mx-2" data-bind-attr-data-icon-id="{{g_PlaceBuilding.selectedConstructibleInfo.type}}"></icon>
					<div class="flex flex-col pr-26">
						<div data-bind-for="entry:{{g_PlaceBuilding.selectedConstructibleInfo.details}}">
							<div data-bind-attr-data-l10n-id="{{entry}}"></div>
						</div>
					</div>
				</div>
				<fxs-header class="uppercase my-2" data-bind-attr-title="{{g_PlaceBuilding.placementHeaderText}}" data-bind-if="{{g_PlaceBuilding.hasSelectedPlot}}" filigree-style="h4"></fxs-header>
				<div class="flex flex-col self-center my-2" data-bind-if="{{g_PlaceBuilding.shouldShowOverbuild}}">
					<div data-bind-value="{{g_PlaceBuilding.overbuildText}}"></div>
				</div>
				<div class="flex flex-col self-center my-2" data-bind-if="{{g_PlaceBuilding.shouldShowUniqueQuarterText}}">
					<div class="self-center text-center" data-bind-value="{{g_PlaceBuilding.uniqueQuarterText}}"></div>
					<div class="self-center text-center text-negative" data-bind-value="{{g_PlaceBuilding.uniqueQuarterWarning}}"></div>
				</div>
				<div class="flex self-center" data-bind-if="{{g_PlaceBuilding.hasSelectedPlot}}">
					<fxs-icon class="size-20 flex justify-center items-center mx-2" data-bind-attr-data-icon-id="{{g_PlaceBuilding.firstConstructibleSlot.type}}" data-bind-if="{{g_PlaceBuilding.firstConstructibleSlot.shouldShow}}">
						<fxs-icon class="size-12" data-icon-id="BUILDING_PLACE" data-bind-if="{{g_PlaceBuilding.firstConstructibleSlot.showPlacementIcon}}"></fxs-icon>
						<fxs-icon class="size-12" data-icon-id="CITY_REPAIR" data-bind-if="{{g_PlaceBuilding.firstConstructibleSlot.showRepairIcon}}"></fxs-icon>
					</fxs-icon>
					<fxs-icon class="size-20 flex justify-center items-center mx-2" data-bind-attr-data-icon-id="{{g_PlaceBuilding.secondConstructibleSlot.type}}" data-bind-if="{{g_PlaceBuilding.secondConstructibleSlot.shouldShow}}">
						<fxs-icon class="size-12" data-icon-id="BUILDING_PLACE" data-bind-if="{{g_PlaceBuilding.secondConstructibleSlot.showPlacementIcon}}"></fxs-icon>
						<fxs-icon class="size-12" data-icon-id="CITY_REPAIR" data-bind-if="{{g_PlaceBuilding.secondConstructibleSlot.showRepairIcon}}"></fxs-icon>
					</fxs-icon>
				</div>
				<div class="flex flex-col self-center items-center mb-2" data-bind-if="{{g_PlaceBuilding.shouldShowFromThisPlot}}">
					<div class="my-2" data-l10n-id="LOC_UI_CITY_VIEW_BONUSES_FROM_THIS_PLOT"></div>
					<div class="flex flex-col mx-2">
						<div data-bind-for="entry:{{g_PlaceBuilding.fromThisPlotYields}}">
							<div data-bind-attr-data-l10n-id="{{entry}}"></div>
						</div>
					</div>
				</div>
				<div class="flex flex-col self-center items-center" data-bind-if="{{g_PlaceBuilding.shouldShowAdjacencyBonuses}}">
					<div class="my-2 font-title uppercase text-gradient-secondary" data-l10n-id="LOC_UI_CITY_VIEW_ADJACENCY_BONUSES"></div>
					<div class="flex flex-col mx-2">
						<div data-bind-for="entry:{{g_PlaceBuilding.adjacencyBonuses}}">
							<div data-bind-attr-data-l10n-id="{{entry}}"></div>
						</div>
					</div>
				</div>
			</div>
		`;
        waitForLayout(() => {
            this.content = MustGetElement(".subsystem-frame__content", this.subsystemFrame);
            this.content.setAttribute("proxy-mouse", "true");
            this.content.setAttribute("handle-gamepad-pan", "true");
            this.content.componentCreatedEvent.on(component => { component.setEngineInputProxy(document.body); });
        });
    }
    requestClose() {
        const selectedCityID = InterfaceMode.getParameters().CityId != null ? InterfaceMode.getParameters().CityId : UI.Player.getHeadSelectedCity(); // May be null if placing results in deselecting city		
        if (selectedCityID && ComponentID.isValid(selectedCityID)) {
            InterfaceMode.switchTo("INTERFACEMODE_CITY_PRODUCTION", { CityID: selectedCityID });
            super.close();
        }
        else {
            // If we still don't have a CityId something has gone very wrong so we'll be safe a kick back to the world.
            InterfaceMode.switchTo("INTERFACEMODE_DEFAULT");
        }
    }
    setHidden(hidden) {
        this.Root.classList.toggle("hidden", hidden);
    }
}
Controls.define('panel-place-building', {
    createInstance: PlaceBuildingPanel,
    description: '',
    classNames: ['panel-place-building']
});
//# sourceMappingURL=file:///base-standard/ui/place-building/panel-place-building.js.map
