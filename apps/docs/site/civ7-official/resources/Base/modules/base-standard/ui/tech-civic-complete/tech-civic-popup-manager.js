/**
 * @file tech-civic-popup-manager.ts
 * @copyright 2022, Firaxis Games
 * @description Manages the data and queue for tech and civic completed popups
 */
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { DisplayHandlerBase } from '/core/ui/context-manager/display-handler.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
import { TutorialLevel } from '/base-standard/ui/tutorial/tutorial-item.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
export var ProgressionTreeTypes;
(function (ProgressionTreeTypes) {
    ProgressionTreeTypes["TECH"] = "TECH";
    ProgressionTreeTypes["CULTURE"] = "CULTURE";
})(ProgressionTreeTypes || (ProgressionTreeTypes = {}));
class TechCivicPopupManagerClass extends DisplayHandlerBase {
    constructor() {
        super("TechCivicPopup", 8000);
        this.techNodeCompletedListener = this.onTechNodeCompleted.bind(this);
        this.cultureNodeCompletedListener = this.onCultureNodeCompleted.bind(this);
        this.currentTechCivicPopupData = null;
        this.isFirstCivic = true;
        this.isFirstTech = true;
        this.closePopup = () => {
            if (this.currentTechCivicPopupData) {
                DisplayQueueManager.close(this.currentTechCivicPopupData);
            }
        };
        if (TechCivicPopupManagerClass.instance) {
            console.error("Only one instance of the TechCivicPopup manager class can exist at a time!");
        }
        TechCivicPopupManagerClass.instance = this;
        this.initializeListeners();
    }
    initializeListeners() {
        if (!Configuration.getGame().isAnyMultiplayer) {
            engine.on('TechNodeCompleted', this.techNodeCompletedListener);
            engine.on('CultureNodeCompleted', this.cultureNodeCompletedListener);
        }
    }
    isShowing() {
        return ContextManager.hasInstanceOf("screen-tech-civic-complete");
    }
    /**
      * @implements {IDisplayQueue}
      */
    show(request) {
        this.currentTechCivicPopupData = request;
        InterfaceMode.switchToDefault();
        ContextManager.push("screen-tech-civic-complete", { createMouseGuard: true, singleton: true });
    }
    /**
      * @implements {IDisplayQueue}
      */
    hide(_request, _options) {
        this.currentTechCivicPopupData = null;
        ContextManager.pop("screen-tech-civic-complete");
        if (DisplayQueueManager.findAll(this.getCategory()).length === 1) {
            this.isFirstCivic = true;
            this.isFirstTech = true;
            this.currentTechCivicPopupData = null;
        }
    }
    setRequestIdAndPriority(request) {
        super.setRequestIdAndPriority(request);
        if (request.treeType == ProgressionTreeTypes.TECH) {
            request.subpriority += 1000;
        }
    }
    onTechNodeCompleted(data) {
        if (ContextManager.shouldShowPopup(data.player)) {
            const node = GameInfo.ProgressionTreeNodes.lookup(data.activeNode);
            if (!node) {
                console.error("tech-civic-popup-manager: Unable to retrieve node definition for tech node " + data.activeNode.toString() + " in tree " + data.tree);
                return;
            }
            // BPF: For purposes of the Tutorial, we don't want to show this tech pop-up
            if (node.ProgressionTreeNodeType == "NODE_TECH_AQ_AGRICULTURE") {
                if ((Configuration.getUser().tutorialLevel > TutorialLevel.None) && !Online.Metaprogression.isPlayingActiveEvent()) {
                    return;
                }
            }
            const techCivicPopupData = {
                category: this.getCategory(),
                node: node,
                treeType: ProgressionTreeTypes.TECH
            };
            this.addDisplayRequest(techCivicPopupData);
        }
    }
    onCultureNodeCompleted(data) {
        if (ContextManager.shouldShowPopup(data.player)) {
            const node = GameInfo.ProgressionTreeNodes.lookup(data.activeNode);
            if (!node) {
                console.error("tech-civic-popup-manager: Unable to retrieve node definition for culture node " + data.activeNode.toString() + " in tree " + data.tree);
                return;
            }
            // BPF: For purposes of the Tutorial, we don't want to show this civic pop-up
            if (node.ProgressionTreeNodeType == "NODE_CIVIC_AQ_MAIN_CHIEFDOM") {
                if ((Configuration.getUser().tutorialLevel > TutorialLevel.None) && !Online.Metaprogression.isPlayingActiveEvent()) {
                    return;
                }
            }
            const techCivicPopupData = {
                category: this.getCategory(),
                node: node,
                treeType: ProgressionTreeTypes.CULTURE
            };
            this.addDisplayRequest(techCivicPopupData);
        }
    }
}
TechCivicPopupManagerClass.instance = null;
const TechCivicPopupManager = new TechCivicPopupManagerClass();
export { TechCivicPopupManager as default };
DisplayQueueManager.registerHandler(TechCivicPopupManager);

//# sourceMappingURL=file:///base-standard/ui/tech-civic-complete/tech-civic-popup-manager.js.map
