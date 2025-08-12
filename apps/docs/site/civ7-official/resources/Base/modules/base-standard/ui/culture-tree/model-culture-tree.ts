/**
 * model-culture-tree.ts
 * @copyright 2024-2025, Firaxis Games
 * @description Model for Civics Tree
 */

import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
import { TreeGrid, TreeGridConfiguration, TreeGridSourceType } from '/base-standard/ui/tree-grid/tree-grid.js';
import { TreeGridDirection } from '/base-standard/ui/tree-grid/tree-support.js';

export interface CultureTreeData {
	type: ProgressionTreeType;
	treeGrid?: TreeGrid;
}

export class CultureTreeModel {

	private onUpdate?: (model: CultureTreeModel) => void;
	updateGate: UpdateGate = new UpdateGate(this.update.bind(this));

	private _trees: CultureTreeData[] = [];
	private _activeTree: ProgressionTreeType | undefined = undefined;
	private _sourceProgressionTrees: ProgressionTreeType[] | undefined = undefined;
	private _iconCallback: (node: ProgressionTreeNodeDefinition) => string = () => "";
	private _lastHighlightTree: CultureTreeData | null = null;

	constructor() {
		window.addEventListener(ActiveDeviceTypeChangedEventName, () => {
			this.updateGate.call("ActiveDeviceTypeChangedEventName")
		});

		this.updateGate.call("constructor");
	}

	set updateCallback(callback: (model: CultureTreeModel) => void) {
		this.onUpdate = callback;
	}

	get playerId(): PlayerId {
		return GameContext.localPlayerID;
	}
	get trees(): CultureTreeData[] {
		return this._trees;
	}
	get isGamepadActive(): boolean {
		return ActionHandler.isGamepadActive;
	}
	get activeTree() {
		return this._activeTree;
	}
	set activeTree(eType: ProgressionTreeType | undefined) {
		this._activeTree = eType;
	}

	set iconCallback(iconCallback: (node: ProgressionTreeNodeDefinition) => string) {
		this._iconCallback = iconCallback;
	}

	get iconCallback(): (node: ProgressionTreeNodeDefinition) => string {
		return this._iconCallback;
	}

	set sourceProgressionTrees(sourceCSV: string) {
		this._sourceProgressionTrees = [];
		const sourceTreeTypes: string[] = sourceCSV.split(",");
		sourceTreeTypes.forEach(sourceString => {
			const id: number = parseInt(sourceString);
			if (id) {
				this._sourceProgressionTrees?.push(id);
			}
			else {
				this._sourceProgressionTrees?.push(sourceString);
			}
		});

		this.update();
	}

	private update() {
		this._trees = [];
		const localPlayerID: number = GameContext.localPlayerID;
		const localPlayer: PlayerLibrary | null = Players.get(localPlayerID);
		if (!localPlayer) {
			return;
		}

		const availableTrees: ProgressionTreeType[] | undefined = this._sourceProgressionTrees;
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
			const turnsCallback = (nodeType: ProgressionTreeNodeType) => {
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				const turnsLeft: number = player ? (player.Culture ? player.Culture.getTurnsForNode(nodeType) : 0) : 0;
				return turnsLeft;
			}

			const treeConfig: TreeGridConfiguration = {
				activeTree: this.activeTree,
				direction: TreeGridDirection.HORIZONTAL,
				delegateGetIconPath: this.iconCallback,
				delegateTurnForNode: turnsCallback,
				delegateCostForNode: (nodeType: ProgressionTreeNodeType) => {
					const culture = localPlayer.Culture;
					if (!culture) {
						return null;
					}
					return culture.getNodeCost(nodeType);
				},
				treeType: TreeGridSourceType.CULTURE
			}

			const treeGrid: TreeGrid = new TreeGrid(definition.ProgressionTreeType, treeConfig);
			treeGrid.initialize();

			const attrData: CultureTreeData = {
				type: definition.ProgressionTreeType,
				treeGrid
			}

			this._trees.push(attrData);
		}

		if (this.onUpdate) {
			this.onUpdate(this);
		}
	}

	getCultureTreeData(attr: ProgressionTreeType): CultureTreeData {
		for (let data of this._trees) {
			if (data.type == attr) {
				return data;
			}
		}
		// Not found, create
		let newData: CultureTreeData = {
			type: attr
		}

		this._trees.push(newData);
		return newData;
	}

	getCard(type: ProgressionTreeNodeType | undefined) {
		if (type == undefined) {
			return undefined;
		}

		for (let iTree: number = 0; iTree < this._trees.length; iTree++) {
			const targetTree: CultureTreeData = this._trees[iTree];
			const targetCard = targetTree.treeGrid?.getCard(type);

			if (targetCard != undefined) {
				return targetCard;
			}
		}
		//Else we never found a type match:
		return (undefined);
	}

	findNode(id: ProgressionTreeNodeType) {
		return this.getCard(id);
	}

	findTree(type: ProgressionTreeNodeType): CultureTreeData | null {
		for (let iTree: number = 0; iTree < this._trees.length; iTree++) {
			const targetTree: CultureTreeData = this._trees[iTree];
			const targetCard = targetTree.treeGrid?.getCard(type);

			if (targetCard != undefined) {
				return targetTree;
			}
		}

		return null;
	}

	hoverItems(type: ProgressionTreeNodeType): ProgressionTreeNodeType[] | undefined {
		const tree = this.findTree(type);
		if (!tree || !tree.treeGrid) {
			return [];
		}

		this._lastHighlightTree = tree;
		return tree.treeGrid.setHoverItem(type);
	}

	clearHoverItems(): ProgressionTreeNodeType[] | undefined {
		return this._lastHighlightTree?.treeGrid?.clearHoverItems();
	}
}

const CultureTree = new CultureTreeModel();
engine.whenReady.then(() => {

	const updateModel = () => {
		engine.updateWholeModel(CultureTree);
	}

	engine.createJSModel('g_CultureTree', CultureTree);
	CultureTree.updateCallback = updateModel;

	engine.synchronizeModels();
});

export { CultureTree as default };