/**
 * model-tech-tree.ts
 * @copyright 2024-2025, Firaxis Games
 * @description Model for Tech Tree
 */

import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
import { TreeGrid, TreeGridConfiguration, TreeGridSourceType } from '/base-standard/ui/tree-grid/tree-grid.js';
import { TreeGridDirection } from '/base-standard/ui/tree-grid/tree-support.js';

export interface TechTreeData {
	type: ProgressionTreeType;
	treeGrid?: TreeGrid;
}

export class TechTreeModel {

	private onUpdate?: (model: TechTreeModel) => void;
	updateGate: UpdateGate = new UpdateGate(this.update.bind(this));

	private _tree: TechTreeData | null = null;
	private _activeTree: ProgressionTreeType | null = null;
	private _sourceProgressionTrees: ProgressionTreeType[] | undefined = undefined;
	private _iconCallback: (node: ProgressionTreeNodeDefinition) => string = () => "";

	constructor() {
		window.addEventListener(ActiveDeviceTypeChangedEventName, () => {
			this.updateGate.call("ActiveDeviceTypeChangedEventName")
		});
		window.addEventListener(ActiveDeviceTypeChangedEventName, () => {
			this.updateGate.call("ActiveDeviceTypeChangedEventName")
		});

		this.updateGate.call("constructor");
	}

	set updateCallback(callback: (model: TechTreeModel) => void) {
		this.onUpdate = callback;
	}

	get playerId(): PlayerId {
		return GameContext.localPlayerID;
	}
	get tree(): TechTreeData | null {
		return this._tree;
	}
	get isGamepadActive(): boolean {
		return ActionHandler.isGamepadActive;
	}
	get activeTree() {
		return this._activeTree;
	}
	set activeTree(eType: ProgressionTreeType | null) {
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
		this._tree = null;
		const localPlayerID: number = GameContext.localPlayerID;
		const localPlayer: PlayerLibrary | null = Players.get(localPlayerID);
		if (!localPlayer) {
			return;
		}

		const availableTrees: ProgressionTreeType[] | undefined = this._sourceProgressionTrees;
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
			const turnsCallback = (nodeType: ProgressionTreeNodeType) => {
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				const turnsLeft: number = player ? (player.Techs ? player.Techs.getTurnsForNode(nodeType) : 0) : 0;
				return turnsLeft;
			}
			const treeConfig: TreeGridConfiguration = {
				direction: TreeGridDirection.HORIZONTAL,
				delegateTurnForNode: turnsCallback,
				delegateGetIconPath: this.iconCallback,
				delegateCostForNode: (nodeType: ProgressionTreeNodeType) => {
					const techs = localPlayer.Techs;
					if (!techs) {
						return null;
					}
					return techs.getNodeCost(nodeType);
				},
				treeType: TreeGridSourceType.TECHS
			}

			const treeGrid: TreeGrid = new TreeGrid(definition.ProgressionTreeType, treeConfig);
			treeGrid.initialize();

			const attrData: TechTreeData = {
				type: definition.ProgressionTreeType,
				treeGrid
			}

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

	getCard(type: ProgressionTreeNodeType | undefined) {
		if (type == undefined) {
			return undefined;
		}

		const targetTree: TechTreeData | null = this._tree;
		const targetCard = targetTree?.treeGrid?.getCard(type);

		if (targetCard != undefined) {
			return targetCard;
		}
		//Else we never found a type match:
		return (undefined);
	}

	findNode(id: string) {
		return this.getCard(id);
	}

	hoverItems(type: ProgressionTreeNodeType): ProgressionTreeNodeType[] | undefined {
		if (!this._tree || !this._tree.treeGrid) {
			return [];
		}

		return this._tree.treeGrid.setHoverItem(type);
	}

	clearHoverItems(): ProgressionTreeNodeType[] | undefined {
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
	}

	engine.createJSModel('g_TechTree', TechTree);
	TechTree.updateCallback = updateModel;

	engine.synchronizeModels();
});

export { TechTree as default };