/**
 * model-tech-tree.ts
 * @copyright 2024-2025, Firaxis Games
 * @description Model for Tech Tree
 */
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
import { TreeGrid, TreeGridSourceType } from '/base-standard/ui/tree-grid/tree-grid.js';
import { TreeGridDirection } from '/base-standard/ui/tree-grid/tree-support.js';
export class TechTreeModel {
    constructor() {
        this.updateGate = new UpdateGate(this.update.bind(this));
        this._tree = null;
        this._activeTree = null;
        this._sourceProgressionTrees = undefined;
        this._iconCallback = () => "";
        window.addEventListener(ActiveDeviceTypeChangedEventName, () => {
            this.updateGate.call("ActiveDeviceTypeChangedEventName");
        });
        window.addEventListener(ActiveDeviceTypeChangedEventName, () => {
            this.updateGate.call("ActiveDeviceTypeChangedEventName");
        });
        this.updateGate.call("constructor");
    }
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    get playerId() {
        return GameContext.localPlayerID;
    }
    get tree() {
        return this._tree;
    }
    get isGamepadActive() {
        return ActionHandler.isGamepadActive;
    }
    get activeTree() {
        return this._activeTree;
    }
    set activeTree(eType) {
        this._activeTree = eType;
    }
    set iconCallback(iconCallback) {
        this._iconCallback = iconCallback;
    }
    get iconCallback() {
        return this._iconCallback;
    }
    set sourceProgressionTrees(sourceCSV) {
        this._sourceProgressionTrees = [];
        const sourceTreeTypes = sourceCSV.split(",");
        sourceTreeTypes.forEach(sourceString => {
            const id = parseInt(sourceString);
            if (id) {
                this._sourceProgressionTrees?.push(id);
            }
            else {
                this._sourceProgressionTrees?.push(sourceString);
            }
        });
        this.update();
    }
    update() {
        this._tree = null;
        const localPlayerID = GameContext.localPlayerID;
        const localPlayer = Players.get(localPlayerID);
        if (!localPlayer) {
            return;
        }
        const availableTrees = this._sourceProgressionTrees;
        if (availableTrees == undefined) {
            console.warn("model-tech-tree: No available trees to generate");
            return;
        }
        for (let tree of availableTrees) {
            const definition = GameInfo.ProgressionTrees.lookup(tree);
            if (!definition) {
                console.warn("model-tech-tree: update(): No definition for tree: " + tree);
                continue;
            }
            const turnsCallback = (nodeType) => {
                const player = Players.get(GameContext.localPlayerID);
                const turnsLeft = player ? (player.Techs ? player.Techs.getTurnsForNode(nodeType) : 0) : 0;
                return turnsLeft;
            };
            const treeConfig = {
                direction: TreeGridDirection.HORIZONTAL,
                delegateTurnForNode: turnsCallback,
                delegateGetIconPath: this.iconCallback,
                delegateCostForNode: (nodeType) => {
                    const techs = localPlayer.Techs;
                    if (!techs) {
                        return null;
                    }
                    return techs.getNodeCost(nodeType);
                },
                treeType: TreeGridSourceType.TECHS
            };
            const treeGrid = new TreeGrid(definition.ProgressionTreeType, treeConfig);
            treeGrid.initialize();
            const attrData = {
                type: definition.ProgressionTreeType,
                treeGrid
            };
            this._tree = attrData;
        }
        // If no active tree viewing, choose the first
        if (this._activeTree == null && this._tree != null) {
            this._activeTree = this._tree.type;
        }
        if (this.onUpdate) {
            this.onUpdate(this);
        }
    }
    getCard(type) {
        if (type == undefined) {
            return undefined;
        }
        const targetTree = this._tree;
        const targetCard = targetTree?.treeGrid?.getCard(type);
        if (targetCard != undefined) {
            return targetCard;
        }
        //Else we never found a type match:
        return (undefined);
    }
    findNode(id) {
        return this.getCard(id);
    }
    hoverItems(type) {
        if (!this._tree || !this._tree.treeGrid) {
            return [];
        }
        return this._tree.treeGrid.setHoverItem(type);
    }
    clearHoverItems() {
        return this._tree?.treeGrid?.clearHoverItems();
    }
    canAddChooseNotification() {
        if (!this._tree || !this._tree.treeGrid) {
            console.log("model-tech-tree: canAddChooseNotification(): No tree or grid to add notification check");
            return false;
        }
        return this._tree.treeGrid.canAddChooseNotification();
    }
}
const TechTree = new TechTreeModel();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(TechTree);
    };
    engine.createJSModel('g_TechTree', TechTree);
    TechTree.updateCallback = updateModel;
    engine.synchronizeModels();
});
export { TechTree as default };
//# sourceMappingURL=file:///base-standard/ui/tech-tree/model-tech-tree.js.map
