/**
 * @file screen-culture-tree.ts
 * @copyright 2024-2025, Firaxis Games
 * @description Full Culture Tree
 */
import { Audio } from '/core/ui/audio-base/audio-support.js';
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import CultureTree from '/base-standard/ui/culture-tree/model-culture-tree.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { TreeCardActivatedEventName, TreeCardHoveredEventName, TreeCardDehoveredEventName } from '/base-standard/ui/tree-grid/tree-card.js';
import { TreeSupport, TreeGridDirection } from '/base-standard/ui/tree-grid/tree-support.js';
import FocusManager from '/core/ui/input/focus-manager.js';
class ScreenCultureTree extends Panel {
    constructor(root) {
        super(root);
        this.isMobileViewExperience = UI.getViewExperience() == UIViewExperience.Mobile;
        this.viewCultureProgressionTreeListener = this.onViewProgressionTree.bind(this);
        this.engineInputListener = this.onEngineInput.bind(this);
        this.closeListener = this.close.bind(this);
        this.activeDeviceTypeListener = this.onActiveDeviceTypeChanged.bind(this);
        this.onCardActivateListener = this.onCardActivate.bind(this);
        this.onCardHoverListener = this.onCardHover.bind(this);
        this.onCardDehoverListener = this.onCardDehover.bind(this);
        this.startResearchButtonActivateListener = this.onStartResearchButtonActivate.bind(this);
        this.selectedNode = null;
        this.selectedLevel = 0;
        this.currentPanelIndex = 0;
        this.currentPanelID = "";
        this.panelContentElements = new Map();
        this.onTabSelected = (event) => {
            this.currentPanelIndex = event.detail.index;
            this.currentPanelID = event.detail.selectedItem.id;
            this.slotGroup.setAttribute("selected-slot", event.detail.selectedItem.id);
            const panelCategoryContainer = this.Root.querySelector('.culture-category-container-' + this.currentPanelID);
            if (!panelCategoryContainer) {
                console.warn("screen-culture-tree: onReceiveFocus(): No culture category container found, focus is not posible");
                return;
            }
            waitForLayout(() => FocusManager.setFocus(this.slotGroup));
            const panelRefs = this.panelContentElements.get(this.currentPanelIndex);
            if (panelRefs?.cardScaling) {
                panelRefs.cardScaling.checkBoundaries();
            }
            this.startResearchButton?.remove();
        };
        this.animateInType = this.animateOutType = AnchorType.RelativeToLeft;
        this.Root.setAttribute("data-audio-group-ref", "audio-screen-culture-tree-progression");
        this.enableOpenSound = true;
        this.enableCloseSound = true;
    }
    onAttach() {
        super.onAttach();
        window.addEventListener('view-culture-progression-tree', this.viewCultureProgressionTreeListener);
        window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
        this.frame = MustGetElement('fxs-subsystem-frame', this.Root);
        if (this.isMobileViewExperience) {
            this.frame.setAttribute("box-style", "fullscreen");
            this.frame.setAttribute("outside-safezone-mode", "full");
            waitForLayout(() => this.frame.classList.remove("pb-10"));
        }
        this.tabContainer = MustGetElement("#culture-tree-tab-container", this.Root);
        //Get the relevant gameplay data progression tree to fill in to the grid.
        const player = Players.get(GameContext.localPlayerID);
        if (player) {
            const availableCultureTree = player.Culture?.getAvailableTrees();
            if (availableCultureTree == undefined) {
                console.error("screen-culture-tree: onAttach(): Error getting progression trees");
            }
        }
        const closebutton = document.querySelector('.culture-tree-hex-grid-close');
        if (closebutton) {
            closebutton.addEventListener('action-activate', this.closeListener);
        }
        this.Root.addEventListener('engine-input', this.engineInputListener);
        this.frame.addEventListener('subsystem-frame-close', this.closeListener);
        CultureTree.updateGate.call('onAttach');
        engine.on('CultureTreeChanged', this.onCultureUpdated, this);
        engine.on('CultureTargetChanged', this.onCultureTargetUpdated, this);
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        waitForLayout(() => FocusManager.setFocus(this.slotGroup));
    }
    onCultureUpdated(data) {
        if (data.player && data.player != GameContext.localPlayerID) {
            //Not us, we don't need to update
            return;
        }
        CultureTree.updateGate.call("onCultureUpdated");
    }
    onCultureTargetUpdated(data) {
        if (data.player && data.player != GameContext.localPlayerID) {
            //Not us, we don't need to update
            return;
        }
        CultureTree.updateGate.call("onCultureUpdated");
    }
    onDetach() {
        window.removeEventListener('view-culture-progression-tree', this.viewCultureProgressionTreeListener);
        window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
        this.Root.removeEventListener('engine-input', this.engineInputListener);
        engine.off('CultureTreeChanged', this.onCultureUpdated, this);
        this.panelContentElements.forEach(entry => {
            if (entry.cardScaling) {
                entry.cardScaling.removeListeners();
            }
        });
        super.onDetach();
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
            this.close();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    onViewProgressionTree(event) {
        this.refreshProgressionTree(event.detail.treeCSV, event.detail.targetNode, event.detail.iconCallback);
    }
    refreshProgressionTree(treesCSV, targetNode, iconCallback) {
        CultureTree.sourceProgressionTrees = treesCSV;
        if (iconCallback) {
            CultureTree.iconCallback = iconCallback;
        }
        while (this.tabContainer.hasChildNodes()) {
            this.tabContainer.removeChild(this.tabContainer.lastChild);
        }
        const tabControl = this.createTabControl();
        this.tabContainer.appendChild(tabControl);
        if (targetNode) {
            this.refreshDetailsPanel(targetNode);
        }
    }
    /**
     * @returns: A tab control element configured with an array of tab configuration objects
    */
    createTabControl() {
        const configuration = this.getConfigurationTabArray();
        const attributeTabBar = document.createElement("fxs-tab-bar");
        attributeTabBar.classList.add("mx-16");
        attributeTabBar.setAttribute("tab-for", "fxs-subsystem-frame");
        attributeTabBar.setAttribute("tab-items", JSON.stringify(configuration));
        attributeTabBar.setAttribute("data-audio-group-ref", "audio-screen-culture-tree-chooser");
        attributeTabBar.setAttribute("data-audio-tab-selected", "unlocks-tab-select");
        attributeTabBar.addEventListener("tab-selected", this.onTabSelected);
        // Auto select the tab with the active tree
        if (CultureTree.activeTree) {
            attributeTabBar.setAttribute("selected-tab-index", `${configuration.findIndex(tab => tab.id == CultureTree.activeTree)}`);
        }
        this.slotGroup = document.createElement("fxs-slot-group");
        this.slotGroup.classList.add("flex", "flex-auto");
        const content = document.createElement("fxs-vslot");
        content.classList.add("flex-auto");
        content.appendChild(this.slotGroup);
        for (let i = 0; i < configuration.length; i++) {
            const configurationObj = configuration[i];
            const { root } = this.createPanelContent(i, configurationObj.id);
            this.slotGroup.appendChild(root);
        }
        const frag = document.createDocumentFragment();
        frag.appendChild(attributeTabBar);
        frag.appendChild(content);
        return frag;
    }
    createPanelContent(index, id) {
        let refs = this.panelContentElements.get(index);
        if (refs) {
            return refs;
        }
        const root = document.createElement("fxs-slot");
        root.classList.add("flex-auto", "items-center", "w-full", "relative", "pb-6", `culture-category-container-${id}`);
        root.setAttribute("id", id);
        const tree = `g_CultureTree.trees[${index}]`;
        const { scrollable, cardScaling } = TreeSupport.getGridElement(tree, TreeGridDirection.HORIZONTAL, this.createCard.bind(this));
        if (TreeSupport.isSmallScreen()) {
            scrollable.setAttribute('handle-gamepad-pan', 'false');
        }
        const cardDetailContainer = document.createElement("div");
        cardDetailContainer.classList.add(`card-detail-container`, "p-4", "pointer-events-none", "items-end", "w-96", "flex-col", "items-center", "max-h-full");
        cardDetailContainer.setAttribute('panel-id', id);
        cardDetailContainer.classList.toggle("max-w-128", this.isMobileViewExperience);
        cardDetailContainer.classList.toggle("w-96", !this.isMobileViewExperience);
        root.append(scrollable, cardDetailContainer);
        refs = { root, scrollable, cardDetailContainer, cardScaling };
        this.panelContentElements.set(index, refs);
        return refs;
    }
    createCard(container) {
        const cardElement = document.createElement("tree-card");
        Databind.if(cardElement, "card.hasData");
        Databind.attribute(cardElement, 'dummy', 'card.isDummy');
        Databind.attribute(cardElement, 'type', 'card.nodeType');
        Databind.attribute(cardElement, 'name', 'card.name');
        Databind.attribute(cardElement, 'progress', 'card.progressPercentage');
        Databind.attribute(cardElement, 'turns', 'card.turns');
        Databind.attribute(cardElement, 'unlocks-by-depth', 'card.unlocksByDepthString');
        Databind.attribute(cardElement, 'queue-order', 'card.queueOrder');
        cardElement.setAttribute('tree-type', 'culture');
        cardElement.setAttribute('tooltip-type', 'culture-tree');
        cardElement.setAttribute("data-audio-group-ref", "audio-screen-culture-tree-progression");
        cardElement.setAttribute("data-audio-activate-ref", "none");
        cardElement.setAttribute("data-audio-focus-ref", "data-audio-focus");
        Databind.classToggle(cardElement, 'locked', 'card.isLocked');
        Databind.classToggle(cardElement, 'queued', 'card.isQueued');
        cardElement.addEventListener(TreeCardHoveredEventName, this.onCardHoverListener);
        cardElement.addEventListener(TreeCardDehoveredEventName, this.onCardDehoverListener);
        cardElement.addEventListener(TreeCardActivatedEventName, this.onCardActivateListener);
        container.appendChild(cardElement);
    }
    /**
     * @returns: An array containing tab configuration object to create tabs in an easier way
    */
    getConfigurationTabArray() {
        const configuration = [];
        for (const tree of CultureTree.trees) {
            const definition = GameInfo.ProgressionTrees.lookup(tree.type);
            const name = definition?.Name ? `${Locale.compose(definition.Name)}` : `[WIP] Civic Tree`;
            configuration.push({
                id: tree.type.toString() || "no_type",
                label: name,
            });
        }
        return configuration;
    }
    refreshDetailsPanel(nodeId, level = "0") {
        this.selectedNode = nodeId;
        this.selectedLevel = +level;
        this.updateTreeDetail(nodeId, level);
        this.refreshNavTray();
    }
    updateTreeDetail(nodeId, level) {
        if (!TreeSupport.isSmallScreen()) {
            return;
        }
        const panelRefs = this.panelContentElements.get(this.currentPanelIndex);
        if (!panelRefs) {
            console.error("screen-attribute-tree: updateTreeDetail(): no panel content references found for current panel index", this.currentPanelIndex);
            return;
        }
        const { root, cardDetailContainer } = panelRefs;
        if (!this.treeDetail) {
            this.treeDetail = document.createElement("tree-detail");
            this.treeDetail.classList.add("max-w-full");
        }
        if (!cardDetailContainer.contains(this.treeDetail)) {
            cardDetailContainer.appendChild(this.treeDetail);
            // The tree detail scrollable never receives focus directly, so we need to make the scrollable listen for engine input
            // at the root of the panel content
            waitForLayout(() => {
                const treeDetailScrollable = this.treeDetail?.maybeComponent?.scrollable?.maybeComponent;
                treeDetailScrollable?.setEngineInputProxy(root);
            });
        }
        if (!this.startResearchButton || !cardDetailContainer.contains(this.startResearchButton)) {
            this.startResearchButton = document.createElement("fxs-button");
            this.startResearchButton.classList.add("mt-6");
            this.startResearchButton.setAttribute('caption', 'LOC_UI_TREE_START_RESEARCH');
            this.startResearchButton.addEventListener('action-activate', this.startResearchButtonActivateListener);
            cardDetailContainer.appendChild(this.startResearchButton);
        }
        const node = CultureTree.getCard(nodeId);
        if (node == undefined) {
            console.error("screen-culture-tree: updateTreeDetail(): Node with id " + nodeId + " couldn't be found on the grid data");
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
    refreshNavTray() {
        NavTray.addOrUpdateGenericBack();
        const canActivateItem = this.canActivateItem();
        if (canActivateItem) {
            NavTray.addOrUpdateAccept('LOC_UI_TREE_START_RESEARCH');
        }
        else {
            NavTray.addOrUpdateAccept('LOC_UI_TREE_START_SELECT');
        }
    }
    canActivateItem() {
        if (this.selectedNode) {
            const nodeIndex = +(this.selectedNode);
            const args = { ProgressionTreeNodeType: nodeIndex };
            const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.SET_CULTURE_TREE_NODE, args, false);
            if (result.Success) {
                return true;
            }
        }
        return false;
    }
    onActivateCulturelistItem() {
        if (this.selectedNode) {
            const localPlayer = Players.get(GameContext.localPlayerID);
            // if a target exists, make this node the new target
            if (localPlayer) {
                const targetNode = localPlayer.Culture?.getTargetNode();
                if (targetNode != undefined && targetNode != ProgressionTreeNodeTypes.NO_NODE) {
                    this.onTargetCulturelistItem();
                    return;
                }
            }
            const nodeIndex = +(this.selectedNode);
            const args = { ProgressionTreeNodeType: nodeIndex };
            const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.SET_CULTURE_TREE_NODE, args, false);
            if (result.Success) {
                Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.SET_CULTURE_TREE_NODE, args);
            }
            else {
                this.playSound('data-audio-negative', 'data-audio-negative-ref');
            }
        }
    }
    onTargetCulturelistItem() {
        if (this.selectedNode) {
            const nodeIndex = +(this.selectedNode);
            const args = { ProgressionTreeNodeType: nodeIndex };
            const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.SET_CULTURE_TREE_TARGET_NODE, args, false);
            if (result.Success) {
                // set the current research to the start of the path
                if (this.selectedNode != ProgressionTreeNodeTypes.NO_NODE) {
                    const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.SET_CULTURE_TREE_NODE, args, false);
                    if (result.Success) {
                        Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.SET_CULTURE_TREE_NODE, args);
                    }
                }
                Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.SET_CULTURE_TREE_TARGET_NODE, args);
            }
            else {
                this.playSound('data-audio-negative', 'data-audio-negative-ref');
            }
        }
    }
    onActiveDeviceTypeChanged() {
        this.refreshNavTray();
        if (this.selectedNode) {
            this.updateTreeDetail(`${this.selectedNode}`, `${this.selectedLevel}`);
        }
    }
    onCardActivate(event) {
        const { type, level } = event.detail;
        if (ActionHandler.isTouchActive && TreeSupport.isSmallScreen()) {
            this.handleCardHover(type, level);
            this.refreshDetailsPanel(type, level);
            return;
        }
        this.handleCardActivate(type, level);
    }
    handleCardActivate(type, level) {
        if (this.canActivateItem()) {
            this.onActivateCulturelistItem();
        }
        else {
            this.onTargetCulturelistItem();
        }
        // AUDIO: Get node name and send unique audio event
        if (this.selectedNode) {
            const card = CultureTree.getCard(this.selectedNode.toString());
            if (card) {
                const node = GameInfo.ProgressionTreeNodes.lookup(card.nodeType);
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
        this.refreshDetailsPanel(type, level);
    }
    onCardHover(event) {
        this.handleCardHover(event.detail.type, event.detail.level);
    }
    handleCardHover(type, level) {
        this.refreshDetailsPanel(type, level);
        if (this.selectedNode) {
            this.handleCardDehover();
            const nodeIndex = +(this.selectedNode);
            const highlightList = CultureTree.hoverItems(nodeIndex);
            if (highlightList) {
                Audio.playSound("data-audio-queue-hover", "audio-screen-culture-tree-progression");
                for (let index = 0; index < highlightList.length; index++) {
                    const setElement = this.Root.querySelector(`tree-card[type="${highlightList[index]}"]`);
                    setElement?.classList.add("hoverqueued");
                }
            }
        }
        else {
            this.handleCardDehover();
        }
    }
    onCardDehover(_event) {
        this.handleCardDehover();
    }
    handleCardDehover() {
        const clearList = CultureTree.clearHoverItems();
        if (clearList) {
            for (let index = 0; index < clearList.length; index++) {
                const clearElement = this.Root.querySelector(`tree-card[type="${clearList[index]}"]`);
                clearElement?.classList.remove("hoverqueued");
            }
        }
    }
    onStartResearchButtonActivate({ target }) {
        const nodeId = target.getAttribute('type') ?? "";
        const level = target.getAttribute('level') ?? "0";
        this.handleCardActivate(nodeId, level);
        target.classList.add("hidden");
    }
}
Controls.define('screen-culture-tree', {
    createInstance: ScreenCultureTree,
    description: 'Grid picker list and info window for civics.',
    classNames: ['screen-culture-tree', 'screen-tree'],
    styles: ['fs://game/base-standard/ui/tree-grid/tree-components.css'],
    content: ['fs://game/base-standard/ui/culture-tree/screen-culture-tree.html']
});

//# sourceMappingURL=file:///base-standard/ui/culture-tree/screen-culture-tree.js.map
