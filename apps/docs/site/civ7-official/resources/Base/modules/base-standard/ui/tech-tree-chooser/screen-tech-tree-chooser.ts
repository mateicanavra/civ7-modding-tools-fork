/**
 * @file screen-tech-tree-chooser.ts
 * @copyright 2021-2024, Firaxis Games
 * @description Select a tech immediate.  
 */

import TechTreeChooser from '/base-standard/ui/tech-tree-chooser/model-tech-tree-chooser.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { TreeChooserNode } from '/base-standard/ui/tree-chooser-item/model-tree-chooser-item.js';
import { TreeChooserItem } from '/base-standard/ui/tree-chooser-item/tree-chooser-item.js';
import { Focus } from '/core/ui/input/focus-support.js';

class ScreenTechTreeChooser extends Panel {
	private techItemListener: EventListener = (event: CustomEvent) => { this.onActivateTechListItem(event); }
	private gridButtonListener: EventListener = () => { this.onHotLinkToFullGrid(); };
	private engineInputListener: EventListener = (inputEvent: InputEngineEvent) => { this.onEngineInput(inputEvent); };

	private updateHandler = this.update.bind(this);

	private selectedNode?: ProgressionTreeNodeType;
	private selectedTreeType?: ProgressionTreeType;

	private techList: HTMLDivElement | null = null;
	private currentResearchDivider: HTMLDivElement | null = null;
	private headerAllAvailable: HTMLElement | null = null;
	private currentItems: HTMLElement[] = [];

	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.RelativeToLeft;
		this.inputContext = InputContext.Dual;
		this.enableOpenSound = true;
		this.enableCloseSound = true;
	}

	onInitialize(): void {
		this.render();
		if (ContextManager.hasInstanceOf("panel-radial-menu")) {
			ContextManager.pop("panel-radial-menu");
		}
	}

	onAttach() {
		super.onAttach();

		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);

		TechTreeChooser.subject.on(this.updateHandler);
	}

	render() {
		this.Root.setAttribute('data-tooltip-anchor', 'right');

		const subsystemPanel = MustGetElement("fxs-subsystem-frame", this.Root);
		subsystemPanel.setAttribute("data-audio-close-group-ref", "audio-screen-tech-tree-chooser");

		subsystemPanel.addEventListener('subsystem-frame-close', () => { this.requestClose(); });

		const techListTop = MustGetElement('.tech-tree-currently-studying', this.Root);
		this.techList = MustGetElement<HTMLDivElement>('.tech-tree-list', this.Root);

		const headerInProgress = document.createElement("fxs-header");
		headerInProgress.setAttribute("title", "LOC_UI_CURRENT_TECH_HEADER");
		headerInProgress.setAttribute("filigree-style", "none");
		headerInProgress.classList.add("text-accent-3", "uppercase", "mt-3\\.5", "font-title-base");
		techListTop.appendChild(headerInProgress);

		this.currentResearchDivider = document.createElement("div");
		this.currentResearchDivider.classList.add("filigree-divider-inner-frame");
		techListTop.appendChild(this.currentResearchDivider);

		this.headerAllAvailable = document.createElement("fxs-header");
		this.headerAllAvailable.setAttribute("title", "LOC_UI_TECH_AVAILABLE_HEADER");
		this.headerAllAvailable.setAttribute("filigree-style", "h4");
		this.headerAllAvailable.classList.add("text-secondary", "uppercase", "mt-4", "mb-2\\.5", "font-title-base", "w-96", "self-center");
		this.techList.appendChild(this.headerAllAvailable);

		const showTreeButton = document.createElement('fxs-hero-button');
		Databind.if(showTreeButton, `!{{g_NavTray.isTrayRequired}}`);
		showTreeButton.setAttribute("caption", "LOC_UI_TECH_VIEW_FULL_PROG_TREE");
		showTreeButton.classList.add("mx-8", "mt-3", "mb-6", "uppercase", "text-accent-2");
		showTreeButton.setAttribute('action-key', 'inline-shell-action-1');
		showTreeButton.setAttribute("data-audio-group-ref", "audio-screen-tech-tree-chooser");
		showTreeButton.setAttribute("data-audio-focus", "tech-tree-chooser-focus");
		showTreeButton.setAttribute("data-slot", "footer")
		showTreeButton.addEventListener('action-activate', this.gridButtonListener);
		subsystemPanel.appendChild(showTreeButton);
	}

	update() {
		for (const itemToRemove of this.currentItems) {
			itemToRemove.remove();
		}

		// In Progress
		if (TechTreeChooser.hasCurrentResearch) {
			for (const inProgreesNode of TechTreeChooser.inProgressNodes) {
				const inProgress = document.createElement("tree-chooser-item");
				this.createTechItem(inProgress, inProgreesNode);
				inProgress.classList.add("in-progress", "max-w-full");
				this.currentResearchDivider?.insertAdjacentElement('afterend', inProgress);
				this.currentItems.push(inProgress);
			}
		} else {
			const emptyInProgress: HTMLDivElement = document.createElement("div");
			emptyInProgress.classList.add("tech-current__empty", "font-body-sm", "text-accent-2");

			const emptyCaption = document.createElement("div");
			emptyCaption.innerHTML = TechTreeChooser.currentResearchEmptyTitle;
			emptyInProgress.appendChild(emptyCaption);
			this.currentResearchDivider?.insertAdjacentElement('afterend', emptyInProgress);
			this.currentItems.push(emptyInProgress);
		}

		// Available
		for (const node of TechTreeChooser.nodes) {
			const techItem = document.createElement("tree-chooser-item");
			this.createTechItem(techItem, node);
			this.headerAllAvailable?.insertAdjacentElement('afterend', techItem);
			this.currentItems.push(techItem);
		}
	}

	onDetach() {
		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
		TechTreeChooser.subject.off(this.updateHandler);
		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		const techList: HTMLDivElement = MustGetElement('.tech-tree-list', this.Root);

		Focus.setContextAwareFocus(techList, this.Root);

		NavTray.clear();
		NavTray.addOrUpdateGenericBack();
		NavTray.addOrUpdateGenericSelect();
		NavTray.addOrUpdateShellAction1("LOC_UI_TECH_VIEW_FULL_PROG_TREE");
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	private createTechItem(techItem: ComponentRoot<TreeChooserItem>, node: TreeChooserNode) {
		techItem.componentCreatedEvent.on((chooser) => chooser.treeChooserNode = node);

		techItem.setAttribute('data-tooltip-style', 'tech');
		techItem.addEventListener('action-activate', this.techItemListener);

		techItem.setAttribute("data-audio-group-ref", "audio-screen-tech-tree-chooser");
		techItem.setAttribute("data-audio-focus-ref", "data-audio-chooser-focus");
		techItem.setAttribute("data-tut-highlight", "techChooserHighlights");

		techItem.classList.add("tech-item", "my-1\\.25", "mx-5");
	}

	private openGridView() {
		if (!this.selectedTreeType) {
			this.selectedTreeType = TechTreeChooser.getDefaultTreeToDisplay();
		}
		// Update with the last default node everytime the grid is opened
		this.selectedNode = TechTreeChooser.getDefaultNodeToDisplay();
		this.openFullTechTree();
		this.updateTreeView();
	}

	private openFullTechTree() {
		const treeParent = document.querySelector(".fxs-trees") as HTMLElement || undefined;
		ContextManager.push("screen-tech-tree", { singleton: true, createMouseGuard: true, targetParent: treeParent });
		this.close();
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
			this.requestClose(inputEvent);
		} else if (inputEvent.detail.name == 'shell-action-1') {
			this.onHotLinkToFullGrid();

			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	close() {
		super.close();
	}

	private onActivateTechListItem(event: CustomEvent) {
		// If we clicked the more info button ... 
		if (event.target instanceof HTMLElement) {

			this.selectedNode = event.target.getAttribute('node-id') ?? "";
			this.selectedTreeType = event.target.getAttribute('node-tree-type') ?? "";

			this.confirmSelection();
		}
	}

	private confirmSelection() {
		if (this.selectedNode) {
			TechTreeChooser.chooseNode(this.selectedNode);

			const args = { ProgressionTreeNodeType: ProgressionTreeNodeTypes.NO_NODE };
			Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.SET_TECH_TREE_TARGET_NODE, args);

			this.close();
		}
	}

	private updateTreeView() {
		if (this.selectedTreeType) {
			window.dispatchEvent(new CustomEvent('view-tech-progression-tree', {
				detail: {
					treeCSV: this.selectedTreeType,
					targetNode: this.selectedNode,
					iconCallback: Icon.getTechIconFromProgressionTreeNodeDefinition
				}
			}));
		}
	}

	private onHotLinkToFullGrid() {
		this.openGridView();
	}
}

Controls.define('screen-tech-tree-chooser', {
	createInstance: ScreenTechTreeChooser,
	description: 'Quick picker list and info window for techs.',
	classNames: ['screen-tech-tree-chooser'],
	styles: ['fs://game/base-standard/ui/tech-tree-chooser/screen-tech-tree-chooser.css'],
	content: ['fs://game/base-standard/ui/tech-tree-chooser/screen-tech-tree-chooser.html']
});
