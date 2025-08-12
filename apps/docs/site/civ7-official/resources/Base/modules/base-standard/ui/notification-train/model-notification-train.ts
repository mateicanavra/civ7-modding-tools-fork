/**
 * @file model-notification-train.ts
 * @copyright 2021-2025, Firaxis Games
 * @description Handles notifications raised from game engine which may
 * require actions to be taken by player in order to progress.
 */

import { ComponentID } from '/core/ui/utilities/utilities-component-id.js'

export type NotificationType = number;
export type NotificationID = ComponentID;

export namespace NotificationModel {

	export enum QueryBy {
		InsertOrder,
		Severity,
		Priority
	};

	// Contains the instanced notifications that are all the same type.
	export class TypeEntry {
		private _owner: PlayerId = -1;
		private _type: number = -1;
		private _notifications: NotificationID[] = [];

		constructor(type: number, player?: PlayerId) {
			this._type = type;
			if (player) {
				this._owner = player;
			}
		}

		get isEmpty() { return this._notifications.length == 0; }
		get type() { return this._type; }
		get owner() { return this._owner; }

		get lowestID(): number {
			let lowest: number = -1;
			for (const id of this._notifications) {
				if (lowest < 0 || id.id < lowest)
					lowest = id.id;
			}
			return lowest;
		}

		get highestPriority(): number {
			let highest: number = 0;
			for (const id of this._notifications) {
				const notification = Game.Notifications.find(id);
				if (notification) {
					const notificationDB = GameInfo.Notifications.lookup(notification.Type);
					if (notificationDB) {
						let netSortOrder: number = notificationDB.Priority;

						if (Game.Notifications.getBlocksTurnAdvancement(id)) {
							netSortOrder += 20;	// force turn blockers to the front
						}

						if (netSortOrder > highest) {
							highest = netSortOrder;
						}
					}
				}
			}
			return highest;
		}

		get highestSeverity(): number {
			let highest: number = 0;
			for (const id of this._notifications) {
				const severity = Game.Notifications.getSeverity(id);
				if (severity && severity > highest)
					highest = severity;
			}
			return highest;
		}

		get notifications(): NotificationID[] { return this._notifications; }

		hasID(id: ComponentID): boolean {
			return ComponentID.isMatchInArray(this._notifications, id);
		}

		add(notificationId: NotificationID) {
			ComponentID.addToArray(this._notifications, notificationId);
		}

		remove(notificationId: NotificationID): boolean {
			return ComponentID.removeFromArray(this._notifications, notificationId);
		}

		// Get the topmost notification id.
		get topID(): NotificationID | null {

			if (this._notifications.length > 0)
				return this._notifications[0];

			return null;
		}
	}

	// Contains the instanced notifications that belong to a specific group type.
	export class GroupEntry {
		_owner: PlayerId = -1;
		_type: number = -1;
		_notifications: NotificationID[] = [];

		constructor(type: number, player?: PlayerId) {
			this._type = type;
			if (player) {
				this._owner = player;
			}
		}

		get owner() { return this._owner; }
		get type() { return this._type; }
		get notifications() { return this._notifications; }

		add(notificationId: NotificationID) {
			ComponentID.addToArray(this._notifications, notificationId);
		}

		remove(notificationId: NotificationID): boolean {
			return ComponentID.removeFromArray(this._notifications, notificationId);
		}

		getActive(): NotificationID | null {

			return null;
		}
	}

	interface GroupMap {
		[index: number]: GroupEntry | null;
	}

	interface TypeMap {
		[index: number]: TypeEntry | null;
	}

	type TypeArray = TypeEntry[];

	export class PlayerEntry {
		private _groups: GroupMap = {};		// Notifications by group
		private _types: TypeMap = {};		// Notifications by type
		private _owner: PlayerId = -1;

		constructor(player?: PlayerId) {
			if (player) {
				this._owner = player;
			}
		}

		get groups() { return this._groups; }
		get types() { return this._types; };
		get owner() { return this._owner; }

		addType(type: number): TypeEntry {
			const entry = this._types[type];
			if (entry != null) {
				return entry;
			} else {
				const newEntry = new TypeEntry(type, this._owner);
				this._types[type] = newEntry
				return newEntry;
			}
		}

		findType(type: number): TypeEntry | null {
			return this._types[type];
		}

		/**
		 * getTypesBy returns an array of sorted TypeEntry objects
		 * 
		 * @param queryBy The sorting method for the results
		 * @param includeBlockers Whether or not to include blockers in the results.
		 */
		getTypesBy(queryBy: QueryBy, includeBlockers = false): TypeArray {
			const result: TypeArray = [];
			for (const key in this._types) {
				const entry = this._types[key];
				const entryTopId = entry?.topID;
				if (entryTopId && (includeBlockers || !Game.Notifications.getBlocksTurnAdvancement(entryTopId))) {
					result.push(entry);
				}
			}

			if (queryBy == QueryBy.InsertOrder) {
				result.sort((a, b) => { return a.lowestID - b.lowestID; });
			} else if (queryBy == QueryBy.Priority) {
				result.sort((a, b) => { return b.highestPriority - a.highestPriority; });
			} else {
				if (queryBy == QueryBy.Severity) {
					result.sort((a, b) => { return b.highestSeverity - a.highestSeverity; });	// Sorting high to low.
				}
			}

			return result;
		}

		addGroup(type: number): GroupEntry {
			const entry = this._groups[type];
			if (entry != null) {
				return entry;
			} else {
				const newEntry = new GroupEntry(type, this._owner);
				this._groups[type] = newEntry;
				return newEntry;
			}
		}

		findGroup(type: number): GroupEntry | null {
			return this._groups[type];
		}

		remove(notificationId: NotificationID): boolean {

			let bFound: boolean = false;
			// We are not going to assume the notification still exists, so we won't try to get its type, etc.
			for (const key in this._types) {
				const value = this._types[key];
				if (value) {
					if (value.remove(notificationId)) {
						bFound = true;
						break;
					}
				}
			}

			for (const key in this._groups) {
				const value = this._groups[key];
				if (value) {
					if (value.remove(notificationId)) {
						bFound = true;
						break;
					}
				}
			}

			return bFound;
		}
	}

	interface PlayerMap {
		[index: number]: PlayerEntry | null;
	}

	export interface Handler {
		lookAt(notificationId: NotificationID): void;
		add(notificationId: NotificationID): boolean;
		dismiss(notificationId: NotificationID): void;
		activate(notificationId: NotificationID, activatedBy?: PlayerId | null): boolean;
	};

	export interface HandlerMap {
		[index: number]: Handler;
	}

	// Manager Class
	// This contains the current model state for the notifications.
	export class NotificationTrainManagerImpl {
		private needRebuild: boolean = false;
		private handlers: HandlerMap = {};
		private players: PlayerMap = {};
		private defaultHandler: Handler | null = null;
		private _eventNotificationAdd: LiteEvent<NotificationID> = new LiteEvent<NotificationID>();
		private _eventNotificationRemove: LiteEvent<NotificationID> = new LiteEvent<NotificationID>();
		private _eventNotificationRebuild: LiteEvent<PlayerId> = new LiteEvent<PlayerId>();
		private _eventNotificationUpdate: LiteEvent<void> = new LiteEvent<void>();
		private _eventNotificationHide: LiteEvent<void> = new LiteEvent<void>();
		private _eventNotificationHighlight: LiteEvent<ComponentID> = new LiteEvent<ComponentID>();
		private _eventNotificationUnHighlight: LiteEvent<ComponentID> = new LiteEvent<ComponentID>();
		private _eventNotificationDoFX: LiteEvent<void> = new LiteEvent<void>();

		lastAnimationTurn: number = 0;	// The last turn number we did the notification animations on
		lastMobileNotificationTurn: number = 0;	// The last turn number we did the mobile notifcation sound on
		refreshAfterFX: boolean = false;

		get eventNotificationAdd() {
			return this._eventNotificationAdd.expose();
		}
		get eventNotificationRemove() {
			return this._eventNotificationRemove.expose();
		}

		get eventNotificationRebuild() {
			return this._eventNotificationRebuild.expose();
		}

		get eventNotificationUpdate() {
			return this._eventNotificationUpdate.expose();
		}

		get eventNotificationHide() {
			return this._eventNotificationHide.expose();
		}

		get eventNotificationHighlight() {
			return this._eventNotificationHighlight.expose();
		}

		get eventNotificationUnHighlight() {
			return this._eventNotificationUnHighlight.expose();
		}

		get eventNotificationDoFX() {
			return this._eventNotificationDoFX.expose();
		}

		constructor() {
			engine.whenReady.then(() => {
				engine.on('PlayerTurnActivated', (data: PlayerTurnActivated_EventData) => { this.onPlayerTurnActivated(data) });
				engine.on('NotificationAdded', (data: Notification_EventData) => { this.onNotificationAdded(data) });
				engine.on('NotificationDismissed', (data: Notification_EventData) => { this.onNotificationDismissed(data) });
				engine.on('NotificationActivated', (data: NotificationActivated_EventData) => { this.onNotificationActivated(data) });
				engine.on('GameCoreEventPlaybackComplete', () => { this.onEventPlaybackComplete() });

				this.rebuild();
			});
		}

		private reset() {
			// Reset the data, does not reset the handlers or listeners
			this.players = {};
			this.needRebuild = false;
		}

		registerHandler(hashId: HashId, handler: Handler) {
			const typeId: NotificationType = Game.getHash(hashId);	// Resolve to a number
			this.handlers[typeId] = handler;
		}

		setDefaultHandler(handler: Handler) {
			this.defaultHandler = handler;
		}

		findHandler(type: number | null): Handler | null {
			if (type != null) {
				const handler = this.handlers[type];
				if (handler != null) {
					return handler;
				}
				return this.defaultHandler;
			}
			return null;
		}

		private removePlayer(player: PlayerId) {
			this.players[player as number] = null;
		}

		private addPlayer(player: PlayerId): PlayerEntry {
			let playerEntry = this.players[player as number];
			if (playerEntry == null) {
				playerEntry = new PlayerEntry(player);
				this.players[player as number] = playerEntry;
			}
			return playerEntry;
		}

		findPlayer(player: PlayerId): PlayerEntry | null {
			return this.players[player as number];
		}

		add(notificationType: number, groupType: number, notificationId: NotificationID) {
			const playerEntry = this.addPlayer(notificationId.owner);

			const typeEntry = playerEntry.addType(notificationType);
			if (typeEntry) {
				typeEntry.add(notificationId);
			}

			if (groupType != NotificationGroups.NONE) {
				const groupEntry = playerEntry.addGroup(groupType);
				if (groupEntry) {
					groupEntry.add(notificationId);
				}
			}

			this._eventNotificationAdd.trigger(notificationId);
		}

		remove(notificationId: NotificationID) {
			const playerEntry = this.findPlayer(notificationId.owner);
			if (playerEntry) {
				if (playerEntry.remove(notificationId)) {
					this._eventNotificationRemove.trigger(notificationId);
					Game.Notifications.clearNotifAudioTracking(notificationId);
				}
			}
		}

		getNotificationCount(playerId: PlayerId): number {
			let notificationCount: number = 0;
			const playerEntry = this.findPlayer(playerId);

			if (playerEntry) {
				for (const key in playerEntry.types) {
					const value = playerEntry.types[key];
					if (value) {
						const entryTopId = value.topID;
						if (entryTopId && !Game.Notifications.getBlocksTurnAdvancement(entryTopId)) {
							notificationCount += value.notifications.length;
						}
					}
				}
			}
			return notificationCount;
		}

		onDismiss(notificationId: NotificationID) {
			// if we're dismissing, we definitely don't want any more animations
			NotificationModel.manager.lastAnimationTurn = Game.turn;
			this.remove(notificationId);
		}

		dismissByType(type: number) {
			if (GameContext.localPlayerID != -1) {
				const ids: ComponentID[] | null = Game.Notifications.getIdsForPlayer(GameContext.localPlayerID);

				if (ids && ids.length > 0) {
					for (const id of ids) {
						const notification: Notification | null = Game.Notifications.find(id);
						if (notification) {
							if (notification.Type == type) {
								this.onDismiss(id);
							}
						}
					}
				}
			}
		}

		dismiss(notificationId: NotificationID) {
			const type: number | null = Game.Notifications.getType(notificationId);
			const handler: Handler | null = this.findHandler(type);
			if (handler) {
				handler.dismiss(notificationId);
			} else {
				this.onDismiss(notificationId);
			}
		}

		findTypeEntry(notificationId: NotificationID): TypeEntry | null {
			const notification = Game.Notifications.find(notificationId);
			if (notification) {
				const playerEntry = this.players[notificationId.owner];
				if (playerEntry) {
					return playerEntry.findType(notification.Type);
				}
			}
			return null;
		}

		lookAt(notificationId: NotificationID) {
			const type: number | null = Game.Notifications.getType(notificationId);
			const handler: Handler | null = this.findHandler(type);
			if (handler) {
				handler.lookAt(notificationId)
			} else {
				console.warn(`Notification: Unable to find handler for '${notificationId}'`);
			}
		}

		activate(notificationId: NotificationID) {
			const type: number | null = Game.Notifications.getType(notificationId);
			const handler: Handler | null = this.findHandler(type);
			if (handler && handler.activate) {

				if (type && Game.Notifications.getTypeName(type) != "NOTIFICATION_COMMAND_UNITS" && UI.Player.getHeadSelectedUnit()) {
					UI.Player.deselectAllUnits();
				}

				if (!handler.activate(notificationId, GameContext.localPlayerID)) {
					console.warn(`Notification: Failure when activating '${notificationId}'`);
				}
			} else {
				console.warn(`Notification: Unable to find handler for '${notificationId}'`);
			}
		}

		rebuild() {
			this.reset();

			if (GameContext.localPlayerID != -1) {
				const localPlayer = GameContext.localPlayerID;
				this.removePlayer(localPlayer);
				const ids = Game.Notifications.getIdsForPlayer(localPlayer, IgnoreNotificationType.DISMISSED);
				if (ids && ids.length > 0) {
					for (const id of ids) {
						const handler = this.findHandler(Game.Notifications.getType(id));
						if (handler) {
							handler.add(id);
						}
					}
				}

				// Set the screen's needRebuild flag (no other action is taken, so this is safe to not queue)
				this._eventNotificationRebuild.trigger(GameContext.localPlayerID);
			}

		}

		playAudio(notificationID: ComponentID, context: string) {
			const notificationType = Game.Notifications.getType(notificationID);
			if (notificationType) {
				const notificationName: string | null = Game.Notifications.getTypeName(notificationType);

				if (notificationName) {
					if (Game.Notifications.getPlayedAudioOnTurn(notificationID, Game.turn)) {
						return;
					}

					for (const def of GameInfo.NotificationSounds) {
						if (def.Audio && def.NotificationType == notificationName && def.Context == context) {
							UI.sendAudioEvent(def.Audio);
							break;
						}
						Game.Notifications.setPlayedAudioOnTurn(notificationID, Game.turn);
					}
				}
			}
		}

		updateNotifications() {
			if (this.needRebuild) {
				this._eventNotificationUpdate.trigger();
				this.needRebuild = false;
			}
		}

		// Event listeners
		private onPlayerTurnActivated(data: PlayerTurnActivated_EventData) {
			if (data.player == GameContext.localPlayerID) {
				this.needRebuild = true;
			}
		}

		private onNotificationAdded(data: Notification_EventData) {
			if (data.id?.owner == GameContext.localPlayerID) {
				if (!this.needRebuild) {
					const handler = this.findHandler(Game.Notifications.getType(data.id));
					if (handler) {
						handler.add(data.id);
					}
				}
			}
		}

		private onNotificationDismissed(data: Notification_EventData) {
			if (data.id?.owner == GameContext.localPlayerID) {
				if (!this.needRebuild) {
					const handler = this.findHandler(data.type);
					if (handler) {
						handler.dismiss(data.id);
					}
				}
				// Queuing the audio separately.
				this.playAudio(data.id, "Dismiss");
			}
		}

		private onNotificationActivated(data: NotificationActivated_EventData) {
			if (data.id?.owner == GameContext.localPlayerID) {
				this.activate(data.id);
				// Maybe do this in the handler?
				this.playAudio(data.id, "Activate");
			}
		}

		private onEventPlaybackComplete() {
			if (this.needRebuild) {
				this.rebuild();
			}

			this._eventNotificationUpdate.trigger();
		}

	};

	export const manager = new NotificationTrainManagerImpl();
}
