/**
 * @file screen-pantheon-chooser.ts
 * @copyright 2020-2024, Firaxis Games
 * @description Pantheon Chooser screen.  This screen is an instance of a general chooser.
 */

import { ScreenGeneralChooser } from '/base-standard/ui/general-chooser/screen-general-chooser.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { realizePlayerColors } from '/core/ui/utilities/utilities-color.js'
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { PantheonChooserNode } from '/base-standard/ui/pantheon-chooser-item/model-pantheon-chooser-item.js';
import { PantheonChooserItem } from '/base-standard/ui/pantheon-chooser-item/pantheon-chooser-item.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';

class ScreenPantheonChooser extends ScreenGeneralChooser {
	private confirmButtonListener = this.onConfirm.bind(this);

	private pantheonContainer!: HTMLElement;
	private pantheonSubtitle!: HTMLElement;
	private confirmButton!: HTMLElement;
	private pantheonFrame!: HTMLElement;

	private numPantheonsToAdd: number = -1;
	private pantheonsToAdd: BeliefType[] = [];
	private pantheonButtonsMap: Map<BeliefType, HTMLElement> = new Map<BeliefType, HTMLElement>;

	private mustAddPantheons: boolean = false;

	onInitialize(): void {
		this.pantheonContainer = MustGetElement(".pantheon-chooser_pantheon-container", this.Root);
		this.pantheonSubtitle = MustGetElement(".pantheon-chooser_choose-x-pantheons", this.Root);
		this.confirmButton = MustGetElement(".pantheon-chooser_confirm", this.Root);
		this.pantheonFrame = MustGetElement(".pantheon-frame", this.Root);

		this.createCloseButton = false;
		this.enableOpenSound = true;
		this.enableCloseSound = true;
		this.Root.setAttribute("data-audio-group-ref", "audio-panel-pantheon-picker");
	}

	onAttach(): void {
		super.onAttach();

		this.pantheonFrame.addEventListener('subsystem-frame-close', () => { this.close(); });
		this.pantheonFrame.setAttribute("data-audio-close-group-ref", "audio-panel-pantheon-picker");

		this.confirmButton.addEventListener('action-activate', this.confirmButtonListener);
		this.confirmButton.setAttribute("data-audio-group-ref", "audio-panel-pantheon-picker");
		this.confirmButton.setAttribute("data-audio-activate-ref", "data-audio-pantheon-confirm");

		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (!player) {
			console.error("screen-pantheon-chooser: onAttach() - no local player found!");
			return;
		}

		const playerCulture: PlayerCulture | undefined = player.Culture;
		if (!playerCulture) {
			console.error("screen-pantheon-chooser: onAttach() - no player culture found!");
			return;
		}

		const playerReligion: PlayerReligion | undefined = player.Religion;
		if (!playerReligion) {
			console.error("screen-pantheon-chooser: onAttach() - no player religion found!");
			return;
		}

		this.numPantheonsToAdd = playerReligion.getNumPantheonsUnlocked();
		this.pantheonSubtitle.innerHTML = Locale.compose("LOC_UI_PANTHEON_SUBTITLE", this.numPantheonsToAdd);
		this.mustAddPantheons = playerCulture.isNodeUnlocked("NODE_CIVIC_AQ_MAIN_MYSTICISM") && this.numPantheonsToAdd > 0;

		if (this.mustAddPantheons) {
			this.createEntries(this.pantheonContainer);
		}

		Databind.classToggle(this.confirmButton, 'hidden', `g_NavTray.isTrayRequired`);
	}

	onDetach(): void {
		this.confirmButton.removeEventListener('action-activate', this.confirmButtonListener);
		super.onDetach();
	}

	protected createEntries(_entryContainer: HTMLElement) {

		const player: PlayerId = GameContext.localPlayerID;
		if (Players.isValid(player)) {
			realizePlayerColors(this.Root, player);
		}
		else {
			console.error(`screen-pantheon-chooser: createEntries() - player ${GameContext.localPlayerID} was invalid!`);
		}

		for (const pantheon of GameInfo.Beliefs) {
			const pantheonLocked: boolean = !Game.Religion.isBeliefClaimable(pantheon.$index);
			if (pantheon.BeliefClassType == "BELIEF_CLASS_PANTHEON") {
				const pantheonItem = document.createElement("pantheon-chooser-item") as ComponentRoot<PantheonChooserItem>;
				pantheonItem.classList.value = "pantheon-item bg-primary-4";
				pantheonItem.componentCreatedEvent.on((chooser) => {
					chooser.pantheonChooserNode = this.createPantheonNode(pantheon);
				});
				pantheonItem.setAttribute("beliefType", pantheon.BeliefType);

				if (!pantheonLocked) {
					this.tagEntry(pantheonItem);
				}
				else {
					pantheonItem.setAttribute("data-tooltip-content", Locale.compose("LOC_UI_PANTHEON_ALREADY_TAKEN"));
				}

				this.pantheonButtonsMap.set(pantheon.BeliefType, pantheonItem);
				pantheonItem.setAttribute("data-audio-group-ref", "audio-panel-pantheon-picker");
				pantheonItem.setAttribute("data-audio-activate-ref", "none");

				_entryContainer.appendChild(pantheonItem);

			}
		}
		FocusManager.setFocus(_entryContainer);
	}

	private createPantheonNode(pantheon: BeliefDefinition): PantheonChooserNode {
		const primaryIcon: string = UI.getIconURL(pantheon.BeliefType, "PANTHEONS");
		return {
			name: Locale.compose(pantheon.Name), primaryIcon: primaryIcon,
			description: Locale.stylize(pantheon.Description), isLocked: !Game.Religion.isBeliefClaimable(pantheon.$index)
		}
	}

	/**
	 * Called by the base general chooser when the user chooses an item in the list.
	 * @param {element} entryElement - The HTML element chosen.
	 */
	entrySelected(entryElement: HTMLElement) {
		const beliefTypeSelected: string | null = entryElement.getAttribute("beliefType");
		if (!beliefTypeSelected) {
			console.error("screen-pantheon-chooser: entrySelected() - selected entry had no associated belief type!");
			return;
		}

		if (this.pantheonsToAdd.includes(beliefTypeSelected)) {
			entryElement.setAttribute("selected", "false");
			this.pantheonsToAdd.splice(this.pantheonsToAdd.indexOf(beliefTypeSelected), 1);
			this.confirmButton.setAttribute("disabled", "true");
			NavTray.removeShellAction1();
		}
		else {
			if (this.pantheonsToAdd.length < this.numPantheonsToAdd) {
				entryElement.setAttribute("selected", "true");
				this.pantheonsToAdd.push(beliefTypeSelected);
				if (this.pantheonsToAdd.length == this.numPantheonsToAdd) {
					this.confirmButton.setAttribute("disabled", "false");
					NavTray.addOrUpdateShellAction1("LOC_UI_RESOURCE_ALLOCATION_CONFIRM");
				}
			}
			else {
				this.pantheonButtonsMap.get(this.pantheonsToAdd[0])?.setAttribute("selected", "false");
				this.pantheonsToAdd.splice(0, 1);
				this.pantheonsToAdd.push(beliefTypeSelected);
				entryElement.setAttribute("selected", "true");
			}
		}
	}

	protected onEngineInput(inputEvent: InputEngineEvent) {
		super.onEngineInput(inputEvent);
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.detail.name == 'shell-action-1') {
			if (this.pantheonsToAdd.length == this.numPantheonsToAdd) {
				this.onConfirm();
				Audio.playSound("data-audio-pantheon-confirm", "audio-panel-pantheon-picker");
				inputEvent.stopPropagation();
				inputEvent.preventDefault();
			}
		}
	}

	private onConfirm() {
		this.addNextPantheon();
	}

	private addNextPantheon() {
		const pantheonToAdd: BeliefType | undefined = this.pantheonsToAdd.pop();
		if (!pantheonToAdd) {
			this.close();
			return;
		}
		let args: any = {
			BeliefType: Database.makeHash(pantheonToAdd.toString())
		};
		const result: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.FOUND_PANTHEON, args, false);
		if (result.Success) {
			Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.FOUND_PANTHEON, args);
			const eventHandle: EventHandle = engine.on('PantheonFounded', () => {
				this.addNextPantheon();
				eventHandle.clear();
			});
		}
		else {
			console.error(`screen-pantheon-chooser: addNextBelief() - Couldn't add pantheon ${pantheonToAdd}`);
		}
	}
}

Controls.define('screen-pantheon-chooser', {
	createInstance: ScreenPantheonChooser,
	description: 'Pantheon Chooser screen.',
	classNames: ['screen-pantheon-chooser', 'fullscreen', 'pointer-events-auto', 'flex'],
	styles: ["fs://game/base-standard/ui/pantheon-chooser/screen-pantheon-chooser.css"],
	content: ['fs://game/base-standard/ui/pantheon-chooser/screen-pantheon-chooser.html'],
	attributes: []
});