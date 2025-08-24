/**
 * @file model-notification-train.ts
 * @copyright 2021-2025, Firaxis Games
 * @description Handles notifications raised from game engine which may
 * require actions to be taken by player in order to progress.
 */
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
export var NotificationModel;
(function (NotificationModel) {
    let QueryBy;
    (function (QueryBy) {
        QueryBy[QueryBy["InsertOrder"] = 0] = "InsertOrder";
        QueryBy[QueryBy["Severity"] = 1] = "Severity";
        QueryBy[QueryBy["Priority"] = 2] = "Priority";
    })(QueryBy = NotificationModel.QueryBy || (NotificationModel.QueryBy = {}));
    ;
    // Contains the instanced notifications that are all the same type.
    class TypeEntry {
        constructor(type, player) {
            this._owner = -1;
            this._type = -1;
            this._notifications = [];
            this._type = type;
            if (player) {
                this._owner = player;
            }
        }
        get isEmpty() { return this._notifications.length == 0; }
        get type() { return this._type; }
        get owner() { return this._owner; }
        get lowestID() {
            let lowest = -1;
            for (const id of this._notifications) {
                if (lowest < 0 || id.id < lowest)
                    lowest = id.id;
            }
            return lowest;
        }
        get highestPriority() {
            let highest = 0;
            for (const id of this._notifications) {
                const notification = Game.Notifications.find(id);
                if (notification) {
                    const notificationDB = GameInfo.Notifications.lookup(notification.Type);
                    if (notificationDB) {
                        let netSortOrder = notificationDB.Priority;
                        if (Game.Notifications.getBlocksTurnAdvancement(id)) {
                            netSortOrder += 20; // force turn blockers to the front
                        }
                        if (netSortOrder > highest) {
                            highest = netSortOrder;
                        }
                    }
                }
            }
            return highest;
        }
        get highestSeverity() {
            let highest = 0;
            for (const id of this._notifications) {
                const severity = Game.Notifications.getSeverity(id);
                if (severity && severity > highest)
                    highest = severity;
            }
            return highest;
        }
        get notifications() { return this._notifications; }
        hasID(id) {
            return ComponentID.isMatchInArray(this._notifications, id);
        }
        add(notificationId) {
            ComponentID.addToArray(this._notifications, notificationId);
        }
        remove(notificationId) {
            return ComponentID.removeFromArray(this._notifications, notificationId);
        }
        // Get the topmost notification id.
        get topID() {
            if (this._notifications.length > 0)
                return this._notifications[0];
            return null;
        }
    }
    NotificationModel.TypeEntry = TypeEntry;
    // Contains the instanced notifications that belong to a specific group type.
    class GroupEntry {
        constructor(type, player) {
            this._owner = -1;
            this._type = -1;
            this._notifications = [];
            this._type = type;
            if (player) {
                this._owner = player;
            }
        }
        get owner() { return this._owner; }
        get type() { return this._type; }
        get notifications() { return this._notifications; }
        add(notificationId) {
            ComponentID.addToArray(this._notifications, notificationId);
        }
        remove(notificationId) {
            return ComponentID.removeFromArray(this._notifications, notificationId);
        }
        getActive() {
            return null;
        }
    }
    NotificationModel.GroupEntry = GroupEntry;
    class PlayerEntry {
        constructor(player) {
            this._groups = {}; // Notifications by group
            this._types = {}; // Notifications by type
            this._owner = -1;
            if (player) {
                this._owner = player;
            }
        }
        get groups() { return this._groups; }
        get types() { return this._types; }
        ;
        get owner() { return this._owner; }
        addType(type) {
            const entry = this._types[type];
            if (entry != null) {
                return entry;
            }
            else {
                const newEntry = new TypeEntry(type, this._owner);
                this._types[type] = newEntry;
                return newEntry;
            }
        }
        findType(type) {
            return this._types[type];
        }
        /**
         * getTypesBy returns an array of sorted TypeEntry objects
         *
         * @param queryBy The sorting method for the results
         * @param includeBlockers Whether or not to include blockers in the results.
         */
        getTypesBy(queryBy, includeBlockers = false) {
            const result = [];
            for (const key in this._types) {
                const entry = this._types[key];
                const entryTopId = entry?.topID;
                if (entryTopId && (includeBlockers || !Game.Notifications.getBlocksTurnAdvancement(entryTopId))) {
                    result.push(entry);
                }
            }
            if (queryBy == QueryBy.InsertOrder) {
                result.sort((a, b) => { return a.lowestID - b.lowestID; });
            }
            else if (queryBy == QueryBy.Priority) {
                result.sort((a, b) => { return b.highestPriority - a.highestPriority; });
            }
            else {
                if (queryBy == QueryBy.Severity) {
                    result.sort((a, b) => { return b.highestSeverity - a.highestSeverity; }); // Sorting high to low.
                }
            }
            return result;
        }
        addGroup(type) {
            const entry = this._groups[type];
            if (entry != null) {
                return entry;
            }
            else {
                const newEntry = new GroupEntry(type, this._owner);
                this._groups[type] = newEntry;
                return newEntry;
            }
        }
        findGroup(type) {
            return this._groups[type];
        }
        remove(notificationId) {
            let bFound = false;
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
    NotificationModel.PlayerEntry = PlayerEntry;
    ;
    // Manager Class
    // This contains the current model state for the notifications.
    class NotificationTrainManagerImpl {
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
            this.needRebuild = false;
            this.handlers = {};
            this.players = {};
            this.defaultHandler = null;
            this._eventNotificationAdd = new LiteEvent();
            this._eventNotificationRemove = new LiteEvent();
            this._eventNotificationRebuild = new LiteEvent();
            this._eventNotificationUpdate = new LiteEvent();
            this._eventNotificationHide = new LiteEvent();
            this._eventNotificationHighlight = new LiteEvent();
            this._eventNotificationUnHighlight = new LiteEvent();
            this._eventNotificationDoFX = new LiteEvent();
            this.lastAnimationTurn = 0; // The last turn number we did the notification animations on
            this.lastMobileNotificationTurn = 0; // The last turn number we did the mobile notifcation sound on
            this.refreshAfterFX = false;
            engine.whenReady.then(() => {
                engine.on('PlayerTurnActivated', (data) => { this.onPlayerTurnActivated(data); });
                engine.on('NotificationAdded', (data) => { this.onNotificationAdded(data); });
                engine.on('NotificationDismissed', (data) => { this.onNotificationDismissed(data); });
                engine.on('NotificationActivated', (data) => { this.onNotificationActivated(data); });
                engine.on('GameCoreEventPlaybackComplete', () => { this.onEventPlaybackComplete(); });
                this.rebuild();
            });
        }
        reset() {
            // Reset the data, does not reset the handlers or listeners
            this.players = {};
            this.needRebuild = false;
        }
        registerHandler(hashId, handler) {
            const typeId = Game.getHash(hashId); // Resolve to a number
            this.handlers[typeId] = handler;
        }
        setDefaultHandler(handler) {
            this.defaultHandler = handler;
        }
        findHandler(type) {
            if (type != null) {
                const handler = this.handlers[type];
                if (handler != null) {
                    return handler;
                }
                return this.defaultHandler;
            }
            return null;
        }
        removePlayer(player) {
            this.players[player] = null;
        }
        addPlayer(player) {
            let playerEntry = this.players[player];
            if (playerEntry == null) {
                playerEntry = new PlayerEntry(player);
                this.players[player] = playerEntry;
            }
            return playerEntry;
        }
        findPlayer(player) {
            return this.players[player];
        }
        add(notificationType, groupType, notificationId) {
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
        remove(notificationId) {
            const playerEntry = this.findPlayer(notificationId.owner);
            if (playerEntry) {
                if (playerEntry.remove(notificationId)) {
                    this._eventNotificationRemove.trigger(notificationId);
                    Game.Notifications.clearNotifAudioTracking(notificationId);
                }
            }
        }
        getNotificationCount(playerId) {
            let notificationCount = 0;
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
        onDismiss(notificationId) {
            // if we're dismissing, we definitely don't want any more animations
            NotificationModel.manager.lastAnimationTurn = Game.turn;
            this.remove(notificationId);
        }
        dismissByType(type) {
            if (GameContext.localPlayerID != -1) {
                const ids = Game.Notifications.getIdsForPlayer(GameContext.localPlayerID);
                if (ids && ids.length > 0) {
                    for (const id of ids) {
                        const notification = Game.Notifications.find(id);
                        if (notification) {
                            if (notification.Type == type) {
                                this.onDismiss(id);
                            }
                        }
                    }
                }
            }
        }
        dismiss(notificationId) {
            const type = Game.Notifications.getType(notificationId);
            const handler = this.findHandler(type);
            if (handler) {
                handler.dismiss(notificationId);
            }
            else {
                this.onDismiss(notificationId);
            }
        }
        findTypeEntry(notificationId) {
            const notification = Game.Notifications.find(notificationId);
            if (notification) {
                const playerEntry = this.players[notificationId.owner];
                if (playerEntry) {
                    return playerEntry.findType(notification.Type);
                }
            }
            return null;
        }
        lookAt(notificationId) {
            const type = Game.Notifications.getType(notificationId);
            const handler = this.findHandler(type);
            if (handler) {
                handler.lookAt(notificationId);
            }
            else {
                console.warn(`Notification: Unable to find handler for '${notificationId}'`);
            }
        }
        activate(notificationId) {
            const type = Game.Notifications.getType(notificationId);
            const handler = this.findHandler(type);
            if (handler && handler.activate) {
                if (type && Game.Notifications.getTypeName(type) != "NOTIFICATION_COMMAND_UNITS" && UI.Player.getHeadSelectedUnit()) {
                    UI.Player.deselectAllUnits();
                }
                if (!handler.activate(notificationId, GameContext.localPlayerID)) {
                    console.warn(`Notification: Failure when activating '${notificationId}'`);
                }
            }
            else {
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
        playAudio(notificationID, context) {
            const notificationType = Game.Notifications.getType(notificationID);
            if (notificationType) {
                const notificationName = Game.Notifications.getTypeName(notificationType);
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
        onPlayerTurnActivated(data) {
            if (data.player == GameContext.localPlayerID) {
                this.needRebuild = true;
            }
        }
        onNotificationAdded(data) {
            if (data.id?.owner == GameContext.localPlayerID) {
                if (!this.needRebuild) {
                    const handler = this.findHandler(Game.Notifications.getType(data.id));
                    if (handler) {
                        handler.add(data.id);
                    }
                }
            }
        }
        onNotificationDismissed(data) {
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
        onNotificationActivated(data) {
            if (data.id?.owner == GameContext.localPlayerID) {
                this.activate(data.id);
                // Maybe do this in the handler?
                this.playAudio(data.id, "Activate");
            }
        }
        onEventPlaybackComplete() {
            if (this.needRebuild) {
                this.rebuild();
            }
            this._eventNotificationUpdate.trigger();
        }
    }
    NotificationModel.NotificationTrainManagerImpl = NotificationTrainManagerImpl;
    ;
    NotificationModel.manager = new NotificationTrainManagerImpl();
})(NotificationModel || (NotificationModel = {}));
//# sourceMappingURL=file:///base-standard/ui/notification-train/model-notification-train.js.map
