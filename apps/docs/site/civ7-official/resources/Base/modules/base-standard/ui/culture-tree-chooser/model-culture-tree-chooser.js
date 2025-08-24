/**
 * @file model-culture-tree-chooser.ts
 * @copyright 2020-2024, Firaxis Games
 */
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import { getNodeName, getUnlockTargetDescriptions, getUnlockTargetIcon, getUnlockTargetName } from '/base-standard/ui/utilities/utilities-textprovider.js';
import { formatStringArrayAsNewLineText } from '/core/ui/utilities/utilities-core-textprovider.js';
import { AdvisorUtilities } from '/base-standard/ui/tutorial/tutorial-support.js';
import { TreeNodesSupport } from '/base-standard/ui/tree-grid/tree-support.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
export class CultureTreeChooserModel {
    constructor() {
        this._Player = PlayerIds.NO_PLAYER;
        this.Nodes = [];
        this.ResearchedNodes = [];
        this.InProgressNodes = [];
        this.TreeRevealNodes = [];
        this.TreeRevealData = [];
        this._subject = new Subject(this);
        this._showLockedCivics = false;
        this._isExpanded = false;
        this.updateGate = new UpdateGate(this.update.bind(this));
        this.cultureHotkeyListener = () => { this.onCultureHotkey(); };
        this.treeTitle = "";
        engine.whenReady.then(() => {
            this.playerId = GameContext.localPlayerID;
            engine.on('LocalPlayerTurnBegin', () => {
                this.playerId = GameContext.localPlayerID;
            });
            engine.on('LocalPlayerChanged', () => {
                this.playerId = GameContext.localPlayerID;
            });
            const cultureUpdatesOrPlayerTurnListener = (data) => {
                if (data && data.player !== GameContext.localPlayerID)
                    return;
                this.updateGate.call("cultureUpdatesOrPlayerTurnListener");
            };
            engine.on('CultureYieldChanged', cultureUpdatesOrPlayerTurnListener);
            engine.on('CultureTreeChanged', cultureUpdatesOrPlayerTurnListener);
            engine.on('CultureTargetChanged', cultureUpdatesOrPlayerTurnListener);
            engine.on('CultureNodeCompleted', cultureUpdatesOrPlayerTurnListener);
            engine.on('PlayerTurnActivated', cultureUpdatesOrPlayerTurnListener);
            engine.on('CityReligionChanged', this.onCityReligionChanged, this);
            window.addEventListener('hotkey-open-civics', this.cultureHotkeyListener);
            //TODO: on destroy, need to clear out listeners. 
        });
    }
    get isExpanded() {
        return this._isExpanded;
    }
    set isExpanded(value) {
        this._isExpanded = value;
    }
    get subject() {
        return this._subject;
    }
    get showLockedCivics() {
        return this._showLockedCivics;
    }
    set showLockedCivics(value) {
        this._showLockedCivics = value;
    }
    set playerId(player) {
        if (this._Player != player) {
            this._Player = player;
            this.updateGate.call("playerId");
        }
    }
    get playerId() {
        return this._Player;
    }
    get player() {
        return Players.get(this.playerId);
    }
    get nodes() {
        return this.Nodes ?? [];
    }
    get inProgressNodes() {
        return this.InProgressNodes;
    }
    get hasCurrentResearch() {
        return this.InProgressNodes.length > 0;
    }
    get currentResearchEmptyTitle() {
        return Locale.compose("LOC_UI_CULTURE_RESEARCH_EMPTY");
    }
    get shouldShowTreeRevealHeader() {
        return (this.treeRevealData && this.treeRevealData.length > 0);
    }
    get treeRevealData() {
        return this.TreeRevealNodes ?? [];
    }
    onCityReligionChanged() {
        this.updateGate.call("onCityReligionChanged");
    }
    update(data) {
        const player = Players.get(this.playerId);
        if (!player)
            return;
        // TODO: Is a data being passed through when raised from a gamecore event?
        if (data && data.player !== this.playerId) {
            return;
        }
        this.Nodes = [];
        this.ResearchedNodes = [];
        this.InProgressNodes = [];
        this.TreeRevealData = [];
        this.TreeRevealNodes = [];
        // Recent research + Current research info --------------------------------------------
        let currentResearchIndex;
        const cultures = player.Culture;
        if (cultures) {
            const cultureTreeType = cultures.getActiveTree();
            const treeObject = Game.ProgressionTrees.getTree(player.id, cultureTreeType);
            if (treeObject) {
                currentResearchIndex = treeObject.nodes[treeObject.activeNodeIndex]?.nodeType;
            }
        }
        // List of ALL available tree nodes ---------------------------------------
        const availableNodes = player.Culture?.getAllAvailableNodeTypes();
        if (availableNodes) {
            for (let eNode of availableNodes) {
                const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(eNode);
                if (!nodeInfo) {
                    continue;
                }
                const nodeData = Game.ProgressionTrees.getNode(this.playerId, eNode);
                if (!nodeData) {
                    continue;
                }
                const uiNodeData = this.buildUINodeInfo(nodeInfo, nodeData);
                this.Nodes.push(uiNodeData);
                //If we are currently researching this node, then capture that 
                if (currentResearchIndex && currentResearchIndex == nodeData.nodeType) {
                    this.InProgressNodes.push(uiNodeData);
                }
            }
        }
        // List of already-researched nodes (used when we've researched the entire list to show the tree)
        const researchedNodes = player.Culture?.getResearched();
        if (researchedNodes) {
            researchedNodes.forEach(eNode => {
                const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(eNode.type);
                if (nodeInfo) {
                    const nodeData = Game.ProgressionTrees.getNode(this.playerId, eNode.type);
                    if (nodeData) {
                        const uiNodeData = this.buildUINodeInfo(nodeInfo, nodeData);
                        this.ResearchedNodes.push(uiNodeData);
                    }
                }
                else {
                    console.error(`model-culture-tree-chooser: couldn't get info for node type ${eNode.type}`);
                }
            });
        }
        // List of  tree node information ---------------------------------------
        this.TreeRevealData = Game.ProgressionTrees.getAllTreeRevealData(this.playerId);
        if (this.TreeRevealData) {
            for (let eNode of this.TreeRevealData) {
                const treeNodeData = this.buildTreeRevealInfo(eNode);
                if (treeNodeData) {
                    this.TreeRevealNodes.push(treeNodeData);
                }
            }
        }
        this._subject.value = this;
    }
    chooseNode(nodeId) {
        const nodeIndex = +nodeId;
        const args = { ProgressionTreeNodeType: nodeIndex };
        const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.SET_CULTURE_TREE_NODE, args, false);
        if (result.Success) {
            Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.SET_CULTURE_TREE_NODE, args);
            // Send unique audio event if node data is not null.
            const nodeData = Game.ProgressionTrees.getNode(this.playerId, nodeIndex);
            if (nodeData) {
                const node = GameInfo.ProgressionTreeNodes.lookup(nodeData.nodeType);
                if (node) {
                    UI.sendAudioEvent("civic-tree-activate-" + node.ProgressionTreeNodeType);
                }
                else {
                    Audio.playSound("data-audio-civic-tree-activate", "audio-screen-culture-tree-chooser");
                }
            }
            else {
                Audio.playSound("data-audio-civic-tree-activate", "audio-screen-culture-tree-chooser");
            }
        }
    }
    buildUINodeInfo(nodeInfo, nodeData) {
        const player = this.player;
        const nodeType = nodeData.nodeType;
        const nodeName = getNodeName(nodeData);
        const nodeDesc = Locale.compose(nodeInfo.Description ?? "");
        const primaryIcon = Icon.getCultureIconFromProgressionTreeNodeDefinition(nodeInfo);
        const turnsLeft = (player ? (player.Culture ? player.Culture.getTurnsForNode(nodeType) : -1) : -1);
        const unlocksData = [];
        const unlocksByDepth = [];
        const treeType = nodeInfo.ProgressionTree;
        const treeObject = GameInfo.ProgressionTrees.lookup(treeType);
        const treeDescToLookUp = (treeObject != null) ? (treeObject.Name ?? "") : ""; // Lots of places could be empty. 
        const treeTypeDesc = Locale.compose(treeDescToLookUp);
        const treeIcon = treeObject ? Icon.getCultureIconFromProgressionTreeDefinition(treeObject) : "";
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
                const unlockIcon = getUnlockTargetIcon(unlockInfo.TargetType, unlockInfo.TargetKind);
                const unlockDescriptions = getUnlockTargetDescriptions(unlockInfo.TargetType, unlockInfo.TargetKind);
                const unlockFullDesc = formatStringArrayAsNewLineText(unlockDescriptions);
                const unlockToolTip = unlockName.length ? unlockName : unlockFullDesc;
                if (!unlockFullDesc && !unlockName) {
                    continue;
                }
                const nodeUIDisplayData = {
                    name: unlockName,
                    icon: unlockIcon,
                    description: Locale.stylize(unlockFullDesc),
                    depth: unlockInfo.UnlockDepth,
                    tooltip: unlockToolTip,
                    kind: unlockInfo.TargetKind,
                    type: unlockInfo.TargetType
                };
                unlocksData.push(nodeUIDisplayData);
                // Make sure that our organized array by depth has enough depth to cover us 
                while (unlocksByDepth.length < unlockInfo.UnlockDepth) {
                    const currentDepth = Locale.toRomanNumeral(unlocksByDepth.length + 1);
                    const isCompleted = unlocksByDepth.length < nodeData.depthUnlocked;
                    const isCurrent = unlocksByDepth.length == nodeData.depthUnlocked;
                    let unlockHeader;
                    if (isCompleted) {
                        unlockHeader = Locale.compose("LOC_UI_TECH_TREE_UNLOCK_COMPLETED_HEADER", currentDepth);
                    }
                    else if (isCurrent) {
                        unlockHeader = Locale.compose("LOC_UI_TECH_TREE_UNLOCK_CURRENT_HEADER", currentDepth);
                    }
                    else {
                        unlockHeader = Locale.compose("LOC_UI_TECH_TREE_UNLOCK_HEADER", currentDepth);
                    }
                    let depthLevel = [];
                    for (let depth = 0; depth <= unlocksByDepth.length; depth++) {
                        depthLevel.push({ /*empty object for now*/});
                    }
                    const newDepth = {
                        header: unlockHeader,
                        unlocks: [],
                        isCompleted: isCompleted,
                        isCurrent: isCurrent,
                        depthLevel: depthLevel
                    };
                    unlocksByDepth.push(newDepth);
                }
                // Now, pop that item into the correct sorted section 
                unlocksByDepth[unlockInfo.UnlockDepth - 1].unlocks.push(nodeUIDisplayData);
            }
        }
        //Modify the header if we don't have multiple leves to show. 
        if (unlocksByDepth.length == 1) {
            unlocksByDepth[0].header = Locale.compose("LOC_UI_TECH_TREE_UNLOCK_ALL_HEADER");
        }
        let depthInfo = [];
        for (let depth = 0; depth < nodeData.maxDepth; depth++) {
            depthInfo.push(depth < nodeData.depthUnlocked);
        }
        const cultureRecommendations = AdvisorUtilities.getTreeRecommendations(AdvisorySubjectTypes.CHOOSE_CULTURE);
        const currentRecommendations = AdvisorUtilities.getTreeRecommendationIcons(cultureRecommendations, nodeType).map(rec => rec.class);
        const uiNodeData = {
            id: nodeType,
            name: nodeName,
            branchDescription: treeTypeDesc,
            primaryIcon: primaryIcon,
            branchIcon: treeIcon,
            description: nodeDesc,
            turns: turnsLeft,
            unlocks: unlocksData,
            unlocksByDepth: unlocksByDepth,
            currentDepthUnlocked: nodeData.depthUnlocked,
            maxDepth: nodeData.maxDepth,
            depthSlots: depthInfo,
            percentComplete: nodeData.progress,
            percentCompleteLabel: nodeData.progress.toString() + "%",
            showPercentComplete: nodeData.progress > 0,
            treeType: treeType,
            isLocked: false,
            recommendations: currentRecommendations,
            cost: nodeInfo.Cost
        };
        return uiNodeData;
    }
    buildTreeRevealInfo(treeRevealProgressData) {
        // Skip if the progress is 0
        if (treeRevealProgressData.current == 0) {
            return null;
        }
        // Skip if completed
        if (treeRevealProgressData.current >= treeRevealProgressData.total) {
            return null;
        }
        if (treeRevealProgressData.hideOverride) {
            return null;
        }
        const treeType = treeRevealProgressData.treeType;
        const treeObject = GameInfo.ProgressionTrees.lookup(treeType);
        const treeDescToLookUp = treeObject?.Name ?? "";
        const treeTypeDesc = Locale.compose(treeDescToLookUp);
        const treeIcon = treeObject ? Icon.getCultureIconFromProgressionTreeDefinition(treeObject) : "";
        const percentStyle = `${Math.min(100, 100 * treeRevealProgressData.current / treeRevealProgressData.total)}%`;
        const statuses = formatStringArrayAsNewLineText(treeRevealProgressData.reqStatuses);
        const treeNodeData = {
            treeType: treeRevealProgressData.treeType,
            reqStatuses: statuses,
            current: treeRevealProgressData.current,
            total: treeRevealProgressData.total,
            percentComplete: percentStyle,
            percentCompleteLabel: `${treeRevealProgressData.current} / ${treeRevealProgressData.total}`,
            name: treeTypeDesc,
            icon: treeIcon,
            isLocked: true
        };
        return treeNodeData;
    }
    getDefaultTreeToDisplay() {
        if (this.InProgressNodes.length > 0) {
            return (this.InProgressNodes[0].treeType);
        }
        else if (this.Nodes.length > 0) {
            return (this.Nodes[0].treeType);
        }
        else if (this.ResearchedNodes.length > 0) {
            return (this.ResearchedNodes[0].treeType);
        }
        return undefined;
    }
    getDefaultNodeToDisplay() {
        if (this.InProgressNodes.length > 0) {
            return (this.InProgressNodes[0].id);
        }
        else if (this.Nodes.length > 0) {
            return (this.Nodes[0].id);
        }
        return undefined;
    }
    getAllTreesToDisplay() {
        const player = Players.get(this.playerId);
        if (player) {
            const cultures = player.Culture;
            if (cultures) {
                const cultureTreeTypes = cultures.getAvailableTrees();
                return cultureTreeTypes;
            }
        }
        return undefined;
    }
    findNode(id) {
        return this.Nodes.find(node => node.id == id);
    }
    onCultureHotkey() {
        if (ContextManager.isCurrentClass('screen-culture-tree-chooser')) {
            ContextManager.pop('screen-culture-tree-chooser');
        }
        else if (!ContextManager.hasInstanceOf('screen-pause-menu')) {
            ContextManager.push('screen-culture-tree-chooser');
        }
    }
}
const CultureTreeChooser = new CultureTreeChooserModel();
export { CultureTreeChooser as default };

//# sourceMappingURL=file:///base-standard/ui/culture-tree-chooser/model-culture-tree-chooser.js.map
