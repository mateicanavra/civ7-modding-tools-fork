/**
 * @file model-tech-tree-chooser.ts		// TODO: remove "tree" from file name.
 * @copyright 2020-2024, Firaxis Games
 */

import ContextManager from '/core/ui/context-manager/context-manager.js'
import { formatStringArrayAsNewLineText } from '/core/ui/utilities/utilities-core-textprovider.js'
import { getNodeName, getUnlockTargetDescriptions, getUnlockTargetIcon, getUnlockTargetName } from '/base-standard/ui/utilities/utilities-textprovider.js'
import { Icon } from '/core/ui/utilities/utilities-image.js'
import { Audio } from '/core/ui/audio-base/audio-support.js';
import { AvailableTreeChooserNode, TreeChooserDepthInfo } from '/base-standard/ui/tree-chooser-item/model-tree-chooser-item.js';
import { AdvisorRecommendations, AdvisorUtilities } from '/base-standard/ui/tutorial/tutorial-support.js';
import { TreeNodesSupport } from '/base-standard/ui/tree-grid/tree-support.js';

export interface TechChooserNode extends AvailableTreeChooserNode { }
export interface TechChooserDepthInfo extends TreeChooserDepthInfo { }

export class TechTreeChooserModel {

	private _Player: PlayerId = PlayerIds.NO_PLAYER;
	private Nodes: TechChooserNode[] = [];
	private ResearchedNodes: TechChooserNode[] = [];
	private InProgressNodes: TechChooserNode[] = [];
	private _subject = new Subject<TechTreeChooserModel>(this);

	private techHotkeyListener: EventListener = () => { this.onTechHotkey() };

	constructor() {
		engine.whenReady.then(() => {

			this.playerId = GameContext.localPlayerID;

			engine.on('LocalPlayerTurnBegin', () => {
				this.playerId = GameContext.localPlayerID;
			})

			engine.on('LocalPlayerChanged', () => {
				this.playerId = GameContext.localPlayerID;
			})

			const techsUpdatesOrPlayerTurnListener = (data: any) => {
				if (data && data.player !== GameContext.localPlayerID) return;
				this.update();
			}

			engine.on('ScienceYieldChanged', techsUpdatesOrPlayerTurnListener);
			engine.on('TechTreeChanged', techsUpdatesOrPlayerTurnListener);
			engine.on('TechTargetChanged', techsUpdatesOrPlayerTurnListener);
			engine.on('TechNodeCompleted', techsUpdatesOrPlayerTurnListener);
			engine.on('PlayerTurnActivated', techsUpdatesOrPlayerTurnListener);

			window.addEventListener('hotkey-open-techs', this.techHotkeyListener);

			this.update();
		})
	}

	get subject(): Subject<TechTreeChooserModel> {
		return this._subject;
	}

	set playerId(player: PlayerId) {
		if (this._Player != player) {
			this._Player = player;
			this.update();
		}
	}

	get playerId() {
		return this._Player;
	}
	get player() {
		return Players.get(this.playerId);
	}

	get nodes(): TechChooserNode[] {
		return this.Nodes ?? [];
	}

	get inProgressNodes(): TechChooserNode[] {
		return this.InProgressNodes ?? [];
	}

	get hasCurrentResearch(): boolean {
		return this.InProgressNodes.length > 0;
	}

	get currentResearchEmptyTitle(): string {
		return Locale.compose("LOC_UI_TECH_RESEARCH_EMPTY");
	}

	update() {
		this.Nodes = [];
		this.ResearchedNodes = [];
		this.InProgressNodes = [];

		const player = Players.get(this.playerId);
		if (!player) return;

		// Recent research + Current research info --------------------------------------------
		let currentResearchIndex: ProgressionTreeNodeType | undefined;
		const techs: PlayerTechs | undefined = player.Techs;
		if (techs) {
			const techTreeType: ProgressionTreeType = techs.getTreeType();
			const treeObject: ProgressionTree | null = Game.ProgressionTrees.getTree(player.id, techTreeType);
			if (treeObject) {
				currentResearchIndex = treeObject.nodes[treeObject.activeNodeIndex]?.nodeType;
			}
		}

		// List of ALL available tree nodes ---------------------------------------
		const availableNodes: ProgressionTreeNodeType[] | undefined = player.Techs?.getAllAvailableNodeTypes();
		if (availableNodes) {
			for (let eNode of availableNodes) {

				const nodeInfo: ProgressionTreeNodeDefinition | null = GameInfo.ProgressionTreeNodes.lookup(eNode);
				if (!nodeInfo) {
					continue;
				}
				const nodeData: ProgressionTreeNode | null = Game.ProgressionTrees.getNode(this.playerId, eNode);
				if (!nodeData) {
					continue;
				}

				const uiNodeData: TechChooserNode | null = this.buildUINodeInfo(nodeInfo, nodeData);
				this.Nodes.push(uiNodeData);

				//If we are currently researching this node, then capture that 
				if (currentResearchIndex && currentResearchIndex == nodeData.nodeType) {
					this.InProgressNodes.push(uiNodeData);
				}
			}
		}

		// List of already-researched nodes (used when we've researched the entire list to show the tree)
		const researchedNodes: FullNodeState[] | undefined = player.Techs?.getResearched();
		if (researchedNodes) {
			researchedNodes.forEach(eNode => {
				const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(eNode.type);
				if (nodeInfo) {
					const nodeData = Game.ProgressionTrees.getNode(this.playerId, eNode.type);
					if (nodeData) {
						const uiNodeData: TechChooserNode | null = this.buildUINodeInfo(nodeInfo, nodeData);
						this.ResearchedNodes.push(uiNodeData);
					}
				} else {
					console.error(`model-tech-tree-chooser: couldn't get info for node type ${eNode.type}`);
				}
			});
		}

		this._subject.value = this;
	}

	chooseNode(nodeId: ProgressionTreeNodeType) {
		const nodeIndex: number = +nodeId;
		const args = { ProgressionTreeNodeType: nodeIndex };
		const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.SET_TECH_TREE_NODE, args, false);
		if (result.Success) {
			Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.SET_TECH_TREE_NODE, args);
			// Send unique audio event if node data is not null.
			const nodeData = Game.ProgressionTrees.getNode(this.playerId, nodeIndex);
			if (nodeData) {
				const node: ProgressionTreeNodeDefinition | null = GameInfo.ProgressionTreeNodes.lookup(nodeData.nodeType);
				if (node) {
					UI.sendAudioEvent("tech-tree-activate-" + node.ProgressionTreeNodeType);
				} else {
					Audio.playSound("data-audio-tech-tree-activate", "audio-screen-tech-tree-chooser");
				}
			} else {
				Audio.playSound("data-audio-tech-tree-activate", "audio-screen-tech-tree-chooser");
			}
		}
	}

	buildUINodeInfo(nodeInfo: ProgressionTreeNodeDefinition, nodeData: ProgressionTreeNode): TechChooserNode {
		const player = this.player;
		const nodeType: ProgressionTreeNodeType = nodeData.nodeType;

		const nodeName: string = getNodeName(nodeData);
		const nodeDesc: string = Locale.compose(nodeInfo.Description ?? "");
		const turnsLeft: number = player ? (player.Techs ? player.Techs.getTurnsForNode(nodeType) : -1) : -1;
		const unlocksData: NodeUnlockDisplayData[] = [];
		const unlocksByDepth: TechChooserDepthInfo[] = [];

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
				const unlockIcon: string = getUnlockTargetIcon(unlockInfo.TargetType, unlockInfo.TargetKind);
				const unlockDescriptions: string[] = getUnlockTargetDescriptions(unlockInfo.TargetType, unlockInfo.TargetKind);
				const unlockFullDesc: string = formatStringArrayAsNewLineText(unlockDescriptions);
				const unlockToolTip: string = unlockName.length ? unlockName : unlockFullDesc;

				if (!unlockFullDesc && !unlockName) {
					continue;
				}

				const nodeUIDisplayData: NodeUnlockDisplayData = {
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
					const currentDepth: string = Locale.toRomanNumeral(unlocksByDepth.length + 1);
					const isCompleted: boolean = unlocksByDepth.length < nodeData.depthUnlocked;
					const isCurrent: boolean = unlocksByDepth.length == nodeData.depthUnlocked;
					let unlockHeader: string;
					if (isCompleted) {
						unlockHeader = Locale.compose("LOC_UI_TECH_TREE_UNLOCK_COMPLETED_HEADER", currentDepth);
					} else if (isCurrent) {
						unlockHeader = Locale.compose("LOC_UI_TECH_TREE_UNLOCK_CURRENT_HEADER", currentDepth);
					} else {
						unlockHeader = Locale.compose("LOC_UI_TECH_TREE_UNLOCK_HEADER", currentDepth);
					}

					let depthLevel: object[] = [];
					for (let depth: number = 0; depth <= unlocksByDepth.length; depth++) {
						depthLevel.push({/*empty object for now*/ });
					}

					const newDepth: TechChooserDepthInfo = {
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

		let depthInfo: boolean[] = [];
		for (let depth: number = 0; depth < nodeData.maxDepth; depth++) {
			depthInfo.push(depth < nodeData.depthUnlocked);
		}

		const techRecommendations = AdvisorUtilities.getTreeRecommendations(AdvisorySubjectTypes.CHOOSE_TECH);
		const currentRecommendations: Array<AdvisorRecommendations> = AdvisorUtilities.getTreeRecommendationIcons(techRecommendations, nodeType).map(rec => rec.class);

		const uiNodeData: TechChooserNode = {
			id: nodeType,
			name: nodeName,
			primaryIcon: Icon.getTechIconFromProgressionTreeNodeDefinition(nodeInfo),
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
			treeType: nodeInfo.ProgressionTree,
			isLocked: false,
			recommendations: currentRecommendations,
			cost: nodeInfo.Cost
		};
		return uiNodeData;
	}

	getDefaultTreeToDisplay(): ProgressionTreeType | undefined {
		if (this.InProgressNodes.length > 0) {
			return (this.InProgressNodes[0].treeType);
		} else if (this.Nodes.length > 0) {
			return (this.Nodes[0].treeType);
		} else if (this.ResearchedNodes.length > 0) {
			return (this.ResearchedNodes[0].treeType);
		}

		return undefined;
	}

	getDefaultNodeToDisplay(): ProgressionTreeNodeType | undefined {
		if (this.InProgressNodes.length > 0) {
			return (this.InProgressNodes[0].id);
		} else if (this.Nodes.length > 0) {
			return (this.Nodes[0].id);
		}

		return undefined;
	}

	findNode(id: string): TechChooserNode | undefined {
		return this.Nodes.find(node => node.id == id);
	}

	private onTechHotkey() {
		if (ContextManager.isCurrentClass('screen-tech-tree-chooser')) {
			ContextManager.pop('screen-tech-tree-chooser');
		} else if (!ContextManager.hasInstanceOf('screen-pause-menu')) {
			ContextManager.push('screen-tech-tree-chooser');
		}
	}
}


const TechTreeChooser = new TechTreeChooserModel();

export { TechTreeChooser as default };
