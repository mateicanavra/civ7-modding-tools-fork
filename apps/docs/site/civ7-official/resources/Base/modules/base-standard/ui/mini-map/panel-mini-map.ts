/**
 * @file panel-mini-map.ts
 * @copyright 2021 - 2024, Firaxis Games
 * @description Mini-map panel, and lens/pennant dispaly
 */

import MiniMapData from '/base-standard/ui/mini-map/model-mini-map.js';
import { CheckboxValueChangeEvent } from '/core/ui/components/fxs-checkbox.js';
import { CursorUpdatedEvent, CursorUpdatedEventName } from '/core/ui/input/cursor.js';
import { RadioButtonChangeEvent } from '/core/ui/components/fxs-radio-button.js';
import ContextManager, { ContextManagerEvents } from '/core/ui/context-manager/context-manager.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import LensManager, { LensLayerDisabledEventName, LensLayerEnabledEventName, LensLayerEvent, LensLayerName, LensName, LensActivationEventName } from '/core/ui/lenses/lens-manager.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import { SocialPanelOpenEventName } from '/core/ui/shell/mp-staging/mp-friends.js';
import { Focus } from '/core/ui/input/focus-support.js';
import { ScreenMPChat } from '/core/ui/mp-chat/screen-mp-chat.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';

export class PanelMiniMap extends Panel {
	readonly SMALL_SCREEN_MODE_MAX_HEIGHT = 768;
	readonly SMALL_SCREEN_MODE_MAX_WIDTH = 1800;
	private chatPanelState: boolean = false;
	private lensPanelState: boolean = false;

	private miniMapChatButton = this.createMinimapChatButton();
	private miniMapLensButton = this.createMinimapLensButton();
	private miniMapRadialButton = this.createMinimapRadialButton();
	private miniMapButtonRow!: HTMLElement;

	private chatPanelNavHelp = document.createElement('div');
	private radialNavHelpContainer = document.createElement('div');
	private toggleLensActionNavHelp = document.createElement("fxs-nav-help");
	private chatPanel = document.createElement('div');
	private lensPanel = document.createElement('div');
	private lensPanelComponent?: ComponentRoot<LensPanel>;
	private chatScreen?: ComponentRoot<ScreenMPChat>;
	private readonly miniMapTopContainer = document.createElement("fxs-vslot");
	private mapHighlight = document.createElement('div');
	private mapImage: HTMLElement | null = null;
	private mapLastCursor: HTMLElement | null = null;

	private lastCursorPos: float2 = { x: 0, y: 0 };
	private lastMinimapPos: float2 = { x: 0, y: 0 };

	private mapHeight = 0;
	private mapWidth = 0;
	private mapTopBorderTiles = 2;
	private mapBottomBorderTiles = 2;

	private showHighlightListener = this.onShowHighlight.bind(this);
	private hideHighlightListener = this.onHideHighlight.bind(this);

	private resizeListener = this.onResize.bind(this);
	private activeDeviceTypeListener = this.onActiveDeviceTypeChanged.bind(this);
	private toggleMiniMapListener = this.onToggleMiniMap.bind(this);

	private minimapImageEngineInputListener = this.onMinimapImageEngineInput.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);
	private engineInputCaptureListener = this.onEngineInputCapture.bind(this);
	private activeLensChangedListener = this.onActiveLensChanged.bind(this);
	private readonly cursorUpdatedListener = this.onCursorUpdated.bind(this);
	private readonly socialPanelOpenedListener = this.onSocialPanelOpened.bind(this);

	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.Auto;

		this.mapHeight = GameplayMap.getGridHeight();
		this.mapWidth = GameplayMap.getGridWidth();
	}

	onInitialize(): void {
		const container = document.createElement("fxs-vslot");
		container.setAttribute("reverse-navigation", "");
		container.setAttribute("focus-rule", "last");
		container.classList.add("mini-map-container");
		this.Root.appendChild(container);

		// Mini-Map creation
		this.miniMapTopContainer.classList.add("mini-map__main");
		this.miniMapTopContainer.setAttribute("ignore-prior-focus", "");
		this.miniMapTopContainer.setAttribute("id", "mm-top-container");

		this.mapImage = document.createElement("div");
		this.mapImage.role = "tooltip";
		this.mapImage.classList.add('mini-map__image');
		this.mapImage.setAttribute("data-tooltip-content", Locale.compose("LOC_UI_MINI_MAP_CLICK_TO_NAVIGATE"));
		this.mapImage.setAttribute("data-audio-group-ref", "audio-panel-mini-map");
		this.mapImage.setAttribute("data-audio-activate-ref", "data-audio-minimap-clicked-map");
		this.miniMapTopContainer.appendChild(this.mapImage);

		this.mapImage.addEventListener(InputEngineEventName, this.minimapImageEngineInputListener);
		window.addEventListener(CursorUpdatedEventName, this.cursorUpdatedListener);

		// Lens Button initial press/release sounds
		this.miniMapLensButton.setAttribute('data-audio-group-ref', 'audio-panel-mini-map');
		this.miniMapLensButton.setAttribute('data-audio-press-ref', 'data-audio-minimap-panel-open-press');

		this.miniMapButtonRow = document.createElement("div");
		this.miniMapButtonRow.classList.add("mini-map__button-row");

		this.toggleLensActionNavHelp.setAttribute("action-key", "inline-open-lens-panel");
		this.toggleLensActionNavHelp.classList.add("absolute", "top-1");
		this.miniMapLensButton.appendChild(this.toggleLensActionNavHelp);

		this.miniMapButtonRow.appendChild(this.miniMapLensButton);
		this.miniMapTopContainer.appendChild(this.miniMapButtonRow);

		this.lensPanel.classList.add("mini-map__lens-panel-container", "scale-0");
		container.appendChild(this.lensPanel);
		container.appendChild(this.miniMapTopContainer);

		const miniMapRightContainer = document.createElement("div");
		miniMapRightContainer.classList.add("absolute", "left-full", "bottom-4");

		const saveIndicator = document.createElement("save-indicator");
		miniMapRightContainer.appendChild(saveIndicator);

		// Chat panel creation
		if (Configuration.getGame().isAnyMultiplayer && Network.hasCommunicationsPrivilege(false)) {
			this.miniMapChatButton.setAttribute('data-audio-group-ref', 'audio-panel-mini-map');
			this.miniMapChatButton.setAttribute('data-audio-press-ref', 'data-audio-minimap-panel-open-press');
			this.miniMapButtonRow.appendChild(this.miniMapChatButton);

			const closeChatNavHelp = document.createElement("fxs-nav-help");
			closeChatNavHelp.setAttribute("action-key", "inline-cancel");
			closeChatNavHelp.classList.add("absolute", "-right-4", "-top-3", "z-1");

			this.chatPanel.appendChild(closeChatNavHelp);
			this.chatPanel.classList.add("mini-map__chat-panel", "scale-0", "absolute", "pl-3", "pb-2", "bottom-56", "pointer-events-none");

			const openChatNavHelp = document.createElement("fxs-nav-help");
			openChatNavHelp.setAttribute("action-key", "inline-toggle-chat");
			openChatNavHelp.setAttribute("decoration-mode", "border");
			openChatNavHelp.setAttribute("caption", "LOC_UI_CHAT_PANEL");

			this.chatPanelNavHelp.appendChild(openChatNavHelp);
			this.chatPanelNavHelp.classList.add("flow-row", "fxs-nav-help", "text-shadow", "mt-2");
			Databind.classToggle(this.chatPanelNavHelp, "hidden", "!{{g_NavTray.isTrayRequired}}");

			miniMapRightContainer.appendChild(this.chatPanelNavHelp);

			container.appendChild(this.chatPanel);
		}

		this.miniMapTopContainer.appendChild(miniMapRightContainer);

		this.miniMapButtonRow.appendChild(this.miniMapRadialButton);
		this.radialNavHelpContainer.classList.add("absolute", "left-14", "top-1");
		const radialActionNavHelp = document.createElement("fxs-nav-help");
		radialActionNavHelp.setAttribute("action-key", "inline-toggle-radial-menu");
		this.radialNavHelpContainer.appendChild(radialActionNavHelp);
		this.miniMapRadialButton.appendChild(this.radialNavHelpContainer);

		this.updateRadialButton();
		this.updateLensButton();
		this.updateRadialNavHelpContainer();
		this.updateLensActionNavHelp();
	}

	onAttach() {
		super.onAttach();
		engine.on(ContextManagerEvents.OnChanged, this.onContextChange, this);

		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
		this.Root.addEventListener(TOGGLE_MINI_MAP_EVENT_NAME, this.toggleMiniMapListener);

		window.addEventListener(CursorUpdatedEventName, this.cursorUpdatedListener);
		window.addEventListener(SocialPanelOpenEventName, this.socialPanelOpenedListener);
		window.addEventListener('resize', this.resizeListener);
		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
		this.Root.listenForWindowEvent(LensActivationEventName, this.activeLensChangedListener);

		window.addEventListener('minimap-show-highlight', this.showHighlightListener);
		window.addEventListener('minimap-hide-highlight', this.hideHighlightListener);

		const useCapture = true;
		window.addEventListener(InputEngineEventName, this.engineInputCaptureListener, useCapture);
	}

	onDetach() {
		engine.off(ContextManagerEvents.OnChanged, this.onContextChange, this);

		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
		this.Root.removeEventListener(TOGGLE_MINI_MAP_EVENT_NAME, this.toggleMiniMapListener);

		window.removeEventListener(CursorUpdatedEventName, this.cursorUpdatedListener);
		window.removeEventListener(SocialPanelOpenEventName, this.socialPanelOpenedListener);
		window.removeEventListener('resize', this.resizeListener);
		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
		window.removeEventListener('minimap-show-highlight', this.showHighlightListener);
		window.removeEventListener('minimap-hide-highlight', this.hideHighlightListener);

		const useCapture = true;
		window.removeEventListener(InputEngineEventName, this.engineInputCaptureListener, useCapture);

		super.onDetach();
	}

	private onContextChange(_event: CustomEvent) {
		this.updateChatNavHelp();
	}

	private onActiveLensChanged() {
		if (["fxs-continent-lens", "fxs-settler-lens", "fxs-trade-lens"].includes(LensManager.getActiveLens()) && this.lensPanelState) {
			this.toggleLensPanel(false);
		}
	}

	private panInProgress = false;

	private onMinimapImageEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.name == 'touch-touch') {
			this.panInProgress = true;
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}

		if (inputEvent.detail.name == 'mousebutton-left' || inputEvent.detail.name == 'touch-tap' || inputEvent.detail.name == "touch-pan") {

			// Pressed sound
			if (inputEvent.detail.status == InputActionStatuses.START) {
				UI.sendAudioEvent(Audio.getSoundTag('data-audio-minimap-clicked-map', 'audio-panel-mini-map'));
			}

			// Dragged/Scrubbed sound
			if (inputEvent.detail.status == InputActionStatuses.DRAG) {
				UI.sendAudioEvent(Audio.getSoundTag('data-audio-minimap-scrubbed-map', 'audio-panel-mini-map'));
			}

			if (inputEvent.detail.name == 'mousebutton-left' && inputEvent.detail.status == InputActionStatuses.START) {
				this.panInProgress = true;
			}

			if (this.panInProgress) {
				const quickPan = inputEvent.detail.status == InputActionStatuses.DRAG || inputEvent.detail.status == InputActionStatuses.UPDATE;

				if (inputEvent.detail.name == 'mousebutton-left') {
					this.updateMinimapCamera(quickPan, this.lastCursorPos.x, this.lastCursorPos.y);
				} else {
					this.updateMinimapCamera(quickPan, inputEvent.detail.x, inputEvent.detail.y);
				}

				inputEvent.stopPropagation();
				inputEvent.preventDefault();
			}
		}
	}

	private onSocialPanelOpened() {
		// social panel is opening.  if the lens panel is open, close it now.
		if (this.lensPanelState) {
			this.toggleLensPanel();
		}
	}

	private onCursorUpdated(event: CursorUpdatedEvent) {
		if (event.detail.target instanceof HTMLElement) {
			if (event.detail.target != this.mapLastCursor) {
				if (event.detail.target == this.mapImage) {
					this.playSound("data-audio-minimap-focus");
				}
			}
			this.mapLastCursor = event.detail.target;

			this.lastCursorPos.x = event.detail.x;
			this.lastCursorPos.y = event.detail.y;
		}
	}

	private onEngineInput(inputEvent: InputEngineEvent) {

		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		switch (inputEvent.detail.name) {
			case 'cancel':
			case 'sys-menu':
				if (this.chatPanelState) {
					this.toggleChatPanel();
				}
				if (this.lensPanelState) {
					this.toggleLensPanel();
				}
				inputEvent.stopPropagation();
				inputEvent.preventDefault();
				break;
		}
	}

	private onEngineInputCapture(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.name == "touch-complete" ||
			(inputEvent.detail.name == "mousebutton-left" && inputEvent.detail.status == InputActionStatuses.FINISH)) {
			this.panInProgress = false;
		}
	}

	private updateChatNavHelp() {
		this.chatPanel.classList.toggle("trigger-nav-help", this.chatPanelState && ContextManager.getCurrentTarget()?.tagName != "SEND-TO-PANEL" && ContextManager.getCurrentTarget()?.tagName != "EMOTICON-PANEL");
	}

	private updateMinimapCamera(quickPan: boolean, x: number, y: number) {
		const minimapRect = this.mapImage?.getBoundingClientRect();

		if (minimapRect) {
			// Convert coordinates to UV space (0,0 to 1,1)
			const minimapU = (x - minimapRect.left) / minimapRect.width;
			const minimapV = 1 - ((y - minimapRect.top) / minimapRect.height);

			const worldPos = WorldUI.minimapToWorld({ x: minimapU, y: minimapV });

			if (worldPos && (this.lastMinimapPos.x != worldPos.x || this.lastMinimapPos.y != worldPos.y)) {
				if (quickPan) {
					Camera.panFocus({ x: worldPos.x - this.lastMinimapPos.x, y: worldPos.y - this.lastMinimapPos.y });
				} else {
					Camera.lookAt(worldPos.x, worldPos.y);
				}

				this.lastMinimapPos = worldPos;
			}
		}
	}

	private isOpenRadialButtonVisible() {
		return (this.isScreenSmallMode() || UI.getViewExperience() == UIViewExperience.Mobile) && ActionHandler.isGamepadActive;
	}

	private updateRadialButton() {
		this.miniMapRadialButton.classList.toggle("hidden", !this.isOpenRadialButtonVisible());
	}

	private updateLensButton() {
		const isRadialButton = this.isOpenRadialButtonVisible();
		this.miniMapLensButton.classList.toggle("mx-3", isRadialButton);
		this.miniMapLensButton.classList.toggle("mx-1", !isRadialButton);
	}

	private updateRadialNavHelpContainer() {
		this.radialNavHelpContainer.classList.toggle("hidden", !this.isOpenRadialButtonVisible());
	}

	private updateLensActionNavHelp() {
		const isRadialButton = this.isOpenRadialButtonVisible();
		if (isRadialButton) {
			const isMobileViewExperience = UI.getViewExperience() == UIViewExperience.Mobile;
			this.toggleLensActionNavHelp.classList.toggle("right-14", isMobileViewExperience);
			this.toggleLensActionNavHelp.classList.toggle("right-12", !isMobileViewExperience);
		} else {
			this.toggleLensActionNavHelp.classList.remove("right-14", "right-12");
		}
		this.toggleLensActionNavHelp.classList.toggle("right-22", !isRadialButton);
	}

	private onResize() {
		this.updateRadialButton();
		this.updateLensButton();
		this.updateRadialNavHelpContainer();
		this.updateLensActionNavHelp()
	}

	private onActiveDeviceTypeChanged() {
		this.updateRadialButton();
		this.updateLensButton();
		this.updateRadialNavHelpContainer();
		this.updateLensActionNavHelp();
	}

	private isScreenSmallMode(): boolean {
		return window.innerHeight <= Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_HEIGHT) || window.innerWidth <= Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_WIDTH);
	}

	/**
	 * Create the button to toggle the lens panel
	 * @returns the button element
	 */
	private createMinimapLensButton() {
		const miniMapButton = document.createElement("fxs-activatable");
		miniMapButton.classList.add("mini-map__lens-button", "mx-1");
		miniMapButton.setAttribute('data-tooltip-content', Locale.compose('LOC_UI_TOGGLE_LENS_PANEL'));
		miniMapButton.addEventListener('action-activate', () => {
			const toggle = this.toggleLensPanel();
			miniMapButton.classList.toggle('mini-map__button--selected', toggle);
		});

		const miniMapBG = document.createElement("div");
		miniMapBG.classList.add('mini-map__lens-button__bg', "pointer-events-none");
		miniMapButton.appendChild(miniMapBG);

		const miniMapButtonIcon = document.createElement("div");
		miniMapButtonIcon.classList.add("mini-map__lens-button__icon", "pointer-events-none");
		miniMapButton.appendChild(miniMapButtonIcon);

		return miniMapButton;
	}

	/**
	 * Create the button to toggle the chat panel
	 * @returns the button element
	 */
	private createMinimapChatButton() {
		const miniMapButton = document.createElement("fxs-activatable");
		miniMapButton.classList.add("mini-map__chat-button", "relative", "w-12", "h-12", "mx-1");
		Databind.classToggle(miniMapButton, "hidden", "g_NavTray.isTrayRequired");
		miniMapButton.setAttribute('data-tooltip-content', Locale.compose('LOC_UI_TOGGLE_CHAT_PANEL'));
		miniMapButton.addEventListener('action-activate', () => {
			const toggle = this.toggleChatPanel();
			miniMapButton.classList.toggle('mini-map__button--selected', toggle);
		});

		const miniMapBG = document.createElement("div");
		miniMapBG.classList.add('mini-map__chat-button__bg', "pointer-events-none");
		miniMapButton.appendChild(miniMapBG);

		const miniMapButtonIcon = document.createElement("div");
		miniMapButtonIcon.classList.add("mini-map__chat-button__icon", "pointer-events-none");
		miniMapButton.appendChild(miniMapButtonIcon);

		miniMapButton.setAttribute("data-audio-group-ref", "audio-panel-mini-map");
		miniMapButton.setAttribute("data-audio-activate-ref", "data-audio-minimap-panel-toggle");

		return miniMapButton;
	}

	/**
	 * Create the button to open the radial menu
	 * @returns the button element
	 */
	private createMinimapRadialButton() {
		const miniMapButton = document.createElement("div");
		miniMapButton.classList.add("mini-map__radial-button", "relative", "w-12", "h-12", "mx-3");

		const miniMapBG = document.createElement("div");
		miniMapBG.classList.add('mini-map__radial-button__bg', "pointer-events-none");
		miniMapButton.appendChild(miniMapBG);

		const miniMapButtonIcon = document.createElement("div");
		miniMapButtonIcon.classList.add("mini-map__radial-button__icon", "pointer-events-none");
		miniMapButton.appendChild(miniMapButtonIcon);

		miniMapButton.setAttribute("data-audio-group-ref", "audio-panel-mini-map");
		miniMapButton.setAttribute("data-audio-activate-ref", "data-audio-minimap-panel-toggle");

		return miniMapButton;
	}

	/**
	 * Expand or collapse the chat panel
	 * @returns true if panel should be expanded
	 */
	toggleChatPanel = (): boolean => {

		if (!Configuration.getGame().isAnyMultiplayer || !Network.hasCommunicationsPrivilege(false)) {
			return false;
		}

		this.chatPanelState = !this.chatPanelState;
		this.miniMapChatButton.setAttribute('data-audio-press-ref',
			this.chatPanelState ?
				'data-audio-minimap-panel-close-press'
				: 'data-audio-minimap-panel-open-press'
		)
		this.chatPanel.classList.toggle("scale-0", !this.chatPanelState);
		this.updateChatNavHelp();

		if (ContextManager.hasInstanceOf("screen-mp-chat")) {
			this.chatScreen?.component.close();
		} else {
			if (this.lensPanelState) {
				this.toggleLensPanel();
			}
			this.chatScreen = ContextManager.push("screen-mp-chat", { singleton: true, createMouseGuard: false, targetParent: this.chatPanel });
			this.chatScreen.classList.add("w-full", "h-full");
		}

		return this.chatPanelState;
	}

	/**
	 * Expand or collapse the lens panel
	 * @returns true if panel should be expanded
	 */
	toggleLensPanel = (force?: boolean): boolean => {
		this.lensPanelState = force ?? !this.lensPanelState;
		this.lensPanel.classList.toggle('scale-0', !this.lensPanelState);
		this.updateChatNavHelp();

		const activateId = this.lensPanelState ?
			'data-audio-minimap-panel-open-release'
			: 'data-audio-minimap-panel-close-release';
		Audio.playSound(activateId, "audio-panel-mini-map");

		// Set open and close press/release sounds based on the lens Panel State
		this.miniMapLensButton.setAttribute('data-audio-press-ref',
			this.lensPanelState ?
				'data-audio-minimap-panel-close-press'
				: 'data-audio-minimap-panel-open-press'
		)

		if (ContextManager.hasInstanceOf("lens-panel")) {
			this.lensPanelComponent?.component.close();
		} else {
			if (this.chatPanelState) {
				this.toggleChatPanel();
			}
			this.lensPanelComponent = ContextManager.push("lens-panel", { singleton: true, createMouseGuard: false, targetParent: this.lensPanel });
		}

		return this.lensPanelState;
	}

	private onShowHighlight(event: CustomEvent) {
		if (!this.mapHighlight) {
			console.warn("PanelMiniMap: received a minimap-show-highlight event but the mapHighLight element is not set. Is the minimap attached yet?");
			return;
		}

		const x: number = parseInt(event.detail.x);
		const y: number = parseInt(event.detail.y);
		const oddLineOffset: number = y % 2 ? 0.5 : 0;
		const inverseY: number = this.mapHeight - 1 - y;

		// add 0.5 so the highlight is centered in the minimap plot
		const coordPercentX: number = (x + oddLineOffset + 0.5) / (this.mapWidth + 0.5) * 100;
		const coordPercentY: number = (inverseY + this.mapTopBorderTiles + 0.5) / (this.mapHeight + this.mapTopBorderTiles + this.mapBottomBorderTiles + 0.5) * 100;

		this.mapHighlight.style.transform = `translate(${coordPercentX}%, ${coordPercentY}%)`;

		// wait a bit so the animation can reset when going between two elements that request the highlight
		window.requestAnimationFrame(() => {
			window.requestAnimationFrame(() => {
				if (this.mapHighlight) {
					this.mapHighlight.classList.add('displayed');
				}
			});
		});
	}

	private onHideHighlight() {
		if (this.mapHighlight) {
			this.mapHighlight.classList.remove('displayed');
		} else {
			console.warn("PanelMiniMap: received a minimap-hide-highlight event but the mapHighLight element is not set. Is the minimap attached yet?");
		}
	}

	private onToggleMiniMap({ detail: { value } }: ToggleMiniMapEvent) {
		this.miniMapTopContainer.classList.toggle("mini-map__main-minimized", !value);
		if (value) {
			Audio.playSound("data-audio-showing", "audio-panel-mini-map")
		}
		else {
			Audio.playSound("data-audio-hiding", "audio-panel-mini-map")
		}
	}
}

Controls.define('panel-mini-map', {
	createInstance: PanelMiniMap,
	description: 'Minimap and lens/pennant display.',
	classNames: ['mini-map'],
	styles: ["fs://game/base-standard/ui/mini-map/panel-mini-map.css"],
	images: [
		'fs://game/hud_mini_box.png',
		'fs://game/action_lookout.png',
		'fs://game/hud_mini_lens_btn.png'
	]
});

export const TOGGLE_MINI_MAP_EVENT_NAME = "toggle-mini-map-event";
export class ToggleMiniMapEvent extends CustomEvent<{ value: boolean }> {
	constructor(value: boolean) {
		super(TOGGLE_MINI_MAP_EVENT_NAME, { bubbles: true, detail: { value } });
	}
}

export class LensPanel extends Panel {
	private lensPanel = document.createElement('fxs-vslot');
	private readonly lensRadioButtonContainer = document.createElement('fxs-spatial-slot');
	private readonly layerCheckboxContainer = document.createElement('fxs-spatial-slot');
	private readonly miniMapLensDisplayOptionName: string = "minimap_set_lens";
	private lensRadioButtons: HTMLElement[] = [];
	private lensElementMap: Record<string, HTMLElement> = {};
	private layerElementMap: Record<string, HTMLElement> = {};

	private onActiveLensChangedListener = this.onActiveLensChanged.bind(this);

	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.Fade;
		this.animateOutType = this.animateOutType = AnchorType.Fade;
	}

	onInitialize(): void {
		super.onInitialize();
		// Lens panel creation
		this.lensPanel.setAttribute('data-navrule-up', 'stop');
		this.lensPanel.setAttribute('data-navrule-down', 'stop');
		this.lensPanel.setAttribute('data-navrule-right', 'stop');
		this.lensPanel.setAttribute('data-navrule-left', 'stop');
		this.lensPanel.classList.add("mini-map__lens-panel", "left-3", "px-2", "py-8");

		const closeLensPanelNavHelp = document.createElement("fxs-nav-help");
		closeLensPanelNavHelp.setAttribute("action-key", "inline-cancel");
		closeLensPanelNavHelp.classList.add("absolute", "-right-4", "-top-3", "z-1");
		Databind.classToggle(closeLensPanelNavHelp, "hidden", "!{{g_NavTray.isTrayRequired}}");
		this.lensPanel.appendChild(closeLensPanelNavHelp);

		const lensPanelContent = document.createElement("div");
		lensPanelContent.classList.add("mb-5");
		this.lensPanel.appendChild(lensPanelContent);

		const lensPanelHeader = document.createElement("fxs-header");
		lensPanelHeader.classList.add("mb-3", "font-title-base", "text-secondary");
		lensPanelHeader.setAttribute('title', 'LOC_UI_MINI_MAP_LENSES');
		lensPanelHeader.setAttribute('filigree-style', 'h4');
		lensPanelContent.appendChild(lensPanelHeader);

		this.lensRadioButtonContainer.className = 'relative flex flex-wrap row items-start justify-start';
		lensPanelContent.appendChild(this.lensRadioButtonContainer);

		// Decorations panel creation
		const decorPanelContent = document.createElement("div");
		decorPanelContent.classList.add("mini-map__decor-panel-content");
		this.lensPanel.appendChild(decorPanelContent);

		const decorPanelHeader = document.createElement("fxs-header");
		decorPanelHeader.classList.add("mb-3", "font-title-base", "text-secondary");
		decorPanelHeader.setAttribute('title', 'LOC_UI_MINI_MAP_DECORATION');
		decorPanelHeader.setAttribute('filigree-style', 'h4');
		decorPanelContent.appendChild(decorPanelHeader);

		this.layerCheckboxContainer.className = 'relative flex flex-wrap row items-start justify-start';
		decorPanelContent.appendChild(this.layerCheckboxContainer);

		// Visibility panel creation
		const visibilityPanelContent = document.createElement("div");
		visibilityPanelContent.classList.add("fxs-vslot");
		this.lensPanel.appendChild(visibilityPanelContent);

		const visibilityDivider = document.createElement("div");
		visibilityDivider.classList.add("filigree-divider-inner-frame");
		visibilityPanelContent.appendChild(visibilityDivider);

		visibilityPanelContent.appendChild(this.createShowMinimapCheckbox());

		this.createLensButton("LOC_UI_MINI_MAP_NONE", 'fxs-default-lens', "lens-group");
		this.createLensButton("LOC_UI_MINI_MAP_SETTLER", 'fxs-settler-lens', "lens-group");
		this.createLensButton("LOC_UI_MINI_MAP_CONTINENT", "fxs-continent-lens", "lens-group");
		this.createLensButton("LOC_UI_MINI_MAP_TRADE", "fxs-trade-lens", "lens-group");
		this.createLayerCheckbox("LOC_UI_MINI_MAP_HEX_GRID", "fxs-hexgrid-layer");
		this.createLayerCheckbox("LOC_UI_MINI_MAP_RESOURCE", "fxs-resource-layer");
		this.createLayerCheckbox("LOC_UI_MINI_MAP_YIELDS", "fxs-yields-layer");

		this.Root.appendChild(this.lensPanel);
	}

	onAttach(): void {
		super.onAttach();
		window.addEventListener(LensActivationEventName, this.onActiveLensChangedListener);
		window.addEventListener(LensLayerEnabledEventName, this.onLensLayerEnabled);
		window.addEventListener(LensLayerDisabledEventName, this.onLensLayerDisabled);
	}

	onDetach(): void {
		super.onDetach();
		window.removeEventListener(LensActivationEventName, this.onActiveLensChangedListener);
		window.removeEventListener(LensLayerEnabledEventName, this.onLensLayerEnabled);
		window.removeEventListener(LensLayerDisabledEventName, this.onLensLayerDisabled);
	}

	onReceiveFocus(): void {
		super.onReceiveFocus();
		Focus.setContextAwareFocus(this.lensPanel, this.Root);
	}

	createShowMinimapCheckbox() {
		const checkboxLabelContainer = document.createElement("div");
		checkboxLabelContainer.className = 'w-1\\/2 flex flex-row items-center'

		const checkbox = document.createElement("fxs-checkbox");
		checkbox.classList.add('mr-2');
		checkbox.setAttribute('selected', 'true');
		checkbox.setAttribute("data-audio-group-ref", "audio-panel-mini-map");
		checkbox.setAttribute("data-audio-focus-ref", "data-audio-checkbox-focus");
		checkboxLabelContainer.appendChild(checkbox);

		const label = document.createElement("div");
		label.role = "paragraph";
		label.className = 'text-accent-2 text-base font-body pointer-events-auto';
		label.dataset.l10nId = "LOC_UI_SHOW_MINIMAP";
		checkboxLabelContainer.appendChild(label);

		checkbox.addEventListener(ComponentValueChangeEventName, (event: CheckboxValueChangeEvent) => {
			this.Root.dispatchEvent(new ToggleMiniMapEvent(event.detail.value));
		});

		return checkboxLabelContainer;
	}

	createLayerCheckbox(caption: string, layer: LensLayerName) {
		const isLayerEnabled: boolean = LensManager.isLayerEnabled(layer);

		// Create and set up the checkbox
		const checkbox = document.createElement("fxs-checkbox");
		this.layerElementMap[layer] = checkbox;
		checkbox.classList.add('mr-2');
		checkbox.setAttribute('selected', isLayerEnabled.toString());
		checkbox.setAttribute("data-audio-group-ref", "audio-panel-mini-map");
		checkbox.setAttribute("data-audio-focus-ref", "data-audio-checkbox-focus");
		const checkboxLabelContainer = document.createElement("div");
		checkboxLabelContainer.className = 'w-1\\/2 flex flex-row items-center'
		checkboxLabelContainer.appendChild(checkbox);

		const label = document.createElement("div");
		label.role = "paragraph";
		label.className = 'text-accent-2 text-base font-body pointer-events-auto'
		label.dataset.l10nId = caption;

		checkboxLabelContainer.appendChild(label);
		this.layerCheckboxContainer.appendChild(checkboxLabelContainer);

		checkbox.addEventListener(ComponentValueChangeEventName, (event: CheckboxValueChangeEvent) => {
			const isLayerEnabled: boolean = LensManager.isLayerEnabled(layer);
			if (isLayerEnabled != event.detail.value) {
				LensManager.toggleLayer(layer, event.detail.value);
				MiniMapData.setDecorationOption(layer, event.detail.value);
			}
		});
	}

	createLensButton(caption: string, lens: string, group: string) {
		const isLensEnabled = LensManager.getActiveLens() === lens;

		const radioButtonLabelContainer = document.createElement("div");
		radioButtonLabelContainer.className = 'w-1\\/2 flex flex-row items-center';

		const radioButton = document.createElement("fxs-radio-button");
		this.lensElementMap[lens] = radioButton;
		radioButton.classList.add("mr-2");
		radioButton.setAttribute("group-tag", group);
		radioButton.setAttribute('value', lens);
		radioButton.setAttribute("caption", caption);
		radioButton.setAttribute('selected', isLensEnabled.toString());
		radioButton.setAttribute('tabindex', '-1');
		radioButton.setAttribute("data-audio-group-ref", "minimap-radio-button");
		radioButtonLabelContainer.appendChild(radioButton);
		this.lensRadioButtons.push(radioButton);

		const label = document.createElement("div");
		label.role = "paragraph";
		label.className = 'text-accent-2 text-base font-body pointer-events-auto';
		label.dataset.l10nId = caption;
		radioButtonLabelContainer.appendChild(label);

		this.lensRadioButtonContainer.appendChild(radioButtonLabelContainer);

		// Set selected if layer is already enabled
		radioButton.addEventListener(ComponentValueChangeEventName, this.onLensChange);
	}

	close() {
		super.close();
	}

	private onLensChange = (event: RadioButtonChangeEvent<LensName>) => {
		const { isChecked, value: lens } = event.detail;

		if (isChecked) {
			LensManager.setActiveLens(lens);
			MiniMapData.setLensDisplayOption(this.miniMapLensDisplayOptionName, lens);
		}
	}

	private onActiveLensChanged() {
		for (const lensButton of this.lensRadioButtons) {
			const isLensEnabled = LensManager.getActiveLens() === lensButton.getAttribute("value");
			lensButton.setAttribute('selected', isLensEnabled.toString());
		}
	}

	private onLensLayerEnabled = (event: LensLayerEvent) => {
		const checkbox = this.layerElementMap[event.detail.layer];
		checkbox?.setAttribute('selected', 'true');
	}

	private onLensLayerDisabled = (event: LensLayerEvent) => {
		const checkbox = this.layerElementMap[event.detail.layer];
		checkbox?.setAttribute('selected', 'false');
	}
}

Controls.define('lens-panel', {
	createInstance: LensPanel,
	description: 'Lens Panel',
	classNames: ['lens-panel'],
	tabIndex: -1,
});

declare global {
	interface HTMLElementTagNameMap {
		'lens-panel': ComponentRoot<LensPanel>
	}
	interface HTMLElementEventMap {
		TOGGLE_MINI_MAP_EVENT_NAME: ToggleMiniMapEvent;
	}
}