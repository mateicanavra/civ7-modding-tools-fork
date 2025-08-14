/**
 * tree-grid.ts
 * @copyright 2024-2025, Firaxis Games
 * @description Contains tree data for models to use.
*/

import { formatStringArrayAsNewLineText } from '/core/ui/utilities/utilities-core-textprovider.js'
import { getUnlockTargetDescriptions, getUnlockTargetName, getUnlockTargetIcon } from '/base-standard/ui/utilities/utilities-textprovider.js'
import { Graph, Label } from '/core/ui/graph-layout/graph.js';
import { GraphLayout } from '/core/ui/graph-layout/layout.js';
import { utils } from '/core/ui/graph-layout/utils.js';
import { TreeGridDepthInfo, TreeGridCard, GridCardLine, GridCard, TreeGridData, TreeNodesSupport, TreeGridDirection, LineDirection } from '/base-standard/ui/tree-grid/tree-support.js';

type GetIconPath = (node: ProgressionTreeNodeDefinition) => string;
type GetTurnForNode = (nodeType: ProgressionTreeNodeType) => number;
type GetCostForNode = (nodeType: ProgressionTreeNodeType) => number | null;
type CanPurchaseNode = (node: ProgressionTreeNodeType) => boolean;

type TreeGridConfigurationAPI = {
	delegateGetIconPath?: GetIconPath;
	delegateTurnForNode?: GetTurnForNode;
	delegateCostForNode?: GetCostForNode;
	canPurchaseNode?: CanPurchaseNode;
}

export interface TreeGridConfiguration extends TreeGridConfigurationAPI {
	direction: TreeGridDirection;
	activeTree?: ProgressionTreeType;
	extraRows?: number;
	extraColumns?: number;
	originRow?: number;
	originColumn?: number;
	treeType?: TreeGridSourceType;
}

export enum TreeGridSourceType {
	ATTRIBUTES,
	TECHS,
	CULTURE
}

export class TreeGrid implements TreeGridConfigurationAPI {
	private _player: PlayerId = -1;
	private _sourceProgressionTree: ProgressionTreeType;
	private _treeData: TreeGridData;
	private _grid: GridCard[][] = [];
	private _lines: GridCardLine[] = [];
	private _direction: TreeGridDirection = TreeGridDirection.HORIZONTAL;
	private _activeTree: ProgressionTreeType | undefined;
	private _extraColumns: number = 1;
	private _extraRows: number = 1;
	private _originRow: number = 1;
	private _originColumn: number = 1;
	private _collisionOffsetPX: number = 6;
	private treeType: TreeGridSourceType = TreeGridSourceType.ATTRIBUTES;		// Why not use progression tree type?

	private targetRows: number = 0;
	private targetColumns: number = 0;

	delegateGetIconPath?: GetIconPath;
	delegateTurnForNode?: GetTurnForNode;
	delegateCostForNode?: GetCostForNode;
	canPurchaseNode?: CanPurchaseNode;

	private currentResearching: TreeGridCard | null = null;
	private queuedElements: number = 0;
	private prerequisiteQueue: TreeGridCard[] = [];

	constructor(progressTreeType: ProgressionTreeType, configuration?: TreeGridConfiguration) {
		this._sourceProgressionTree = progressTreeType;
		if (configuration) {
			this._direction = configuration.direction;
			this._activeTree = configuration.activeTree;
			this._originRow = configuration.originRow ?? 1;
			this._originColumn = configuration.originColumn ?? 1;

			this._extraRows = configuration.extraRows ?? 1;
			this._extraColumns = configuration.extraColumns ?? 1;

			this.delegateGetIconPath = configuration.delegateGetIconPath;
			this.delegateTurnForNode = configuration.delegateTurnForNode;
			this.delegateCostForNode = configuration.delegateCostForNode;
			this.canPurchaseNode = configuration.canPurchaseNode;

			this.treeType = configuration.treeType ?? TreeGridSourceType.ATTRIBUTES;
		}
		this._player = GameContext.localPlayerID;
		this._treeData = {
			rows: 0,
			columns: 0,
			dataHeight: 0,
			dataWidth: 0,
			layoutWidth: 0,
			layoutHeight: 0,
			extraRows: 0,
			extraColumns: 0,
			originRow: 0,
			originColumn: 0,
			horizontalCardSeparation: 0,
			verticalCardSeparation: 0,
			graphLayout: new Graph(),
			nodesAtDepth: [],
			cards: []
		};
	}

	initialize() {
		this.generateData();
		this.generateLayoutData();
		this.generateLinesData();
		this.generateGrid();
		this.generateCollisionData();
	}

	public updateLines() {
		this._lines.length = 0;
		this.generateLinesData();
		this._lines.push({
			to: "none",
			from: "none",
			dummy: false,
			direction: LineDirection.SAME_LEVEL_LINE,
			level: 0,
			position: 0,
			locked: false,
		})
	}

	get grid(): GridCard[][] {
		return this._grid;
	}

	get lines(): GridCardLine[] {
		return this._lines;
	}

	private generateData() {
		if (!this._sourceProgressionTree) {
			console.error("TreeGrid: generateData(): No available tree to generate");
			return;
		}

		const treeStructureNodes: ProgressionTreeStructureNode[] = Game.ProgressionTrees.getTreeStructure(this._sourceProgressionTree);
		if (!treeStructureNodes) {
			console.error("TreeGrid: generateData(): No nodes available for this tree: " + this._sourceProgressionTree);
			return;
		}

		this._treeData = {
			rows: 0,
			columns: 0,
			dataHeight: 0,
			dataWidth: 0,
			layoutWidth: 0,
			layoutHeight: 0,
			extraRows: 0,
			extraColumns: 0,
			originRow: 0,
			originColumn: 0,
			horizontalCardSeparation: 0,
			verticalCardSeparation: 0,
			graphLayout: new Graph(),
			nodesAtDepth: [],
			cards: []
		};

		//Where index = tree depth, and the value = number of nodes at that depth
		let nodesAtDepth: ProgressionTreeNodeType[][] = [];

		// Initialize Graph
		const graph: Graph = new Graph();
		graph.setGraph({});
		graph.setDefaultEdgeLabel(function () { return {}; });
		const localPlayerID: number = GameContext.localPlayerID;

		const treeObject = Game.ProgressionTrees.getTree(GameContext.localPlayerID, this._sourceProgressionTree);
		if (!treeObject) {
			console.warn("tree-grid: No tree-object for tree with id: ", this._sourceProgressionTree);
		}

		const currentResearchIndex: ProgressionTreeNodeType | undefined = treeObject?.nodes[treeObject.activeNodeIndex]?.nodeType;

		const lockedNodes = new Array<ProgressionTreeNodeType>();
		const contentTreeStructureNodes = treeStructureNodes.filter(structureNodeData => {
			const contentVal = Game.ProgressionTrees.canEverUnlock(localPlayerID, structureNodeData.nodeType);
			const isLocked = contentVal.isLocked;
			if (isLocked) {
				lockedNodes.push(structureNodeData.nodeType);
			}
			return !isLocked;
		});

		const contentConnectedTreeStructureNodes = contentTreeStructureNodes.map(structureNodeData => {
			structureNodeData.connectedNodeTypes = structureNodeData.connectedNodeTypes.filter(node => {
				return !lockedNodes.includes(node);
			});
			return structureNodeData;
		});

		const localPlayer: PlayerLibrary | null = Players.get(localPlayerID);
		let targetNode: ProgressionTreeNodeType | undefined = undefined;

		if (!localPlayer) {
			console.warn(`tree-grid: Unable to find local player with ID ${localPlayer}`);
		} else {
			switch (this.treeType) {
				case TreeGridSourceType.CULTURE:
					targetNode = localPlayer.Culture?.getTargetNode();
					break;

				case TreeGridSourceType.TECHS:
					targetNode = localPlayer.Techs?.getTargetNode();
					break;

				case TreeGridSourceType.ATTRIBUTES:
				default:
					break;
			}
		}

		// if a target node exists, generate the path to it
		const AI = localPlayer?.AI;
		let path: FullyQualifiedProgressionTreeNode[] = [];
		if (!AI) {
			console.warn("tree-grid: Unable to get AI object for local player");
		} else {
			if (targetNode != undefined && targetNode != -1) {
				path = AI.getProgressionTreePath(targetNode, 1);
			}
		}

		contentConnectedTreeStructureNodes.forEach(structureNodeData => {
			const nodeInfo: ProgressionTreeNodeDefinition | null = GameInfo.ProgressionTreeNodes.lookup(structureNodeData.nodeType);

			if (!nodeInfo) {
				console.warn("model-rectangular-grid: No information for node with id: ", structureNodeData.nodeType);
				return;
			}

			const id: string = structureNodeData.nodeType.toString();
			const identifier: string = id; // can use name instead of nodeType for debugging purposes
			graph.setNode(identifier, { label: `${identifier}` });

			structureNodeData.connectedNodeTypes.forEach(node => {
				const childId: string = node.toString();
				const childIdentifier: string = childId;

				graph.setNode(childIdentifier, { label: `${childIdentifier}` });
				graph.setEdge(identifier, childIdentifier);
			});

			//Capture the overall height of the tree 
			this._treeData.dataHeight = Math.max(this._treeData.dataHeight, structureNodeData.treeDepth);

			// Keep a count of the number of nodes at this depth, to later use for calculating width without re-analyzing entire tree. 
			// add additional levels to our tracking array if necessary: 
			while (nodesAtDepth.length <= this._treeData.dataHeight) {
				nodesAtDepth.push([]);
			}

			const foundIndex: number = nodesAtDepth[structureNodeData.treeDepth].indexOf(structureNodeData.nodeType);
			if (foundIndex == -1) {
				nodesAtDepth[structureNodeData.treeDepth].push(structureNodeData.nodeType);
			}


			const localeName: string = Locale.compose(nodeInfo.Name ?? nodeInfo.ProgressionTreeNodeType);
			const localeDescription: string = Locale.compose(nodeInfo.Description ?? "");
			const nodeState: ProgressionTreeNodeState = Game.ProgressionTrees.getNodeState(this._player, structureNodeData.nodeType);
			const nodeData: ProgressionTreeNode | null = Game.ProgressionTrees.getNode(this._player, structureNodeData.nodeType);
			const iconPath: string = this.delegateGetIconPath ? this.delegateGetIconPath(nodeInfo) : "";

			let isLocked: boolean = (nodeState === ProgressionTreeNodeState.NODE_STATE_CLOSED);
			let lockedReason: string = "";
			// It's locked, lets get the reason
			if (nodeState <= ProgressionTreeNodeState.NODE_STATE_OPEN && this.canPurchaseNode != undefined && !this.canPurchaseNode(structureNodeData.nodeType)) {
				isLocked = true;
				if (Game.ProgressionTrees.hasLegendUnlocked(this._player, structureNodeData.nodeType).isLocked) {
					lockedReason = Locale.compose(Game.ProgressionTrees.getLegendAttributeNodeLockedString(this._player, structureNodeData.nodeType)) || "";
				}
			}

			let queued: boolean = false;
			let queueOrder: number = -1;
			if (path && path.length > 1 && nodeData) {
				for (let pathIndex: number = 0; pathIndex < path.length; pathIndex++) {
					if (path[pathIndex].nodeType == nodeData.nodeType) {
						queued = true;
						queueOrder = pathIndex + 1;
						break;
					}
				}
			}

			if (nodeData) {
				const turnsLeft: number = this.delegateTurnForNode ? this.delegateTurnForNode(nodeData.nodeType) : 0;
				const cost: number | null = this.delegateCostForNode ? this.delegateCostForNode(nodeData.nodeType) : nodeInfo.Cost;
				const costValue: number = cost ?? nodeInfo.Cost;
				const progressPercentage: number = 100 - (1 - (nodeData.progress / costValue)) * 100;
				const unlocksData: NodeUnlockDisplayData[] = [];
				const unlocksByDepth: TreeGridDepthInfo[] = [];

				const treeNodeUnlocks: ProgressionTreeNodeUnlockDefinition[] = TreeNodesSupport.getValidNodeUnlocks(nodeData);
				const removableUnlocks: string[] = TreeNodesSupport.getRepeatedUniqueUnits(treeNodeUnlocks);

				for (let i of nodeData.unlockIndices) {
					const unlockInfo: ProgressionTreeNodeUnlockDefinition = GameInfo.ProgressionTreeNodeUnlocks[i];
					if (unlockInfo && !unlockInfo.Hidden) {

						//Is this a unit, and has it been permanently disabled?
						if (unlockInfo.TargetKind == "KIND_UNIT") {
							const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
							if (player && player.Units?.isBuildPermanentlyDisabled(unlockInfo.TargetType)) {
								continue;
							}

							if (removableUnlocks.includes(unlockInfo.TargetType)) {
								continue;
							}
						}

						const unlockName: string = getUnlockTargetName(unlockInfo.TargetType, unlockInfo.TargetKind);
						const unlockDescriptions: string[] = getUnlockTargetDescriptions(unlockInfo.TargetType, unlockInfo.TargetKind);
						const unlockFullDesc: string = formatStringArrayAsNewLineText(unlockDescriptions);
						const unlockIcon: string = getUnlockTargetIcon(unlockInfo.TargetType, unlockInfo.TargetKind);
						const unlockToolTip: string = unlockName.length ? unlockName : unlockFullDesc;

						if (!unlockFullDesc && !unlockName) {
							continue;
						}

						const nodeUIDisplayData: NodeUnlockDisplayData = {
							name: unlockName,
							description: unlockFullDesc,
							depth: unlockInfo.UnlockDepth,
							icon: unlockIcon,
							tooltip: unlockToolTip,
							kind: unlockInfo.TargetKind,
							type: unlockInfo.TargetType
						};

						unlocksData.push(nodeUIDisplayData);

						// Make sure that our organized array by depth has enough depth to cover us 
						while (unlocksByDepth.length < unlockInfo.UnlockDepth) {
							const currentDepth: string = Locale.toRomanNumeral(unlocksByDepth.length + 1);
							const isCompleted: boolean = unlocksByDepth.length < nodeData.depthUnlocked;
							const isCurrent: boolean = unlocksByDepth.length == nodeData.depthUnlocked && currentResearchIndex == structureNodeData.nodeType && (this._activeTree ? this._activeTree == this._sourceProgressionTree : true);
							const isLocked: boolean = nodeState == ProgressionTreeNodeState.NODE_STATE_CLOSED || !(unlocksByDepth.length <= nodeData.depthUnlocked);
							const unlockHeader: string = currentDepth;

							const depthLevel: object[] = [];
							for (let depth: number = 0; depth <= unlocksByDepth.length; depth++) {
								depthLevel.push({/*empty object for now*/ });
							}

							const newDepth: TreeGridDepthInfo = {
								header: unlockHeader,
								unlocks: [],
								isCompleted: isCompleted,
								isCurrent: isCurrent,
								isLocked: isLocked,
								depthLevel: depthLevel,
								iconURL: iconPath
							};
							unlocksByDepth.push(newDepth);
						}
						// Now, pop that item into the correct sorted section 
						unlocksByDepth[unlockInfo.UnlockDepth - 1].unlocks.push(nodeUIDisplayData);
					}
				}

				// Fill in the card data, and capture the information in the treeData. 
				this._treeData.cards.push({
					row: -1,
					column: -1,
					name: localeName,
					hasData: false,
					isDummy: false,
					description: localeDescription,
					icon: iconPath,
					cost: nodeInfo.Cost,
					progress: nodeData.progress,
					progressPercentage: progressPercentage,
					turns: turnsLeft,
					currentDepthUnlocked: nodeData.depthUnlocked,
					maxDepth: nodeData.maxDepth,
					repeatedDepth: nodeData.repeatedDepth,
					unlocks: unlocksData,
					unlocksByDepth: unlocksByDepth,
					unlocksByDepthString: JSON.stringify(unlocksByDepth),
					nodeState: nodeState,
					isAvailable: this.isAvailable(nodeState),
					canBegin: this.canBegin(nodeState),
					isCurrent: (nodeState === ProgressionTreeNodeState.NODE_STATE_IN_PROGRESS),
					isLocked: isLocked,
					isCompleted: (nodeState === ProgressionTreeNodeState.NODE_STATE_FULLY_UNLOCKED),
					isRepeatable: nodeData.depthUnlocked == 0 && nodeData.repeatedDepth > 0,
					isQueued: queued,
					queueOrder: queueOrder.toString(),
					isHoverQueued: false,
					treeDepth: structureNodeData.treeDepth,
					nodeType: nodeData.nodeType,
					lockedReason: lockedReason,
					connectedNodeTypes: structureNodeData.connectedNodeTypes,
					isContent: true,
					canPurchase: this.canPurchaseNode ? this.canPurchaseNode(structureNodeData.nodeType) : false
				});
			}
			else {
				// Fill in the card data, and capture the information in the treeData. 
				this._treeData.cards.push({
					row: -1,
					column: -1,
					name: localeName,
					hasData: false,
					isDummy: false,
					description: localeDescription,
					icon: iconPath,
					cost: nodeInfo.Cost,
					progress: 0,
					progressPercentage: 0,
					unlocksByDepthString: "",
					turns: 0,
					currentDepthUnlocked: 0,
					maxDepth: 1, //TODO: need correct data 
					repeatedDepth: 0,
					unlocks: [],
					nodeState: nodeState,
					isAvailable: this.isAvailable(nodeState),
					canBegin: this.canBegin(nodeState),
					isCurrent: (nodeState === ProgressionTreeNodeState.NODE_STATE_IN_PROGRESS),
					isLocked: isLocked,
					isCompleted: (nodeState === ProgressionTreeNodeState.NODE_STATE_FULLY_UNLOCKED),
					isRepeatable: false,
					isQueued: queued,
					queueOrder: queueOrder.toString(),
					isHoverQueued: false,
					treeDepth: structureNodeData.treeDepth,
					nodeType: structureNodeData.nodeType,
					connectedNodeTypes: structureNodeData.connectedNodeTypes,
					isContent: true,
					canPurchase: this.canPurchaseNode ? this.canPurchaseNode(structureNodeData.nodeType) : false
				});
			}
		});

		const layout: GraphLayout = new GraphLayout(graph);
		const layoutGraph: Graph = layout.getLayoutGraph();

		// assign treeDepth values as ranks for each node
		this._treeData.cards.forEach(card => {
			const nodeId: string = card.nodeType.toString();
			const rank: number = card.treeDepth;
			layoutGraph.setNode(nodeId, { ...layoutGraph.node(nodeId), rank });
		});

		layout.normalize(layoutGraph);
		layout.order(layoutGraph);
		// Save tree layout
		this._treeData.graphLayout = layoutGraph;
		//Save off the depth data 
		this._treeData.nodesAtDepth = nodesAtDepth;

		//Now sort the height data to find the largest height in the this._treeData
		let max: number = -1;
		let indexOfLongestConnectionArray: number = -1;
		nodesAtDepth.forEach(function (a, i) {
			if (a.length > max) {
				max = a.length;
				indexOfLongestConnectionArray = i;
			}
		});

		// Calculate grid dimensions
		this._treeData.dataWidth = nodesAtDepth.length;
		this._treeData.dataHeight = nodesAtDepth[indexOfLongestConnectionArray].length;

		if (this._direction == TreeGridDirection.HORIZONTAL) {
			this._treeData.layoutWidth = utils.maxRank(this._treeData.graphLayout) + 1;
			this._treeData.layoutHeight = utils.maxOrder(this._treeData.graphLayout) + 1;
		} else {
			this._treeData.layoutWidth = utils.maxOrder(this._treeData.graphLayout) + 1;
			this._treeData.layoutHeight = utils.maxRank(this._treeData.graphLayout) + 1;
		}

		this._treeData.horizontalCardSeparation = 2;
		this._treeData.verticalCardSeparation = 2;

		this._treeData.extraColumns = this._extraColumns;
		this._treeData.extraRows = this._extraRows;
		this._treeData.originColumn = this._originColumn;
		this._treeData.originRow = this._originRow;

		//Calculate the card size needed for this tree (convert data w/h to columns/columns)
		this._treeData.rows = (this._treeData.layoutHeight * this._treeData.horizontalCardSeparation + this._treeData.extraRows);
		this._treeData.columns = (this._treeData.layoutWidth * this._treeData.verticalCardSeparation + this._treeData.extraColumns);
	}

	private generateLayoutData() {
		const graphLayout: Graph = this._treeData.graphLayout;

		// add dummy nodes to tree cards
		const dummyNodes: string[] = graphLayout.nodes().filter(v => {
			const node: Label = graphLayout.node(v);
			return node.dummy == "edge";
		});

		if (dummyNodes.length > 0) {
			dummyNodes.forEach(v => {
				const node: Label = graphLayout.node(v);

				// We can assume dummy nodes don't have multiple predecessors or succesors because they join actual nodes.
				const predecessors = graphLayout.predecessors(v);
				const successors = graphLayout.successors(v);

				const from: string = predecessors[0];
				const to: string = successors ? successors[0] : node.edgeObj.w;

				if (from) {
					const card: TreeGridCard | undefined = this.getCard(from);

					if (card) {
						// remove previous from
						const index = card.connectedNodeTypes.indexOf(from);
						card.connectedNodeTypes.splice(index, 1);
						// push new from 
						card.connectedNodeTypes.push(v);
					}
				}

				const dummyCard: TreeGridCard = {
					row: -1,
					column: -1,
					name: v,
					isDummy: true,
					hasData: false,
					description: "",
					icon: "",
					cost: 0,
					progress: 0,
					turns: 0,
					progressPercentage: 0,
					unlocksByDepthString: "",
					currentDepthUnlocked: 0,
					maxDepth: 0,
					repeatedDepth: 0,
					unlocks: [],
					nodeState: -1,
					canBegin: false,
					isAvailable: false,
					isContent: true,
					isCurrent: false,
					isCompleted: false,
					isHoverQueued: false,
					isLocked: true,
					isQueued: false,
					isRepeatable: false,
					nodeType: v,
					treeDepth: -1,
					connectedNodeTypes: [],
					canPurchase: false,
					queueOrder: '',
				}

				if (to) {
					const card: TreeGridCard | undefined = this.getCard(to);
					if (card) {
						dummyCard.isLocked = card.isLocked;
					}
					dummyCard.connectedNodeTypes.push(to);
				}
				// Fill in the card data, and capture the information in the treeData. 
				this._treeData.cards.push(dummyCard);
			})
		}

		const layerOffsets: number[] = this.getVerticalOffsets(graphLayout);

		// sort by rank to make sure we traverse from left->right/top->bottom (for the sink and dummy alignment)
		const orderedCards: TreeGridCard[] = this._treeData.cards.sort((cardA, cardB) => {
			const nodeA: Label = this._treeData.graphLayout.node(cardA.nodeType.toString());
			const nodeB: Label = this._treeData.graphLayout.node(cardB.nodeType.toString());
			return nodeA.rank - nodeB.rank;
		});

		this._treeData.cards = orderedCards;

		this._treeData.cards.forEach(infoCard => {
			let nodeId: string = infoCard.nodeType.toString();
			if (infoCard.isDummy) {
				nodeId = infoCard.name;
			}

			const node: Label = graphLayout.node(nodeId);
			let row;
			let column;
			if (this._direction == TreeGridDirection.HORIZONTAL) {
				row = node.order;
				column = node.rank;
			} else {
				row = node.rank;
				column = node.order;
			}
			const offset: number = layerOffsets[this._direction == TreeGridDirection.HORIZONTAL ? column : row];
			const horizontalSeparation: number = this._treeData.horizontalCardSeparation;
			const verticalSeparation: number = this._treeData.verticalCardSeparation;

			// straight lines for nodes with only one child and for nodes following a dummy node
			const isSink: boolean = infoCard.connectedNodeTypes.length == 0;
			const isDummy: boolean = infoCard.isDummy;

			if (infoCard.row == -1) {
				infoCard.row = this._treeData.originRow + row * horizontalSeparation + (this._direction == TreeGridDirection.HORIZONTAL ? offset : 0);
			}

			if (infoCard.column == -1) {
				infoCard.column = this._treeData.originColumn + column * verticalSeparation + (this._direction == TreeGridDirection.VERTICAL ? offset : 0);
			}

			if (isSink) {
				const predecessors: string[] | [] = graphLayout.predecessors(nodeId);
				if (predecessors.length == 1) {
					// select last parent since we are layering from top to bottom
					const lastParent: string = predecessors[predecessors.length - 1];
					const parentCard: TreeGridCard | undefined = this.getCard(lastParent);

					// if isn't the only sink, maintain centered the children
					let parentChildSinks: number = 0;
					let parentChildrenGrids: TreeGridCard[] = [];
					parentCard?.connectedNodeTypes.forEach(node => {
						const card: TreeGridCard | undefined = this.getCard(node.toString());
						const isSink: boolean = card?.connectedNodeTypes.length == 0;
						if (card) {
							parentChildrenGrids.push(card)
						}
						if (isSink) {
							parentChildSinks++;
						}
					});

					if (parentCard && parentChildSinks == 1) {
						if (this._direction == TreeGridDirection.HORIZONTAL) {
							infoCard.row = parentCard.row;
						} else {
							infoCard.column = parentCard.column;
							// Confirm that the change in column does not overlap an existing node.
							while (this._treeData.cards.find(child =>
								child.row === infoCard.row &&
								child.column === infoCard.column &&
								child.nodeType !== infoCard.nodeType
							)) {
								// If the parent card position is below half the tree's width, that the child card should shift to the left side
								if (parentCard.column < (this._treeData.columns / 2)) {
									infoCard.column -= this._treeData.verticalCardSeparation;
								} else {
									infoCard.column += this._treeData.verticalCardSeparation;
								}
							}
						}
					}
				}
			}

			if (isDummy) {
				const connectedCardId: string = infoCard.connectedNodeTypes[0].toString();
				const connectedNode: Label = graphLayout.node(nodeId);
				const childCard: TreeGridCard | undefined = this.getCard(connectedCardId);
				if (connectedNode && childCard) {
					if (this._direction == TreeGridDirection.HORIZONTAL) {
						childCard.row = infoCard.row;
					} else {
						childCard.column = infoCard.column;
					}
				}
			}

			infoCard.hasData = true;

			const cardInQueue: TreeGridCard | undefined = this.prerequisiteQueue.find(card => { return card.nodeType == infoCard.nodeType })
			if (cardInQueue) {
				infoCard.queuePriority = cardInQueue.queuePriority;
			}

			if (this.currentResearching && infoCard.nodeType == this.currentResearching.nodeType) {
				infoCard.queuePriority = this.currentResearching.queuePriority;
			}
		});
	}

	private generateLinesData() {
		for (let i: number = 0; i < this._treeData.cards.length; i++) {
			const card: TreeGridCard = this._treeData.cards[i];
			const nodeId: ProgressionTreeNodeType = card.nodeType;
			const nodeName: ProgressionTreeNodeType = card.name;
			const connectedNodes: ProgressionTreeNodeType[] = card.connectedNodeTypes;
			const isDummyFrom = card.isDummy;
			const fromLevel = this._direction == TreeGridDirection.HORIZONTAL ? card.column : card.row;
			const fromPosition = this._direction == TreeGridDirection.HORIZONTAL ? card.row : card.column;

			connectedNodes.forEach(nodeType => {
				const childCard: TreeGridCard | undefined = this.getCard(nodeType.toString());
				if (!childCard) {
					console.log("tree-grid: generateLinesData(): No child card data for type: " + nodeType);
					return;
				}

				const toPosition = this._direction == TreeGridDirection.HORIZONTAL ? childCard.row : childCard.column;
				let direction: LineDirection = fromPosition > toPosition ? LineDirection.UP_LINE :
					fromPosition < toPosition ? LineDirection.DOWN_LINE :
						LineDirection.SAME_LEVEL_LINE;

				this._lines.push({
					from: nodeId,
					to: nodeType,
					locked: childCard.isLocked,
					dummy: isDummyFrom || childCard.isDummy,
					level: fromLevel,
					position: toPosition,
					direction,
					aliasFrom: nodeName,
					aliasTo: childCard.name
				})
			});
		}
	}

	getCard(type: ProgressionTreeNodeType | undefined): TreeGridCard | undefined {
		return this._treeData.cards.find(t => t.nodeType == type);
	}

	private getVerticalOffsets(graph: Graph): number[] {
		const maxRank: number = utils.maxRank(graph);
		const maxOrder: number = utils.maxOrder(graph);
		const layers: Object[][] = utils.range(0, maxRank + 1).map<string[]>(function () { return []; });;

		graph.nodes().forEach(v => {
			const node: Label = graph.node(v);
			const rank: number = node.rank;
			const order: number = node.order;

			const layerNode: Object = { v, order, rank }

			if (node) {
				layers[rank].push(layerNode);
			}
		});

		const maxHeight: number = maxOrder + 1;
		const layerOffsets: number[] = [];
		layers.forEach(layer => {
			const layerOffset: number = maxHeight - layer.length;
			layerOffsets.push(layerOffset);
		})

		return layerOffsets;
	}

	private generateGrid() {
		this.targetRows = this._treeData.rows;
		this.targetColumns = this._treeData.columns;

		if (this._direction == TreeGridDirection.HORIZONTAL) {
			for (let i: number = 0; i < this.targetColumns; i++) {
				this._grid[i] = new Array();
				for (let j: number = 0; j < this.targetRows; j++) {
					const card: GridCard = { row: j, column: i }
					const dataCard: TreeGridCard | undefined = this._treeData.cards.find(card => card.row == j && card.column == i);
					this._grid[i].push(dataCard || card);
				}
			}
		} else {
			for (let i: number = 0; i < this.targetRows; i++) {
				this._grid[i] = new Array();
				for (let j: number = 0; j < this.targetColumns; j++) {
					const card: GridCard = { row: i, column: j }
					const dataCard: TreeGridCard | undefined = this._treeData.cards.find(card => card.row == i && card.column == j);
					this._grid[i].push(dataCard || card);
				}
			}
		}
	}

	private generateCollisionData() {
		// Find the dummy line that goes into a dummy
		const toDummyLine = this._lines.find(line => {
			const goesToDummy = line.dummy && String(line.to).includes("_d");
			const toLine = this._lines.find(toLine => toLine.from == line.to);
			if (!toLine) {
				return;
			}
			const goesToAnotherDummy = toLine.dummy && String(toLine.to).includes("_d");
			return goesToDummy && !goesToAnotherDummy;
		});

		const toDummyLineLevel = toDummyLine?.level;

		if (!toDummyLineLevel) {
			console.warn("tree-grid: generateCollisionData(): No level found for line.");
			return;
		}

		const levelLines = this._lines.filter(line => line.level == toDummyLineLevel);
		const sameDirectionLines = levelLines.filter(line => line.direction == toDummyLine.direction);

		const nextPositionLine = sameDirectionLines.find(line => {
			if (toDummyLine.direction == LineDirection.UP_LINE) {
				return toDummyLine.position + this._treeData.horizontalCardSeparation == line.position;
			} else if (toDummyLine.direction == LineDirection.DOWN_LINE) {
				return toDummyLine.position - this._treeData.horizontalCardSeparation == line.position;
			}
			return undefined;
		});

		if (nextPositionLine) {
			toDummyLine.collisionOffset = toDummyLine.direction == LineDirection.UP_LINE ? -this._collisionOffsetPX :
				toDummyLine.direction == LineDirection.DOWN_LINE ? this._collisionOffsetPX : 0;
			nextPositionLine.collisionOffset = -toDummyLine.collisionOffset;
		}
	}

	/**
	 * Helper to evaluate if we show the available visual state on a card based on a node state 
	 * @param state 
	 * @returns 
	 */
	private isAvailable(state: ProgressionTreeNodeState): boolean {
		switch (state) {
			case ProgressionTreeNodeState.NODE_STATE_OPEN:
			case ProgressionTreeNodeState.NODE_STATE_IN_PROGRESS:
			case ProgressionTreeNodeState.NODE_STATE_UNLOCKED:
			case ProgressionTreeNodeState.NODE_STATE_FULLY_UNLOCKED:
				return true;
			case ProgressionTreeNodeState.NODE_STATE_INVALID:
			case ProgressionTreeNodeState.NODE_STATE_CLOSED:
				return false;
		}
		return false;
	}

	/**
	 * Helper to evaluate if the card can be started based on node state 
	 * @param state 
	 * @returns 
	 */
	private canBegin(state: ProgressionTreeNodeState): boolean {
		switch (state) {
			case ProgressionTreeNodeState.NODE_STATE_OPEN:
			case ProgressionTreeNodeState.NODE_STATE_IN_PROGRESS:
			case ProgressionTreeNodeState.NODE_STATE_UNLOCKED:
				return true;
			case ProgressionTreeNodeState.NODE_STATE_FULLY_UNLOCKED:
			case ProgressionTreeNodeState.NODE_STATE_INVALID:
			case ProgressionTreeNodeState.NODE_STATE_CLOSED:
				return false;
		}
		return false;
	}

	queueCardItems(nodeIndex: ProgressionTreeNodeType) {
		this.queueItems(nodeIndex);
		this.activateQueueItems();
	}

	setHoverItem(nodeIndex: ProgressionTreeNodeType) {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		const AI = player?.AI;
		let highlightNodes: ProgressionTreeNodeType[];

		if (!AI) {
			console.error(`tree-grid: Can't get AI for player ${player?.id}`);
			return;
		}

		highlightNodes = [];

		const path: FullyQualifiedProgressionTreeNode[] = AI.getProgressionTreePath(nodeIndex, 1);
		if (!path) { // no path? then it's a single node or a not defined node
			console.warn(`tree-grid: No path found for ${nodeIndex}`);
			const card: TreeGridCard | undefined = this.getCard(nodeIndex.toString());
			if (!card) {
				console.error(`tree-grid: Can't get hovered card with nodeType ${nodeIndex}`);
				return highlightNodes;
			}
			card.isHoverQueued = true;
		}

		for (let qualifiedNode of path) {
			const type: ProgressionTreeNodeType = qualifiedNode.nodeType;
			const card: TreeGridCard | undefined = this.getCard(type.toString());

			highlightNodes.push(type);

			if (!card) {
				console.error(`tree-grid: Can't get hovered card with nodeType ${type}`);
				return highlightNodes;
			}

			card.isHoverQueued = true;
		}

		return highlightNodes;
	}

	clearHoverItems(): ProgressionTreeNodeType[] {
		let clearNodes: ProgressionTreeNodeType[];

		clearNodes = [];

		this._treeData.cards.forEach(card => {
			if (card.isHoverQueued) {
				card.isHoverQueued = false;
				clearNodes.push(card.nodeType);
			}
		});

		return clearNodes;
	}

	/**
	 * Queues the prerequisite nodes for a given node 
	 * @param {ProgressionTreeNodeType} nodeIndex Id for the selected node
	 * @returns 
	 */
	private queueItems(nodeIndex: ProgressionTreeNodeType) {
		this.prerequisiteQueue.length = 0;
		this.queuedElements = 0;

		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		const AI = player?.AI;

		if (!AI) {
			console.error(`model-rectangular-grid: Can't get AI for player ${player?.id}`);
			return;
		}

		const path: FullyQualifiedProgressionTreeNode[] = AI.getProgressionTreePath(nodeIndex, 1);
		if (!path) { // no path? then it's a single node or a not defined node
			console.warn(`model-rectangular-grid: No path found for ${nodeIndex}`);
			const card: TreeGridCard | undefined = this.getCard(nodeIndex.toString());
			if (!card) {
				console.error(`model-rectangular-grid: Can't get selected card with nodeType ${nodeIndex}`);
				return;
			}
			card.queuePriority = 0;
		}

		for (let qualifiedNode of path) {
			const type: ProgressionTreeNodeType = qualifiedNode.nodeType;
			const card: TreeGridCard | undefined = this.getCard(type.toString());

			if (!card) {
				console.error(`model-rectangular-grid: Can't get selected card with nodeType ${type}`);
				return;
			}

			this.prerequisiteQueue.push(card);
			this.queuedElements++;
			card.queuePriority = this.queuedElements;
		}
	}

	/**
	 * Activates by sendRequest the next queue item
	*/
	private activateQueueItems() {
		if (this.prerequisiteQueue.length > 0 && this.queuedElements > 0) {
			this.updateQueuePriorities();
			this.currentResearching = this.prerequisiteQueue.shift() || null;
			if (!this.currentResearching) {
				return;
			}

			this.queuedElements--;

			const args: Object = { ProgressionTreeNodeType: this.currentResearching.nodeType };
			const result: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.SET_TECH_TREE_NODE, args, false);
			if (result.Success) {
				Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.SET_TECH_TREE_NODE, args);
			}
		} else {
			this.currentResearching = null;
		}
	}

	private updateQueuePriorities() {
		for (let [index, item] of this.prerequisiteQueue.entries()) {
			item.queuePriority = ++index; // make it one indexed
		}
	}

	/**
	 *  If true notifications for ChooseTech handler can be added and not automatically dismissed
	*/
	canAddChooseNotification(): boolean {
		const player = GameContext.localPlayerID;
		if (this.currentResearching) {
			const nodeState: ProgressionTreeNodeState = Game.ProgressionTrees.getNodeState(player, this.currentResearching.nodeType);
			// The current node has opened a path to the next item in queue
			if (nodeState == ProgressionTreeNodeState.NODE_STATE_UNLOCKED || nodeState == ProgressionTreeNodeState.NODE_STATE_FULLY_UNLOCKED) {
				this.activateQueueItems();
				return false;
			}
		}

		return true;
	}

	getLastAvailableNodeType(): string {
		const card = this._treeData.cards.find(card => card.isAvailable);
		if (card) {
			return card.nodeType.toString();
		}
		return this._treeData.cards[0].nodeType.toString();
	}
}
