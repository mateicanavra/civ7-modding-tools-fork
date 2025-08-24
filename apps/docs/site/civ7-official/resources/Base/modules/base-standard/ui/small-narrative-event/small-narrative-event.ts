/**
 * @file small-narrative-event.ts
 * @copyright 2020-2023, Firaxis Games
 * @description Small Narrative Event screen
 */

import { NotificationID } from '/base-standard/ui/notification-train/model-notification-train.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import Panel from '/core/ui/panel-support.js';
import NarrativePopupManager from '/base-standard/ui/narrative-event/narrative-popup-manager.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js'
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';

interface NarrativeEventOptions {
	notificationId: NotificationID;
}

class SmallNarrativeEvent extends Panel {

	static SM_NAR_Z_PLACEMENT = { x: 0, y: 0, z: 18 };
	focusOverriden = false;

	private closeOrCloseButtonListener = this.onClose.bind(this);
	private entryListener = this.onActivate.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);
	private turnEndListener = () => { this.close(UIViewChangeMethod.Automatic), NarrativePopupManager.closePopup(); }
	private updateListener = this.onUpdate.bind(this);
	private globalHideListener = this.onGlobalHide.bind(this);

	private panelOptions: NarrativeEventOptions | null = null;
	private targetStoryId: ComponentID | null = null;
	private currentScreenPosition: float2 = { x: -1, y: -1 };
	private _worldAnchorHandle: number | null = null;
	private storyCoordinates: float2 | null = { "x": 0, "y": 0 };
	private worldSpaceFocusOffset: number = 64;
	private storyType = "LIGHT";
	private leaderCiv: string = "";
	private iconsPayload: NarrativeRewardIconDefinition[] = [];

	constructor(root: ComponentRoot) {
		super(root);
		this.inputContext = InputContext.Dual;
		this.enableOpenSound = true;
		this.Root.setAttribute("data-audio-group-ref", "small-narrative-event");

	}

	onAttach() {

		super.onAttach();
		this.Root.classList.add('absolute', 'top-0', 'left-0', 'flex', 'flex-col', 'item-center');
		const closebutton: HTMLElement = document.createElement('fxs-close-button');
		closebutton.addEventListener('action-activate', this.closeOrCloseButtonListener);
		closebutton.setAttribute("data-audio-group-ref", "small-narrative-event");
		closebutton.classList.add("-right-0\\.5", "-top-1", "mt-px");
		this.Root.appendChild(closebutton);

		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);

		this.addElements();

		window.requestAnimationFrame(this.updateListener);
		engine.on("LocalPlayerTurnEnd", this.turnEndListener);
		window.addEventListener('ui-hide-small-narratives', this.globalHideListener);
	}

	getPanelContent(): string {
		if (this.targetStoryId) {
			return this.targetStoryId.id.toString();
		}
		return "";
	}

	setPanelOptions(options: object) {
		this.panelOptions = options as NarrativeEventOptions;
		this.addElements();			// We don't really want to do this here, but we don't get the options until after the onAttach
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		NavTray.clear();
		NavTray.addOrUpdateGenericBack();
		NavTray.addOrUpdateGenericSelect();
		waitForLayout(() => {
			const entryContainer = MustGetElement('.small-narrative__content', this.Root);
			FocusManager.setFocus(entryContainer);
		})
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	private onGlobalHide() {
		this.close(UIViewChangeMethod.Automatic);
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
			return;
		}

		//set location 
		if (playerStories.getStoryPlotCoord(targetStoryId)) {
			this.storyCoordinates = playerStories.getStoryPlotCoord(targetStoryId);
			this.makeAnchorWithStoryCoordinates(this.storyCoordinates);
		}

		//pan and zoom to location
		if (this.storyCoordinates) {
			const worldLocation: float3 = WorldUI.getPlotLocation(this.storyCoordinates, { x: 0, y: 0, z: 0 }, PlacementMode.WATER);
			// Try to pan to a world position so the UI is visible on screen
			Camera.lookAt(worldLocation.x, worldLocation.y + this.worldSpaceFocusOffset);
		}

		const story: NarrativeStory | null = playerStories.find(targetStoryId);
		if (!story) {
			return;
		}
		this.targetStoryId = targetStoryId;

		const storyDef: NarrativeStoryDefinition | null = GameInfo.NarrativeStories.lookup(story.type);

		if (storyDef) {
			if (storyDef.UIActivation === "DISCOVERY") {
				this.storyType = "DISCOVERY";
			}

			const bodyContainer: HTMLElement | null = this.Root.querySelector<HTMLElement>('.small-narrative__body-text');
			if (bodyContainer) {
				if (storyDef.Completion) {
					bodyContainer.innerHTML = Locale.stylize(playerStories.determineNarrativeInjectionComponentId(targetStoryId, StoryTextTypes.BODY));

				} else {
					console.error(`Narrative event does not have a storyDef.Completion.  bodyContainer: '${bodyContainer.innerHTML}'`);
					bodyContainer.innerHTML = "ERROR: Missing storyDef completion";
				}
			}

			const entryContainer: HTMLElement | null = this.Root.querySelector<HTMLElement>('.small-narrative__content');
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
				if (this.storyType == "DISCOVERY") {
					FocusManager.setFocus(entryContainer);
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
		buttonFXS.setAttribute("small-narrative-choice-key", key);
		buttonFXS.setAttribute("tabindex", "-1");
		buttonFXS.setAttribute("main-text", descriptiveText);
		buttonFXS.setAttribute("reward", reward);
		buttonFXS.setAttribute("action-text", action);
		buttonFXS.setAttribute('leader-civ', this.leaderCiv);
		buttonFXS.setAttribute("icons", JSON.stringify(icons));
		buttonFXS.setAttribute("story-type", "LIGHT");
		buttonFXS.setAttribute("data-audio-group-ref", "small-narrative-event");
		buttonFXS.setAttribute("data-audio-focus-ref", "data-audio-choice-focus");
		if (!canAfford) {
			buttonFXS.classList.add("opacity-50");
		}
		container.appendChild(buttonFXS);

	}


	onDetach() {
		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
		window.removeEventListener('ui-hide-small-narratives', this.globalHideListener);
		engine.off("LocalPlayerTurnEnd", this.turnEndListener);
		this.destroyWorldAnchor();
		NarrativePopupManager.closePopup();
		super.onDetach();
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
			this.close(UIViewChangeMethod.PlayerInteraction);
			NarrativePopupManager.closePopup();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private onActivate(event: ActionActivateEvent) {
		if (event.currentTarget instanceof HTMLElement) {
			if (event.currentTarget.classList.contains("fxs-reward-button")) {
				const answerKey: string | null = event.currentTarget.getAttribute("small-narrative-choice-key");
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

	private onUpdate() {
		window.requestAnimationFrame(this.updateListener);
		this.realizeScreenPosition();
	}

	private onClose(event: ActionActivateEvent) {
		event.stopPropagation();
		event.preventDefault();
		NarrativePopupManager.closePopup();
		this.close(UIViewChangeMethod.PlayerInteraction);
	}

	private realizeScreenPosition() {

		if (!this._worldAnchorHandle) {
			return;
		}
		// Update location, show/hide based if off screen.
		let targetLocation: float2 | null = this.storyCoordinates;

		if (!targetLocation) {
			// Off screen (or no world anchor), set position outside the screen so we don't see tooltip on focused action.
			targetLocation = { x: -1, y: -1 };
		}

		if (targetLocation.x == this.currentScreenPosition.x && targetLocation.y == this.currentScreenPosition.y) { // Already positioned
			return;
		}

		//data-bind-style-transform2d in makeWorldAnchor() provides the main positioning but this adjustment is needed to compensate for the window height because the window height will vary from story to story
		this.Root.style.topPX = -this.Root.offsetHeight;
	}

	private makeWorldAnchor(location: float2) {

		this._worldAnchorHandle = WorldAnchors.RegisterFixedWorldAnchor(location, SmallNarrativeEvent.SM_NAR_Z_PLACEMENT);
		if (this._worldAnchorHandle !== null && this._worldAnchorHandle >= 0) {
			this.Root.setAttribute('data-bind-style-transform2d', `{{FixedWorldAnchors.offsetTransforms[${this._worldAnchorHandle}].value}}`);
		}
		else {
			console.error(`Failed to create world anchor for location`, location);
		}
	}

	private destroyWorldAnchor() {
		if (this._worldAnchorHandle !== null) {
			this.Root.removeAttribute('data-bind-style-transform2d');
			WorldAnchors.UnregisterFixedWorldAnchor(this._worldAnchorHandle);
			this._worldAnchorHandle = null;
		}
	}

	//create the world anchor, if there is no coordinates it defaults to space next to the player's capitol city
	private makeAnchorWithStoryCoordinates(storyCoordinates: float2 | null) {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let cities: ComponentID[] | undefined = player?.Cities?.getCityIds();
		const defaultCoordinates: float2 = { "x": -9999, "y": -9999 };

		if (JSON.stringify(storyCoordinates) == JSON.stringify(defaultCoordinates)) {
			if (cities) {
				cities.some(cityID => {
					const city: City | null = Cities.get(cityID);
					if (city) {
						if (city.isCapital) {
							//offset currently added for superficial visibility reasons 
							let cityOffset: float2 = { x: city.location.x + 1, y: city.location.y };
							if (cityOffset) {
								this.makeWorldAnchor(cityOffset);
								this.storyCoordinates = cityOffset;
							}
						}
					}
				})
			}
		} else {
			if (storyCoordinates) {
				this.makeWorldAnchor(storyCoordinates);
			}
			else {
				console.error("storyCoordinates is null");
			}
		}
	}
}


Controls.define('small-narrative-event', {
	createInstance: SmallNarrativeEvent,
	description: 'Small Narrative Event Screen.',
	classNames: ['small-narrative-event'],
	styles: ['fs://game/base-standard/ui/small-narrative-event/small-narrative-event.css'],
	content: ['fs://game/base-standard/ui/small-narrative-event/small-narrative-event.html'],
	//	properties: [],
	attributes: []
});