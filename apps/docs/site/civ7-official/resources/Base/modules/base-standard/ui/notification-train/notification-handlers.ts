/**
 * @file notification-handlers.ts
 * @copyright 2021-2025, Firaxis Games
 */

import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import ActionHandler from '/core/ui/input/action-handler.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import PlotCursor from '/core/ui/input/plot-cursor.js';
import { PlotCoord } from '/core/ui/utilities/utilities-plotcoord.js';
import { NetworkUtilities } from 'core/ui/utilities/utilities-network.js';

import DiplomacyManager from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import { NotificationModel, NotificationID } from '/base-standard/ui/notification-train/model-notification-train.js';
import { RaiseDiplomacyEvent } from '/base-standard/ui/diplomacy/diplomacy-events.js';
import NarrativePopupManager from '/base-standard/ui/narrative-event/narrative-popup-manager.js';
import PopupSequencer, { PopupSequencerData } from '/base-standard/ui/popup-sequencer/popup-sequencer.js';
import { AgeTransitionBannerAttributes, AGE_TRANSITION_BANNER_FADE_OUT_DURATION } from '/base-standard/ui/age-transition-banner/age-transition-banner.js';
import { TutorialAdvisorType } from '/base-standard/ui/tutorial/tutorial-item.js';
import TechTree from '/base-standard/ui/tech-tree/model-tech-tree.js';
import WatchOutManager from '/base-standard/ui/watch-out/watch-out-manager.js';
import { VictoryProgressOpenTab } from '/base-standard/ui/victory-progress/screen-victory-progress.js';
import DialogManager, { DialogBoxAction, DialogBoxCallbackSignature } from '/core/ui/dialog-box/manager-dialog-box.js';
import { PolicyTabPlacement } from '/base-standard/ui/policies/model-policies.js';

export namespace NotificationHandlers {

	// Default implementation of the Handler
	export class DefaultHandler implements NotificationModel.Handler {

		lookAt(notificationId: NotificationID) {
			const notification: Notification | null = Game.Notifications.find(notificationId);
			if (notification) {
				if (notification.Location && PlotCoord.isValid(notification.Location)) {
					if (ActionHandler.isGamepadActive) {
						PlotCursor.plotCursorCoords = notification.Location;
					}

					Camera.lookAtPlot(notification.Location)
				}
			}
		}

		activate(notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			if (ComponentID.isValid(notificationId)) {
				this.lookAt(notificationId);
				return true;
			}
			return false;
		}

		add(notificationId: NotificationID): boolean {
			const notification: Notification | null = Game.Notifications.find(notificationId);
			if (notification) {
				if (NotificationModel.manager.add(notification.Type, notification.GroupType, notificationId) != null) {
					return true;
				}
			}
			return false;
		}

		dismiss(notificationId: NotificationID) {
			NotificationModel.manager.onDismiss(notificationId);
		}
	}

	// -----------------------------------------------------------------------
	export class NewPopulationHandler extends DefaultHandler {

		activate(_notificationId: NotificationID, activatedBy: PlayerId | null): boolean {
			if (activatedBy == null) {
				return false;
			}

			const player: PlayerLibrary | null = Players.get(activatedBy);
			if (!player) {
				return false;
			}

			//TODO: Uncomment when target is supported in notification (needs to be unique notification per city)
			//const notification: Notification | null = Game.Notifications.find(notificationId);
			//if (notification && (notification.Target != undefined) && ComponentID.isValid(notification.Target)) {
			//	UI.Player.lookAtID(notification.Target);
			//	InterfaceMode.switchTo('INTERFACEMODE_ACQUIRE_TILE', { CityID: notification.Target });
			//	return true;
			//}
			//TODO: Remove when target is supported
			// find target city
			var city: City | null = null;
			const playerCities: PlayerCities | undefined = player.Cities;
			if (playerCities) {
				for (const cityId of playerCities.getCityIds()) {
					city = Cities.get(cityId);
					if (city != null) {
						if (city.Growth?.isReadyToPlacePopulation) {
							break;
						}
					}
				}
			}

			if (city) {
				const cityId: ComponentID = city.id;
				UI.Player.lookAtID(cityId);
				InterfaceMode.switchTo('INTERFACEMODE_ACQUIRE_TILE', { CityID: cityId });
				return true;
			}

			return false;
		}
	}

	// -----------------------------------------------------------------------
	export class CommandUnits extends DefaultHandler {

		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			let unitId: ComponentID | null = UI.Player.getHeadSelectedUnit();
			if (ComponentID.isValid(unitId)) {
				unitId = UI.Player.selectNextReadyUnit(unitId);
			}
			else {
				unitId = UI.Player.selectNextReadyUnit();
			}
			if (ComponentID.isValid(unitId)) {
				UI.Player.lookAtID(unitId);
				const unitLocation: float2 | undefined = Units.get(unitId)?.location;
				if (unitLocation) {
					PlotCursor.plotCursorCoords = unitLocation;
				}
				return true;
			}
			return false;
		}
	}

	export class ConsiderRazeCity extends DefaultHandler {
		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {

			if (_activatedBy == null) {
				return false;
			}

			const player: PlayerLibrary | null = Players.get(_activatedBy);
			if (!player) {
				return false;
			}

			//TODO: Update when notifs can point to new targets
			// find target city
			var city: City | null = null;
			const playerCities: PlayerCities | undefined = player.Cities;
			if (playerCities) {
				for (const cityId of playerCities.getCityIds()) {
					city = Cities.get(cityId);
					if (city != null) {
						if (city.isJustConqueredFrom) {
							break;
						}
					}
				}
			}

			if (city) {
				const cityId: ComponentID = city.id;
				UI.Player.lookAtID(cityId);
				UI.Player.selectCity(cityId);		// This will currently auto-open the city capture chooser.
				return true;
			}

			return false;
		}
	}

	// -----------------------------------------------------------------------
	export class ChooseCelebration extends DefaultHandler {

		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			ContextManager.push("panel-celebration-chooser", { singleton: true });
			return true;
		}
	}


	// -----------------------------------------------------------------------
	export class ChooseGovernment extends DefaultHandler {

		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			ContextManager.push("screen-government-picker", { singleton: true, createMouseGuard: true });
			return true;
		}
	}

	// -----------------------------------------------------------------------
	export class ChooseTech extends DefaultHandler {

		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			ContextManager.push("screen-tech-tree-chooser", { singleton: true });
			return true;
		}

		add(notificationId: NotificationID): boolean {
			const notification: Notification | null = Game.Notifications.find(notificationId);
			if (notification) {
				const localPlayer = GameContext.localPlayerID;
				const ids: ComponentID[] | null = Game.Notifications.getIdsForPlayer(localPlayer, IgnoreNotificationType.DISMISSED);
				let canAdd = true;

				if (ids) {
					const isDismissedId = ids.find(id => ComponentID.isMatch(id, notificationId));
					if (isDismissedId) {
						canAdd = false;
					}
				}

				if (!TechTree.canAddChooseNotification()) {
					super.dismiss(notificationId);
					Game.Notifications.dismiss(notificationId);
					return false;
				}

				if (canAdd) {
					NotificationModel.manager.add(notification.Type, notification.GroupType, notificationId);
					return true;
				}
			}
			return false;
		}
	}

	// -----------------------------------------------------------------------
	export class ChooseCultureNode extends DefaultHandler {

		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			ContextManager.push("screen-culture-tree-chooser", { singleton: true });
			return true;
		}
	}

	// -----------------------------------------------------------------------
	export class ViewCultureTree extends DefaultHandler {

		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			window.dispatchEvent(new CustomEvent('open-screen-culture-tree-chooser'));
			return true;
		}
	}

	// -----------------------------------------------------------------------
	export class ViewPoliciesChooserNormal extends DefaultHandler {

		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			ContextManager.push("screen-policies", { singleton: true, createMouseGuard: true, panelOptions: { openTab: PolicyTabPlacement.POLICIES } });
			return true;
		}
	}

	// -----------------------------------------------------------------------
	export class ViewPoliciesChooserCrisis extends DefaultHandler {

		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			ContextManager.push("screen-policies", { singleton: true, createMouseGuard: true, panelOptions: { openTab: PolicyTabPlacement.CRISIS } });
			return true;
		}
	}

	// -----------------------------------------------------------------------
	export class ViewAttributeTree extends DefaultHandler {

		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			ContextManager.push("screen-attribute-trees", { singleton: true, createMouseGuard: true });
			return true;
		}
	}

	// -----------------------------------------------------------------------
	export class ViewVictoryProgress extends DefaultHandler {

		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			ContextManager.push("screen-victory-progress", { singleton: true, createMouseGuard: true });
			return true;
		}
	}


	// -----------------------------------------------------------------------
	export class ChooseCityStateBonus extends DefaultHandler {

		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			ContextManager.push("screen-city-state-bonus-chooser", { singleton: true });
			return true;
		}
	}

	// -----------------------------------------------------------------------
	export class ChooseCityProduction extends DefaultHandler {

		activate(notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {

			const notification: Notification | null = Game.Notifications.find(notificationId);
			if (notification && notification.Target != undefined && ComponentID.isValid(notification.Target)) {
				UI.Player.lookAtID(notification.Target);
				UI.Player.selectCity(notification.Target);		// This will currently auto-open the production chooser.
				const cityLocation: float2 | undefined = Cities.get(notification.Target)?.location;
				if (cityLocation) {
					PlotCursor.plotCursorCoords = cityLocation;
				}
				return true;
			}
			return false;
		}
	}

	// -----------------------------------------------------------------------
	export class CreateAdvancedStart extends DefaultHandler {

		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			if (!Autoplay.isActive) {
				const HANGOUT_TIMEOUT: number = 30000;
				const timeout: number = setTimeout(() => {
					console.warn("notification-handlers: CreateAdvancedStart: Failed to push advanced start screen, posible hangout or waiting for user input");
				}, HANGOUT_TIMEOUT);
				waitUntilValue(() => {
					const curtain = document.querySelector('#loading-curtain');
					return curtain ? null : true;
				}).then(() => {
					clearTimeout(timeout);
					ContextManager.push("screen-advanced-start", { singleton: true, createMouseGuard: false, panelOptions: { isAgeTransition: false } });
				});
			}
			return true;
		}
	}

	// -----------------------------------------------------------------------
	export class CreateAgeTransition extends DefaultHandler {

		static didDisplayBanner: boolean = false;

		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			if (Autoplay.isActive) {
				return true;
			}

			if (CreateAgeTransition.didDisplayBanner) {
				ContextManager.push("screen-advanced-start", { singleton: true, createMouseGuard: false, panelOptions: { isAgeTransition: true } });
			} else {
				CreateAgeTransition.didDisplayBanner = true;
				waitUntilValue(() => {
					const curtain = document.querySelector('#loading-curtain');
					return curtain ? null : true;
				}).then(() => {

					const attributes: AgeTransitionBannerAttributes = {
						"age-transition-type": 'age-start'
					}

					const banner = ContextManager.push('age-transition-banner', { singleton: true, createMouseGuard: true, attributes });
					const handleBannerAnimationEnd = (event: AnimationEvent) => {
						if (event.animationName === 'age-ending-end-part-1') {
							const ageEndingPanel: HTMLElement | null = banner.querySelector("#age-ending-panel");
							ageEndingPanel?.classList.add("age-ending__panel--fade-out-banner");
							ageEndingPanel?.classList.add("age-ending__panel--fade-out");

							setTimeout(() => {
								banner.removeEventListener('animationend', handleBannerAnimationEnd)
								ContextManager.pop(banner);
								ContextManager.push("screen-advanced-start", { singleton: true, createMouseGuard: false, panelOptions: { isAgeTransition: true } });
							}, AGE_TRANSITION_BANNER_FADE_OUT_DURATION)
						}
					}
					banner.addEventListener('animationend', handleBannerAnimationEnd)
				})
			}

			return true;
		}
	}

	// -----------------------------------------------------------------------
	export class AssignNewResources extends DefaultHandler {

		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null) {
			ContextManager.push("screen-resource-allocation", { singleton: true, createMouseGuard: true });
			return true;
		}
	}

	// -----------------------------------------------------------------------
	export class AssignNewPromotionPoint extends DefaultHandler {

		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null) {
			const notification: Notification | null = Game.Notifications.find(_notificationId);
			if (notification && notification.Target != undefined && ComponentID.isValid(notification.Target)) {
				if (notification.Target !== UI.Player.getHeadSelectedUnit()) {
					UI.Player.selectUnit(notification.Target);
				}

				UI.Player.lookAtID(notification.Target);
				Game.Notifications.dismiss(_notificationId);
				return true;
			}

			return false;
		}
	}

	// -----------------------------------------------------------------------
	export class ChooseTownProject extends DefaultHandler {

		activate(notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {

			const notification: Notification | null = Game.Notifications.find(notificationId);
			if (notification && notification.Target != undefined && ComponentID.isValid(notification.Target)) {
				UI.Player.lookAtID(notification.Target);
				UI.Player.selectCity(notification.Target);		// This will currently auto-open the production chooser.
				const cityLocation: float2 | undefined = Cities.get(notification.Target)?.location;
				if (cityLocation) {
					PlotCursor.plotCursorCoords = cityLocation;
				}
				return true;
			}
			return false;
		}
	}

	// -----------------------------------------------------------------------
	export class ChooseNarrativeDirection extends DefaultHandler {

		activate(notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			if (ComponentID.isValid(notificationId)) {
				NarrativePopupManager.raiseNotificationPanel(notificationId, _activatedBy);
				return true;
			}
			return false
		}
	}

	// -----------------------------------------------------------------------
	export class ChoosePantheon extends DefaultHandler {

		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			ContextManager.push("screen-pantheon-chooser", { singleton: true, createMouseGuard: false });
			return true;
		}
	}

	export class ChooseReligion extends DefaultHandler {

		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			ContextManager.push("panel-religion-picker", { singleton: true });
			return true;
		}
	}


	// -----------------------------------------------------------------------
	export class ChooseBelief extends DefaultHandler {

		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			ContextManager.push("panel-belief-picker", { singleton: true });
			return true;
		}
	}

	// -----------------------------------------------------------------------
	export class InvestigateDiplomaticAction extends DefaultHandler {

		activate(_notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			super.activate(_notificationId, _activatedBy);

			const notification: Notification | null = Game.Notifications.find(_notificationId);
			if (notification && notification.Target != undefined && ComponentID.isValid(notification.Target)) {
				//notification.Target.id is the uniqueID for the diplomacy action.
				DiplomacyManager.selectedActionID = notification.Target.id;

				const actionData: DiplomaticEventHeader = Game.Diplomacy.getDiplomaticEventData(DiplomacyManager.selectedActionID);
				if (actionData.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN) {
					window.dispatchEvent(new RaiseDiplomacyEvent(actionData.targetPlayer));
				} else {
					window.dispatchEvent(new RaiseDiplomacyEvent(notification.Target.owner));
				}
				return true;
			}

			return true;
		}
	}

	export class AllyAtWar extends DefaultHandler {
		activate(notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			super.activate(notificationId, _activatedBy);
			const actionID: DiplomacyActionEventId = Game.Diplomacy.getNextCallToArms(GameContext.localPlayerID);
			if (actionID != -1) {
				const warData: DiplomaticEventHeader = Game.Diplomacy.getDiplomaticEventData(actionID);
				DiplomacyManager.currentAllyWarData = warData;
				InterfaceMode.switchTo("INTERFACEMODE_CALL_TO_ARMS");
			}
			return true
		}
	}

	export class DeclareWar extends DefaultHandler {
		activate(notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			const notification: Notification | null = Game.Notifications.find(notificationId);
			if (notification && notification.Target) {
				DiplomacyManager.selectedActionID = notification.Target.id;
				window.dispatchEvent(new RaiseDiplomacyEvent(notification.Target.owner));
				return true;
			}
			return true;
		}
	}

	export class GameInvite extends DefaultHandler {
		activate(notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			super.activate(notificationId, _activatedBy);

			NetworkUtilities.openSocialPanel("notifications-list-tab");

			return true;
		}
	}

	export class KickVote extends DefaultHandler {
		activate(notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {

			const notification: Notification | null = Game.Notifications.find(notificationId);
			if (notification && notification.Player && notification.Player2) {

				const kickPlayerID = notification.Player.valueOf();
				const kickerPlayerID = notification.Player2.valueOf();

				const dialogCallback: DialogBoxCallbackSignature = (eAction: DialogBoxAction) => {
					if (eAction == DialogBoxAction.Confirm
						|| eAction == DialogBoxAction.Cancel
						|| eAction == DialogBoxAction.Close) {
						Network.kickVotePlayer(kickPlayerID, eAction == DialogBoxAction.Confirm, KickVoteReasonType.KICKVOTE_NONE);
					} else {
						console.error("notification-handlers: activate(): Invalid dialog action (" + eAction + ")");
					}
				};

				const kickPlayerConfig: ConfigurationPlayerAccessor = Configuration.getPlayer(kickPlayerID);
				const kickPlayerName: string = Locale.compose(kickPlayerConfig.slotName);
				const kickerPlayerConfig: ConfigurationPlayerAccessor = Configuration.getPlayer(kickerPlayerID);
				const kickerPlayerName: string = Locale.compose(kickerPlayerConfig.slotName);

				DialogManager.createDialog_ConfirmCancel({
					body: Locale.compose("LOC_KICK_VOTE_CHOICE_DIALOG", kickPlayerName, kickerPlayerName),
					title: "LOC_KICK_DIALOG_TITLE",
					callback: dialogCallback
				});

				Game.Notifications.dismiss(notificationId);
			}

			return true;
		}
	}

	export class RespondToDiplomaticAction extends DefaultHandler {

		activate(notificationId: NotificationID, activatedBy: PlayerId | null): boolean {
			super.activate(notificationId, activatedBy);

			const notification: Notification | null = Game.Notifications.find(notificationId);
			if (notification && notification.Target && notification.Target.id != DiplomacyManager.currentProjectReactionData?.actionID && notification.Target.id != DiplomacyManager.currentProjectReactionRequest?.actionID) {
				DiplomacyManager.currentProjectReactionData = Game.Diplomacy.getResponseDataForUI(notification.Target?.id);
				const request = DiplomacyManager.currentProjectReactionData;

				DiplomacyManager.addCurrentDiplomacyProject(request);
			}

			return true;
		}
	}

	export class RelationshipChanged extends DefaultHandler {
		activate(notificationId: NotificationID, activatedBy: PlayerId | null): boolean {
			super.activate(notificationId, activatedBy);

			const notification: Notification | null = Game.Notifications.find(notificationId);
			if (notification && notification.Target) {
				window.dispatchEvent(new RaiseDiplomacyEvent(notification.Target.id));
			}
			return true;
		}
	}

	export class AdvisorWarning extends DefaultHandler {
		private advisorType: TutorialAdvisorType = TutorialAdvisorType.Default;
		constructor(advisorType: TutorialAdvisorType) {
			super();
			this.advisorType = advisorType;
		}
		activate(notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			if (ComponentID.isValid(notificationId)) {
				WatchOutManager.raiseNotificationPanel(notificationId, this.advisorType, super.lookAt);
				return true;
			}

			return false;
		}

		add(notificationId: NotificationID): boolean {
			if (!WatchOutManager.isManagerActive) {// Immediately dismiss advisor warnings if we have them disabled so we won't see them at all.
				// We do this here rather than in gamecore to maintain determinism of the gamecore components of 
				// advisor warnings.
				this.dismiss(notificationId);
				return false;
			}

			return super.add(notificationId);
		}

		dismiss(notificationId: NotificationID) {
			if (ComponentID.isValid(notificationId)) {
				const args = { Target: notificationId };
				const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.VIEWED_ADVISOR_WARNING, args, false);
				if (result.Success) {
					Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.VIEWED_ADVISOR_WARNING, args);
				}
			}
			super.dismiss(notificationId);
		}
	}

	export class ActionEspionage extends DefaultHandler {
		activate(notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			const notification: Notification | null = Game.Notifications.find(notificationId);
			const summary = Game.Notifications.getSummary(notificationId);
			if (notification && notification.Target && summary) {
				const espionageData: PopupSequencerData = {
					category: PopupSequencer.getCategory(),
					screenId: "screen-espionage-details",
					properties: { singleton: true, createMouseGuard: true },
					userData: { Header: Game.Diplomacy.getDiplomaticEventData(notification.Target.id), DetailsString: summary },
					showCallback: (userData: any | undefined) => {
						if (userData) {
							DiplomacyManager.currentEspionageData = userData;
						}
					}
				};

				PopupSequencer.addDisplayRequest(espionageData);
			}
			return true;
		}
	}

	export class AgeProgression extends DefaultHandler {
		activate(notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			const notification: Notification | null = Game.Notifications.find(notificationId);
			if (notification) {
				//const milestoneType = notification.Type as AgeProgressionMilestoneType;

				// TODO - Navigate to the correct tab.
				ContextManager.push("screen-victory-progress", { singleton: true, createMouseGuard: true, panelOptions: { openTab: VictoryProgressOpenTab.RankingsOverView } });
			}
			return true;
		}
	}

	export class CapitalLost extends DefaultHandler {
		activate(notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			const notification: Notification | null = Game.Notifications.find(notificationId);
			const notifTarget: ComponentID | undefined = notification?.Target;
			if (notifTarget) {
				UI.Player.lookAtID(notifTarget);
			}
			return true;
		}
	}

	export class RewardUnlocked extends DefaultHandler {
		activate(notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			const notification: Notification | null = Game.Notifications.find(notificationId);
			if (notification) {
				const unlocksData: PopupSequencerData = {
					category: PopupSequencer.getCategory(),
					screenId: "screen-unlocks",
					properties: { singleton: true, createMouseGuard: true, panelOptions: { navigateToPage: 'rewards' } },
				};

				PopupSequencer.addDisplayRequest(unlocksData);
			}
			return true;
		}
	}

	export class GreatWorkCreated extends DefaultHandler {
		activate(notificationId: NotificationID, _activatedBy: PlayerId | null): boolean {
			const notification: Notification | null = Game.Notifications.find(notificationId);
			if (notification) {
				ContextManager.push("screen-great-works", { singleton: true, createMouseGuard: true });
			}
			return true;
		}
	}
}

NotificationModel.manager.setDefaultHandler(new NotificationHandlers.DefaultHandler);
NotificationModel.manager.registerHandler("NOTIFICATION_ADVANCED_START", new NotificationHandlers.CreateAdvancedStart);
NotificationModel.manager.registerHandler("NOTIFICATION_ASSIGN_NEW_RESOURCES", new NotificationHandlers.AssignNewResources);
NotificationModel.manager.registerHandler("NOTIFICATION_UNIT_PROMOTION_AVAILABLE", new NotificationHandlers.AssignNewPromotionPoint);
NotificationModel.manager.registerHandler("NOTIFICATION_CHOOSE_TOWN_PROJECT", new NotificationHandlers.ChooseTownProject);
NotificationModel.manager.registerHandler("NOTIFICATION_AGE_TRANSITION", new NotificationHandlers.CreateAgeTransition);
NotificationModel.manager.registerHandler("NOTIFICATION_CAN_BUY_ATTRIBUTE_SKILL", new NotificationHandlers.ViewAttributeTree);
NotificationModel.manager.registerHandler("NOTIFICATION_CHOOSE_CITY_PRODUCTION", new NotificationHandlers.ChooseCityProduction);
NotificationModel.manager.registerHandler("NOTIFICATION_CHOOSE_CITY_STATE_BONUS", new NotificationHandlers.ChooseCityStateBonus);
NotificationModel.manager.registerHandler("NOTIFICATION_CHOOSE_CULTURE_NODE", new NotificationHandlers.ChooseCultureNode);
NotificationModel.manager.registerHandler("NOTIFICATION_CHOOSE_GOLDEN_AGE", new NotificationHandlers.ChooseCelebration);
NotificationModel.manager.registerHandler("NOTIFICATION_CHOOSE_GOVERNMENT", new NotificationHandlers.ChooseGovernment);
NotificationModel.manager.registerHandler("NOTIFICATION_CHOOSE_TECH", new NotificationHandlers.ChooseTech);
NotificationModel.manager.registerHandler("NOTIFICATION_COMMAND_UNITS", new NotificationHandlers.CommandUnits);
NotificationModel.manager.registerHandler("NOTIFICATION_CONSIDER_RAZE_CITY", new NotificationHandlers.ConsiderRazeCity);
NotificationModel.manager.registerHandler("NOTIFICATION_NEW_POPULATION", new NotificationHandlers.NewPopulationHandler);
NotificationModel.manager.registerHandler("NOTIFICATION_CULTURE_TREE_REVEALED", new NotificationHandlers.ViewCultureTree);
NotificationModel.manager.registerHandler("NOTIFICATION_TRADITIONS_AVAILABLE", new NotificationHandlers.ViewPoliciesChooserNormal);
NotificationModel.manager.registerHandler("NOTIFICATION_CRISIS", new NotificationHandlers.ViewPoliciesChooserCrisis);
NotificationModel.manager.registerHandler("NOTIFICATION_CHOOSE_NARRATIVE_STORY_DIRECTION", new NotificationHandlers.ChooseNarrativeDirection);
NotificationModel.manager.registerHandler("NOTIFICATION_CHOOSE_DISCOVERY_STORY_DIRECTION", new NotificationHandlers.ChooseNarrativeDirection);
NotificationModel.manager.registerHandler("NOTIFICATION_CHOOSE_AUTO_NARRATIVE_STORY_DIRECTION", new NotificationHandlers.ChooseNarrativeDirection);
NotificationModel.manager.registerHandler("NOTIFICATION_CHOOSE_PANTHEON", new NotificationHandlers.ChoosePantheon);
NotificationModel.manager.registerHandler("NOTIFICATION_CHOOSE_RELIGION", new NotificationHandlers.ChooseReligion);
NotificationModel.manager.registerHandler("NOTIFICATION_CHOOSE_BELIEF", new NotificationHandlers.ChooseBelief);
NotificationModel.manager.registerHandler("NOTIFICATION_DIPLOMATIC_ACTION", new NotificationHandlers.InvestigateDiplomaticAction);
NotificationModel.manager.registerHandler("NOTIFICATION_DIPLOMATIC_ACTION_WARNING", new NotificationHandlers.InvestigateDiplomaticAction);
NotificationModel.manager.registerHandler("NOTIFICATION_PLAYER_DEFEATED", new NotificationHandlers.ViewVictoryProgress);
NotificationModel.manager.registerHandler("NOTIFICATION_TEAM_VICTORIOUS", new NotificationHandlers.ViewVictoryProgress);
NotificationModel.manager.registerHandler("NOTIFICATION_DIPLOMATIC_ALLY_AT_WAR", new NotificationHandlers.AllyAtWar);
NotificationModel.manager.registerHandler("NOTIFICATION_DECLARE_WAR", new NotificationHandlers.DeclareWar);
NotificationModel.manager.registerHandler("NOTIFICATION_GAME_INVITE", new NotificationHandlers.GameInvite);
NotificationModel.manager.registerHandler("NOTIFICATION_KICK_VOTE_STARTED", new NotificationHandlers.KickVote);
NotificationModel.manager.registerHandler("NOTIFICATION_DIPLOMATIC_RESPONSE_REQUIRED", new NotificationHandlers.RespondToDiplomaticAction);
NotificationModel.manager.registerHandler("NOTIFICATION_DIPLOMATIC_RELATIONSHIP_CHANGED", new NotificationHandlers.RelationshipChanged);
NotificationModel.manager.registerHandler("NOTIFICATION_ADVISOR_WARNING_SCIENCE", new NotificationHandlers.AdvisorWarning(TutorialAdvisorType.Science));
NotificationModel.manager.registerHandler("NOTIFICATION_ADVISOR_WARNING_CULTURE", new NotificationHandlers.AdvisorWarning(TutorialAdvisorType.Culture));
NotificationModel.manager.registerHandler("NOTIFICATION_ADVISOR_WARNING_ECONOMIC", new NotificationHandlers.AdvisorWarning(TutorialAdvisorType.Economic));
NotificationModel.manager.registerHandler("NOTIFICATION_ADVISOR_WARNING_MILITARY", new NotificationHandlers.AdvisorWarning(TutorialAdvisorType.Military));
NotificationModel.manager.registerHandler("NOTIFICATION_DIPLOMATIC_ACTION_ESPIONAGE", new NotificationHandlers.ActionEspionage);
NotificationModel.manager.registerHandler("NOTIFICATION_AGE_PROGRESSION_MILESTONE_MET", new NotificationHandlers.AgeProgression);
NotificationModel.manager.registerHandler("NOTIFICATION_AGE_PROGRESSION_PROGRESS_CHANGED", new NotificationHandlers.AgeProgression);
NotificationModel.manager.registerHandler("NOTIFICATION_CAPITAL_LOST", new NotificationHandlers.CapitalLost);
NotificationModel.manager.registerHandler("NOTIFICATION_PLAYER_UNLOCK_CHANGED", new NotificationHandlers.RewardUnlocked);
NotificationModel.manager.registerHandler("NOTIFICATION_GREAT_WORK_CREATED", new NotificationHandlers.GreatWorkCreated);
NotificationModel.manager.rebuild();