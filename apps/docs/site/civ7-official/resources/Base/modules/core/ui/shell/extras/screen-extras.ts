/**
 * @file screen-extras.ts
 * @copyright 2024, Firaxis Games
 * @description Sub-menu showing additional items that aren't on the main menu.
 */

import ContextManager from '/core/ui/context-manager/context-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js';
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { ModsContent } from 'core/ui/shell/mods-content/mods-content.js';

export class ScreenExtras extends Panel {
	private title!: HTMLElement;
	private closeButtonListener = () => { this.close(); }
	private engineInputListener = this.onEngineInput.bind(this);
	private creditsListener = this.onCredits.bind(this);
	private legalListener = this.onLegal.bind(this);
	private additionalContentButtonListener = this.onAdditionalContentButtonPressed.bind(this);
	private activeDeviceTypeListener: EventListener = this.onActiveDeviceTypeChanged.bind(this);

	constructor(root: ComponentRoot) {
		super(root);
		this.enableOpenSound = true;
		this.enableCloseSound = true;
		this.Root.setAttribute("data-audio-group-ref", "additional-content-audio");
	};

	onAttach() {
		super.onAttach();

		this.Root.addEventListener('engine-input', this.engineInputListener);

		this.title = MustGetElement(".additional-content-header", this.Root);

		const closeButton = MustGetElement('.additional-content-back-button', this.Root);
		closeButton.addEventListener('action-activate', this.closeButtonListener);
		if (ActionHandler.isGamepadActive) {
			closeButton.classList.add('hidden');
		}
		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);

		Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.AdditionalContent, MenuAction: TelemetryMenuActionType.Load });

		const modsButton = MustGetElement('.extras-item-mods', this.Root);

		if (UI.supportsDLC()) {
			modsButton.addEventListener("action-activate", this.additionalContentButtonListener);
		} else {
			modsButton.remove();
		}

		const creditsButton = MustGetElement('.extras-item-credits', this.Root);
		creditsButton.addEventListener("action-activate", this.creditsListener);

		const legalButton = MustGetElement('.extras-item-legal', this.Root);
		legalButton.addEventListener("action-activate", this.legalListener);

		const graphicsBenchmarkButton = MustGetElement('.extras-item-benchmark-graphics', this.Root);
		const aiBenchmarkButton = MustGetElement('.extras-item-benchmark-ai', this.Root);

		if (UI.shouldDisplayBenchmarkingTools()) {
			graphicsBenchmarkButton.addEventListener("action-activate", this.onGraphicsBenchmark.bind(this));
			aiBenchmarkButton.addEventListener("action-activate", this.onAiBenchmark.bind(this));
		} else {
			graphicsBenchmarkButton.remove();
			aiBenchmarkButton.remove();
		}
	}


	onDetach() {
		//The close sound effect gets called by Panel.close(). However, for some reason this screen doesn't call that. So we need to call
		//the close sound directly from here
		this.playAnimateOutSound();
		Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.AdditionalContent, MenuAction: TelemetryMenuActionType.Exit });

		this.Root.removeEventListener('engine-input', this.engineInputListener);

		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);

		super.onDetach();
	}

	override generateOpenCallbacks(callbacks: Record<string, OptionalOpenCallback>): void {
		callbacks['screen-credits'] = this.onCredits;
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		const extraMenu = MustGetElement(".extras-menu", this.Root);
		FocusManager.setFocus(extraMenu);

		NavTray.clear();
		NavTray.addOrUpdateGenericBack();
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	close() {
		ContextManager.popUntil("main-menu");
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.detail.name == 'cancel' || inputEvent.detail.name == 'sys-menu' || inputEvent.detail.name == 'keyboard-escape') {
			this.close();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private onActiveDeviceTypeChanged(event: CustomEvent) {
		const closeButton = MustGetElement('.additional-content-back-button', this.Root);
		closeButton.classList.toggle('hidden', event.detail?.gamepadActive);
	}

	private onAdditionalContentButtonPressed(event: ActionActivateEvent) {
		if (!(event.target instanceof HTMLElement)) {
			return;
		}

		const buttonID: string | null = event.target.getAttribute('button-id');
		if (!buttonID) {
			return;
		}

		this.title.setAttribute("title", "LOC_UI_CONTENT_MGR_TITLE");
		const slotGroup = MustGetElement('.additional-content-slot-group', this.Root);
		const screenModContent = MustGetElement<ComponentRoot<ModsContent>>('.mods-content', this.Root);

		slotGroup.setAttribute('selected-slot', buttonID);
		FocusManager.setFocus(screenModContent);
	}

	private onCredits() {
		ContextManager.popUntil("main-menu");
		ContextManager.push("screen-credits", { singleton: true, createMouseGuard: false });
		Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.AdditionalContent, MenuAction: TelemetryMenuActionType.Select, Item: "Credits" });
	}

	private onLegal() {
		ContextManager.popUntil("main-menu");
		ContextManager.push("screen-mp-legal", { singleton: true, createMouseGuard: true, panelOptions: { viewOnly: true } });
		Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.AdditionalContent, MenuAction: TelemetryMenuActionType.Select, Item: "Legal" });
	}

	private onGraphicsBenchmark() {
		Benchmark.Game.setDebugUiVisiblity(false);
		Benchmark.Automation.start(GameBenchmarkType.GRAPHICS);
	}

	private onAiBenchmark() {
		Benchmark.Game.setDebugUiVisiblity(false);
		Benchmark.Automation.start(GameBenchmarkType.AI);
	}
}

Controls.define('screen-extras', {
	createInstance: ScreenExtras,
	description: 'Extras screen.',
	classNames: ['screen-extras', 'w-full', 'h-full', 'flex', 'items-center', 'justify-center'],
	styles: ['fs://game/core/ui/shell/extras/screen-extras.css'],
	content: ['fs://game/core/ui/shell/extras/screen-extras.html'],
	opens: [
		'screen-credits'
	],
	attributes: [],
});
