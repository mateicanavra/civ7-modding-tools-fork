/**
 * @file screen-attribute-trees.ts
 * @copyright 2021 - 2024, Firaxis Games
 * @description Shows a player's Attribute stats and points, and lets them spend points on Attribute skills
 */
import AttributeTrees from '/base-standard/ui/attribute-trees/model-attribute-trees.js';
import { InputEngineEventName } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { TreeSupport, UpdateLinesEvent, TreeGridDirection } from '/base-standard/ui/tree-grid/tree-support.js';
import { TreeCardHoveredEventName } from '/base-standard/ui/tree-grid/tree-card.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
class ScreenIdentity extends Panel {
    constructor() {
        super(...arguments);
        this.currentPanelIndex = 0;
        this.currentPanelID = "";
        this.closeButtonListener = () => { this.close(); };
        this.engineInputListener = (inputEvent) => { this.onEngineInput(inputEvent); };
        this.resizeListener = this.onResize.bind(this);
        this.onCardHoverListener = this.onCardHover.bind(this);
        this.confirmButtonActivateListener = this.onConfirmButtonActivate.bind(this);
        this.activeDeviceTypeChangedListener = this.onActiveDeviceTypeChanged.bind(this);
        this.attributeTabBar = document.createElement("fxs-tab-bar");
        this.isMobileViewExperience = UI.getViewExperience() == UIViewExperience.Mobile;
        this.panelContentElements = new Map();
        this.onTabBarSelected = (event) => {
            this.currentPanelIndex = event.detail.index;
            this.currentPanelID = event.detail.selectedItem.id;
            this.confirmButton?.remove();
            this.ensurePanelContent(this.currentPanelIndex, this.currentPanelID);
            this.refreshDetailsPanel(AttributeTrees.getFirstAvailable(this.currentPanelID));
            this.attributeSlotGroup.setAttribute("selected-slot", event.detail.selectedItem.id);
            this.updateLines();
        };
    }
    get treeDetail() {
        return this._treeDetail ?? (this._treeDetail = document.createElement("tree-detail"));
    }
    onInitialize() {
        super.onInitialize();
        this.enableOpenSound = true;
        this.enableCloseSound = true;
        this.Root.setAttribute("data-audio-group-ref", "audio-diplo-project-reaction");
    }
    onAttach() {
        super.onAttach();
        this.frame = MustGetElement('#attribute-trees-frame', this.Root);
        this.frame.setAttribute("box-style", TreeSupport.isSmallScreen() ? "fullscreen" : "b1");
        if (this.isMobileViewExperience) {
            this.frame.setAttribute("box-style", "fullscreen");
            this.frame.setAttribute("outside-safezone-mode", "full");
        }
        this.tabContainerElement = MustGetElement('#attribute-tab-container', this.Root);
        this.header = MustGetElement(".attribute-trees__header", this.Root);
        this.header.setAttribute("filigree-style", TreeSupport.isSmallScreen() ? "none" : "h3");
        const tabControl = this.createTabControl();
        this.tabContainerElement.appendChild(tabControl);
        this.frame.addEventListener('subsystem-frame-close', this.closeButtonListener);
        this.Root.listenForWindowEvent(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeChangedListener);
        window.addEventListener(InputEngineEventName, this.engineInputListener);
        window.addEventListener('resize', this.resizeListener);
        engine.on('AttributePointsChanged', this.refreshAll, this);
        engine.on('AttributeNodeCompleted', this.refreshAll, this);
        this.refreshAll();
    }
    onDetach() {
        engine.off('AttributePointsChanged', this.refreshAll, this);
        engine.off('AttributeNodeCompleted', this.refreshAll, this);
        window.removeEventListener('resize', this.resizeListener);
        window.removeEventListener(InputEngineEventName, this.engineInputListener);
        this.frame.removeEventListener('subsystem-frame-close', this.closeButtonListener);
        super.onDetach();
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        waitForLayout(() => FocusManager.setFocus(this.attributeSlotGroup));
        NavTray.clear();
        NavTray.addOrUpdateGenericBack();
    }
    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
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
    refreshAll() {
        AttributeTrees.updateGate.call("refreshAll");
        // wait until all values are displayed
        waitForLayout(() => this.updateTabControl());
    }
    /**
     * @returns: A tab control element configured with an array of tab configuration objects
    */
    createTabControl() {
        const configuration = this.getConfigurationTabArray();
        const attributeTabContainer = document.createElement("div");
        attributeTabContainer.classList.add("px-10", "flex", "flex-auto", "justify-center");
        this.attributeTabBar.setAttribute("tab-for", "fxs-subsystem-frame");
        this.attributeTabBar.setAttribute("tab-items", JSON.stringify(configuration));
        this.attributeTabBar.setAttribute("data-audio-focus-ref", "none");
        this.attributeTabBar.classList.add("w-full");
        this.attributeTabBar.addEventListener("tab-selected", this.onTabBarSelected);
        this.attributeSlotGroup = document.createElement("fxs-slot-group");
        this.attributeSlotGroup.classList.add("flex", "flex-auto");
        const content = document.createElement("div");
        content.classList.add("flex-auto", "flex", "flex-col");
        content.appendChild(this.attributeSlotGroup);
        this.ensurePanelContent(0, configuration[0].id);
        const frag = document.createDocumentFragment();
        attributeTabContainer.appendChild(this.attributeTabBar);
        frag.appendChild(attributeTabContainer);
        frag.appendChild(content);
        return frag;
    }
    ensurePanelContent(index, id) {
        if (!this.panelContentElements.has(index)) {
            const panelCategoryContainer = document.createElement("fxs-slot");
            panelCategoryContainer.classList.add("flex-auto", "items-center", "flex-col", "w-full", "relative");
            panelCategoryContainer.setAttribute("tabindex", "-1");
            panelCategoryContainer.setAttribute("id", id);
            panelCategoryContainer.setAttribute("disable-focus-allowed", "true");
            this.createPanelContent(panelCategoryContainer, index, id);
            this.attributeSlotGroup.appendChild(panelCategoryContainer);
        }
        else {
            const cardDetailContainer = this.panelContentElements.get(index)?.cardDetailContainer;
            cardDetailContainer?.classList.toggle("flex", TreeSupport.isSmallScreen());
            cardDetailContainer?.classList.toggle("hidden", !TreeSupport.isSmallScreen());
        }
    }
    updateTabControl() {
        const configuration = this.getConfigurationTabArray();
        const currentPanelIndex = this.currentPanelIndex;
        this.attributeTabBar.setAttribute("tab-items", JSON.stringify(configuration));
        this.attributeTabBar.setAttribute("selected-tab-index", currentPanelIndex.toString());
    }
    /**
     * @returns: An array containing tab configuration object to create tabs in an easier way
    */
    getConfigurationTabArray() {
        const configuration = [];
        for (const a of AttributeTrees.attributes) {
            const definition = GameInfo.Attributes.lookup(a.type);
            const iconURL = UI.getIconURL(a.type.toString());
            const hasTree = a.treeGrid != undefined;
            if (!definition) {
                console.warn("screen-attribute-trees: getConfigurationTabArray(): No definition for attribute: " + a.type);
                continue;
            }
            if (!hasTree) {
                console.warn("screen-attribute-trees: getConfigurationTabArray(): No tree definition for attribute: " + a.type);
                continue;
            }
            const name = Locale.compose(definition.Name || "LOC_UI_ATTRIBUTE_TREES_TITLE");
            configuration.push({
                id: definition?.AttributeType || "no_type",
                label: `${TreeSupport.isSmallScreen() ? "" : name} ${a.availablePoints}`,
                className: "mx-4",
                nowrap: true,
                icon: iconURL,
                iconClass: "size-8 mr-2"
            });
        }
        return configuration;
    }
    updateLines() {
        const panelContent = this.panelContentElements.get(this.currentPanelIndex);
        const linesContainer = panelContent?.root?.querySelector('.lines-container');
        if (!linesContainer) {
            console.warn("updateCardLines(): No lines container to update lines from");
            return;
        }
        linesContainer.querySelectorAll('tree-line')?.forEach(c => {
            c.dispatchEvent(new UpdateLinesEvent());
        });
    }
    createPanelContent(container, index, id) {
        const attribute = `g_AttributeTrees.attributes[${index}]`;
        const wildcardElement = document.createElement('div');
        wildcardElement.classList.add("my-5", "font-body", "text-base");
        Databind.html(wildcardElement, `${attribute}.wildCardLabel`);
        const treeContent = document.createElement('div');
        treeContent.classList.add("flex", "flex-auto", "flex-col", "items-center", "w-full");
        treeContent.classList.toggle("mb-4", !TreeSupport.isSmallScreen());
        const treeDetails = document.createElement('div');
        treeDetails.classList.add("flex", "flex-auto", "w-full");
        const { scrollable, } = TreeSupport.getGridElement(attribute, TreeGridDirection.VERTICAL, this.createCard.bind(this));
        if (TreeSupport.isSmallScreen()) {
            scrollable.setAttribute('handle-gamepad-pan', 'false');
        }
        const cardDetailContainer = document.createElement("div");
        cardDetailContainer.classList.add("screen-attribute__card-container", "ml-5", "mr-2", "pointer-events-none", "items-center", "w-96", "flex", "flex-col");
        cardDetailContainer.classList.toggle("flex", TreeSupport.isSmallScreen());
        cardDetailContainer.classList.toggle("hidden", !TreeSupport.isSmallScreen());
        cardDetailContainer.classList.toggle("w-128", this.isMobileViewExperience);
        cardDetailContainer.classList.toggle("w-96", !this.isMobileViewExperience);
        cardDetailContainer.setAttribute('panel-id', id);
        treeDetails.append(scrollable, cardDetailContainer);
        treeContent.append(wildcardElement, treeDetails);
        this.panelContentElements.set(index, {
            root: treeContent,
            scrollable,
            cardDetailContainer,
            cardScaling: null
        });
        container.appendChild(treeContent);
    }
    createCard(container) {
        const cardElement = document.createElement("attribute-card");
        cardElement.classList.add("mx-6");
        Databind.if(cardElement, "card.isContent");
        Databind.attribute(cardElement, 'dummy', 'card.isDummy');
        Databind.attribute(cardElement, 'type', 'card.nodeType');
        Databind.attribute(cardElement, "name", "card.name");
        Databind.classToggle(cardElement, "opacity-40", "card.isLocked");
        Databind.attribute(cardElement, "locked", "card.isLocked");
        Databind.attribute(cardElement, "completed", "card.isCompleted");
        Databind.attribute(cardElement, "repeatable", "card.isRepeatable");
        Databind.attribute(cardElement, "repeated", "card.repeatedDepth");
        Databind.attribute(cardElement, "icon", "card.icon");
        Databind.attribute(cardElement, "locked-reason", "card.lockedReason");
        Databind.classToggle(cardElement, "attribute-card--repeatable", "card.isRepeatable");
        Databind.classToggle(cardElement, "attribute-card--complete", "card.isCompleted");
        Databind.classToggle(cardElement, "attribute-card--in-progress", "card.isCurrentlyActive");
        Databind.classToggle(cardElement, "available", "card.isAvailable");
        cardElement.setAttribute("data-audio-group-ref", this.getAudioGroupForCard());
        cardElement.addEventListener(TreeCardHoveredEventName, this.onCardHoverListener);
        container.appendChild(cardElement);
    }
    getAudioGroupForCard() {
        switch (this.currentPanelIndex) {
            case (0):
                return "attribute-card-cultural";
            case (1):
                return "attribute-card-diplomatic";
            case (2):
                return "attribute-card-economic";
            case (3):
                return "attribute-card-expansionist";
            case (4):
                return "attribute-card-militaristic";
            case (5):
                return "attribute-card-scientific";
            default:
                return "attribute-card-generic";
        }
    }
    refreshDetailsPanel(nodeId, level = "0") {
        const node = AttributeTrees.getCard(nodeId);
        if (node == undefined) {
            console.error("screen-attribute-tree: refreshDetailsPanel(): Node with id " + nodeId + " couldn't be found on the grid data");
            return;
        }
        const prevElement = this.Root.querySelector(`attribute-card[type="${this.selectedNode}"]`);
        prevElement?.classList.remove("selected");
        this.selectedNode = nodeId;
        this.updateTreeDetail(nodeId, level);
        const selectedElement = this.Root.querySelector(`attribute-card[type="${this.selectedNode}"]`);
        selectedElement?.classList.add("selected");
        const canActivateItem = this.selectedNode ? AttributeTrees.canBuyAttributeTreeNode(this.selectedNode) : false;
        selectedElement?.setAttribute("play-error-sound", (!canActivateItem).toString());
        this.refreshNavTray(canActivateItem);
    }
    updateTreeDetail(nodeId, level) {
        if (!TreeSupport.isSmallScreen()) {
            return;
        }
        const panelContent = this.panelContentElements.get(this.currentPanelIndex);
        if (!panelContent) {
            console.error("screen-attribute-tree: refreshDetailsPanel(): could not get panelContent for currentPanelIndex: " + this.currentPanelIndex);
            return;
        }
        const { root, cardDetailContainer } = panelContent;
        if (!cardDetailContainer.contains(this.treeDetail)) {
            cardDetailContainer.appendChild(this.treeDetail);
            // The tree detail scrollable never receives focus directly, so we need to make the scrollable listen for engine input
            // at the root of the panel content
            waitForLayout(() => {
                const treeDetailScrollable = this.treeDetail.maybeComponent?.scrollable?.maybeComponent;
                treeDetailScrollable?.setEngineInputProxy(root);
            });
        }
        if (!this.confirmButton || !cardDetailContainer.contains(this.confirmButton)) {
            this.confirmButton = document.createElement("fxs-button");
            this.confirmButton.classList.add("mt-4", "self-center");
            this.confirmButton.setAttribute('caption', 'LOC_OPTIONS_CONFIRM');
            this.confirmButton.addEventListener('action-activate', this.confirmButtonActivateListener);
            cardDetailContainer.appendChild(this.confirmButton);
        }
        const node = AttributeTrees.getCard(nodeId);
        if (node == undefined) {
            console.error("screen-attribute-tree: refreshDetailsPanel(): Node with id " + nodeId + " couldn't be found on the grid data");
            return;
        }
        const wildcardPoints = Players.get(GameContext.localPlayerID)?.Identity?.getWildcardPoints() ?? 0;
        const availablePoints = AttributeTrees.attributes[this.currentPanelIndex].availablePoints;
        const { isCompleted, isCurrent, isLocked } = node.unlocksByDepth?.[+level] ?? {};
        this.confirmButton?.classList.toggle("hidden", (!availablePoints && !wildcardPoints) || isCompleted || isCurrent || isLocked || !ActionHandler.isTouchActive || ActionHandler.isGamepadActive);
        this.confirmButton?.setAttribute('type', nodeId);
        this.confirmButton?.setAttribute('level', level);
        const definition = GameInfo.Attributes.lookup(this.currentPanelID);
        this.treeDetail.setAttribute('detailed', "true");
        this.treeDetail.setAttribute('type', node.nodeType.toString());
        this.treeDetail.setAttribute('name', Locale.compose(definition?.Name || "LOC_UI_ATTRIBUTE_TREES_TITLE"));
        this.treeDetail.setAttribute('description', Locale.compose(definition?.Description || ""));
        this.treeDetail.setAttribute('level', level);
        this.treeDetail.setAttribute('progress', `${node.progressPercentage}`);
        this.treeDetail.setAttribute('turns', `${node.turns}`);
        this.treeDetail.setAttribute('unlocks-by-depth', node.unlocksByDepthString);
        this.treeDetail.setAttribute('icon', node.icon);
        this.treeDetail.setAttribute('repeated', `${node.repeatedDepth}`);
        this.treeDetail.setAttribute('locked-reason', `${node.lockedReason}`);
    }
    refreshNavTray(canActivateItem) {
        NavTray.addOrUpdateGenericBack();
        if (canActivateItem) {
            NavTray.addOrUpdateAccept('LOC_UI_ATTRIBUTE_TREES_BUY_BUTTON');
        }
        else {
            NavTray.removeAccept();
        }
    }
    onActiveDeviceTypeChanged() {
        const canActivateItem = this.selectedNode ? AttributeTrees.canBuyAttributeTreeNode(this.selectedNode) : false;
        this.refreshNavTray(canActivateItem);
        if (this.selectedNode) {
            this.updateTreeDetail(`${this.selectedNode}`, "0");
        }
    }
    onResize() {
        const panelContent = this.panelContentElements.get(this.currentPanelIndex);
        this.updateLines();
        this.updateTabControl();
        panelContent?.cardDetailContainer.classList.toggle("flex", TreeSupport.isSmallScreen());
        panelContent?.cardDetailContainer.classList.toggle("hidden", !TreeSupport.isSmallScreen());
        panelContent?.root.classList.toggle("mb-4", !TreeSupport.isSmallScreen());
        for (const { scrollable } of this.panelContentElements.values()) {
            if (TreeSupport.isSmallScreen()) {
                this.frame.setAttribute("box-style", "fullscreen");
                this.header.setAttribute("filigree-style", "none");
                this.cardDetailContainer?.classList.remove("hidden");
                this.cardDetailContainer?.classList.add("flex");
                // disable gamepad pan on the main scrollable so that we can use it for the tree detail
                scrollable.setAttribute('handle-gamepad-pan', 'false');
            }
            else {
                this.frame.setAttribute("box-style", "b1");
                this.header.setAttribute("filigree-style", "h3");
                this.cardDetailContainer?.classList.remove("flex");
                this.cardDetailContainer?.classList.add("hidden");
                scrollable.setAttribute('handle-gamepad-pan', 'true');
            }
            if (this.isMobileViewExperience) {
                this.frame.setAttribute("box-style", "fullscreen");
                this.frame.setAttribute("outside-safezone-mode", "full");
            }
        }
    }
    onCardHover(event) {
        this.handleCardHover(event.detail.type, event.detail.level);
    }
    handleCardHover(type, level) {
        this.refreshDetailsPanel(type, level);
    }
    onConfirmButtonActivate({ target }) {
        const nodeId = target.getAttribute('type') ?? "";
        AttributeTrees.buyAttributeTreeNode(nodeId);
        target.classList.add("hidden");
    }
    close() {
        AttributeTrees.activeTreeAttribute = null;
        const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.CONSIDER_ASSIGN_ATTRIBUTE, {}, false);
        if (!result) {
            console.error("screen-attribute-tree: close(): The operation PlayerOperationTypes.CONSIDER_ASSIGN_ATTRIBUTE resulted in a undefined behavior");
            super.close();
            return;
        }
        if (result.Success) {
            Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.CONSIDER_ASSIGN_ATTRIBUTE, {});
        }
        super.close();
    }
}
Controls.define('screen-attribute-trees', {
    createInstance: ScreenIdentity,
    description: 'Area for player Attribute stats, points, and skill trees.',
    classNames: ['screen-attribute-trees', 'pointer-events-auto', 'fullscreen'],
    styles: ["fs://game/base-standard/ui/attribute-trees/screen-attribute-trees.css"],
    content: ['fs://game/base-standard/ui/attribute-trees/screen-attribute-trees.html']
});

//# sourceMappingURL=file:///base-standard/ui/attribute-trees/screen-attribute-trees.js.map
