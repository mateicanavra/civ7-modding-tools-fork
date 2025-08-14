/**
 * @file screen-culture-tree-chooser.ts		// TODO: Rename file without "tree" in it
 * @copyright 2021-2024, Firaxis Games
 * @description Quick selection of culture item
 */
import CultureTreeChooser from '/base-standard/ui/culture-tree-chooser/model-culture-tree-chooser.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { InputEngineEventName } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { Focus } from '/core/ui/input/focus-support.js';
/**
 * Quick menu with info version to choose next research culture.
 */
class ScreenCultureTreeChooser extends Panel {
    constructor(root) {
        super(root);
        this.cultureItemListener = (event) => { this.onActivateCultureListItem(event); };
        this.treeRevealItemListener = (event) => { this.onTreeProgressListItem(event); };
        this.expandCollapseListener = this.onToggleExpandCollapse.bind(this);
        this.gridButtonListener = () => { this.onHotLinkToFullGrid(); };
        this.engineInputListener = (inputEvent) => { this.onEngineInput(inputEvent); };
        this.updateHandler = this.update.bind(this);
        this.cultureList = null;
        this.currentResearchDivider = null;
        this.headerAllAvailable = null;
        this.headerTreeProgressContainer = null;
        this.currentItems = [];
        this.animateInType = this.animateOutType = AnchorType.RelativeToLeft;
        this.inputContext = InputContext.Dual;
        this.enableOpenSound = true;
        this.enableCloseSound = true;
    }
    onInitialize() {
        super.onInitialize();
        this.render();
        if (ContextManager.hasInstanceOf("panel-radial-menu")) {
            ContextManager.pop("panel-radial-menu");
        }
    }
    onAttach() {
        super.onAttach();
        this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
        this.updateExpandCollapse();
        CultureTreeChooser.subject.on(this.updateHandler);
    }
    render() {
        this.Root.setAttribute('data-tooltip-anchor', 'right');
        const subsystemPanel = MustGetElement("fxs-subsystem-frame", this.Root);
        subsystemPanel.addEventListener('subsystem-frame-close', () => { this.requestClose(); });
        const cultureListTop = MustGetElement('.culture-tree-currently-studying', this.Root);
        this.cultureList = MustGetElement('.culture-tree-list', this.Root);
        this.cultureList.setAttribute('disable-focus-allowed', "true");
        const headerInProgress = document.createElement("fxs-header");
        headerInProgress.setAttribute("title", "LOC_UI_CURRENT_STUDY");
        headerInProgress.setAttribute("filigree-style", "none");
        headerInProgress.classList.add("text-accent-3", "uppercase", "mt-3\\.5", "font-title-sm");
        cultureListTop.appendChild(headerInProgress);
        this.currentResearchDivider = document.createElement("div");
        this.currentResearchDivider.classList.add("filigree-divider-inner-frame");
        cultureListTop.appendChild(this.currentResearchDivider);
        this.headerAllAvailable = document.createElement("fxs-header");
        this.headerAllAvailable.setAttribute("title", "LOC_UI_CULTURE_CHOOSE_CIVIC_HEADER");
        this.headerAllAvailable.setAttribute("filigree-style", "h4");
        this.headerAllAvailable.classList.add("text-secondary", "uppercase", "mt-4", "mb-2\\.5", "font-title-base");
        this.cultureList.appendChild(this.headerAllAvailable);
        this.headerTreeProgressContainer = document.createElement("div");
        this.headerTreeProgressContainer.classList.add("flex", "flex-row", 'items-center', "justify-center", "hidden");
        this.cultureList.appendChild(this.headerTreeProgressContainer);
        const headerTreeProgress = document.createElement("fxs-header");
        headerTreeProgress.setAttribute("title", "LOC_UI_CULTURE_TREE_LOCKED_CIVICS");
        headerTreeProgress.setAttribute("filigree-style", "h4");
        headerTreeProgress.classList.add("text-secondary", "uppercase", "mt-4", "mb-2\\.5", "relative", "font-title-base");
        this.headerTreeProgressContainer.appendChild(headerTreeProgress);
        const headerTreeExpandButton = document.createElement("fxs-activatable");
        headerTreeExpandButton.classList.add("screen-culture-tree-chooser__tree-expand-button");
        headerTreeExpandButton.addEventListener('action-activate', this.expandCollapseListener);
        headerTreeExpandButton.setAttribute('tabindex', "-1");
        this.headerTreeProgressContainer.appendChild(headerTreeExpandButton);
        const showTreeButton = document.createElement('fxs-hero-button');
        Databind.if(showTreeButton, `!{{g_NavTray.isTrayRequired}}`);
        showTreeButton.setAttribute("caption", "LOC_UI_CULTURE_TREE_VIEW_FULL_TREE_BUTTON");
        showTreeButton.classList.add("mx-8", "mt-3", "mb-6", "uppercase", "text-accent-2");
        showTreeButton.setAttribute('action-key', 'inline-shell-action-1');
        showTreeButton.setAttribute("data-slot", "footer");
        showTreeButton.addEventListener('action-activate', this.gridButtonListener);
        subsystemPanel.appendChild(showTreeButton);
    }
    update() {
        for (const itemToRemove of this.currentItems) {
            itemToRemove.remove();
        }
        // In Progress
        if (CultureTreeChooser.hasCurrentResearch) {
            for (const inProgreesNode of CultureTreeChooser.inProgressNodes) {
                const inProgress = document.createElement("tree-chooser-item");
                this.createCultureItem(inProgress, inProgreesNode);
                inProgress.classList.add("in-progress", "max-w-full");
                this.currentResearchDivider?.insertAdjacentElement('afterend', inProgress);
                this.currentItems.push(inProgress);
            }
        }
        else {
            const emptyInProgress = document.createElement("div");
            emptyInProgress.classList.add("culture-current__empty", "font-body-sm", "text-accent-2");
            const emptyCaption = document.createElement("div");
            emptyCaption.innerHTML = CultureTreeChooser.currentResearchEmptyTitle;
            emptyInProgress.appendChild(emptyCaption);
            this.currentResearchDivider?.insertAdjacentElement('afterend', emptyInProgress);
            this.currentItems.push(emptyInProgress);
        }
        // Available
        for (const node of CultureTreeChooser.nodes) {
            const cultureItem = document.createElement("tree-chooser-item");
            this.createCultureItem(cultureItem, node);
            this.headerAllAvailable?.insertAdjacentElement('afterend', cultureItem);
            this.currentItems.push(cultureItem);
        }
        // Locked
        if (CultureTreeChooser.shouldShowTreeRevealHeader) {
            this.headerTreeProgressContainer?.classList.remove("hidden");
        }
        else {
            this.headerTreeProgressContainer?.classList.add("hidden");
        }
        for (const lockedNode of CultureTreeChooser.treeRevealData) {
            const lockedItem = document.createElement("tree-chooser-item");
            this.createCultureItem(lockedItem, lockedNode);
            this.headerTreeProgressContainer?.insertAdjacentElement('afterend', lockedItem);
            this.currentItems.push(lockedItem);
        }
    }
    onDetach() {
        this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
        CultureTreeChooser.subject.off(this.updateHandler);
        super.onDetach();
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        const cultureList = MustGetElement('.culture-tree-list', this.Root);
        Focus.setContextAwareFocus(cultureList, this.Root);
        NavTray.clear();
        NavTray.addOrUpdateGenericBack();
        NavTray.addOrUpdateGenericSelect();
        NavTray.addOrUpdateShellAction1("LOC_UI_CULTURE_TREE_VIEW_FULL_TREE_BUTTON");
    }
    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
    }
    createCultureItem(cultureItem, node) {
        cultureItem.componentCreatedEvent.on((chooser) => chooser.treeChooserNode = node);
        cultureItem.classList.add("culture-item", "my-1\\.25", "mx-5");
        if (node.isLocked) {
            cultureItem.classList.add("locked-item");
            cultureItem.addEventListener('action-activate', this.treeRevealItemListener);
            cultureItem.setAttribute("disabled", "true");
        }
        else {
            cultureItem.setAttribute('data-tooltip-style', 'culture');
            cultureItem.addEventListener('action-activate', this.cultureItemListener);
        }
        cultureItem.setAttribute("data-audio-group-ref", "audio-screen-culture-tree-chooser");
        cultureItem.setAttribute("data-audio-activate-ref", "data-audio-culture-tree-activate");
        cultureItem.setAttribute("data-audio-focus-ref", "data-audio-chooser-focus");
    }
    onToggleExpandCollapse() {
        CultureTreeChooser.showLockedCivics = !CultureTreeChooser.showLockedCivics;
        this.updateExpandCollapse();
    }
    updateExpandCollapse() {
        if (CultureTreeChooser.showLockedCivics) {
            this.Root.classList.add("expanded");
            this.Root.classList.remove("collapsed");
        }
        else {
            this.Root.classList.add("collapsed");
            this.Root.classList.remove("expanded");
        }
    }
    openGridView() {
        if (!this.selectedTreeType) {
            this.selectedTreeType = CultureTreeChooser.getDefaultTreeToDisplay();
        }
        if (!this.availableTreeTypes) {
            const allTreeTypes = CultureTreeChooser.getAllTreesToDisplay();
            if (allTreeTypes) {
                const allTreeTypesCSV = allTreeTypes.join(',');
                this.availableTreeTypes = allTreeTypesCSV;
            }
        }
        // Update with the last default node everytime the grid is opened
        this.selectedNode = CultureTreeChooser.getDefaultNodeToDisplay();
        this.openFullCultureTree();
        this.updateTreeView();
    }
    openFullCultureTree() {
        const treeParent = document.querySelector(".fxs-trees") || undefined;
        ContextManager.push("screen-culture-tree", { singleton: true, createMouseGuard: true, targetParent: treeParent });
        this.close();
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
            this.requestClose(inputEvent);
        }
        else if (inputEvent.detail.name == 'shell-action-1') {
            this.onHotLinkToFullGrid();
            inputEvent.preventDefault();
            inputEvent.stopPropagation();
        }
    }
    onActivateCultureListItem(event) {
        // If we clicked the more info button ... 
        if (event.target instanceof HTMLElement) {
            this.selectedNode = event.target.getAttribute('node-id') ?? "";
            this.selectedTreeType = event.target.getAttribute('node-tree-type') ?? "";
            this.confirmSelection();
        }
    }
    confirmSelection() {
        if (CultureTreeChooser.isExpanded) {
            this.updateTreeView();
        }
        else if (this.selectedNode) {
            CultureTreeChooser.chooseNode(this.selectedNode);
            const args = { ProgressionTreeNodeType: ProgressionTreeNodeTypes.NO_NODE };
            Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.SET_CULTURE_TREE_TARGET_NODE, args);
            this.close();
        }
    }
    updateTreeView() {
        if (this.availableTreeTypes) {
            window.dispatchEvent(new CustomEvent('view-culture-progression-tree', {
                detail: {
                    treeCSV: this.availableTreeTypes,
                    targetNode: this.selectedNode,
                    iconCallback: Icon.getCultureIconFromProgressionTreeNodeDefinition
                }
            }));
        }
    }
    onHotLinkToFullGrid() {
        this.openGridView();
    }
    onTreeProgressListItem(event) {
        if (event.target instanceof HTMLElement) {
            this.playSound('data-audio-activate', 'data-audio-activate-ref');
            event.stopPropagation();
            event.preventDefault();
            const targetTree = event.target.getAttribute('node-tree-type') ?? "";
            window.dispatchEvent(new CustomEvent('view-culture-progression-tree', {
                detail: {
                    treeCSV: targetTree,
                    targetNode: null,
                    iconCallback: Icon.getCultureIconFromProgressionTreeNodeDefinition
                }
            }));
        }
    }
}
Controls.define('screen-culture-tree-chooser', {
    createInstance: ScreenCultureTreeChooser,
    description: 'Quick picker list and info window for cultures.',
    classNames: ['screen-culture-tree-chooser'],
    styles: ['fs://game/base-standard/ui/culture-tree-chooser/screen-culture-tree-chooser.css'],
    content: ['fs://game/base-standard/ui/culture-tree-chooser/screen-culture-tree-chooser.html'],
    images: ['fs://game/hud_quest_open.png', 'fs://game/hud_quest_close.png']
});

//# sourceMappingURL=file:///base-standard/ui/culture-tree-chooser/screen-culture-tree-chooser.js.map
