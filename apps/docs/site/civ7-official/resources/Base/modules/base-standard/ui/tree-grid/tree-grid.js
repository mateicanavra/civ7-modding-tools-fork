/**
 * tree-grid.ts
 * @copyright 2024-2025, Firaxis Games
 * @description Contains tree data for models to use.
*/
import { formatStringArrayAsNewLineText } from '/core/ui/utilities/utilities-core-textprovider.js';
import { getUnlockTargetDescriptions, getUnlockTargetName, getUnlockTargetIcon } from '/base-standard/ui/utilities/utilities-textprovider.js';
import { Graph } from '/core/ui/graph-layout/graph.js';
import { GraphLayout } from '/core/ui/graph-layout/layout.js';
import { utils } from '/core/ui/graph-layout/utils.js';
import { TreeNodesSupport, TreeGridDirection, LineDirection } from '/base-standard/ui/tree-grid/tree-support.js';
export var TreeGridSourceType;
(function (TreeGridSourceType) {
    TreeGridSourceType[TreeGridSourceType["ATTRIBUTES"] = 0] = "ATTRIBUTES";
    TreeGridSourceType[TreeGridSourceType["TECHS"] = 1] = "TECHS";
    TreeGridSourceType[TreeGridSourceType["CULTURE"] = 2] = "CULTURE";
})(TreeGridSourceType || (TreeGridSourceType = {}));
export class TreeGrid {
    constructor(progressTreeType, configuration) {
        this._player = -1;
        this._grid = [];
        this._lines = [];
        this._direction = TreeGridDirection.HORIZONTAL;
        this._extraColumns = 1;
        this._extraRows = 1;
        this._originRow = 1;
        this._originColumn = 1;
        this._collisionOffsetPX = 6;
        this.treeType = TreeGridSourceType.ATTRIBUTES; // Why not use progression tree type?
        this.targetRows = 0;
        this.targetColumns = 0;
        this.currentResearching = null;
        this.queuedElements = 0;
        this.prerequisiteQueue = [];
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
    updateLines() {
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
        });
    }
    get grid() {
        return this._grid;
    }
    get lines() {
        return this._lines;
    }
    generateData() {
        if (!this._sourceProgressionTree) {
            console.error("TreeGrid: generateData(): No available tree to generate");
            return;
        }
        const treeStructureNodes = Game.ProgressionTrees.getTreeStructure(this._sourceProgressionTree);
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
        let nodesAtDepth = [];
        // Initialize Graph
        const graph = new Graph();
        graph.setGraph({});
        graph.setDefaultEdgeLabel(function () { return {}; });
        const localPlayerID = GameContext.localPlayerID;
        const treeObject = Game.ProgressionTrees.getTree(GameContext.localPlayerID, this._sourceProgressionTree);
        if (!treeObject) {
            console.warn("tree-grid: No tree-object for tree with id: ", this._sourceProgressionTree);
        }
        const currentResearchIndex = treeObject?.nodes[treeObject.activeNodeIndex]?.nodeType;
        const lockedNodes = new Array();
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
        const localPlayer = Players.get(localPlayerID);
        let targetNode = undefined;
        if (!localPlayer) {
            console.warn(`tree-grid: Unable to find local player with ID ${localPlayer}`);
        }
        else {
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
        let path = [];
        if (!AI) {
            console.warn("tree-grid: Unable to get AI object for local player");
        }
        else {
            if (targetNode != undefined && targetNode != -1) {
                path = AI.getProgressionTreePath(targetNode, 1);
            }
        }
        contentConnectedTreeStructureNodes.forEach(structureNodeData => {
            const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(structureNodeData.nodeType);
            if (!nodeInfo) {
                console.warn("model-rectangular-grid: No information for node with id: ", structureNodeData.nodeType);
                return;
            }
            const id = structureNodeData.nodeType.toString();
            const identifier = id; // can use name instead of nodeType for debugging purposes
            graph.setNode(identifier, { label: `${identifier}` });
            structureNodeData.connectedNodeTypes.forEach(node => {
                const childId = node.toString();
                const childIdentifier = childId;
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
            const foundIndex = nodesAtDepth[structureNodeData.treeDepth].indexOf(structureNodeData.nodeType);
            if (foundIndex == -1) {
                nodesAtDepth[structureNodeData.treeDepth].push(structureNodeData.nodeType);
            }
            const localeName = Locale.compose(nodeInfo.Name ?? nodeInfo.ProgressionTreeNodeType);
            const localeDescription = Locale.compose(nodeInfo.Description ?? "");
            const nodeState = Game.ProgressionTrees.getNodeState(this._player, structureNodeData.nodeType);
            const nodeData = Game.ProgressionTrees.getNode(this._player, structureNodeData.nodeType);
            const iconPath = this.delegateGetIconPath ? this.delegateGetIconPath(nodeInfo) : "";
            let isLocked = (nodeState === ProgressionTreeNodeState.NODE_STATE_CLOSED);
            let lockedReason = "";
            // It's locked, lets get the reason
            if (nodeState <= ProgressionTreeNodeState.NODE_STATE_OPEN && this.canPurchaseNode != undefined && !this.canPurchaseNode(structureNodeData.nodeType)) {
                isLocked = true;
                if (Game.ProgressionTrees.hasLegendUnlocked(this._player, structureNodeData.nodeType).isLocked) {
                    lockedReason = Locale.compose(Game.ProgressionTrees.getLegendAttributeNodeLockedString(this._player, structureNodeData.nodeType)) || "";
                }
            }
            let queued = false;
            let queueOrder = -1;
            if (path && path.length > 1 && nodeData) {
                for (let pathIndex = 0; pathIndex < path.length; pathIndex++) {
                    if (path[pathIndex].nodeType == nodeData.nodeType) {
                        queued = true;
                        queueOrder = pathIndex + 1;
                        break;
                    }
                }
            }
            if (nodeData) {
                const turnsLeft = this.delegateTurnForNode ? this.delegateTurnForNode(nodeData.nodeType) : 0;
                const cost = this.delegateCostForNode ? this.delegateCostForNode(nodeData.nodeType) : nodeInfo.Cost;
                const costValue = cost ?? nodeInfo.Cost;
                const progressPercentage = 100 - (1 - (nodeData.progress / costValue)) * 100;
                const unlocksData = [];
                const unlocksByDepth = [];
                const treeNodeUnlocks = TreeNodesSupport.getValidNodeUnlocks(nodeData);
                const removableUnlocks = TreeNodesSupport.getRepeatedUniqueUnits(treeNodeUnlocks);
                for (let i of nodeData.unlockIndices) {
                    const unlockInfo = GameInfo.ProgressionTreeNodeUnlocks[i];
                    if (unlockInfo && !unlockInfo.Hidden) {
                        //Is this a unit, and has it been permanently disabled?
                        if (unlockInfo.TargetKind == "KIND_UNIT") {
                            const player = Players.get(GameContext.localPlayerID);
                            if (player && player.Units?.isBuildPermanentlyDisabled(unlockInfo.TargetType)) {
                                continue;
                            }
                            if (removableUnlocks.includes(unlockInfo.TargetType)) {
                                continue;
                            }
                        }
                        const unlockName = getUnlockTargetName(unlockInfo.TargetType, unlockInfo.TargetKind);
                        const unlockDescriptions = getUnlockTargetDescriptions(unlockInfo.TargetType, unlockInfo.TargetKind);
                        const unlockFullDesc = formatStringArrayAsNewLineText(unlockDescriptions);
                        const unlockIcon = getUnlockTargetIcon(unlockInfo.TargetType, unlockInfo.TargetKind);
                        const unlockToolTip = unlockName.length ? unlockName : unlockFullDesc;
                        if (!unlockFullDesc && !unlockName) {
                            continue;
                        }
                        const nodeUIDisplayData = {
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
                            const currentDepth = Locale.toRomanNumeral(unlocksByDepth.length + 1);
                            const isCompleted = unlocksByDepth.length < nodeData.depthUnlocked;
                            const isCurrent = unlocksByDepth.length == nodeData.depthUnlocked && currentResearchIndex == structureNodeData.nodeType && (this._activeTree ? this._activeTree == this._sourceProgressionTree : true);
                            const isLocked = nodeState == ProgressionTreeNodeState.NODE_STATE_CLOSED || !(unlocksByDepth.length <= nodeData.depthUnlocked);
                            const unlockHeader = currentDepth;
                            const depthLevel = [];
                            for (let depth = 0; depth <= unlocksByDepth.length; depth++) {
                                depthLevel.push({ /*empty object for now*/});
                            }
                            const newDepth = {
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
                    maxDepth: 1,
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
        const layout = new GraphLayout(graph);
        const layoutGraph = layout.getLayoutGraph();
        // assign treeDepth values as ranks for each node
        this._treeData.cards.forEach(card => {
            const nodeId = card.nodeType.toString();
            const rank = card.treeDepth;
            layoutGraph.setNode(nodeId, { ...layoutGraph.node(nodeId), rank });
        });
        layout.normalize(layoutGraph);
        layout.order(layoutGraph);
        // Save tree layout
        this._treeData.graphLayout = layoutGraph;
        //Save off the depth data 
        this._treeData.nodesAtDepth = nodesAtDepth;
        //Now sort the height data to find the largest height in the this._treeData
        let max = -1;
        let indexOfLongestConnectionArray = -1;
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
        }
        else {
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
    generateLayoutData() {
        const graphLayout = this._treeData.graphLayout;
        // add dummy nodes to tree cards
        const dummyNodes = graphLayout.nodes().filter(v => {
            const node = graphLayout.node(v);
            return node.dummy == "edge";
        });
        if (dummyNodes.length > 0) {
            dummyNodes.forEach(v => {
                const node = graphLayout.node(v);
                // We can assume dummy nodes don't have multiple predecessors or succesors because they join actual nodes.
                const predecessors = graphLayout.predecessors(v);
                const successors = graphLayout.successors(v);
                const from = predecessors[0];
                const to = successors ? successors[0] : node.edgeObj.w;
                if (from) {
                    const card = this.getCard(from);
                    if (card) {
                        // remove previous from
                        const index = card.connectedNodeTypes.indexOf(from);
                        card.connectedNodeTypes.splice(index, 1);
                        // push new from 
                        card.connectedNodeTypes.push(v);
                    }
                }
                const dummyCard = {
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
                };
                if (to) {
                    const card = this.getCard(to);
                    if (card) {
                        dummyCard.isLocked = card.isLocked;
                    }
                    dummyCard.connectedNodeTypes.push(to);
                }
                // Fill in the card data, and capture the information in the treeData. 
                this._treeData.cards.push(dummyCard);
            });
        }
        const layerOffsets = this.getVerticalOffsets(graphLayout);
        // sort by rank to make sure we traverse from left->right/top->bottom (for the sink and dummy alignment)
        const orderedCards = this._treeData.cards.sort((cardA, cardB) => {
            const nodeA = this._treeData.graphLayout.node(cardA.nodeType.toString());
            const nodeB = this._treeData.graphLayout.node(cardB.nodeType.toString());
            return nodeA.rank - nodeB.rank;
        });
        this._treeData.cards = orderedCards;
        this._treeData.cards.forEach(infoCard => {
            let nodeId = infoCard.nodeType.toString();
            if (infoCard.isDummy) {
                nodeId = infoCard.name;
            }
            const node = graphLayout.node(nodeId);
            let row;
            let column;
            if (this._direction == TreeGridDirection.HORIZONTAL) {
                row = node.order;
                column = node.rank;
            }
            else {
                row = node.rank;
                column = node.order;
            }
            const offset = layerOffsets[this._direction == TreeGridDirection.HORIZONTAL ? column : row];
            const horizontalSeparation = this._treeData.horizontalCardSeparation;
            const verticalSeparation = this._treeData.verticalCardSeparation;
            // straight lines for nodes with only one child and for nodes following a dummy node
            const isSink = infoCard.connectedNodeTypes.length == 0;
            const isDummy = infoCard.isDummy;
            if (infoCard.row == -1) {
                infoCard.row = this._treeData.originRow + row * horizontalSeparation + (this._direction == TreeGridDirection.HORIZONTAL ? offset : 0);
            }
            if (infoCard.column == -1) {
                infoCard.column = this._treeData.originColumn + column * verticalSeparation + (this._direction == TreeGridDirection.VERTICAL ? offset : 0);
            }
            if (isSink) {
                const predecessors = graphLayout.predecessors(nodeId);
                if (predecessors.length == 1) {
                    // select last parent since we are layering from top to bottom
                    const lastParent = predecessors[predecessors.length - 1];
                    const parentCard = this.getCard(lastParent);
                    // if isn't the only sink, maintain centered the children
                    let parentChildSinks = 0;
                    let parentChildrenGrids = [];
                    parentCard?.connectedNodeTypes.forEach(node => {
                        const card = this.getCard(node.toString());
                        const isSink = card?.connectedNodeTypes.length == 0;
                        if (card) {
                            parentChildrenGrids.push(card);
                        }
                        if (isSink) {
                            parentChildSinks++;
                        }
                    });
                    if (parentCard && parentChildSinks == 1) {
                        if (this._direction == TreeGridDirection.HORIZONTAL) {
                            infoCard.row = parentCard.row;
                        }
                        else {
                            infoCard.column = parentCard.column;
                            // Confirm that the change in column does not overlap an existing node.
                            while (this._treeData.cards.find(child => child.row === infoCard.row &&
                                child.column === infoCard.column &&
                                child.nodeType !== infoCard.nodeType)) {
                                // If the parent card position is below half the tree's width, that the child card should shift to the left side
                                if (parentCard.column < (this._treeData.columns / 2)) {
                                    infoCard.column -= this._treeData.verticalCardSeparation;
                                }
                                else {
                                    infoCard.column += this._treeData.verticalCardSeparation;
                                }
                            }
                        }
                    }
                }
            }
            if (isDummy) {
                const connectedCardId = infoCard.connectedNodeTypes[0].toString();
                const connectedNode = graphLayout.node(nodeId);
                const childCard = this.getCard(connectedCardId);
                if (connectedNode && childCard) {
                    if (this._direction == TreeGridDirection.HORIZONTAL) {
                        childCard.row = infoCard.row;
                    }
                    else {
                        childCard.column = infoCard.column;
                    }
                }
            }
            infoCard.hasData = true;
            const cardInQueue = this.prerequisiteQueue.find(card => { return card.nodeType == infoCard.nodeType; });
            if (cardInQueue) {
                infoCard.queuePriority = cardInQueue.queuePriority;
            }
            if (this.currentResearching && infoCard.nodeType == this.currentResearching.nodeType) {
                infoCard.queuePriority = this.currentResearching.queuePriority;
            }
        });
    }
    generateLinesData() {
        for (let i = 0; i < this._treeData.cards.length; i++) {
            const card = this._treeData.cards[i];
            const nodeId = card.nodeType;
            const nodeName = card.name;
            const connectedNodes = card.connectedNodeTypes;
            const isDummyFrom = card.isDummy;
            const fromLevel = this._direction == TreeGridDirection.HORIZONTAL ? card.column : card.row;
            const fromPosition = this._direction == TreeGridDirection.HORIZONTAL ? card.row : card.column;
            connectedNodes.forEach(nodeType => {
                const childCard = this.getCard(nodeType.toString());
                if (!childCard) {
                    console.log("tree-grid: generateLinesData(): No child card data for type: " + nodeType);
                    return;
                }
                const toPosition = this._direction == TreeGridDirection.HORIZONTAL ? childCard.row : childCard.column;
                let direction = fromPosition > toPosition ? LineDirection.UP_LINE :
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
                });
            });
        }
    }
    getCard(type) {
        return this._treeData.cards.find(t => t.nodeType == type);
    }
    getVerticalOffsets(graph) {
        const maxRank = utils.maxRank(graph);
        const maxOrder = utils.maxOrder(graph);
        const layers = utils.range(0, maxRank + 1).map(function () { return []; });
        ;
        graph.nodes().forEach(v => {
            const node = graph.node(v);
            const rank = node.rank;
            const order = node.order;
            const layerNode = { v, order, rank };
            if (node) {
                layers[rank].push(layerNode);
            }
        });
        const maxHeight = maxOrder + 1;
        const layerOffsets = [];
        layers.forEach(layer => {
            const layerOffset = maxHeight - layer.length;
            layerOffsets.push(layerOffset);
        });
        return layerOffsets;
    }
    generateGrid() {
        this.targetRows = this._treeData.rows;
        this.targetColumns = this._treeData.columns;
        if (this._direction == TreeGridDirection.HORIZONTAL) {
            for (let i = 0; i < this.targetColumns; i++) {
                this._grid[i] = new Array();
                for (let j = 0; j < this.targetRows; j++) {
                    const card = { row: j, column: i };
                    const dataCard = this._treeData.cards.find(card => card.row == j && card.column == i);
                    this._grid[i].push(dataCard || card);
                }
            }
        }
        else {
            for (let i = 0; i < this.targetRows; i++) {
                this._grid[i] = new Array();
                for (let j = 0; j < this.targetColumns; j++) {
                    const card = { row: i, column: j };
                    const dataCard = this._treeData.cards.find(card => card.row == i && card.column == j);
                    this._grid[i].push(dataCard || card);
                }
            }
        }
    }
    generateCollisionData() {
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
            }
            else if (toDummyLine.direction == LineDirection.DOWN_LINE) {
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
    isAvailable(state) {
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
    canBegin(state) {
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
    queueCardItems(nodeIndex) {
        this.queueItems(nodeIndex);
        this.activateQueueItems();
    }
    setHoverItem(nodeIndex) {
        const player = Players.get(GameContext.localPlayerID);
        const AI = player?.AI;
        let highlightNodes;
        if (!AI) {
            console.error(`tree-grid: Can't get AI for player ${player?.id}`);
            return;
        }
        highlightNodes = [];
        const path = AI.getProgressionTreePath(nodeIndex, 1);
        if (!path) { // no path? then it's a single node or a not defined node
            console.warn(`tree-grid: No path found for ${nodeIndex}`);
            const card = this.getCard(nodeIndex.toString());
            if (!card) {
                console.error(`tree-grid: Can't get hovered card with nodeType ${nodeIndex}`);
                return highlightNodes;
            }
            card.isHoverQueued = true;
        }
        for (let qualifiedNode of path) {
            const type = qualifiedNode.nodeType;
            const card = this.getCard(type.toString());
            highlightNodes.push(type);
            if (!card) {
                console.error(`tree-grid: Can't get hovered card with nodeType ${type}`);
                return highlightNodes;
            }
            card.isHoverQueued = true;
        }
        return highlightNodes;
    }
    clearHoverItems() {
        let clearNodes;
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
    queueItems(nodeIndex) {
        this.prerequisiteQueue.length = 0;
        this.queuedElements = 0;
        const player = Players.get(GameContext.localPlayerID);
        const AI = player?.AI;
        if (!AI) {
            console.error(`model-rectangular-grid: Can't get AI for player ${player?.id}`);
            return;
        }
        const path = AI.getProgressionTreePath(nodeIndex, 1);
        if (!path) { // no path? then it's a single node or a not defined node
            console.warn(`model-rectangular-grid: No path found for ${nodeIndex}`);
            const card = this.getCard(nodeIndex.toString());
            if (!card) {
                console.error(`model-rectangular-grid: Can't get selected card with nodeType ${nodeIndex}`);
                return;
            }
            card.queuePriority = 0;
        }
        for (let qualifiedNode of path) {
            const type = qualifiedNode.nodeType;
            const card = this.getCard(type.toString());
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
    activateQueueItems() {
        if (this.prerequisiteQueue.length > 0 && this.queuedElements > 0) {
            this.updateQueuePriorities();
            this.currentResearching = this.prerequisiteQueue.shift() || null;
            if (!this.currentResearching) {
                return;
            }
            this.queuedElements--;
            const args = { ProgressionTreeNodeType: this.currentResearching.nodeType };
            const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.SET_TECH_TREE_NODE, args, false);
            if (result.Success) {
                Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.SET_TECH_TREE_NODE, args);
            }
        }
        else {
            this.currentResearching = null;
        }
    }
    updateQueuePriorities() {
        for (let [index, item] of this.prerequisiteQueue.entries()) {
            item.queuePriority = ++index; // make it one indexed
        }
    }
    /**
     *  If true notifications for ChooseTech handler can be added and not automatically dismissed
    */
    canAddChooseNotification() {
        const player = GameContext.localPlayerID;
        if (this.currentResearching) {
            const nodeState = Game.ProgressionTrees.getNodeState(player, this.currentResearching.nodeType);
            // The current node has opened a path to the next item in queue
            if (nodeState == ProgressionTreeNodeState.NODE_STATE_UNLOCKED || nodeState == ProgressionTreeNodeState.NODE_STATE_FULLY_UNLOCKED) {
                this.activateQueueItems();
                return false;
            }
        }
        return true;
    }
    getLastAvailableNodeType() {
        const card = this._treeData.cards.find(card => card.isAvailable);
        if (card) {
            return card.nodeType.toString();
        }
        return this._treeData.cards[0].nodeType.toString();
    }
}
//# sourceMappingURL=file:///base-standard/ui/tree-grid/tree-grid.js.map
