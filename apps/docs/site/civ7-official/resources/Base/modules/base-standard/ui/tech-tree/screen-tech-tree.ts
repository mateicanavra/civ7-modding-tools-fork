/**
 * @file screen-tech-tree.ts
 * @copyright 2024-2025, Firaxis Games
 * @description Full Tech Tree
 */

import { Audio } from '/core/ui/audio-base/audio-support.js';
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import TechTree from '/base-standard/ui/tech-tree/model-tech-tree.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { TreeCardActivatedEventDetail, TreeCardActivatedEventName, TreeCardHoveredEventDetail, TreeCardHoveredEventName, TreeCardDehoveredEventDetail, TreeCardDehoveredEventName } from '/base-standard/ui/tree-grid/tree-card.js';
import { TreeGridCard, TreeSupport, TreeGridDirection, TreeCardScaleBoundary } from '/base-standard/ui/tree-grid/tree-support.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { TreeDetail } from '/base-standard/ui/tree-grid/tree-detail.js'
import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js';

class ScreenTechTree extends Panel {
	private readonly isMobileViewExperience = UI.getViewExperience() == UIViewExperience.Mobile;

	private viewTechProgressionTreeListener = this.onViewProgressionTree.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);
	private closeListener = this.close.bind(this);
	private activeDeviceTypeListener = this.onActiveDeviceTypeChanged.bind(this);
	private onCardActivateListener = this.onCardActivate.bind(this);
	private onCardHoverListener = this.onCardHover.bind(this);
	private onCardDehoverListener = this.onCardDehover.bind(this);
	private startResearchButtonActivateListener = this.onStartResearchButtonActivate.bind(this);

	private selectedNode?: ProgressionTreeNodeType;
	private selectedLevel: number = 0;
	private previousSelectedNode?: ProgressionTreeNodeType;

	private frame!: HTMLElement;
	private cardDetailContainer?: HTMLElement;
	private contentContainer!: HTMLElement;
	private treeDetail?: ComponentRoot<TreeDetail>;
	private startResearchButton?: HTMLElement;

	private cardScaling: TreeCardScaleBoundary | null = null;

	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.RelativeToLeft;
		this.enableOpenSound = true;
		this.enableCloseSound = true;
	}

	onAttach() {
		this.Root.setAttribute("data-audio-group-ref", "audio-screen-tech-tree");

		super.onAttach();
		window.addEventListener('view-tech-progression-tree', this.viewTechProgressionTreeListener);
		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);

		this.frame = MustGetElement('fxs-subsystem-frame', this.Root);
		if (this.isMobileViewExperience) {
			this.frame.setAttribute("box-style", "fullscreen");
			this.frame.setAttribute("outside-safezone-mode", "full");
			waitForLayout(() => this.frame.classList.remove("pb-10"));
		}
		this.contentContainer = MustGetElement("#tech-tree-content-container", this.Root);

		//Get the relevant gameplay data progression tree to fill in to the grid.
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const availableTechTree: ProgressionTreeType | undefined = player.Techs?.getTreeType();
			if (availableTechTree == undefined) {
				console.error("screen-tech-tree: onAttach(): Error getting progression trees");
			}
		}

		const closebutton: HTMLElement | null = document.querySelector<HTMLElement>('.tech-tree-hex-grid-close');
		if (closebutton) {
			closebutton.addEventListener('action-activate', this.closeListener);
		}

		this.Root.addEventListener('engine-input', this.engineInputListener);
		this.frame.addEventListener('subsystem-frame-close', this.closeListener);
		engine.on('TechTreeChanged', this.onTechUpdated, this);
		engine.on('TechTargetChanged', this.onTechTargetUpdated, this);

		TechTree.updateGate.call('onAttach');
	}

	onReceiveFocus(): void {
		super.onReceiveFocus();

		const panelCategoryContainer = this.Root.querySelector('#tech-category-container');
		if (!panelCategoryContainer) {
			console.warn("screen-tech-tree: onReceiveFocus(): No tech category container found, focus is not posible");
			return;
		}

		waitForLayout(() => FocusManager.setFocus(panelCategoryContainer));
	}

	private onTechUpdated(data: PlayerProgressionTree_EventData) {
		if (data.player && data.player != GameContext.localPlayerID) {
			//Not us, we don't need to update
			return;
		}

		TechTree.updateGate.call("onTechUpdated");
	}

	private onTechTargetUpdated(data: PlayerProgressionTarget_EventData) {
		if (data.player && data.player != GameContext.localPlayerID) {
			//Not us, we don't need to update
			return;
		}

		TechTree.updateGate.call("onTechTargetUpdated");
	}

	onDetach(): void {
		window.removeEventListener('view-tech-progression-tree', this.viewTechProgressionTreeListener);
		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);

		this.Root.removeEventListener('engine-input', this.engineInputListener);

		engine.off('TechTreeChanged', this.onTechUpdated, this);
		engine.off('TechTargetChanged', this.onTechTargetUpdated, this);

		if (this.cardScaling) {
			this.cardScaling.removeListeners();
		}

		super.onDetach();
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
			this.close();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private cleanPreviousSelectedNode() {
		if (this.previousSelectedNode != undefined) {
			const selectedElement: HTMLElement | null = this.Root.querySelector<HTMLElement>(`tree-card[type="${this.previousSelectedNode}"]`);
			if (selectedElement) {
				selectedElement.classList.remove("selected");
			} else {
				console.warn("screen-tech-tree: cleanPreviousSelectedNode(): Previous selected rectangular card not found");
			}
		}
	}

	private onViewProgressionTree(event: CustomEvent) {
		this.refreshProgressionTree(event.detail.treeCSV, event.detail.targetNode, event.detail.iconCallback);
	}

	private refreshProgressionTree(treesCSV: string, targetNode: string, iconCallback: (node: ProgressionTreeNodeDefinition) => string) {
		TechTree.sourceProgressionTrees = treesCSV;
		if (iconCallback) {
			TechTree.iconCallback = iconCallback;
		}

		while (this.contentContainer.hasChildNodes()) {
			this.contentContainer.removeChild(this.contentContainer.lastChild!);
		}

		const panelCategoryContainer: HTMLElement = document.createElement("fxs-slot");
		panelCategoryContainer.id = "tech-category-container";
		panelCategoryContainer.classList.add("flex-auto", "items-center", "w-full", "flex", "relative");

		this.createPanelContent(panelCategoryContainer);

		this.contentContainer.appendChild(panelCategoryContainer);

		waitForLayout(() => FocusManager.setFocus(panelCategoryContainer));

		if (targetNode) {
			this.refreshDetailsPanel(targetNode);
		}
	}

	private createPanelContent(container: Element) {
		const tree: string = `g_TechTree.tree`;
		const { scrollable, cardScaling } = TreeSupport.getGridElement(tree, TreeGridDirection.HORIZONTAL, this.createCard.bind(this));

		this.cardScaling = cardScaling;

		if (TreeSupport.isSmallScreen()) {
			scrollable.setAttribute('handle-gamepad-pan', 'false');
		}
		this.cardDetailContainer = document.createElement("div");
		this.cardDetailContainer.classList.add(`card-detail-container`, "p-4", "pointer-events-none", "items-end", "w-96", "flex-col", "items-center", "max-h-full");
		this.cardDetailContainer.classList.toggle("w-128", this.isMobileViewExperience);
		this.cardDetailContainer.classList.toggle("w-96", !this.isMobileViewExperience);

		container.appendChild(scrollable);
		container.appendChild(this.cardDetailContainer);
	}

	private createCard(container: HTMLElement) {
		const cardElement: HTMLElement = document.createElement("tree-card");
		Databind.if(cardElement, "card.hasData");
		Databind.attribute(cardElement, 'dummy', 'card.isDummy');
		Databind.attribute(cardElement, 'type', 'card.nodeType');
		Databind.attribute(cardElement, 'name', 'card.name');
		Databind.attribute(cardElement, 'progress', 'card.progressPercentage');
		Databind.attribute(cardElement, 'turns', 'card.turns');
		Databind.attribute(cardElement, 'queue-order', 'card.queueOrder');
		Databind.attribute(cardElement, 'unlocks-by-depth', 'card.unlocksByDepthString');
		cardElement.setAttribute('tooltip-type', 'tech-tree');
		cardElement.setAttribute('tree-type', 'tech');
		cardElement.setAttribute("data-audio-group-ref", "audio-screen-tech-tree-chooser");
		cardElement.setAttribute("data-audio-activate-ref", "none");
		cardElement.setAttribute("data-audio-focus", "tech-tree-full-focus");
		Databind.classToggle(cardElement, 'locked', 'card.isLocked');
		Databind.classToggle(cardElement, 'queued', 'card.isQueued');
		cardElement.addEventListener(TreeCardHoveredEventName, this.onCardHoverListener);
		cardElement.addEventListener(TreeCardDehoveredEventName, this.onCardDehoverListener);
		cardElement.addEventListener(TreeCardActivatedEventName, this.onCardActivateListener);
		container.appendChild(cardElement);
	}

	private refreshDetailsPanel(nodeId: string, level: string = "0") {
		this.previousSelectedNode = this.selectedNode;
		this.selectedNode = nodeId;
		this.selectedLevel = +level;
		this.cleanPreviousSelectedNode();

		this.updateTreeDetail(nodeId, level);

		const selectedElement: HTMLElement | null = this.Root.querySelector<HTMLElement>(`tree-card[type="${this.selectedNode}"]`);
		selectedElement?.classList.add("selected");

		this.refreshNavTray();
	}

	private updateTreeDetail(nodeId: string, level: string) {
		if (!this.treeDetail) {
			if (!this.cardDetailContainer) {
				console.error("screen-tech-tree: refreshDetailsPanel(): detailCardsContainer '.card-detail-container' couldn't be found");
				return;
			}

			this.treeDetail = document.createElement("tree-detail");
			this.treeDetail.classList.add("max-w-full");
			this.cardDetailContainer.appendChild(this.treeDetail);

			this.startResearchButton = document.createElement("fxs-button");
			this.startResearchButton.classList.add("mt-6");
			this.startResearchButton.setAttribute('caption', 'LOC_UI_TREE_START_RESEARCH');
			this.startResearchButton.addEventListener('action-activate', this.startResearchButtonActivateListener)
			this.cardDetailContainer.appendChild(this.startResearchButton);

			// The tree detail scrollable never receives focus directly, so we need to make the scrollable listen for engine input
			// at the root of the panel content
			waitForLayout(() => {
				const treeDetailScrollable = this.treeDetail?.maybeComponent?.scrollable?.maybeComponent;
				treeDetailScrollable?.setEngineInputProxy(this.Root);
			})
		}

		const node: TreeGridCard | undefined = TechTree.getCard(nodeId);
		if (node == undefined) {
			console.error("screen-tech-tree: updateTreeDetail(): Node with id " + nodeId + " couldn't be found on the grid data");
			return;
		}

		const { isCompleted, isCurrent } = node.unlocksByDepth?.[+level] ?? {};
		this.startResearchButton?.classList.toggle("hidden", isCompleted || isCurrent || !ActionHandler.isTouchActive);
		this.startResearchButton?.setAttribute('type', nodeId);
		this.startResearchButton?.setAttribute('level', level);

		this.treeDetail.setAttribute('name', node.name);
		this.treeDetail.setAttribute('icon', node.icon);
		this.treeDetail.setAttribute('level', level);
		this.treeDetail.setAttribute('progress', `${node.progressPercentage}`);
		this.treeDetail.setAttribute('turns', `${node.turns}`);
		this.treeDetail.setAttribute('unlocks-by-depth', node.unlocksByDepthString);
	}

	close() {
		super.close();
	}

	private refreshNavTray() {
		NavTray.addOrUpdateGenericBack();

		const canActivateItem: boolean = this.canActivateItem();
		if (canActivateItem) {
			NavTray.addOrUpdateAccept('LOC_UI_TREE_START_RESEARCH');
		} else {
			NavTray.addOrUpdateAccept('LOC_UI_TREE_START_SELECT');
		}
	}

	private canActivateItem(): boolean {
		if (this.selectedNode) {
			const nodeIndex: number = +(this.selectedNode);
			const args: Object = { ProgressionTreeNodeType: nodeIndex };
			const result: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.SET_TECH_TREE_NODE, args, false);
			if (result.Success) {
				return true;
			}
		}
		return false;
	}

	private onActivateTechlistItem() {
		if (this.selectedNode) {
			const localPlayer: PlayerLibrary | null = Players.get(GameContext.localPlayerID);

			// if a target exists, make this node the new target
			if (localPlayer) {
				const targetNode = localPlayer.Techs?.getTargetNode();
				if (targetNode != undefined && targetNode != ProgressionTreeNodeTypes.NO_NODE) {
					this.onTargetTechlistItem();
					return;
				}
			}

			const nodeIndex: number = +(this.selectedNode);
			const args = { ProgressionTreeNodeType: nodeIndex };
			const result: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.SET_TECH_TREE_NODE, args, false);
			if (result.Success) {
				Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.SET_TECH_TREE_NODE, args);
				//this.playSound('data-audio-activate', 'data-audio-activate-ref');
			}
		}
	}

	private onTargetTechlistItem() {
		if (this.selectedNode) {
			const nodeIndex: number = +(this.selectedNode);
			const args = { ProgressionTreeNodeType: nodeIndex };
			const result: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.SET_TECH_TREE_TARGET_NODE, args, false);
			if (result.Success) {
				// set the current research to the start of the path
				if (this.selectedNode != ProgressionTreeNodeTypes.NO_NODE) {
					const result: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.SET_TECH_TREE_NODE, args, false);
					if (result.Success) {
						Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.SET_TECH_TREE_NODE, args);
					}
				}

				Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.SET_TECH_TREE_TARGET_NODE, args);
			}
		}
	}

	private onActiveDeviceTypeChanged() {
		this.refreshNavTray();
		this.cleanPreviousSelectedNode();
		if (this.selectedNode) {
			this.updateTreeDetail(`${this.selectedNode}`, `${this.selectedLevel}`);
		}
	}

	private onCardActivate(event: CustomEvent<TreeCardActivatedEventDetail>) {
		const { type, level } = event.detail;

		if (ActionHandler.isTouchActive && TreeSupport.isSmallScreen()) {
			this.handleCardHover(type, level);
			this.refreshDetailsPanel(type, level);
			return;
		}
		this.handleCardActivate(type, level)
	}

	private handleCardActivate(type: string, level: string) {
		if (this.canActivateItem()) {
			this.onActivateTechlistItem();
		} else {
			this.onTargetTechlistItem();
		}

		// AUDIO: Get node name and send unique audio event
		if (this.selectedNode) {
			const card: TreeGridCard | undefined = TechTree.getCard(this.selectedNode.toString());
			if (card) {
				const node: ProgressionTreeNodeDefinition | null = GameInfo.ProgressionTreeNodes.lookup(card.nodeType);
				if (node) {
					UI.sendAudioEvent("tech-tree-activate-" + node.ProgressionTreeNodeType);
				} else {
					Audio.playSound("data-audio-tech-tree-activate", "audio-screen-tech-tree-chooser");
				}
			} else {
				Audio.playSound("data-audio-tech-tree-activate", "audio-screen-tech-tree-chooser");
			}
		}

		this.refreshDetailsPanel(type, level);
	}

	private onCardHover(event: CustomEvent<TreeCardHoveredEventDetail>) {
		this.handleCardHover(event.detail.type, event.detail.level);
	}

	private handleCardHover(type: string, level: string) {
		this.refreshDetailsPanel(type, level);

		if (this.selectedNode) {
			this.handleCardDehover();

			const nodeIndex: number = +(this.selectedNode);
			const highlightList = TechTree.hoverItems(nodeIndex);
			if (highlightList) {
				Audio.playSound("data-audio-queue-hover", "audio-screen-tech-tree")

				for (let index: number = 0; index < highlightList.length; index++) {
					const setElement: HTMLElement | null = this.Root.querySelector<HTMLElement>(`tree-card[type="${highlightList[index]}"]`);
					setElement?.classList.add("hoverqueued");
				}
			}
		} else {
			this.handleCardDehover();
		}
	}

	private onCardDehover(_event: CustomEvent<TreeCardDehoveredEventDetail>) {
		this.handleCardDehover();
	}

	private handleCardDehover() {
		const clearList = TechTree.clearHoverItems();

		if (clearList) {
			for (let index: number = 0; index < clearList.length; index++) {
				const clearElement: HTMLElement | null = this.Root.querySelector<HTMLElement>(`tree-card[type="${clearList[index]}"]`);
				clearElement?.classList.remove("hoverqueued");
			}
		}
	}

	private onStartResearchButtonActivate({ target }: ActionActivateEvent) {
		const nodeId = (target as HTMLElement).getAttribute('type') ?? "";
		const level = (target as HTMLElement).getAttribute('level') ?? "0";
		this.handleCardActivate(nodeId, level);
		(target as HTMLElement).classList.add("hidden");
	}
}

Controls.define('screen-tech-tree', {
	createInstance: ScreenTechTree,
	description: 'Grid screen for techs.',
	classNames: ['screen-tech-tree', 'screen-tree'],
	styles: ['fs://game/base-standard/ui/tree-grid/tree-components.css'],
	content: ['fs://game/base-standard/ui/tech-tree/screen-tech-tree.html']
});
