/**
 * model-culture-tree.ts
 * @copyright 2024-2025, Firaxis Games
 * @description Model for Civics Tree
 */
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
import { TreeGrid, TreeGridSourceType } from '/base-standard/ui/tree-grid/tree-grid.js';
import { TreeGridDirection } from '/base-standard/ui/tree-grid/tree-support.js';
export class CultureTreeModel {
    constructor() {
        this.updateGate = new UpdateGate(this.update.bind(this));
        this._trees = [];
        this._activeTree = undefined;
        this._sourceProgressionTrees = undefined;
        this._iconCallback = () => "";
        this._lastHighlightTree = null;
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
    get trees() {
        return this._trees;
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
        this._trees = [];
        const localPlayerID = GameContext.localPlayerID;
        const localPlayer = Players.get(localPlayerID);
        if (!localPlayer) {
            return;
        }
        const availableTrees = this._sourceProgressionTrees;
        if (availableTrees == undefined) {
            console.warn("model-culture-tree: No available trees to generate");
            return;
        }
        const treeCulture = localPlayer.Culture?.getActiveTree();
        if (treeCulture) {
            this.activeTree = GameInfo.ProgressionTrees.lookup(treeCulture)?.ProgressionTreeType;
        }
        for (let tree of availableTrees) {
            const definition = GameInfo.ProgressionTrees.lookup(tree);
            if (!definition) {
                console.warn("model-culture-tree: update(): No definition for tree: " + tree);
                continue;
            }
            const turnsCallback = (nodeType) => {
                const player = Players.get(GameContext.localPlayerID);
                const turnsLeft = player ? (player.Culture ? player.Culture.getTurnsForNode(nodeType) : 0) : 0;
                return turnsLeft;
            };
            const treeConfig = {
                activeTree: this.activeTree,
                direction: TreeGridDirection.HORIZONTAL,
                delegateGetIconPath: this.iconCallback,
                delegateTurnForNode: turnsCallback,
                delegateCostForNode: (nodeType) => {
                    const culture = localPlayer.Culture;
                    if (!culture) {
                        return null;
                    }
                    return culture.getNodeCost(nodeType);
                },
                treeType: TreeGridSourceType.CULTURE
            };
            const treeGrid = new TreeGrid(definition.ProgressionTreeType, treeConfig);
            treeGrid.initialize();
            const attrData = {
                type: definition.ProgressionTreeType,
                treeGrid
            };
            this._trees.push(attrData);
        }
        if (this.onUpdate) {
            this.onUpdate(this);
        }
    }
    getCultureTreeData(attr) {
        for (let data of this._trees) {
            if (data.type == attr) {
                return data;
            }
        }
        // Not found, create
        let newData = {
            type: attr
        };
        this._trees.push(newData);
        return newData;
    }
    getCard(type) {
        if (type == undefined) {
            return undefined;
        }
        for (let iTree = 0; iTree < this._trees.length; iTree++) {
            const targetTree = this._trees[iTree];
            const targetCard = targetTree.treeGrid?.getCard(type);
            if (targetCard != undefined) {
                return targetCard;
            }
        }
        //Else we never found a type match:
        return (undefined);
    }
    findNode(id) {
        return this.getCard(id);
    }
    findTree(type) {
        for (let iTree = 0; iTree < this._trees.length; iTree++) {
            const targetTree = this._trees[iTree];
            const targetCard = targetTree.treeGrid?.getCard(type);
            if (targetCard != undefined) {
                return targetTree;
            }
        }
        return null;
    }
    hoverItems(type) {
        const tree = this.findTree(type);
        if (!tree || !tree.treeGrid) {
            return [];
        }
        this._lastHighlightTree = tree;
        return tree.treeGrid.setHoverItem(type);
    }
    clearHoverItems() {
        return this._lastHighlightTree?.treeGrid?.clearHoverItems();
    }
}
const CultureTree = new CultureTreeModel();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(CultureTree);
    };
    engine.createJSModel('g_CultureTree', CultureTree);
    CultureTree.updateCallback = updateModel;
    engine.synchronizeModels();
});
export { CultureTree as default };
//# sourceMappingURL=file:///base-standard/ui/culture-tree/model-culture-tree.js.map
