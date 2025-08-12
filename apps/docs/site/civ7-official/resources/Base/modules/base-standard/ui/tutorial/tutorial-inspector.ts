/**
 * @file tutorial-inspector.ts
 * @copyright 2020-2022, Firaxis Games
 * @description Debug panel for showing the progression of the tutorial.
 */

import '/base-standard/ui/tutorial/model-tutorial-inspector.js';
import { TutorialItemState } from '/base-standard/ui/tutorial/tutorial-item.js';
import TutorialManager from '/base-standard/ui/tutorial/tutorial-manager.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { MakeDraggable, MakeResizeable } from '/core/ui/utilities/utilities-frame.js';

/**
 * The UI (information and controls) for tutorial system
 */
class TutorialInspector extends Component {
	private removeDraggable: Function | undefined;
	private removeResizeable: Function | undefined;

	constructor(root: ComponentRoot) {
		super(root);
	}

	onAttach() {
		super.onAttach();


		const frame = document.createElement("fxs-frame");

		//Set up clicking on the child line items
		frame.addEventListener('action-activate', (event: Event) => {
			const targetElement = event.target as HTMLElement;
			if (targetElement) {
				const itemType = targetElement.getAttribute('item-type');
				if (itemType) {
					this.playSound('data-audio-activate', 'data-audio-activate-ref');
					engine.trigger("TutorialBegin");
				}
			}
		});

		const scrollable = document.createElement('fxs-scrollable');

		const container = document.createElement("div");
		container.classList.add("flow-column");
		container.classList.add("container-list");
		container.setAttribute("tabindex", "-1");

		const itemDiv = document.createElement('div');
		Databind.for(itemDiv, "g_TutorialInspector.items", "item")
		{
			const item = document.createElement('div');
			item.classList.add("tutorial-inspector-item");

			Databind.classToggle(item, "tintbg", "{{item.index}} % 2 == 0");

			const itemBG = document.createElement("div");
			itemBG.classList.add("bg-container");
			item.appendChild(itemBG);

			const caption = document.createElement("div");
			caption.classList.add("caption");
			caption.classList.add("ti__item-id");
			Databind.locText(caption, "item.ID");
			item.appendChild(caption);

			const itemState = document.createElement("div");
			itemState.classList.add("caption");
			itemState.classList.add("ti__item-status");
			Databind.locText(itemState, "item.status");
			item.appendChild(itemState);

			const hiddenState = document.createElement("div");
			hiddenState.classList.add("caption");
			hiddenState.classList.add("ti__item-hidden");
			Databind.locText(hiddenState, "item.calloutHiddenText");
			item.appendChild(hiddenState);

			const activateButton: HTMLElement = document.createElement("fxs-activatable");
			activateButton.classList.add("ti__button");
			activateButton.innerHTML = Locale.compose("LOC_UI_TUT_ACTIVATE_EVENT");
			Databind.classToggle(activateButton, "disabled", "item.isDisabled");
			Databind.classToggle(activateButton, "hidden", "!{{item.hasEventListeners}}");
			Databind.attribute(activateButton, 'nodeID', "item.ID");
			Databind.tooltip(activateButton, "item.activateLabel");

			activateButton.addEventListener('action-activate', (event: Event) => {
				const targetElement = event.target as HTMLElement;
				if (targetElement) {
					const nodeID = targetElement.getAttribute('nodeID');
					if (nodeID) {
						if (TutorialManager.forceActivation(nodeID)) {
							this.playSound('data-audio-activate', 'data-audio-activate-ref');
						}
					}
				}
			});

			item.appendChild(activateButton);

			const toggle: HTMLElement = document.createElement("fxs-switch");
			toggle.setAttribute("data-tooltip-content", Locale.compose("LOC_UI_TUT_ITEM_TOGGLE"));
			Databind.attribute(toggle, 'nodeID', "item.ID");
			Databind.attribute(toggle, 'status', "item.status");
			item.appendChild(toggle);

			toggle.addEventListener('action-activate', (event: Event) => {
				const targetElement = event.target as HTMLElement;
				if (targetElement) {
					const status: string | null = targetElement.getAttribute('status');
					const nodeID: string | null = targetElement.getAttribute('nodeID');
					if (nodeID && status) {
						this.playSound('data-audio-activate', 'data-audio-activate-ref');
						this.forceNextItemState(status, nodeID);
					}
				}
			});

			itemDiv.appendChild(item);
		}
		container.appendChild(itemDiv);

		scrollable.appendChild(container);
		frame.appendChild(scrollable);
		this.Root.appendChild(frame);

		const toggleButton = document.createElement('fxs-button');
		toggleButton.setAttribute("caption", Locale.compose("LOC_UI_TOGGLE_TUT_INSPECTOR"));
		toggleButton.addEventListener('action-activate', () => {
			this.playSound('data-audio-activate', 'data-audio-activate-ref');
			this.Root.classList.toggle("collapsed");
		});
		toggleButton.classList.add("mb-2");

		const resetButton = document.createElement('fxs-button');
		resetButton.setAttribute("caption", Locale.compose("LOC_UI_RESET_TUT_MANAGER"));
		resetButton.addEventListener('action-activate', () => {
			this.playSound('data-audio-activate', 'data-audio-activate-ref');
			TutorialManager.reset();
		});

		const logButton = document.createElement('fxs-button');
		logButton.setAttribute("caption", Locale.compose("LOC_UI_LOG_TUT_MANAGER"));
		logButton.addEventListener('action-activate', () => {
			this.playSound('data-audio-activate', 'data-audio-activate-ref');
			const logLines = TutorialManager.getDebugLogOutput();
			logLines.forEach(line => {
				console.log(line);
			});
		});


		const close: HTMLElement = document.createElement('fxs-button');
		Databind.if(close, "g_NavTray.isTrayActive")
		close.setAttribute('caption', 'LOC_GENERIC_CLOSE');
		close.addEventListener('action-activate', () => {
			UI.sendAudioEvent("generic-panel-hiding");
			this.close();
		});

		frame.appendChild(toggleButton);
		frame.appendChild(resetButton);
		frame.appendChild(logButton);
		frame.appendChild(close);

		//moved this down so it sat on top
		const closeButton: HTMLElement = document.createElement('fxs-close-button');
		closeButton.addEventListener('action-activate', () => {
			UI.sendAudioEvent("generic-panel-hiding");
			this.close();
		});
		this.Root.appendChild(closeButton);
		const minimizeButton = document.createElement("fxs-minimize-button");
		this.Root.appendChild(minimizeButton);

		this.removeDraggable = MakeDraggable(this.Root, ".header");
		this.removeResizeable = MakeResizeable(this.Root);
	}

	onDetach() {
		if (this.removeDraggable && this.removeResizeable) {
			this.removeDraggable();
			this.removeResizeable();
		}
	}

	private forceNextItemState(currentStatus: string, nodeID: string) {
		switch (currentStatus) {
			case TutorialItemState[TutorialItemState.Unseen]:
				TutorialManager.forceActivate(nodeID);
				break;
			case TutorialItemState[TutorialItemState.Active]:
			case TutorialItemState[TutorialItemState.Persistent]:
				TutorialManager.forceComplete(nodeID);
				break;
			case TutorialItemState[TutorialItemState.Completed]:
				TutorialManager.unsee(nodeID);
				break;
			default:
				break;
		}
	}

	close() {
		ContextManager.popIncluding(this.Root.tagName);
	}
}

Controls.define('panel-tutorial-inspector', {
	createInstance: TutorialInspector,
	description: '',
	classNames: ['tutorial-inspector'],
	styles: ["fs://game/base-standard/ui/tutorial/tutorial-inspector.css"],
	attributes: []
});
