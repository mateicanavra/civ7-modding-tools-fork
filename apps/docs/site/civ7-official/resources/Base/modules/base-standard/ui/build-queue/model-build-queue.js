/**
 * @file model-build-queue.ts
 * @copyright 2020-2022, Firaxis Games
 * @description Model the build queue for the selected city
 */
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
class BuildQueueModel {
    get isEmpty() { return (this.items.length == 0); }
    constructor() {
        this.CityID = null;
        this.Items = [];
        this.updateGate = new UpdateGate(() => {
            this.Items = [];
            let index = 0;
            const player = Players.get(GameContext.localPlayerID);
            const cityID = this.cityID;
            if (player && cityID) {
                const c = Cities.get(cityID);
                if (c) {
                    const queue = c.BuildQueue;
                    if (queue) {
                        const queueNodes = queue.getQueue();
                        queueNodes.forEach(queueData => {
                            let turns = queue.getTurnsLeft(queueData.type);
                            let progress = queue.getPercentComplete(queueData.type);
                            let name = "?name?";
                            if (queueData.orderType == OrderTypes.ORDER_CONSTRUCT) {
                                const buildingInfo = GameInfo.Constructibles.lookup(queueData.constructibleType);
                                if (buildingInfo) {
                                    name = Locale.compose(buildingInfo.Name);
                                }
                                else {
                                    console.warn("Queue item without a definition: " + queueData.orderType.toString());
                                    name = queueData.orderType.toString(); // TODO: Show nothing or something else? (Pre-vertical slice, show whatever this is that is missing)
                                }
                                this.Items.push({
                                    index: index++,
                                    name: name,
                                    type: buildingInfo ? buildingInfo.ConstructibleType : "",
                                    turns: turns != -1 ? turns.toString() : "999",
                                    showTurns: turns > 0,
                                    icon: buildingInfo ? Icon.getConstructibleIconFromDefinition(buildingInfo) : "",
                                    percentComplete: progress
                                });
                            }
                            else if (queueData.orderType == OrderTypes.ORDER_TRAIN || queueData.orderType == OrderTypes.ORDER_FOOD_TRAIN) {
                                const unitInfo = GameInfo.Units.lookup(queueData.unitType);
                                if (unitInfo) {
                                    name = Locale.compose(unitInfo.Name);
                                }
                                else {
                                    console.warn("Queue item without a definition: " + queueData.orderType.toString());
                                    name = queueData.orderType.toString(); // TODO: Show nothing or something else? (Pre-vertical slice, show whatever this is that is missing)
                                }
                                this.Items.push({
                                    index: index++,
                                    name: name,
                                    type: unitInfo ? unitInfo.UnitType : "",
                                    turns: turns != -1 ? turns.toString() : "999",
                                    showTurns: turns > 0,
                                    icon: unitInfo ? Icon.getUnitIconFromDefinition(unitInfo) : "",
                                    percentComplete: progress,
                                    isUnit: true,
                                });
                            }
                            else if (queueData.orderType == OrderTypes.ORDER_ADVANCE) {
                                const projectInfo = GameInfo.Projects.lookup(queueData.projectType);
                                if (projectInfo) {
                                    name = Locale.compose(projectInfo.Name);
                                }
                                else {
                                    console.warn("Queue item without a definition: " + queueData.orderType.toString());
                                    name = queueData.orderType.toString(); // TODO: Show nothing or something else? (Pre-vertical slice, show whatever this is that is missing)
                                }
                                this.Items.push({
                                    index: index++,
                                    name: name,
                                    type: projectInfo ? projectInfo.ProjectType : "",
                                    turns: turns != -1 ? turns.toString() : "999",
                                    showTurns: turns > 0,
                                    icon: projectInfo ? Icon.getProjectIconFromDefinition(projectInfo) : "",
                                    percentComplete: progress
                                });
                            }
                        });
                    }
                }
            }
            ;
            if (this._OnUpdate) {
                this._OnUpdate(this);
            }
        });
        engine.whenReady.then(() => {
            //TODO: also update when build queue events trigger! 
            engine.on('CitySelectionChanged', (event) => {
                if (event.cityID.owner != GameContext.localPlayerID) {
                    // Ignore updates for other players
                    return;
                }
                if (event.selected) {
                    if (ComponentID.isValid(event.cityID)) {
                        this.cityID = event.cityID;
                        return;
                    }
                    console.error("Model build queue is unable to get valid cityID from selected event.");
                }
                this.cityID = ComponentID.getInvalidID();
            });
            engine.on('CityProductionQueueChanged', (data) => {
                if (data.cityID.owner == GameContext.localPlayerID) {
                    this.updateGate.call('CityProductionQueueChanged');
                }
            });
            engine.on('CityProductionChanged', (data) => {
                if (data.cityID.owner == GameContext.localPlayerID) {
                    this.updateGate.call('CityProductionChanged');
                }
            });
            engine.on('CityYieldChanged', (data) => {
                if (data.cityID.owner == GameContext.localPlayerID) {
                    this.updateGate.call('CityYieldChanged');
                }
            });
            engine.on('CityProductionUpdated', (data) => {
                if (data.cityID.owner == GameContext.localPlayerID) {
                    this.updateGate.call('CityProductionUpdated');
                }
            });
            window.addEventListener('request-build-queue-cancel-item', (event) => { this.cancelItem(event.detail.index); });
            window.addEventListener('request-build-queue-move-item-up', (event) => { this.moveItemUp(event.detail.index); });
            window.addEventListener('request-build-queue-move-item-last', (event) => { this.moveItemLast(event.detail.index); });
            this.updateGate.call('engine.whenReady');
        });
    }
    get isTrackingCity() {
        return this.CityID != null;
    }
    set updateCallback(callback) {
        this._OnUpdate = callback;
    }
    set cityID(id) {
        this.CityID = id;
        this.updateGate.call('set cityID');
    }
    get cityID() {
        return this.CityID;
    }
    get items() {
        return this.Items ?? [];
    }
    cancelItem(rawIndex) {
        const index = parseInt(rawIndex);
        if (index > -1) {
            if (this.CityID) {
                console.log(`Attempting to cancel item at rawIndex ${rawIndex}`);
                const args = {};
                args.InsertMode = CityOperationsParametersValues.RemoveAt;
                args.QueueLocation = index;
                const result = Game.CityOperations.canStart(this.CityID, CityOperationTypes.BUILD, args, false);
                if (result.Success) {
                    Game.CityOperations.sendRequest(this.CityID, CityOperationTypes.BUILD, args);
                }
            }
            else {
                console.error(`Attempting to delete from build queue construction w/ no city selected!`);
            }
        }
    }
    moveItemUp(rawIndex) {
        const index = parseInt(rawIndex);
        if (index > -1) {
            if (this.CityID) {
                const args = {
                    InsertMode: CityOperationsParametersValues.Swap,
                    QueueSourceLocation: index,
                    QueueDestinationLocation: index - 1
                };
                const result = Game.CityOperations.canStart(this.CityID, CityOperationTypes.BUILD, args, false);
                if (result.Success) {
                    Game.CityOperations.sendRequest(this.CityID, CityOperationTypes.BUILD, args);
                }
            }
        }
        else {
            console.error(`Attempting to modify build queue construction w/ no city selected!`);
        }
    }
    moveItemDown(rawIndex) {
        const index = parseInt(rawIndex);
        if (index > -1) {
            if (this.CityID) {
                const args = {
                    InsertMode: CityOperationsParametersValues.Swap,
                    QueueSourceLocation: index,
                    QueueDestinationLocation: index + 1
                };
                const result = Game.CityOperations.canStart(this.CityID, CityOperationTypes.BUILD, args, false);
                if (result.Success) {
                    Game.CityOperations.sendRequest(this.CityID, CityOperationTypes.BUILD, args);
                }
            }
        }
        else {
            console.error(`Attempting to modify build queue construction w/ no city selected!`);
        }
    }
    moveItemLast(rawIndex) {
        const index = parseInt(rawIndex);
        if (index > -1) {
            if (this.Items.length > 0 && this.CityID) {
                const args = {
                    InsertMode: CityOperationsParametersValues.MoveTo,
                    QueueSourceLocation: index,
                    QueueDestinationLocation: this.Items.length - 1
                };
                const result = Game.CityOperations.canStart(this.CityID, CityOperationTypes.BUILD, args, false);
                if (result.Success) {
                    Game.CityOperations.sendRequest(this.CityID, CityOperationTypes.BUILD, args);
                }
            }
        }
        else {
            console.error(`Attempting to modify build queue construction w/ no city selected!`);
        }
    }
}
export const BuildQueue = new BuildQueueModel();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(BuildQueue);
    };
    engine.createJSModel('g_BuildQueue', BuildQueue);
    BuildQueue.updateCallback = updateModel;
});
//# sourceMappingURL=file:///base-standard/ui/build-queue/model-build-queue.js.map
