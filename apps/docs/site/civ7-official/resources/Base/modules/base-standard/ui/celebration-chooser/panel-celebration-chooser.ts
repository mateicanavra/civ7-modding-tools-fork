/**
 * @file panel-celebration-chooser.ts
 * @copyright 2020-2024, Firaxis Games
 * @description Celebration chooser screen.  This screen is an instance of a general chooser.
 */

import { ScreenGeneralChooser } from '/base-standard/ui/general-chooser/screen-general-chooser.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { ChooserItem } from "/base-standard/ui/chooser-item/chooser-item.js";
import { ChooserNode } from "/base-standard/ui/chooser-item/model-chooser-item.js";
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { Focus } from '/core/ui/input/focus-support.js';

class CelebrationChooser extends ScreenGeneralChooser {
	private confirmButtonListener = this.onConfirm.bind(this);

	private currentlySelectedChoice: HTMLElement | null = null;
	private confirmButton!: HTMLElement;
	private bonusEntryContainer!: HTMLElement;

	onInitialize(): void {
		this.confirmButton = MustGetElement(".celebrations__confirm", this.Root);
		this.createCloseButton = false;
	}

	onAttach() {
		super.onAttach();

		this.confirmButton.addEventListener('action-activate', this.confirmButtonListener);

		const celebrationSubsystemFrame: HTMLElement = MustGetElement(".celebration-subsystem-frame", this.Root);
		celebrationSubsystemFrame.addEventListener('subsystem-frame-close', () => { this.close(); });

		UI.sendAudioEvent(Audio.getSoundTag('data-audio-golden-age-chooser-enter', 'golden-age-chooser'));

		Databind.classToggle(this.confirmButton, 'hidden', `g_NavTray.isTrayRequired`);

		this.realizeCelebrationPanel();
	}

	onDetach() {
		this.confirmButton.removeEventListener('action-activate', this.confirmButtonListener);
		UI.sendAudioEvent(Audio.getSoundTag('data-audio-golden-age-chooser-exit', 'golden-age-chooser'));
		engine.off('TraditionSlotsAdded', this.onPolicySlotsAdded, this);
		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		const focusElement: HTMLElement = MustGetElement('.celebrations__choices-container', this.Root);
		Focus.setContextAwareFocus(focusElement, this.Root);
	}

	private realizeCelebrationPanel() {
		const uiViewExperience = UI.getViewExperience();

		const playerObject: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (!playerObject) {
			console.error("panel-celebration-chooser: realizeCelebrationPanel - Unable to get player object for local player while trying to government info!");
			return;
		}

		if (!playerObject.Culture) {
			console.error("panel-celebration-chooser: realizeCelebrationPanel - No valid culture object attached to local player!");
			return;
		}

		const playerHappiness: PlayerHappiness | undefined = playerObject.Happiness;
		if (playerHappiness == undefined) {
			console.error("panel-celebration-chooser: realizeCelebrationPanel - No player happiness!");
			return;
		}

		const governmentDefinition: GovernmentDefinition | null = GameInfo.Governments.lookup(playerObject.Culture.getGovernmentType());
		if (!governmentDefinition) {
			console.error("panel-celebration-chooser: realizeCelebrationPanel - No valid GovernmentDefinition for local player!");
			return;
		}

		if (!governmentDefinition.Description) {
			console.error("panel-celebration-chooser: realizeCelebrationPanel - No description for government: " + governmentDefinition.GovernmentType);
			return;
		}

		const celebrationHeader: HTMLElement = MustGetElement(".celebrations__header", this.Root);
		celebrationHeader.setAttribute("title", governmentDefinition.CelebrationName);

		const governmentType = MustGetElement(".celebrations__government-title", this.Root);
		governmentType.setAttribute("data-l10n-id", governmentDefinition.Name);

		const governmentDescriptionBottom = MustGetElement(".celebrations__government-desc-bottom", this.Root);
		governmentDescriptionBottom.innerHTML = Locale.stylize("LOC_UI_CELEBRATION_DESC_2", playerHappiness.getGoldenAgeDuration());

		this.bonusEntryContainer = MustGetElement<HTMLElement>('.celebrations__choices-container', this.Root);

		this.createEntries(this.bonusEntryContainer);

		const celebrationSubsystemFrame: HTMLElement = MustGetElement(".celebration-subsystem-frame", this.Root);
		celebrationSubsystemFrame.classList.toggle('top-48', uiViewExperience != UIViewExperience.Mobile);

		if (uiViewExperience == UIViewExperience.Mobile) {
			celebrationSubsystemFrame.classList.add('top-10');

			this.bonusEntryContainer.classList.add('w-128');
			this.bonusEntryContainer.classList.add('mx-6');
			this.bonusEntryContainer.classList.remove('mx-11');
			this.bonusEntryContainer.classList.remove('h-80');
			this.bonusEntryContainer.classList.remove('w-96');

			celebrationHeader.classList.add('mb-4');
			celebrationHeader.classList.remove('w-80');
			celebrationHeader.classList.remove('mb-8');

			const governmentTopContainer = MustGetElement('.celebrations__government-container', this.Root);
			governmentTopContainer.classList.add('mt-2');
			governmentTopContainer.classList.remove('mt-10');

			const governmentDescriptionContainer = MustGetElement('.celebrations__government', this.Root);
			governmentDescriptionContainer.classList.add('mt-4');
			governmentDescriptionContainer.classList.add('mb-6');
			governmentDescriptionContainer.classList.remove('my-10');

			const governmentDescriptionTop = MustGetElement(".celebrations__government-desc-top", this.Root);
			governmentDescriptionTop.classList.add('max-w-128');
			governmentDescriptionTop.classList.remove('max-w-96');

			governmentDescriptionBottom.classList.add('max-w-128');
			governmentDescriptionBottom.classList.remove('max-w-96');
		}
	}

	/**
	 * Create the list of entries in this chooser. Called by the base general chooser.
	 * @param {element} entryContainer - The HTML element that's the parent of all of the entries.
	 */
	protected createEntries(entryContainer: HTMLElement) {
		const localPlayerID: PlayerId = GameContext.localPlayerID;

		if (!Players.isValid(localPlayerID)) {
			console.error("panel-celebration-chooser: createEntries - GameContext.localPlayerID is not a valid player!");
			return;
		}

		const player: PlayerLibrary | null = Players.get(localPlayerID);
		if (player == null || player.Culture == undefined) {
			console.error("panel-celebration-chooser: createEntries - Couldn't get local player!");
			return;
		}

		const playerHappiness: PlayerHappiness | undefined = player.Happiness;
		if (playerHappiness == undefined) {
			console.error("panel-celebration-chooser: createEntries - No player happiness!");
			return;
		}

		const playerCulture: PlayerCulture | undefined = player.Culture;
		if (!playerCulture) {
			console.error("panel-celebration-chooser: createEntries - No player culture!");
			return;
		}

		const choices: string[] = playerCulture.getGoldenAgeChoices();
		const numChoices: number = choices.length;
		const hasExtraChoices: boolean = numChoices > 2;
		const governmentContainer: HTMLElement = MustGetElement(".celebrations__government", this.Root);
		governmentContainer.classList.add(hasExtraChoices ? "my-4" : "my-10");
		for (const choice of choices) {
			let celebrationItemDef: GoldenAgeDefinition | null = GameInfo.GoldenAges.lookup(choice);
			if (!celebrationItemDef) {
				console.error(`panel-celebration-chooser: createEntries - No golden age definition found for ${celebrationItemDef}!`);
				return;
			}
			const celebrationItem = document.createElement("celebration-chooser-item") as ComponentRoot<CelebrationChooserItem>;
			celebrationItem.classList.add("bg-primary-4");
			celebrationItem.setAttribute("data-audio-group-ref", "golden-age-chooser");
			celebrationItem.setAttribute("data-audio-focus-ref", "data-audio-golden-age-chooser-focus");
			celebrationItem.setAttribute("data-audio-activate-ref", "data-audio-golden-age-chooser-activate");
			celebrationItem.componentCreatedEvent.on((chooser) => {
				chooser.celebrationChooserNode = this.createCelebrationNode(celebrationItemDef!, playerHappiness.getGoldenAgeDuration());
			});
			celebrationItem.classList.add(hasExtraChoices ? "my-2" : "my-5");

			this.tagEntry(celebrationItem);
			celebrationItem.setAttribute("golden-age-type", celebrationItemDef.GoldenAgeType);
			entryContainer.appendChild(celebrationItem);
		}
	}

	private createCelebrationNode(celebrationItemDef: GoldenAgeDefinition, celebrationDuration: number): CelebrationChooserNode {
		const primaryIcon: string = UI.getIconURL(celebrationItemDef.GoldenAgeType);
		console.log(primaryIcon);
		return {
			name: Locale.compose(celebrationItemDef.Name),
			primaryIcon: primaryIcon,
			description: celebrationItemDef.Description,
			turnDuration: celebrationDuration,
			isLocked: false
		}
	}

	/**
	 * Called by the base general chooser when the user chooses an item in the list.
	 * @param {element} entryElement - The HTML element chosen.
	 */
	entrySelected(entryElement: HTMLElement) {
		if (this.currentlySelectedChoice) {
			this.currentlySelectedChoice.setAttribute("selected", "false");
		}
		entryElement.setAttribute("selected", "true");
		this.currentlySelectedChoice = entryElement;
		this.confirmButton.removeAttribute("disabled");
		NavTray.addOrUpdateShellAction1("LOC_UI_RESOURCE_ALLOCATION_CONFIRM");
	}

	protected onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
			this.close();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
		if (inputEvent.detail.name == 'shell-action-1') {
			if (this.currentlySelectedChoice) {
				this.onConfirm();
			}
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private onConfirm() {
		if (!this.currentlySelectedChoice) {
			console.error("panel-celebration-chooser: onConfirm() - no golden age choice currently selected!");
			return;
		}
		const goldenAgeType: string | null = this.currentlySelectedChoice.getAttribute("golden-age-type");
		if (goldenAgeType) {
			let args: any = {
				GoldenAgeType: Database.makeHash(goldenAgeType)
			};

			const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.CHOOSE_GOLDEN_AGE, args, false);
			if (result.Success) {
				Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.CHOOSE_GOLDEN_AGE, args);
				//display policies screen after the slot gets added
				engine.on('TraditionSlotsAdded', this.onPolicySlotsAdded, this);
			}
		}
	}

	private onPolicySlotsAdded(data: TraditionSlotsAdded_EventData) {
		if (data.player == GameContext.localPlayerID) {
			ContextManager.push("screen-policies", { singleton: true, createMouseGuard: true });
			this.close();
		}
	}
}

Controls.define('panel-celebration-chooser', {
	createInstance: CelebrationChooser,
	description: 'Celebration Chooser',
	classNames: ['panel-celebration-chooser', 'fullscreen'],
	styles: ['fs://game/base-standard/ui/celebration-chooser/panel-celebration-chooser.css'],
	content: ['fs://game/base-standard/ui/celebration-chooser/panel-celebration-chooser.html'],
	attributes: []
});

class CelebrationChooserItem extends ChooserItem {
	public get celebrationChooserNode(): CelebrationChooserNode | null {
		return this._chooserNode as CelebrationChooserNode;
	}

	public set celebrationChooserNode(value: CelebrationChooserNode | null) {
		this._chooserNode = value;
	}

	render() {
		super.render();

		const chooserItem = document.createDocumentFragment();

		const node = this.celebrationChooserNode;
		if (!node) {
			console.error("celebration-chooser-item: render() - celebrationChooserNode was null!");
			return;
		}

		this.Root.classList.add("chooser-item_unlocked", "text-accent-2", "flex", "items-center", "min-h-20", "py-1");

		const primaryIcon: HTMLElement = this.createChooserIcon(node.primaryIcon);
		chooserItem.appendChild(primaryIcon);

		const description: HTMLDivElement = document.createElement("div");
		description.classList.value = "font-body-sm px-1 text-accent-3 max-w-76 relative";
		description.innerHTML = Locale.stylize(node.description, node.turnDuration);
		chooserItem.appendChild(description);

		this.Root.appendChild(chooserItem);
	}
}

Controls.define('celebration-chooser-item', {
	createInstance: CelebrationChooserItem,
	description: 'A chooser item to be used with the celebration chooser',
	classNames: ['celebration-chooser-item', "relative", "group"],
	styles: [
		'fs://game/base-standard/ui/chooser-item/chooser-item.css'
	],
	images: ['fs://game/hud_sidepanel_list-bg.png', 'fs://game/hud_list-focus_frame.png', 'fs://game/hud_turn-timer.png', 'fs://game/hud_civics-icon_frame.png'],
	attributes: [{ name: 'selected' }]
});

declare global {
	interface HTMLElementTagNameMap {
		'celebration-chooser-item': ComponentRoot<CelebrationChooserItem>
	}
}

interface CelebrationChooserNode extends ChooserNode {
	description: string;
	turnDuration: number
}