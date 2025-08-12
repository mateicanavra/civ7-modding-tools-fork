/**
 * @file panel-unit-promotion.ts
 * @copyright 2022-2025 Firaxis Games
 * @description Displays the promotions and stats of promotable units and allows player to assign promotions.
 */
/// <reference path="../../../core/ui/component-support.ts" />
import { Audio } from '/core/ui/audio-base/audio-support.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEventName } from '/core/ui/input/input-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import Panel from '/core/ui/panel-support.js';
import UnitPromotionModel from '/base-standard/ui/unit-promotion/model-unit-promotion.js';
class UnitPromotionPanel extends Panel {
    constructor(root) {
        super(root);
        this.viewReceiveFocusListener = this.realizeFocus.bind(this);
        this.lastMoveCoordX = 0; // used to find the next target to focus given a navigation direction
        this.promotionElements = [];
        this.lastFocusedTree = null;
        this.selectedUnit = null;
        this.currentPromotionElement = null;
        this.MIN_LINE_WIDTH = 10;
        this.selectedUnitID = null;
        this.treeElementsMap = new Map();
        this.onActiveDeviceTypeChanged = () => {
            this.refreshConfirmButton();
        };
        this.onResize = () => {
            UnitPromotionModel.promotionTrees.forEach(tree => {
                this.updateLines(tree);
            });
        };
        this.onEngineInput = (inputEvent) => {
            if (inputEvent.detail.status != InputActionStatuses.FINISH) {
                return;
            }
            if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
                this.close();
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
            }
            else if (inputEvent.detail.name == 'shell-action-1') {
                this.onConfirm();
            }
        };
        this.onConfirm = () => {
            if (!this.currentPromotionElement) {
                console.warn("panel-unit-promotion: onConfirm(): No current promotion selected to confirm!");
                return;
            }
            this.promotionConfirmButton.setAttribute("disabled", "true");
            const { discipline, promotion } = this.currentPromotionElement;
            this.selectPromotion(discipline, promotion);
            this.refreshConfirmButton();
        };
        this.onNavigateInput = (navigationEvent) => {
            const live = this.handleNavigation(navigationEvent);
            if (!live) {
                navigationEvent.preventDefault();
                navigationEvent.stopImmediatePropagation();
            }
        };
        this.onTreesFocus = (event) => {
            const focusedContainer = event.target;
            if (focusedContainer == null) {
                console.error("panel-unit-promotion: onTreesFocus(): Invalid event target. It should be an HTMLElement");
                return;
            }
            const promotionTrees = focusedContainer.querySelectorAll(".promotion-rectangular-grid");
            if (promotionTrees.length <= 0) {
                console.error("panel-unit-promotion: onTreesFocus(): There are no trees!");
                return;
            }
            if (!this.lastFocusedTree) {
                this.onRectangularGridFocus(promotionTrees[0]);
                return;
            }
            const lastRowCards = UnitPromotionModel.getLastPopulatedRowFromTree(this.lastFocusedTree);
            if (!lastRowCards || lastRowCards.length <= 0) {
                console.error("panel-unit-promotion: onTreesFocus(): No last row found for the tree");
                return;
            }
            const nextCard = this.getNextCardFromRow(lastRowCards, false);
            if (!nextCard) {
                console.error("panel-unit-promotion: onTreesFocus(): No card in horizontal last row");
                return;
            }
            FocusManager.setFocus(nextCard);
        };
        this.onRectangularGridFocus = (focusedTree) => {
            // Focus in priority the 'can-earn' card or the first card.
            const cards = focusedTree.querySelectorAll('.promotion-element');
            if (cards.length <= 0) {
                console.error("panel-unit-promotion: onRectangularGridFocus(): There is no card within that tree!");
                return;
            }
            let canEarnCard = null;
            for (let i = 0; i < cards.length; ++i) {
                const card = cards[i];
                if (card.classList.contains("can-earn")) {
                    canEarnCard = card;
                    break;
                }
            }
            if (canEarnCard) {
                FocusManager.setFocus(canEarnCard);
            }
            else {
                FocusManager.setFocus(cards[0]);
            }
        };
    }
    onInitialize() {
        this.promotionTreeContainer = MustGetElement(".promotion-trees-container", this.Root);
        this.promotionButtonContainer = MustGetElement("#promotion-button-container", this.Root);
        this.promotionConfirmButton = MustGetElement("#promotion-confirm-button", this.Root);
        this.promotionCommendationsContainer = MustGetElement("#promotion-commendations-container", this.Root);
        this.experienceRing = MustGetElement('fxs-ring-meter', this.Root);
    }
    onAttach() {
        super.onAttach();
        UnitPromotionModel.isClosing = false;
        const promotionCommendations = MustGetElement("#commendations-container", this.Root);
        const header = MustGetElement('.panel-unit-promotion__header', this.Root);
        Databind.classToggle(this.promotionButtonContainer, "hidden", "!{{g_UnitPromotion.canPurchase}}");
        this.selectedUnitID = UI.Player.getHeadSelectedUnit();
        if (!this.selectedUnitID) {
            console.error("panel-unit-promotion: onAttach(): Unable to retrieve selected unit ID!");
            this.close();
            return;
        }
        const unit = Units.get(this.selectedUnitID);
        if (!unit) {
            console.error("panel-unit-promotion: onAttach(): No existing unit with id: " + this.selectedUnitID);
            this.close();
            return;
        }
        window.addEventListener(ActiveDeviceTypeChangedEventName, this.onActiveDeviceTypeChanged);
        window.addEventListener('resize', this.onResize);
        engine.on('UnitPromoted', this.onUnitPromoted, this);
        engine.on('UnitExperienceChanged', this.onUnitExperienceChanged, this);
        this.Root.addEventListener(InputEngineEventName, this.onEngineInput);
        this.Root.addEventListener('view-receive-focus', this.viewReceiveFocusListener);
        this.createPanelBackground(promotionCommendations, "LOC_PROMOTION_COMMENDATIONS_TITLE", true);
        const closeButton = document.createElement('fxs-close-button');
        closeButton.addEventListener('action-activate', () => {
            this.close();
        });
        this.Root.appendChild(closeButton);
        this.promotionTreeContainer.addEventListener('focus', this.onTreesFocus);
        this.promotionTreeContainer.addEventListener('navigate-input', this.onNavigateInput);
        this.promotionConfirmButton.addEventListener('action-activate', this.onConfirm);
        this.selectedUnit = unit;
        this.refreshConfirmButton();
        const loading = this.Root.querySelector('.panel-unit-promotion-content-loading');
        if (loading) {
            const flipbook = document.createElement("flip-book");
            const flipbookDefinition = {
                fps: 30,
                atlas: [['fs://game/hourglasses01.png', 128, 128, 512],
                    ['fs://game/hourglasses02.png', 128, 128, 512],
                    ['fs://game/hourglasses03.png', 128, 128, 1024, 13]]
            };
            this.promotionButtonContainer.classList.add('hidden');
            flipbook.setAttribute("data-flipbook-definition", JSON.stringify(flipbookDefinition));
            loading.appendChild(flipbook);
            loading.classList.remove('hidden');
        }
        this.realizeExperience();
        setTimeout(() => {
            loading?.remove();
            if (this.Root.isConnected) {
                UnitPromotionModel.updateModel();
                this.populateUnitPromotionPanel();
                this.promotionButtonContainer.classList.remove('hidden');
                this.Root.querySelector('.panel-unit-promotion-content')?.classList.remove('hidden');
                header.setAttribute('data-l10n-id', UnitPromotionModel.name);
            }
        }, 500);
        Audio.playSound("data-audio-window-overlay-open");
    }
    onDetach() {
        this.Root.removeEventListener(InputEngineEventName, this.onEngineInput);
        this.promotionConfirmButton.removeEventListener('action-activate', this.onConfirm);
        window.removeEventListener(ActiveDeviceTypeChangedEventName, this.onActiveDeviceTypeChanged);
        window.removeEventListener('resize', this.onResize);
        engine.off("UnitPromoted", this.onUnitPromoted, this);
        engine.off('UnitExperienceChanged', this.onUnitExperienceChanged, this);
        this.promotionTreeContainer.removeEventListener('focus', this.onTreesFocus);
        this.promotionTreeContainer.removeEventListener('navigate-input', this.onNavigateInput);
        this.Root.removeEventListener('view-receive-focus', this.viewReceiveFocusListener);
        super.onDetach();
        Audio.playSound("data-audio-window-overlay-close");
    }
    close() {
        UnitPromotionModel.isClosing = true;
        //TODO possibly change to unit selected instead
        // Only change interface mode if this wasn't closed from an interface mode change
        if (InterfaceMode.getCurrent() == "INTERFACEMODE_UNIT_PROMOTION") {
            InterfaceMode.switchToDefault();
        }
    }
    refreshConfirmButton() {
        this.promotionConfirmButton.style.display = !ActionHandler.isGamepadActive ? '' : 'none';
    }
    createPanelBackground(container, title, isCommendation) {
        const uiViewExperience = UI.getViewExperience();
        const background = document.createElement('div');
        background.classList.add("panel-background", 'inset-0');
        background.classList.toggle('h-9', uiViewExperience == UIViewExperience.Mobile);
        isCommendation && background.classList.add("bg-none");
        const header = document.createElement('fxs-header');
        header.classList.add('text-accent-1', 'tracking-150', "font-title-base", "max-h-24", 'flex', 'items-center', 'p-1');
        header.classList.toggle('h-9', uiViewExperience == UIViewExperience.Mobile);
        header.setAttribute('filigree-style', 'none');
        header.setAttribute('truncate', 'true');
        header.setAttribute('font-fit-mode', uiViewExperience == UIViewExperience.Mobile ? 'shrink' : '');
        header.setAttribute('wrap', uiViewExperience == UIViewExperience.Mobile ? 'nowrap' : '');
        if (title) {
            header.setAttribute('title', title);
            const tooltip = "[B][style:font-title-base][style:uppercase][style:break-words]" + Locale.compose(title) + "[/style][/style][/style][/B]";
            header.setAttribute("data-tooltip-content", tooltip);
        }
        const titleContainer = document.createElement("div");
        titleContainer.classList.add('flex', 'justify-center', 'items-center');
        titleContainer.appendChild(header);
        background.appendChild(titleContainer);
        container.insertBefore(background, container.firstChild);
    }
    updateNavTray() {
        NavTray.clear();
        NavTray.addOrUpdateShellAction1("LOC_UI_PANTHEON_CONFIRM");
        NavTray.addOrUpdateGenericBack();
    }
    /**
     * Populates the panel with the current information
     * @param updateTrees If true, only updates the trees' cards without building the tree.
    */
    populateUnitPromotionPanel(updateTrees) {
        if (updateTrees) {
            this.updateTrees();
        }
        else {
            this.populatePromotionTreeElements();
        }
        this.populateCommendationElements();
    }
    realizeExperience() {
        const progressCaption = MustGetElement('#promotion-progress__capcontainer', this.Root);
        this.experienceRing.setAttribute('min-value', '0');
        Databind.attribute(this.experienceRing, 'max-value', 'g_UnitPromotion.experienceMax');
        Databind.attribute(this.experienceRing, 'value', 'g_UnitPromotion.experienceCurrent');
        const experienceLevel = this.experienceRing.querySelector(".experience-level");
        if (experienceLevel) {
            Databind.value(experienceLevel, "g_UnitPromotion.level");
        }
        const experience = document.createElement("div");
        experience.classList.add("promotion-progress__experience", "font-body-xs", "text-accent-1", "flex", "items-start", "absolute", "bottom-0", "translate-y-full");
        const levelContainer = document.createElement("div");
        Databind.value(levelContainer, 'g_UnitPromotion.experienceCaption');
        experience.appendChild(levelContainer);
        this.experienceRing.appendChild(experience);
        const pointsContainer = document.createElement("div");
        pointsContainer.classList.add("flex", "items-center");
        const points = document.createElement("div");
        points.classList.add("promotion-progress__points", "size-6", "relative", "flex", "justify-center", "items-center", "text-xs", 'font-fit-shrink');
        Databind.classToggle(points, "active-num", "{{g_UnitPromotion.promotionPoints}} > 0");
        const pointsNumber = document.createElement("div");
        pointsNumber.classList.add('font-body', 'text-sm', 'text-accent-2', 'self-center');
        Databind.value(pointsNumber, 'g_UnitPromotion.promotionPoints');
        points.appendChild(pointsNumber);
        const pointsCaption = document.createElement("div");
        pointsCaption.classList.add("promotion-progress__caption", "font-title-base", "text-accent-1", "tracking-150", "relative", "ml-2");
        Databind.value(pointsCaption, 'g_UnitPromotion.promotionsLabel');
        pointsContainer.appendChild(points);
        pointsContainer.appendChild(pointsCaption);
        progressCaption.appendChild(pointsContainer);
        const verticalDivider = document.createElement("div");
        verticalDivider.classList.add("promotion-progress__divider", "mx-4", "h-2\\/3", "w-px", "bg-secondary-2");
        progressCaption.appendChild(verticalDivider);
        const commendationsContainer = document.createElement("div");
        commendationsContainer.classList.add("flex", "items-center");
        const commendationPoints = document.createElement("div");
        commendationPoints.classList.add("promotion-progress__commendations", "size-6", "relative", "flex", "justify-center", "items-center", "text-xs", 'font-fit-shrink');
        Databind.classToggle(commendationPoints, "active-num", "{{g_UnitPromotion.commendationPoints}} > 0");
        const commendationsNumber = document.createElement("div");
        commendationsNumber.classList.add('font-body', 'text-sm', 'leading-6', 'text-secondary-1', 'text-center', 'self-center');
        Databind.value(commendationsNumber, 'g_UnitPromotion.commendationPoints');
        commendationPoints.appendChild(commendationsNumber);
        const commendationsCaption = document.createElement("div");
        commendationsCaption.classList.add("promotion-progress__caption", "font-title-base", "text-accent-1", "tracking-150", "relative", "ml-2");
        Databind.value(commendationsCaption, 'g_UnitPromotion.commendationsLabel');
        commendationsContainer.appendChild(commendationPoints);
        commendationsContainer.appendChild(commendationsCaption);
        progressCaption.appendChild(commendationsContainer);
    }
    updateTrees() {
        if (UnitPromotionModel.promotionPoints <= 0) {
            UnitPromotionModel.promotionTrees.forEach(tree => {
                this.updateTreeCards(tree);
                this.updateLines(tree);
            });
            this.realizeFocus();
            return;
        }
        if (this.currentPromotionElement) {
            const currentTreeDiscipline = this.currentPromotionElement.discipline;
            const currentTree = UnitPromotionModel.promotionTrees.find(tree => tree.discipline.UnitPromotionDisciplineType == currentTreeDiscipline.UnitPromotionDisciplineType);
            if (!currentTree) {
                console.warn(`panel-unit-promotion: updateTrees(): Tree with discipline ${currentTreeDiscipline.UnitPromotionDisciplineType} doesn't exist in UnitPromotionModel`);
                return;
            }
            this.updateTreeCards(currentTree);
            this.updateLines(currentTree);
            this.realizeFocus();
        }
    }
    updateLines(tree) {
        const oldTreeElement = this.treeElementsMap.get(tree.discipline.UnitPromotionDisciplineType);
        if (!oldTreeElement) {
            console.error("panel-unit-promotion: updateLines(): No promotion tree found for 'discipline' attribute ID " + tree.discipline);
            return;
        }
        const rectangularGrid = oldTreeElement.querySelector('.promotion-rectangular-grid');
        if (!rectangularGrid) {
            console.error("panel-unit-promotion: updateLines(): No rectangularGrid found for tree with 'discipline' attribute ID " + tree.discipline);
            return;
        }
        const oldLines = rectangularGrid.querySelector('.lines-container');
        if (!oldLines) {
            console.error("panel-unit-promotion: updateLines(): No lines container found for tree with 'discipline' attribute ID " + tree.discipline);
            return;
        }
        rectangularGrid.removeChild(oldLines);
        this.createLines(tree, rectangularGrid);
    }
    updateTreeCards(tree) {
        const treeElement = this.treeElementsMap.get(tree.discipline.UnitPromotionDisciplineType);
        if (!treeElement) {
            console.error("panel-unit-promotion: updateTreeCards(): No promotion tree found for 'discipline' attribute ID " + tree.discipline.UnitPromotionDisciplineType);
            return;
        }
        tree.cards.forEach(card => {
            const promotion = card.promotion;
            const discipline = card.discipline;
            const iconClass = card.iconClass;
            const oldPromotionElement = treeElement.querySelector(`.promotion-element[promotion-id="${promotion.UnitPromotionType}"]`);
            if (!oldPromotionElement || !oldPromotionElement.parentElement) {
                console.error("panel-unit-promotion: updateTreeCards(): No promotion element found for 'promotion-id' attribute with ID " + promotion.UnitPromotionType);
                return;
            }
            const newPromotionElement = this.createPromotionElement(discipline, promotion, iconClass);
            if (!newPromotionElement) {
                console.error("panel-unit-promotion: updateTreeCards(): promotionElement not created properly");
                return;
            }
            newPromotionElement.setAttribute("row", card.row.toString());
            newPromotionElement.setAttribute("col", card.column.toString());
            oldPromotionElement.parentElement.replaceChild(newPromotionElement, oldPromotionElement);
        });
    }
    realizeFocus() {
        waitForLayout(() => {
            const promotionTrees = this.promotionTreeContainer.querySelectorAll(".promotion-rectangular-grid");
            if (promotionTrees.length <= 0) {
                console.error("panel-unit-promotion: realizeFocus(): There are no trees");
                return;
            }
            const rectangularGrid = promotionTrees[0];
            this.onRectangularGridFocus(rectangularGrid);
        });
    }
    populatePromotionTreeElements() {
        this.buildPromotionTrees();
        this.realizeFocus();
    }
    buildPromotionTrees() {
        for (let i = 0; i < UnitPromotionModel.promotionTrees.length; i++) {
            const promotionTree = UnitPromotionModel.promotionTrees[i];
            const promotionTreeElement = this.buildPromotionTree(promotionTree);
            if (!promotionTreeElement) {
                console.error("panel-unit-promotion: buildPromotionTrees(): No valid promotion tree");
                return;
            }
            this.promotionElements.push(promotionTreeElement);
            this.promotionTreeContainer.appendChild(promotionTreeElement);
        }
    }
    buildPromotionTree(promotionTree) {
        const rows = promotionTree.layoutData.rows;
        const columns = promotionTree.layoutData.columns;
        const treeGrid = this.generateGrid(rows, columns);
        this.setCards(promotionTree, treeGrid);
        this.createLines(promotionTree, treeGrid);
        const promotionTreeContainer = this.createPromotionTreeContainer(promotionTree.discipline.UnitPromotionDisciplineType);
        promotionTreeContainer.appendChild(treeGrid);
        return promotionTreeContainer;
    }
    createPromotionElement(promotionDiscipline, promotion, iconClass) {
        if (!this.selectedUnit) {
            console.error("panel-unit-promotion: createPromotionElement(): No valid unit selected");
            return;
        }
        const promotionElement = document.createElement("fxs-activatable");
        promotionElement.classList.add("promotion-element", "w-18", "h-18", "relative", "flex", "justify-center", "items-center", "pointer-events-auto", iconClass);
        promotionElement.setAttribute('tabindex', "-1");
        promotionElement.setAttribute("promotion-id", promotion.UnitPromotionType);
        promotionElement.setAttribute("data-audio-group-ref", "interact-unit");
        promotionElement.setAttribute("data-audio-press-ref", "data-audio-unit-commander-promotion-clicked");
        promotionElement.setAttribute("data-audio-focus-ref", "data-audio-unit-commander-promotion-hovered");
        promotionElement.setAttribute("data-audio-activate-ref", "data-audio-unit-commander-promotion-selected");
        const selected = document.createElement("div");
        selected.classList.add("promotion-element__selected", "w-full", "h-full", "transition-opacity");
        promotionElement.appendChild(selected);
        const outline = document.createElement("div");
        outline.classList.add("promotion-element__outline", "transition-opacity");
        promotionElement.appendChild(outline);
        const icon = document.createElement("div");
        icon.classList.add("promotion-element__icon");
        promotionElement.appendChild(icon);
        const locked = document.createElement("div");
        locked.classList.add("promotion-element__locked", "h-10", "bottom-0", "bg-center", "transition-opacity");
        promotionElement.appendChild(locked);
        const hover = document.createElement("div");
        hover.classList.add("promotion-element__hover", "w-full", "h-full", "transition-opacity");
        promotionElement.appendChild(hover);
        const tooltip = "[B][style:font-title-base][style:uppercase][style:break-words]" + Locale.compose(promotionDiscipline.Name) + "[/style][/style][/style][/B]" + "[N][B]" + Locale.compose(promotion.Name) + "[/style][/B][N]" + Locale.compose(promotion.Description);
        promotionElement.setAttribute("data-tooltip-content", tooltip);
        promotionElement.setAttribute("data-tooltip-anchor", "right");
        const canEarn = !this.selectedUnit.Experience?.hasPromotion(promotionDiscipline.UnitPromotionDisciplineType, promotion.UnitPromotionType);
        if (canEarn) {
            const available = this.selectedUnit.Experience?.canPromote && this.selectedUnit.Experience?.canEarnPromotion(promotionDiscipline.UnitPromotionDisciplineType, promotion.UnitPromotionType, false);
            promotionElement.classList.add("can-earn");
            if (available) {
                // Available promotion: can be navigated to and selected
                promotionElement.classList.add("available");
                promotionElement.addEventListener('action-activate', () => {
                    this.promotionConfirmButton.setAttribute("disabled", "false");
                    this.currentPromotionElement = {
                        discipline: promotionDiscipline,
                        promotion
                    };
                    this.selectElement(promotionElement);
                    this.updateNavTray();
                });
            }
            else {
                promotionElement.setAttribute("play-error-sound", "true");
            }
        }
        else {
            // already have this promotion: can't be navigated to or selected, and special "earned" style
            promotionElement.classList.add("disabled");
            promotionElement.classList.add("earned");
            promotionElement.setAttribute("play-error-sound", "true");
        }
        return promotionElement;
    }
    generateGrid(rows, columns) {
        const rectangularGrid = document.createElement("div");
        rectangularGrid.classList.add("promotion-rectangular-grid", "relative", "flex-auto", "overflow-hidden");
        const rowFragment = document.createDocumentFragment();
        for (let i = 0; i < rows; i++) {
            const cardsRow = document.createElement('div');
            cardsRow.classList.add("flex", "justify-center");
            const cardsFragment = document.createDocumentFragment();
            for (let j = 0; j < columns; j++) {
                const card = document.createElement("div");
                card.classList.add("flex", "justify-center", "items-center", "flex-auto", "min-h-4");
                card.setAttribute("row", i.toString());
                card.setAttribute("col", j.toString());
                cardsFragment.appendChild(card);
            }
            cardsRow.appendChild(cardsFragment);
            rowFragment.appendChild(cardsRow);
        }
        rectangularGrid.appendChild(rowFragment);
        return rectangularGrid;
    }
    setCards(tree, grid) {
        tree.cards.forEach(promotionCard => {
            const promotionElement = this.createPromotionElement(promotionCard.discipline, promotionCard.promotion, promotionCard.iconClass);
            if (!promotionElement) {
                console.error("panel-unit-promotion: setCards(): promotionElement not created properly");
                return;
            }
            const promotionType = promotionCard.promotion.UnitPromotionType;
            const row = promotionCard.row;
            const column = promotionCard.column;
            promotionElement.setAttribute("row", row.toString());
            promotionElement.setAttribute("col", column.toString());
            const cardRow = grid.querySelector(`div[row="${row}"][col="${column}"]`);
            if (!cardRow) {
                console.error(`panel-unit-promotion: setCards(): cardRow ${row} not found for card: `, promotionType);
                return;
            }
            cardRow.appendChild(promotionElement);
        });
    }
    createLines(tree, container) {
        delayByFrame(() => {
            const treeElement = this.treeElementsMap.get(tree.discipline.UnitPromotionDisciplineType);
            if (!treeElement) {
                console.error("panel-unit-promotion: createLines(): No promotion tree found for 'discipline' attribute ID " + tree.discipline);
                return;
            }
            const cards = tree.cards;
            const linesContainer = document.createElement("div");
            linesContainer.classList.add("lines-container", "w-full", "h-full", "absolute", "pointer-events-none", "bg-cover", "bg-center", "bg-no-repeat");
            const linesFragment = document.createDocumentFragment();
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                const nodeId = card.promotion.UnitPromotionType;
                const fromElement = treeElement.querySelector(`.promotion-element[promotion-id="${nodeId}"]`);
                if (fromElement && card) {
                    const connectedNodes = tree.layoutGraph.successors(card.promotion.UnitPromotionType);
                    if (connectedNodes) {
                        connectedNodes.forEach((nodeId) => {
                            const toElement = treeElement.querySelector(`.promotion-element[promotion-id="${nodeId}"]`);
                            const childCard = UnitPromotionModel.getCard(nodeId);
                            if (toElement && childCard) {
                                const earned = fromElement.classList.contains('earned');
                                const line = document.createElement("div");
                                line.classList.add("card-line", "w-0\\.5", "absolute");
                                if (!earned) {
                                    line.classList.add("locked", "-z-1");
                                }
                                this.adjustLine(fromElement, toElement, line, linesFragment, false);
                            }
                            else {
                                console.warn("panel-unit-promotions: createLines(): Card 'to' element not found, edge won't be drawn");
                            }
                        });
                    }
                }
                else {
                    console.warn("panel-unit-promotions: createLines(): Card 'from' element not found, edge won't be drawn");
                }
            }
            linesContainer.appendChild(linesFragment);
            container.insertBefore(linesContainer, container.firstChild);
            const disciplineDef = GameInfo.UnitPromotionDisciplines.lookup(tree.discipline.UnitPromotionDisciplineType);
            const backgroundImageUrl = disciplineDef?.BackgroundImage ? `url("fs://game/${disciplineDef?.BackgroundImage}")` : undefined;
            if (backgroundImageUrl) {
                linesContainer.style.setProperty('--panel__bg', backgroundImageUrl);
            }
        }, 3);
    }
    /**
     * Draws a line from the 'from' element to the 'to' element.
     * @param from The origin element of the line.
     * @param to The finish element of the line.
     * @param line The line element to be adjusted from the 'from-to' space positions.
     * @param fragment The container of lines to append the adjusted line
     * @param isLocked Indicates if the to element is locked..
     */
    adjustLine(from, to, line, fragment, isLocked) {
        const fromTop = from.offsetTop + from.offsetHeight / 2;
        const toTop = to.offsetTop + to.offsetHeight / 2;
        const fromLeft = from.offsetLeft + from.offsetWidth / 2;
        const toLeft = to.offsetLeft + to.offsetWidth / 2;
        const toType = to.getAttribute("promotion-id") || "";
        const toNode = UnitPromotionModel.getCard(toType);
        const fromType = from.getAttribute("promotion-id") || "";
        const fromNode = UnitPromotionModel.getCard(fromType);
        if (toNode && fromNode) {
            line.setAttribute("from-node", fromNode?.promotion.UnitPromotionType);
            line.setAttribute("to-node", toNode?.promotion.UnitPromotionType);
        }
        // it has to be less than one (used as conversion factor)
        // topLineHeightProportion + bottomLineHeightProportion = 1, aka 100% of lineHeight.
        const topLineHeightProportion = 3 / 7;
        const bottomLineHeightProportion = 1 - topLineHeightProportion;
        const lockedCenterOffset = 1;
        const availableCenterOffset = 2;
        // rounding here because is easier to manage and less prone to rendering-like errors (widths and heights didn't correspond)
        const verticalHeight = Math.round(Math.abs(toTop - fromTop));
        let horizontalHeight = Math.round(Math.abs(toLeft - fromLeft));
        // adding min width as a margin for straight lines 
        if (horizontalHeight < this.MIN_LINE_WIDTH) {
            horizontalHeight = 0;
        }
        const topLineSplit = document.createElement("div");
        topLineSplit.classList.add("top-split");
        const centerLineSplit = document.createElement("div");
        centerLineSplit.classList.add("center-split");
        const bottomLineSplit = document.createElement("div");
        bottomLineSplit.classList.add("bottom-split");
        let centerLeft = 0;
        let bottomLeft = -horizontalHeight;
        if ((fromTop < toTop && fromLeft < toLeft)) {
            bottomLeft = centerLeft = horizontalHeight;
        }
        const topHeight = Math.round(verticalHeight * topLineHeightProportion);
        const bottomHeight = Math.round(verticalHeight * bottomLineHeightProportion);
        const centerOffset = isLocked ? lockedCenterOffset : availableCenterOffset;
        topLineSplit.style.height = topHeight + centerOffset + "px";
        topLineSplit.style.topPX = 0;
        topLineSplit.style.leftPX = 0;
        const centerLineWidth = Math.abs(horizontalHeight);
        if (centerLineWidth > 0) {
            centerLineSplit.style.height = centerLineWidth + centerOffset + "px";
        }
        else {
            centerLineSplit.style.height = "0px";
        }
        centerLineSplit.style.topPX = topHeight;
        centerLineSplit.style.leftPX = centerLeft + centerOffset;
        bottomLineSplit.style.height = bottomHeight + "px";
        bottomLineSplit.style.topPX = topHeight + centerOffset;
        bottomLineSplit.style.leftPX = bottomLeft;
        line.appendChild(topLineSplit);
        line.appendChild(centerLineSplit);
        line.appendChild(bottomLineSplit);
        line.style.topPX = fromTop;
        line.style.leftPX = fromLeft;
        fragment.appendChild(line);
    }
    createPromotionTreeContainer(discipline) {
        const tree = document.createElement("div");
        tree.classList.add("promotion-tree", "pointer-events-none", "relative", "flex-1", "m-1", "border-primary", "border-2");
        tree.setAttribute("promotion-discipline", discipline);
        this.treeElementsMap.set(discipline, tree);
        const disciplineDef = GameInfo.UnitPromotionDisciplines.lookup(discipline);
        this.createPanelBackground(tree, disciplineDef?.Name);
        return tree;
    }
    selectPromotion(promotiondiscipline, promotion) {
        if (!this.selectedUnitID) {
            console.error("panel-unit-promotion: selectPromotion(): Unable to retrieve selected unit ID!");
            this.close();
            return;
        }
        const args = {
            PromotionType: Database.makeHash(promotion.UnitPromotionType),
            PromotionDisciplineType: Database.makeHash(promotiondiscipline.UnitPromotionDisciplineType)
        };
        UI.sendAudioEvent(Audio.getSoundTag('data-audio-unit-commander-promotion-confirmed', 'interact-unit'));
        const results = Game.UnitCommands.canStart(this.selectedUnitID, UnitCommandTypes.PROMOTE, args, false);
        if (!results.Success) {
            console.warn("panel-unit-promotion: selectPromotion(): The promotion request failed!");
            return;
        }
        Game.UnitCommands.sendRequest(this.selectedUnitID, UnitCommandTypes.PROMOTE, args);
    }
    selectElement(element) {
        const elements = this.Root.querySelectorAll(".promotion-element, .commendation-element");
        if (elements.length <= 0) {
            console.error(`panel-unit-promotion: selectElement(): There are no promotion or commendation elements!`);
            return;
        }
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            element.classList.remove('selected');
        }
        element.classList.add('selected');
    }
    populateCommendationElements() {
        while (this.promotionCommendationsContainer.hasChildNodes()) {
            this.promotionCommendationsContainer.removeChild(this.promotionCommendationsContainer.lastChild);
        }
        if (this.selectedUnit) {
            const promotionClass = GameInfo.Units.lookup(this.selectedUnit.type);
            if (!promotionClass) {
                console.error("panel-unit-promotion: populateCommendationElements(): No valid promotionClass attached to unit with id:" + this.selectedUnit.id);
                return;
            }
            GameInfo.UnitPromotionClassSets.forEach(set => {
                if (set.PromotionClassType === promotionClass.PromotionClass) {
                    const discipline = GameInfo.UnitPromotionDisciplines.lookup(set.UnitPromotionDisciplineType);
                    const details = GameInfo.UnitPromotionDisciplineDetails.filter(p => p.UnitPromotionDisciplineType === set.UnitPromotionDisciplineType);
                    details.forEach(detail => {
                        const promotion = GameInfo.UnitPromotions.lookup(detail.UnitPromotionType);
                        if (promotion != undefined && discipline != undefined && promotion.Commendation) {
                            const commendation = this.createCommendationElement(discipline, promotion);
                            this.promotionCommendationsContainer.appendChild(commendation);
                        }
                    });
                }
            });
        }
    }
    createCommendationElement(discipline, promotion) {
        const canEarn = !this.selectedUnit?.Experience?.hasPromotion(discipline.UnitPromotionDisciplineType, promotion.UnitPromotionType);
        const available = this.selectedUnit?.Experience?.canPromote && this.selectedUnit?.Experience?.canEarnPromotion(discipline.UnitPromotionDisciplineType, promotion.UnitPromotionType, false);
        const commendationElement = document.createElement("fxs-activatable");
        commendationElement.classList.add("commendation-element", "w-32", "h-16", "pointer-events-auto", "relative", "flex", "justify-center", "items-center");
        commendationElement.setAttribute('tabindex', "-1");
        const glow = document.createElement("div");
        glow.classList.add("commendation-element__glow", "transition-opacity");
        commendationElement.appendChild(glow);
        const background = document.createElement("div");
        background.classList.add("commendation-element__icon", "w-full", "h-full");
        commendationElement.appendChild(background);
        const outline = document.createElement("div");
        outline.classList.add("commendation-element__outline", "w-full", "transition-opacity");
        commendationElement.appendChild(outline);
        const tooltip = Locale.compose(promotion.Name) + "[N]" + Locale.compose(promotion.Description);
        commendationElement.setAttribute("data-tooltip-content", tooltip);
        commendationElement.setAttribute("data-tooltip-anchor", "right");
        if (canEarn) {
            commendationElement.classList.add("can-earn");
            if (available) {
                // Available promotion: can be navigated to and selected
                commendationElement.classList.add("available");
                commendationElement.addEventListener('action-activate', () => {
                    this.promotionConfirmButton.setAttribute("disabled", "false");
                    this.currentPromotionElement = {
                        discipline,
                        promotion
                    };
                    this.selectElement(commendationElement);
                    this.updateNavTray();
                });
            }
        }
        else {
            // already have this promotion: can't be navigated to or selected, and special "earned" style
            commendationElement.classList.add("disabled");
            commendationElement.classList.add("earned");
        }
        return commendationElement;
    }
    onUnitPromoted(data) {
        if (this.selectedUnitID && ComponentID.isMatch(data.unit, this.selectedUnitID)) {
            UnitPromotionModel.updateGate.call("onUnitPromoted");
            this.populateUnitPromotionPanel(true);
        }
    }
    onUnitExperienceChanged(data) {
        if (this.selectedUnitID && ComponentID.isMatch(data.unit, this.selectedUnitID)) {
            const unit = Units.get(data.unit);
            if (!unit) {
                console.error("panel-unit-promotion: onUnitExperienceChanged(): Unable to retrieve unit object for unit with id: " + data.unit.id.toString());
                return;
            }
            UnitPromotionModel.updateGate.call("onUnitExperienceChanged");
            this.updateTrees();
        }
    }
    navigateTree(originTree, horizontalLevel, reverseDirection) {
        const treesParent = originTree.parentNode;
        if (!treesParent) {
            console.error("panel-unit-promotion: navigateTree(): No tree parent was found!");
            return;
        }
        const trees = treesParent.children;
        const currentTreeIndex = Array.from(trees).indexOf(originTree);
        const direction = reverseDirection ? -1 : 1;
        const nextTree = trees[currentTreeIndex + direction];
        // border reached, no tree in this direction
        if (!nextTree) {
            return;
        }
        this.lastFocusedTree = nextTree;
        // try to focus element in the same row
        let nextRowCards = nextTree.querySelectorAll(`div[row="${horizontalLevel}"] .promotion-element`);
        // no elements, select the last row of the next tree
        if (nextRowCards.length <= 0) {
            const lastRowCards = UnitPromotionModel.getLastPopulatedRowFromTree(nextTree);
            if (!lastRowCards || lastRowCards.length <= 0) {
                console.error("panel-unit-promotion: navigateTree(): No last row found for the tree");
                return;
            }
            nextRowCards = lastRowCards;
        }
        const nextCard = this.getNextCardFromRow(nextRowCards, reverseDirection);
        if (!nextCard) {
            console.error("panel-unit-promotion: navigateTree(): No card in horizontal level: " + horizontalLevel);
            return;
        }
        FocusManager.setFocus(nextCard);
    }
    getNextCardFromRow(rowElements, reverseDirection) {
        if (rowElements.length <= 0) {
            console.error("panel-unit-promotion: getNextCardFromRow(): The cards row is empty");
            return;
        }
        if (reverseDirection) {
            return rowElements.item(rowElements.length - 1);
        }
        return rowElements.item(0);
    }
    navigateCommendations(originTree) {
        const treesParent = originTree.parentNode;
        if (!treesParent) {
            console.error("panel-unit-promotion: navigateCommendations(): No tree parent was found!");
            return;
        }
        const trees = treesParent.children;
        const currentTreeIndex = Array.from(trees).indexOf(originTree);
        const commendations = this.promotionCommendationsContainer.children;
        if (commendations.length <= 0) {
            console.error("panel-unit-promotion: navigateCommendations(): There are no commendations!");
            return;
        }
        const currentCommendation = commendations[currentTreeIndex];
        if (!currentCommendation) {
            console.error("panel-unit-promotion: navigateCommendations(): No commendation found!");
            return;
        }
        FocusManager.setFocus(currentCommendation);
    }
    /**
     * @returns true if still live, false if input should stop.
     */
    handleNavigation(navigationEvent) {
        if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
            if (navigationEvent.detail.name == 'nav-move') {
                this.lastMoveCoordX = navigationEvent.detail.x;
            }
            return true;
        }
        const direction = navigationEvent.getDirection();
        const originCard = FocusManager.getFocus();
        if (!originCard.parentElement) {
            console.error("panel-unit-promotion: handleNavigation(): current focus parent element not found.");
            return true;
        }
        const originRowAttribute = originCard.parentElement.getAttribute('row');
        const originColAttribute = originCard.parentElement.getAttribute('col');
        if (!originRowAttribute || !originColAttribute) {
            console.error("panel-unit-promotion: handleNavigation(): Coordinates not found for the origin (current focus)!");
            return true;
        }
        const originTree = originCard.closest('.promotion-tree');
        if (!originTree) {
            console.error("panel-unit-promotion: handleNavigation(): No .panel-unit-promotion parent were found!");
            return true;
        }
        this.lastFocusedTree = originTree;
        const cards = originTree.querySelectorAll('.promotion-element');
        if (cards.length <= 0) {
            console.error("panel-unit-promotion: handleNavigation(): There is no card within that tree!");
            return true;
        }
        let nextTarget = { x: -1, y: -1 };
        const origin = { x: parseInt(originColAttribute), y: parseInt(originRowAttribute) };
        for (let i = 0; i < cards.length; ++i) {
            const card = cards[i];
            const candidateRowAttribute = card.getAttribute('row');
            const candidateColAttribute = card.getAttribute('col');
            if (!candidateRowAttribute || !candidateColAttribute) {
                console.error("panel-unit-promotion: handleNavigation(): coordinates not found for the candidate!");
                return true;
            }
            const candidate = { x: parseInt(candidateColAttribute), y: parseInt(candidateRowAttribute) };
            if (candidate.x == origin.x && candidate.y == origin.y) {
                continue;
            }
            switch (direction) {
                case InputNavigationAction.DOWN:
                    nextTarget = this.bestDownTarget(origin, nextTarget, candidate);
                    break;
                case InputNavigationAction.UP:
                    nextTarget = this.bestUpTarget(origin, nextTarget, candidate);
                    break;
                case InputNavigationAction.LEFT:
                    nextTarget = this.bestLeftTarget(origin, nextTarget, candidate);
                    break;
                case InputNavigationAction.RIGHT:
                    nextTarget = this.bestRightTarget(origin, nextTarget, candidate);
                    break;
            }
        }
        if (nextTarget.x != -1) {
            const card = originTree.querySelector(`div[row="${nextTarget.y}"][col="${nextTarget.x}"] .promotion-element`);
            if (card) {
                FocusManager.setFocus(card);
            }
        }
        else {
            // Focus the next tree depending on the horizontal direction
            if (direction == InputNavigationAction.LEFT || direction == InputNavigationAction.RIGHT) {
                const backwardDirection = direction == InputNavigationAction.LEFT;
                this.navigateTree(originTree, origin.y, backwardDirection);
            }
            if (direction == InputNavigationAction.DOWN) {
                this.navigateCommendations(originTree);
            }
        }
        this.lastMoveCoordX = 0;
        return false;
    }
    /**
     * Choose the best target for a right navigation,
     * so the target the closest to the right of the origin on the same row
     *
     * @param origin The currently focused card coordinates
     * @param current The current best candidate coordinates
     * @param candidate The next candidate coordinates
     * @returns The best candidate coordinates
     */
    bestRightTarget(origin, current, candidate) {
        // only try to navigate to the same row and to the rigth 
        if (candidate.x > origin.x && candidate.y == origin.y) {
            // this is a valid candidate
            if (current.x == -1 || current.x > candidate.x) {
                // it is closer so a better target
                return candidate;
            }
        }
        return current;
    }
    /**
     * Choose the best target for a left navigation,
     * so the target the closest to the left of the origin on the same row
     *
     * @param origin The currently focused card coordinates
     * @param current The current best candidate coordinates
     * @param candidate The next candidate coordinates
     * @returns The best candidate coordinates
     */
    bestLeftTarget(origin, current, candidate) {
        // only try to navigate to the same row and to the left 
        if (candidate.x < origin.x && candidate.y == origin.y) {
            // this is a valid candidate
            if (current.x == -1 || current.x < candidate.x) {
                // it is closer so a better target
                return candidate;
            }
        }
        return current;
    }
    /**
     * Choose the best target for a up navigation
     * It will choose the one on the closest row
     * then the one on the same row if possible otherwise:
     *
     * if using dpad:
     * 	the closest to the origin horizontally.
     *	if two cards are at the same distance prioritize the one on the left.
     * if using stick:
     *  the closest to the origin horizontally on the left or the right depending on the stick direction.
     *
     * We prioritize on the row first as if we choose a candidate on the same column but farther we will jump rows
     * and it can be hard/impossible to select a card that is not aligned with another one.
     *
     * @param origin The currently focused card coordinates
     * @param current The current best candidate coordinates
     * @param candidate The next candidate coordinates
     * @returns The best candidate coordinates
     */
    bestUpTarget(origin, current, candidate) {
        if (candidate.y >= origin.y) {
            return current;
        }
        if (current.x == -1) {
            // No existing target
            return candidate;
        }
        if (current.y < candidate.y) {
            // Closer row
            return candidate;
        }
        if (current.y == candidate.y) {
            if (candidate.x == origin.x) {
                return candidate;
            }
            if (this.lastMoveCoordX > 0) {
                // priority to target on the right and closer to the origin column
                // then on the left and closer
                if (candidate.x > origin.x) {
                    // on the right so check we are closer
                    if (current.x < origin.x || candidate.x < current.x) {
                        return candidate;
                    }
                }
                else {
                    // on the left so only replace if current target is on the left of this one and the origin
                    if (current.x < origin.x && current.x < candidate.x) {
                        return candidate;
                    }
                }
            }
            else if (this.lastMoveCoordX < 0) {
                // priority to target on the left and closer to the origin column
                // then on the right and closer
                if (candidate.x < origin.x) {
                    // on the left so check we are closer
                    if (current.x > origin.x || candidate.x > current.x) {
                        return candidate;
                    }
                }
                else {
                    // on the right so only replace if current target is on the right of this one and the origin
                    if (current.x > origin.x && current.x > candidate.x) {
                        return candidate;
                    }
                }
            }
            else {
                const currentColumnDiff = Math.abs(current.x - origin.x);
                const candidateColumnDiff = Math.abs(candidate.x - origin.x);
                if (currentColumnDiff > candidateColumnDiff) {
                    // Closer column
                    return candidate;
                }
                if (currentColumnDiff == candidateColumnDiff) {
                    // same column difference choose the one on the left
                    if (candidate.x < current.x) {
                        return candidate;
                    }
                }
            }
        }
        return current;
    }
    /**
     * Choose the better target for a down navigation
     * It will choose the one on the closest row
     * then the one on the same row if possible otherwise:
     *
     * if using dpad:
     * 	the closest to the origin horizontally
     *	if two cards are at the same distance prioritize the one on the left.
     * if using stick:
     *  the closest to the origin horizontally on the left or the right depending on the stick direction.
     *
     * We prioritize on the row first as if we choose a candidate on the same column but farther we will jump rows
     * and it can be hard/impossible to select a card that is not aligned with another one.
     *
     * @param origin The currently focused card coordinates
     * @param current The current best candidate coordinates
     * @param candidate The next candidate coordinates
     * @returns The best candidate coordinates
     */
    bestDownTarget(origin, current, candidate) {
        if (candidate.y <= origin.y) {
            return current;
        }
        if (current.x == -1) {
            // No existing target
            return candidate;
        }
        if (current.y > candidate.y) {
            // Closer row
            return candidate;
        }
        if (current.y == candidate.y) {
            if (candidate.x == origin.x) {
                // TODO should we give priority to card to the left if stick is close to 45 degree angle?
                return candidate;
            }
            if (this.lastMoveCoordX > 0) {
                // priority to target on the right and closer to the origin column
                // then on the left and closer
                if (candidate.x > origin.x) {
                    // on the right so check we are closer
                    if (current.x < origin.x || candidate.x < current.x) {
                        return candidate;
                    }
                }
                else {
                    // on the left so only replace if current target is on the left of this one and the origin
                    if (current.x < origin.x && current.x < candidate.x) {
                        return candidate;
                    }
                }
            }
            else if (this.lastMoveCoordX < 0) {
                // priority to target above and closer to the origin column
                // then on the right and closer
                if (candidate.x < origin.x) {
                    // on the left so check we are closer
                    if (current.x > origin.x || candidate.x > current.x) {
                        return candidate;
                    }
                }
                else {
                    // on the right so only replace if current target is on the right of this one and the origin
                    if (current.x > origin.x && current.x > candidate.x) {
                        return candidate;
                    }
                }
            }
            else {
                const currentColumnDiff = Math.abs(current.x - origin.x);
                const candidateColumnDiff = Math.abs(candidate.x - origin.x);
                if (currentColumnDiff > candidateColumnDiff) {
                    // Closer column
                    return candidate;
                }
                if (currentColumnDiff == candidateColumnDiff) {
                    // same column difference choose the one on the left
                    if (candidate.x < current.x) {
                        return candidate;
                    }
                }
            }
        }
        return current;
    }
}
Controls.define('panel-unit-promotion', {
    createInstance: UnitPromotionPanel,
    description: 'Area for earned promotions, experience, and stats for promotable units',
    styles: ['fs://game/base-standard/ui/unit-promotion/panel-unit-promotion.css'],
    content: ['fs://game/base-standard/ui/unit-promotion/panel-unit-promotion.html'],
    classNames: ['unit-promotion-panel', 'flex', 'animate-in-left', 'l-7', 'relative']
});

//# sourceMappingURL=file:///base-standard/ui/unit-promotion/panel-unit-promotion.js.map
