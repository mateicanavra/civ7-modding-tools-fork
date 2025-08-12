/**
 * model-attribute-trees.ts
 * @copyright 2021-2025, Firaxis Games
 * @description Gathers the identity data for the active player
 */

import ContextManager from '/core/ui/context-manager/context-manager.js';
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { roundTo2 } from '/core/ui/utilities/utilities-core-textprovider.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
import { TreeGrid, TreeGridConfiguration, TreeGridSourceType } from '/base-standard/ui/tree-grid/tree-grid.js';
import { TreeGridDirection } from '/base-standard/ui/tree-grid/tree-support.js';

export interface AttributeData {
	type: AttributeType;
	availablePoints: number;
	nextPointProgress: number;
	attributeTree: ProgressionTreeType;
	wildCardLabel: string;
	treeGrid?: TreeGrid;
}

class AttributeTreesModel {

	private onUpdate?: (model: AttributeTreesModel) => void;
	updateGate: UpdateGate = new UpdateGate(this.update.bind(this));

	private _attributes: AttributeData[] = [];
	private _activeTreeAttribute: AttributeType | null = null;
	private _wildCardPoints: number = 0;

	private attributesHotkeyListener = () => { this.onAttributesHotkey() };

	constructor() {
		window.addEventListener('hotkey-open-attributes', this.attributesHotkeyListener);
		window.addEventListener(ActiveDeviceTypeChangedEventName, () => {
			this.updateGate.call("ActiveDeviceTypeChangedEventName")
		});

		this.updateGate.call("constructor");
	}

	set updateCallback(callback: (model: AttributeTreesModel) => void) {
		this.onUpdate = callback;
	}

	get playerId(): PlayerId {
		return GameContext.localPlayerID;
	}
	get attributes(): AttributeData[] {
		return this._attributes;
	}
	get wildCardPoints(): number {
		return this._wildCardPoints;
	}
	get isGamepadActive(): boolean {
		return ActionHandler.isGamepadActive;
	}
	get activeTreeAttribute() {
		return this._activeTreeAttribute;
	}
	set activeTreeAttribute(eType: AttributeType | null) {
		this._activeTreeAttribute = eType;
	}

	private update() {
		this._attributes = [];

		const localPlayerID: number = GameContext.localPlayerID;
		const localPlayer: PlayerLibrary | null = Players.get(localPlayerID);
		if (!localPlayer) {
			return;
		}

		if (localPlayer.Identity) {
			for (let attributeDef of GameInfo.Attributes) {
				const definition = GameInfo.ProgressionTrees.find(t => { return t.ProgressionTreeType == attributeDef.ProgressionTreeType; });

				if (!definition) {
					console.warn("model-attribute-trees: update(): No definition for attribute: " + attributeDef.Name);
					continue;
				}
				const iconCallback = (_node: ProgressionTreeNodeDefinition): string => {
					return UI.getIconURL(attributeDef.AttributeType);
				}

				const treeConfig: TreeGridConfiguration = {
					direction: TreeGridDirection.VERTICAL,
					delegateGetIconPath: iconCallback,
					canPurchaseNode: this.canBuyAttributeTreeNode,
					extraRows: 0,
					extraColumns: 0,
					originRow: 0,
					originColumn: 1,
					treeType: TreeGridSourceType.ATTRIBUTES
				}

				const treeGrid: TreeGrid = new TreeGrid(definition.ProgressionTreeType, treeConfig);
				treeGrid.initialize();

				const attrPoints: number = localPlayer.Identity.getAvailableAttributePoints(attributeDef.AttributeType);
				// Convert normalized pointsProgress into 100-base to show percent properly
				const attrPointProgress: number = roundTo2(localPlayer.Identity.getNextAttributePointProgress(attributeDef.AttributeType)) * 100;
				const wildcardPoints: number = localPlayer.Identity.getWildcardPoints();
				this._wildCardPoints = wildcardPoints || 0;

				const wildcard: string = Locale.stylize("LOC_UI_ATTRIBUTE_TREES_POINTS_WILDCARD", this._wildCardPoints);

				const attrData: AttributeData = {
					attributeTree: definition ? definition.ProgressionTreeType : 0,
					type: attributeDef.AttributeType,
					availablePoints: attrPoints,
					nextPointProgress: attrPointProgress,
					wildCardLabel: wildcard,
					treeGrid
				}

				this._attributes.push(attrData);
			}

			// If no active tree viewing, choose the first
			if (this._activeTreeAttribute == null && this._attributes.length > 0) {
				this._activeTreeAttribute = this._attributes[0].type;
			}
		}

		if (this.onUpdate) {
			this.onUpdate(this);
		}
	}

	getAttributeData(attr: AttributeType): AttributeData {
		for (let data of this._attributes) {
			if (data.type == attr) {
				return data;
			}
		}
		// Not found, create
		let newData: AttributeData = {
			type: attr,
			availablePoints: 0,
			nextPointProgress: 0,
			attributeTree: -1,
			wildCardLabel: "[WIP] Wildcard Label",
		}

		this._attributes.push(newData);
		return newData;
	}

	canBuyAttributeTreeNode(nodeId: ProgressionTreeNodeType): boolean {
		const nodeIndex: number = +nodeId;
		const args = { ProgressionTreeNodeType: nodeIndex };
		const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.BUY_ATTRIBUTE_TREE_NODE, args, false);
		return result.Success;
	}

	buyAttributeTreeNode(nodeId: ProgressionTreeNodeType) {
		const nodeIndex: number = +nodeId;
		const args = { ProgressionTreeNodeType: nodeIndex };
		const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.BUY_ATTRIBUTE_TREE_NODE, args, false);
		if (result.Success) {
			Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.BUY_ATTRIBUTE_TREE_NODE, args);
		}
		this.updateGate.call("buyAttributeTreeNode");
	}

	getFirstAvailable(treeType: AttributeType): string {
		const tree = this._attributes.find(attr => attr.type == treeType);

		if (!tree) {
			console.error("model-attribute-trees: getFirstAvailable(): No tree to gather data from.");
			return "";
		}

		if (!tree.treeGrid) {
			console.error("model-attribute-trees: getFirstAvailable(): No treeGrid to gather data from.");
			return "";
		}

		return tree.treeGrid.getLastAvailableNodeType();
	}

	getCard(type: string | undefined) {
		if (type == undefined) {
			return undefined;
		}

		for (let iTree: number = 0; iTree < this._attributes.length; iTree++) {
			const targetTree: AttributeData = this._attributes[iTree];
			const targetCard = targetTree.treeGrid?.getCard(type);

			if (targetCard != undefined) {
				return targetCard;
			}
		}
		//Else we never found a type match:
		return (undefined);
	}

	private onAttributesHotkey() {
		if (ContextManager.isCurrentClass('screen-attribute-trees')) {
			ContextManager.pop('screen-attribute-trees');
		} else if (!ContextManager.hasInstanceOf('screen-pause-menu')) {
			ContextManager.push('screen-attribute-trees');
		}
	}
}

const AttributeTrees = new AttributeTreesModel();
engine.whenReady.then(() => {

	const updateModel = () => {
		engine.updateWholeModel(AttributeTrees);
	}

	engine.createJSModel('g_AttributeTrees', AttributeTrees);
	AttributeTrees.updateCallback = updateModel;
});

export { AttributeTrees as default };