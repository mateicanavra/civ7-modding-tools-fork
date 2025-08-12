/**
 * @file screen-narrative-event.ts
 * @copyright 2020-2023, Firaxis Games
 * @description Narrative Event screen
 */

import { NotificationID } from '/base-standard/ui/notification-train/model-notification-train.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import NarrativePopupManager from '/base-standard/ui/narrative-event/narrative-popup-manager.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';

interface NarrativeEventOptions {
	notificationId: NotificationID;
}

class ScreenNarrativeEvent extends Panel {
	private closeButtonListener: EventListener = () => { this.close(UIViewChangeMethod.PlayerInteraction), NarrativePopupManager.closePopup(); }
	private entryListener: EventListener = (event: CustomEvent) => { this.onActivate(event); }
	private engineInputListener: EventListener = (inputEvent: InputEngineEvent) => { this.onEngineInput(inputEvent); };
	private turnEndListener = () => { this.close(UIViewChangeMethod.Automatic), NarrativePopupManager.closePopup(); }

	private panelOptions: NarrativeEventOptions | null = null;
	private targetStoryId: ComponentID | null = null;
	private iconsPayload: NarrativeRewardIconDefinition[] = [];
	private leaderCiv: string = "";
	private closebutton?: HTMLElement;

	constructor(root: ComponentRoot) {
		super(root);
		this.enableOpenSound = true;
		this.Root.setAttribute("data-audio-group-ref", "narrative-event");
	};

	onInitialize(): void {
		if (ContextManager.hasInstanceOf("panel-radial-menu")) {
			ContextManager.pop("panel-radial-menu");
		}
	}

	onAttach() {
		super.onAttach();

		const narrativeScreen = MustGetElement('.narrative-reg__content', this.Root);
		this.closebutton = document.createElement('fxs-close-button');
		this.closebutton.classList.add('mt-1', "z-1");
		this.closebutton.addEventListener('action-activate', this.closeButtonListener);
		narrativeScreen.appendChild(this.closebutton);

		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let imagePath: string | undefined = ``;
		if (player) {
			const civ1 = GameInfo.Civilizations.lookup(player.civilizationType);
			if (civ1) {
				if (GameInfo.NarrativeDisplay_Civilizations.lookup(civ1.CivilizationType.toString())?.CivilizationImage) {
					imagePath = GameInfo.NarrativeDisplay_Civilizations.lookup(civ1.CivilizationType.toString())?.CivilizationImage;
				}
			}
		}
		const modalWindow = MustGetElement('.narrative-modal', this.Root);
		modalWindow.setAttribute('data-bg-image', `url("fs://game/${imagePath}")`);

		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);

		engine.on("LocalPlayerTurnEnd", this.turnEndListener);

		this.addElements();			// This is what we want, though it will not do anything
	}

	onDetach() {
		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
		engine.off("LocalPlayerTurnEnd", this.turnEndListener);

		super.onDetach();
	}

	getPanelContent(): string {
		if (this.targetStoryId) {
			return this.targetStoryId.id.toString();
		}
		return "";
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		NavTray.clear();
		NavTray.addOrUpdateGenericSelect();
		NavTray.addOrUpdateGenericClose();

		const entryContainer: HTMLElement | null = this.Root.querySelector<HTMLElement>('.narrative-reg__button-container');
		if (entryContainer) {
			FocusManager.setFocus(entryContainer);
		}
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	/** Handle getting options from the request to open. */
	setPanelOptions(options: object) {
		this.panelOptions = options as NarrativeEventOptions;
		this.addElements();			// We don't really want to do this here, but we don't get the options until after the onAttach
	}

	private addElements() {
		if (!(this.panelOptions && this.panelOptions.notificationId)) {
			return;
		}

		const notification: Notification | null = Game.Notifications.find(this.panelOptions.notificationId);
		if (!notification) {
			return;
		}

		// Get the Player the notification is for (should be the local player)
		const player: PlayerLibrary | null = Players.get(this.panelOptions.notificationId.owner);
		if (!player) {
			return;
		}

		const playerStories: PlayerStories | undefined = player.Stories;
		if (playerStories == undefined) {
			return;
		}

		// The notification is just informs the use that there are one or more narrative events to process.  Get the first one.
		// TODO: Will we want to handle the pending narratives out of order?  Will the system try and not have more than one hit at the same time?
		// There is nothing right now precluding more than one hitting.
		const targetStoryId: ComponentID | null = playerStories.getFirstPendingMetId();
		if (!targetStoryId) {
			this.close(UIViewChangeMethod.Automatic);
			return;
		}

		const story: NarrativeStory | null = playerStories.find(targetStoryId);
		if (!story) {
			return;
		}
		this.targetStoryId = targetStoryId;

		const storyDef: NarrativeStoryDefinition | null = GameInfo.NarrativeStories.lookup(story.type);

		if (storyDef) {
			if (storyDef.UIActivation === "SYSTEMIC" || storyDef.UIActivation === "CRISIS") {
				const header = MustGetElement('.narrative-header-container', this.Root);
				header.remove();
				const headerSys = MustGetElement('.narrative-header-container-sys', this.Root);
				headerSys.classList.toggle('hidden');
				const bottomFil = MustGetElement('.filigree-divider-h2', this.Root);
				bottomFil.remove();
				const imgbg = MustGetElement('.img-narrative-frame-bg', this.Root);
				if (storyDef.UIActivation === "CRISIS") {
					imgbg.style.backgroundImage = 'url(fs://game/nar_bg_crisis)';
				}
				else {
					imgbg.style.backgroundImage = 'url("fs://game/nar_bg_systemic")';
				}
			}

			const titleContainer: HTMLElement | null = this.Root.querySelector<HTMLElement>('.narrative-reg__title-text');

			if (storyDef.StoryTitle) {

				if (titleContainer) {
					titleContainer.innerHTML = Locale.toUpper(storyDef.StoryTitle);
					const dividerContainer = document.createElement("div");
					dividerContainer.classList.value = "flex justify-center";
					const divider: HTMLDivElement = document.createElement("div");
					divider.classList.add(storyDef.UIActivation === "SYSTEMIC" ? 'filigree-divider-h2' : 'filigree-shell-small');
					dividerContainer.appendChild(divider);
					titleContainer.parentElement?.appendChild(dividerContainer);
				}
			} else {
				if (titleContainer) {
					titleContainer.style.display = "none";
				}
			}

			const bodyContainer: HTMLElement | null = this.Root.querySelector<HTMLElement>('.narrative-reg__text-container');
			if (bodyContainer) {
				if (storyDef.Completion) {
					bodyContainer.innerHTML = Locale.stylize(playerStories.determineNarrativeInjectionComponentId(targetStoryId, StoryTextTypes.BODY));
				} else {
					console.error(`Narrative event does not have a storyDef.Completion.  bodyContainer: '${bodyContainer.innerHTML}'`);
					bodyContainer.innerHTML = "ERROR: Missing storyDef completion";
				}
			}

			const entryContainer: HTMLElement | null = this.Root.querySelector<HTMLElement>('.narrative-reg__button-container');
			if (entryContainer) {
				// Remove any previous entries
				while (entryContainer.lastChild) {
					entryContainer.removeChild(entryContainer.lastChild);
				}

				const storyLinks: NarrativeStory_LinkDefinition[] = GameInfo.NarrativeStory_Links.filter(def => def.FromNarrativeStoryType == storyDef.NarrativeStoryType);
				var links = 0;
				if (storyLinks && storyLinks.length > 0) {
					storyLinks.forEach(link => {
						const linkDef: NarrativeStoryDefinition | null = GameInfo.NarrativeStories.lookup(link.ToNarrativeStoryType);
						if (linkDef) {
							if (linkDef?.Activation.toUpperCase() === "LINKED" || (linkDef?.Activation.toUpperCase() === "LINKED_REQUISITE" && playerStories.determineRequisiteLink(linkDef.NarrativeStoryType))) {
								links = links + 1;
								const icons: NarrativeRewardIconDefinition[] = GameInfo.NarrativeRewardIcons.filter(item => {
									return item.NarrativeStoryType === link.ToNarrativeStoryType;
								});
								const toLinkDef: NarrativeStoryDefinition | null = GameInfo.NarrativeStories.lookup(linkDef.NarrativeStoryType);
								var action = playerStories.determineNarrativeInjection(targetStoryId, toLinkDef?.$hash ?? -1, StoryTextTypes.IMPERATIVE);
								var reward = playerStories.determineNarrativeInjection(targetStoryId, toLinkDef?.$hash ?? -1, StoryTextTypes.REWARD);
								const canAfford = (linkDef?.Cost === 0 || playerStories.canAfford(linkDef.NarrativeStoryType));
								this.addEntry(entryContainer, Locale.stylize(playerStories.determineNarrativeInjection(targetStoryId, toLinkDef?.$hash ?? -1, StoryTextTypes.OPTION)), Locale.stylize(reward), Locale.stylize(action), link.ToNarrativeStoryType, icons, canAfford);
								this.iconsPayload = icons;
							}
						}
					});
				}
				if (links == 0) {
					// No links.  We will add a 'close' entry, that will allow the player to then send back that they acknowlege the end of the story-line.
					this.addEntry(entryContainer, Locale.stylize("LOC_NARRATIVE_STORY_END_STORY_NAME"), Locale.stylize(playerStories.determineNarrativeInjectionComponentId(targetStoryId, StoryTextTypes.REWARD)), "", "CLOSE", this.iconsPayload, true);
				}
			}
		}
	}

	private addEntry(container: HTMLElement, descriptiveText: string, reward: string, action: string, key: string, icons: NarrativeRewardIconDefinition[], canAfford: boolean) {


		///==================================REWARD BUTTON DIAGRAM================================+
		//																						  +
		//                                 ON HOVER TOOLTIP --- REWARD                            +
		//                                                                                        +
		//          +********************************************************************         +
		//  QUEST   +                +                                                  *         +
		//  ICON    +     REWARD     +          MAIN (DESCRIPTIVE) TEXT                 *         +
		//  HERE    +     ICONS      +                                                  *         +
		//          *                + **************************************************         +
		//          *                +          ACTION TEXT (OPTIONAL)                  *         +
		//          *+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*         +
		//                                                                                        +
		//  'leaderCiv' INDICATES IF AN OPTION IS AVAILABLE BECAUSE OF YOUR CIV/LEADER CHOICE     +
		//========================================================================================+


		// item elements
		const buttonFXS: HTMLElement = document.createElement("fxs-reward-button");
		buttonFXS.addEventListener('action-activate', this.entryListener);
		buttonFXS.setAttribute("narrative-choice-key", key);
		buttonFXS.setAttribute("tabindex", "-1");
		buttonFXS.setAttribute("main-text", descriptiveText);
		buttonFXS.setAttribute("reward", reward);
		buttonFXS.setAttribute("action-text", action);
		buttonFXS.setAttribute('leader-civ', this.leaderCiv);
		buttonFXS.setAttribute("icons", JSON.stringify(icons));
		buttonFXS.setAttribute("story-type", "DEFAULT");
		buttonFXS.setAttribute("data-audio-group-ref", "narrative-event");
		if (!canAfford) {
			buttonFXS.classList.add("opacity-50");
		}
		container.appendChild(buttonFXS);

	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
			this.close(UIViewChangeMethod.PlayerInteraction);
			NarrativePopupManager.closePopup();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private onActivate(event: CustomEvent) {
		if (event.currentTarget instanceof HTMLElement) {
			if (event.currentTarget.classList.contains("fxs-reward-button")) {
				const answerKey: string | null = event.currentTarget.getAttribute("narrative-choice-key");
				if (answerKey) {

					const args = {
						TargetType: answerKey,
						Target: this.targetStoryId,
						Action: PlayerOperationParameters.Activate
					};
					const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.CHOOSE_NARRATIVE_STORY_DIRECTION, args, false);
					if (result.Success) {
						Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.CHOOSE_NARRATIVE_STORY_DIRECTION, args);
						// Just close the popup.  The operation, if successfully applied, will clear the notification.
						NarrativePopupManager.closePopup();
						this.close(UIViewChangeMethod.PlayerInteraction);
					}
				}
			}
		}
	}
}

Controls.define('screen-narrative-event', {
	createInstance: ScreenNarrativeEvent,
	description: 'Narrative Event screen.',
	classNames: ['screen-narrative-event'],
	styles: ['fs://game/base-standard/ui/narrative-event/screen-narrative-event.css'],
	content: ['fs://game/base-standard/ui/narrative-event/screen-narrative-event.html'],
});