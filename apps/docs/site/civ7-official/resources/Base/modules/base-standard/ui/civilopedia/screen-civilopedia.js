/**
 * @file civilopedia.ts
 * @copyright 2020-2024, Firaxis Games
 * @description Encyclopedia of all things CIV.
 */
import * as Civilopedia from '/base-standard/ui/civilopedia/model-civilopedia.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEventName } from '/core/ui/input/input-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { ChooserItem } from '/base-standard/ui/chooser-item/chooser-item.js';
import { Navigation } from '/core/ui/input/navigation-support.js';
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
const PediaSearchCloseEventName = "pedia-search-close";
class PediaSearchCloseEvent extends CustomEvent {
    constructor() {
        super(PediaSearchCloseEventName, { bubbles: true });
    }
}
class ScreenCivilopedia extends Panel {
    constructor(root) {
        super(root);
        this.previousMode = null;
        this.previousModeContext = null;
        this.engineInputListener = this.onEngineInput.bind(this);
        this.PediaSearchCloseListener = this.onPediaSearchClose.bind(this);
        this.navComponent = null;
        this.sideMenuComponent = null;
        this.searchBar = null;
        this.onNavigateInput = (event) => {
            if (event.detail.status != InputActionStatuses.FINISH) {
                return;
            }
            const direction = event.getDirection();
            let handledInput = false;
            switch (direction) {
                case InputNavigationAction.UP:
                    this.sideMenuComponent?.onArticleUp();
                    handledInput = true;
                    break;
                case InputNavigationAction.DOWN:
                    this.sideMenuComponent?.onArticleDown();
                    handledInput = true;
                    break;
                case InputNavigationAction.SHELL_NEXT:
                    this.navComponent?.onNavigateForward();
                    handledInput = true;
                    break;
                case InputNavigationAction.SHELL_PREVIOUS:
                    this.navComponent?.onNavigateBack();
                    handledInput = true;
                    break;
            }
            if (handledInput) {
                event.stopPropagation();
                event.preventDefault();
            }
        };
        this.enableOpenSound = true;
        this.enableCloseSound = true;
        this.Root.setAttribute("data-audio-group-ref", "civilopedia");
    }
    onAttach() {
        super.onAttach();
        const frame = MustGetElement("fxs-frame", this.Root);
        frame.setAttribute("outside-safezone-mode", "full");
        const closeButton = MustGetElement("fxs-close-button", this.Root);
        closeButton.setAttribute("data-audio-group-ref", "civilopedia");
        closeButton.addEventListener('action-activate', () => {
            this.close();
        });
        //Cinematic mode instead of vignette for models and to help dark UI to stand out
        this.previousMode = InterfaceMode.getCurrent();
        this.previousModeContext = InterfaceMode.getParameters();
        InterfaceMode.switchTo("INTERFACEMODE_CINEMATIC");
        this.Root.addEventListener('navigate-input', this.onNavigateInput);
        // Adjust the header for lower resolutions to make a tiny bit more space.
        const header = document.getElementById("civilopedia-header");
        if (header) {
            if (window.innerHeight < Layout.pixelsToScreenPixels(1080)) {
                header.setAttribute("filigree-style", "small");
            }
            else {
                header.removeAttribute("filigree-style");
            }
        }
        const mainScrollable = this.getComponentRoot(".content-main-scroll").component;
        mainScrollable.setEngineInputProxy(this.Root);
        // get some components 
        this.navComponent = this.getComponentRoot(".pedia-navigation").component;
        this.sideMenuComponent = this.getComponentRoot(".pedia-page-list").component;
        this.searchBar = this.getComponentRoot(".pedia-search__textbox").component;
        DisplayQueueManager.suspend();
        //navigate to last loaded page if any
        Civilopedia.instance.navigateToLastPageInHistory();
        Civilopedia.instance.isOpen = true;
    }
    onDetach() {
        Civilopedia.instance.isOpen = false;
        if ((!this.previousMode || (this.previousMode && !InterfaceMode.switchTo(this.previousMode, this.previousModeContext)))) {
            InterfaceMode.switchToDefault(); // ... if more context is needed, fallback to default mode.
        }
        DisplayQueueManager.resume();
        this.Root.removeEventListener('navigate-input', this.onNavigateInput);
        super.onDetach();
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        NavTray.clear();
        NavTray.addOrUpdateGenericBack();
        NavTray.addOrUpdateShellAction2("LOC_OPTIONS_SEARCH");
        this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
        this.Root.addEventListener('navigate-input', this.onNavigateInput);
        this.Root.addEventListener(PediaSearchCloseEventName, this.PediaSearchCloseListener);
        this.realizeFocus();
    }
    realizeFocus() {
        const firstListItem = this.Root.querySelector("pedia-page-list-item");
        if (firstListItem) {
            FocusManager.setFocus(firstListItem);
            return;
        }
        const firstFocusableChild = Navigation.getFirstFocusableElement(this.Root, { isDisableFocusAllowed: false, direction: InputNavigationAction.NONE });
        if (firstFocusableChild) {
            FocusManager.setFocus(firstFocusableChild);
        }
    }
    onPediaSearchClose(_event) {
        this.realizeFocus();
    }
    onLoseFocus() {
        NavTray.clear();
        this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
        this.Root.removeEventListener('navigate-input', this.onNavigateInput);
        this.Root.removeEventListener(PediaSearchCloseEventName, this.PediaSearchCloseListener);
        super.onLoseFocus();
    }
    getComponentRoot(componentName) {
        const componentElement = MustGetElement(componentName, document);
        // @ts-expect-error - gameface custom element initialization is broken when appending custom elements to other custom elements
        componentElement.initialize();
        return componentElement;
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        let handledInput = false;
        if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
            this.close();
            handledInput = true;
        }
        switch (inputEvent.detail.name) {
            case "shell-action-2":
                this.searchBar?.onActivate();
                handledInput = true;
                break;
        }
        if (handledInput) {
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
}
Controls.define('screen-civilopedia', {
    createInstance: ScreenCivilopedia,
    description: 'Encyclopedia of all things CIV.',
    classNames: ['screen-civilopedia', 'relative', 'max-w-full', 'max-h-full'],
    styles: ['fs://game/base-standard/ui/civilopedia/screen-civilopedia.css'],
    content: ['fs://game/base-standard/ui/civilopedia/screen-civilopedia.html'],
});
class PediaBreadCrumbs extends Component {
    constructor() {
        super(...arguments);
        this.boundOnNavigate = () => { this.onNavigate(); };
        this.scrollReadyListener = this.onScrollReady.bind(this);
        this.crumbClicked = false;
        this.elementToScrollTo = null;
    }
    onInitialize() {
        this.crumbsContainer = MustGetElement('.pedia-breadcrumbs__container', this.Root);
    }
    onAttach() {
        Civilopedia.instance.onNavigatePage.on(this.boundOnNavigate);
        this.Root.addEventListener('scroll-is-ready', this.scrollReadyListener);
        this.refresh();
    }
    onDetach() {
        Civilopedia.instance.onNavigatePage.off(this.boundOnNavigate);
        this.Root.removeEventListener('scroll-is-ready', this.scrollReadyListener);
    }
    onScrollReady(event) {
        if (this.elementToScrollTo) {
            const scrollComponentRoot = event.target;
            scrollComponentRoot.component.scrollIntoView(this.elementToScrollTo);
        }
    }
    onNavigate() {
        //don't refresh if we just clicked a breadcrumb
        if (!this.crumbClicked) {
            this.refresh();
        }
        this.crumbClicked = false;
    }
    refresh() {
        while (this.crumbsContainer.hasChildNodes()) {
            this.crumbsContainer.removeChild(this.crumbsContainer.lastChild);
        }
        for (const [index, historyPage] of Civilopedia.instance.history.entries()) {
            const historyPageDetails = Civilopedia.instance.getPage(historyPage.sectionID, historyPage.pageID);
            if (!historyPageDetails) {
                console.error(`PediaBreadCrumbs: refresh - historyPageDetails for sectionID ${historyPage.sectionID} and pageID ${historyPage.pageID} was null!`);
                return;
            }
            const historyPageTitle = historyPageDetails.nameKey;
            if (!historyPageTitle) {
                console.error(`PediaBreadCrumbs: refresh - historyPageTitle for sectionID ${historyPage.sectionID} and pageID ${historyPage.pageID} was null!`);
                return;
            }
            const newCrumb = document.createElement("fxs-activatable");
            newCrumb.classList.add('font-body', 'text-sm', 'hover\\:text-accent-1', 'focus:\\text-accent-1');
            newCrumb.setAttribute("data-l10n-id", historyPageTitle);
            newCrumb.setAttribute("data-audio-group-ref", "civilopedia");
            this.crumbsContainer.insertBefore(newCrumb, this.crumbsContainer.firstChild);
            if (index != Civilopedia.instance.history.length - 1) {
                const crumbDivider = document.createElement("div");
                crumbDivider.classList.value = "pedia-breadcrumbs__divider size-4 px-4 bg-contain bg-no-repeat bg-center";
                this.crumbsContainer.insertBefore(crumbDivider, this.crumbsContainer.firstChild);
            }
            if (index == Civilopedia.instance.currentHistoryIndex) {
                this.elementToScrollTo = newCrumb;
            }
            const indexInHistory = index;
            newCrumb.addEventListener('action-activate', () => {
                this.crumbClicked = true;
                if (Civilopedia.instance.currentHistoryIndex < indexInHistory) {
                    Civilopedia.instance.navigateBack(indexInHistory - Civilopedia.instance.currentHistoryIndex);
                }
                else if (Civilopedia.instance.currentHistoryIndex > indexInHistory) {
                    Civilopedia.instance.navigateForward(Civilopedia.instance.currentHistoryIndex - indexInHistory);
                }
            });
        }
    }
}
Controls.define('pedia-breadcrumbs', {
    createInstance: PediaBreadCrumbs,
    description: 'Breadcrumbs display for pedia history.',
});
class PediaSearch extends Component {
    constructor() {
        super(...arguments);
        this.textInputListener = this.onTextInput.bind(this);
        this.focusInListener = this.onTextEngineInput.bind(this);
        this.validateVirtualKeyboardListener = this.onTextInput.bind(this);
        this.onEngineInputListener = this.onEngineInput.bind(this);
    }
    onInitialize() {
        this.textInput = MustGetElement('.pedia-search__textbox', this.Root);
        this.resultsContainer = MustGetElement('.pedia-search__results', this.Root);
        this.resultsScrollableContainer = MustGetElement('.pedia-search__results-scrollable-container', this.Root);
    }
    onAttach() {
        this.textInput.addEventListener("input", this.textInputListener);
        this.textInput.addEventListener("focusin", this.focusInListener);
        this.textInput.addEventListener('fxs-textbox-validate-virtual-keyboard', this.validateVirtualKeyboardListener);
        this.textInput.setAttribute("data-audio-focus-ref", "none");
        this.Root.addEventListener(InputEngineEventName, this.onEngineInputListener);
    }
    onDetach() {
        this.textInput.removeEventListener("input", this.textInputListener);
        this.textInput.removeEventListener("focusin", this.focusInListener);
        this.textInput.removeEventListener('fxs-textbox-validate-virtual-keyboard', this.validateVirtualKeyboardListener);
        this.Root.removeEventListener(InputEngineEventName, this.onEngineInputListener);
    }
    onEngineInput(event) {
        if (event.detail.status == InputActionStatuses.FINISH && event.detail.name == "cancel") {
            this.Root.dispatchEvent(new PediaSearchCloseEvent());
            this.resultsScrollableContainer.classList.add("hidden");
            event.stopImmediatePropagation();
            event.preventDefault();
        }
    }
    onTextInput() {
        this.resultsContainer.innerHTML = '';
        const searchQuery = this.textInput.getAttribute("value");
        if (!searchQuery || searchQuery.length == 0) {
            this.resultsScrollableContainer.classList.add("hidden");
            return;
        }
        const searchResults = Civilopedia.instance.search(searchQuery, 5);
        this.resultsScrollableContainer.classList.toggle("hidden", searchResults.length == 0);
        let firstItem = true;
        for (const searchResult of searchResults) {
            const pageDetails = Civilopedia.instance.getPage(searchResult.page.sectionID, searchResult.page.pageID);
            if (!pageDetails) {
                console.error(`PediaSearch: onTextInput - pageDetails for sectionID ${searchResult.page.sectionID} and pageID ${searchResult.page.pageID} was null!`);
                continue;
            }
            const resultItem = document.createElement('fxs-dropdown-item');
            resultItem.setAttribute("data-audio-group-ref", "civilopedia");
            resultItem.dataset.label = pageDetails.nameKey;
            if (pageDetails.pageGroupID == "UNIQUE_MILITARY_UNITS") {
                let upgradeTier = 1;
                let hasPreviousUpgrade = GameInfo.UnitUpgrades.length > 0;
                let unitType = pageDetails.pageID;
                while (hasPreviousUpgrade) {
                    hasPreviousUpgrade = false;
                    for (const upgrade of GameInfo.UnitUpgrades) {
                        if (upgrade.UpgradeUnit == unitType) {
                            unitType = upgrade.Unit;
                            upgradeTier++;
                            hasPreviousUpgrade = true;
                            break;
                        }
                    }
                    ;
                }
                if (upgradeTier > 1) {
                    resultItem.dataset.label = Locale.compose(pageDetails.nameKey) + " " + Locale.compose("LOC_CIVILOPEDIA_UPGRADE_TIER", upgradeTier);
                }
            }
            resultItem.dataset.selected = (firstItem) ? 'true' : 'false';
            resultItem.dataset.disabled = 'false';
            resultItem.dataset.tooltipContent = '';
            this.resultsContainer.appendChild(resultItem);
            resultItem.addEventListener('action-activate', () => {
                if (!Civilopedia.instance.navigateTo(searchResult.page)) {
                    // Could not navigate to the searched page (might already be there), so cancel instead
                    this.Root.dispatchEvent(new PediaSearchCloseEvent());
                }
                this.resultsScrollableContainer.classList.add("hidden");
            });
            firstItem = false;
        }
        if (searchResults.length > 0) {
            FocusManager.setFocus(this.resultsContainer);
        }
        else {
            this.Root.dispatchEvent(new PediaSearchCloseEvent());
        }
    }
    onTextEngineInput() {
        this.textInput.setAttribute("value", "");
    }
}
Controls.define('pedia-search', {
    createInstance: PediaSearch,
    description: 'Search box for the pedia.',
});
class PediaNavigation extends Component {
    constructor() {
        super(...arguments);
        this.boundOnNavigate = (page) => { this.onNavigatePage(page); };
        this.boundOnNavigateForward = () => { this.onNavigateForward(); };
        this.boundOnNavigateHome = () => { this.onNavigateHome(); };
        this.boundOnNavigateBack = () => { this.onNavigateBack(); };
        this.activeDeviceChangedListener = this.onActiveDeviceChange.bind(this);
    }
    onInitialize() {
        this.backContainer = MustGetElement(".pedia-navigation_back-container", this.Root);
        this.forwardContainer = MustGetElement(".pedia-navigation_forward-container", this.Root);
        this.backArrow = MustGetElement(".left-arrow", this.Root);
        this.backArrow.addEventListener('action-activate', this.boundOnNavigateBack);
        this.homeElement = MustGetElement(".pedia-navigation-item", this.Root);
        this.homeElement.addEventListener('action-activate', this.boundOnNavigateHome);
        this.homeElement.setAttribute("data-audio-group-ref", "civilopedia");
        this.forwardArrow = MustGetElement(".right-arrow", this.Root);
        this.forwardArrow.addEventListener('action-activate', this.boundOnNavigateForward);
    }
    onAttach() {
        Civilopedia.instance.onNavigatePage.on(this.boundOnNavigate);
        window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceChangedListener);
        this.toggleNavArrows();
        this.backArrow.setAttribute("data-audio-group-ref", "audio-pager");
        this.forwardArrow.setAttribute("data-audio-group-ref", "audio-pager");
    }
    onDetach() {
        Civilopedia.instance.onNavigatePage.off(this.boundOnNavigate);
        window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceChangedListener);
    }
    onActiveDeviceChange(event) {
        this.backArrow.classList.toggle("hidden", event.detail.gamepadActive);
        this.forwardArrow.classList.toggle("hidden", event.detail.gamepadActive);
    }
    onNavigatePage(_page) {
        this.toggleNavArrows();
    }
    toggleNavArrows() {
        this.backContainer.classList.toggle("opacity-0", !(Civilopedia.instance.canNavigateBackwards()));
        this.forwardContainer.classList.toggle("opacity-0", !(Civilopedia.instance.canNavigateForward()));
        this.backArrow.classList.toggle("hidden", ActionHandler.isGamepadActive);
        this.forwardArrow.classList.toggle("hidden", ActionHandler.isGamepadActive);
    }
    onNavigateHome() {
        Civilopedia.instance.navigateHome();
    }
    onNavigateBack() {
        Civilopedia.instance.navigateBack();
    }
    onNavigateForward() {
        Civilopedia.instance.navigateForward();
    }
}
Controls.define('pedia-navigation', {
    createInstance: PediaNavigation,
    description: 'Navigation bar for the pedia.',
});
class PediaSectionList extends Component {
    constructor() {
        super(...arguments);
        this.allSectionIds = [];
        this.onSectionTabSelectedListener = this.onTabSelected.bind(this);
    }
    onAttach() {
        const sections = Civilopedia.instance.getSections();
        const tabsContainer = MustGetElement(".pedia__top-menu-tab-bar", this.Root);
        let tabItems = [];
        let lastTabIndex = -1;
        for (const [index, section] of sections.entries()) {
            const pages = Civilopedia.instance.getPages(section.sectionID);
            if (pages && pages.length > 0) {
                this.allSectionIds.push(section.sectionID);
                tabItems.push({
                    icon: section.icon,
                    id: section.sectionID,
                    label: "",
                    iconClass: "size-10 img-rel-icon-select",
                    tooltip: section.nameKey,
                });
                if (section.sectionID == Civilopedia.instance.currentPage.sectionID) {
                    lastTabIndex = index;
                }
            }
        }
        tabsContainer.setAttribute("tab-items", JSON.stringify(tabItems));
        tabsContainer.setAttribute("data-audio-group-ref", "civilopedia");
        if (lastTabIndex > -1) {
            tabsContainer.setAttribute("selected-tab-index", lastTabIndex.toString());
        }
        //don't listen to tab selection for a frame, we want to load the last page we were on.
        delayByFrame(() => {
            tabsContainer.addEventListener("tab-selected", this.onSectionTabSelectedListener);
        }, 1);
    }
    onTabSelected(e) {
        const newSectionID = this.allSectionIds[e.detail.index];
        const pages = Civilopedia.instance.getPages(newSectionID);
        if (pages && pages.length > 0) {
            Civilopedia.instance.navigateTo({ sectionID: newSectionID, pageID: pages[0].pageID });
        }
    }
}
Controls.define('pedia-top-menu', {
    createInstance: PediaSectionList,
    description: 'List of sections for the pedia.',
});
class PediaPageList extends Component {
    constructor() {
        super(...arguments);
        this.activateListener = this.onActivate.bind(this);
        this.navigateListener = (page) => { this.onNavigate(page); };
        this.pageTabs = new Map();
        this.currentSectionID = null;
        this.currentPageID = null;
    }
    onInitialize() {
        this.pageItemContainer = MustGetElement(".pedia_page-list-container", this.Root);
        this.refresh();
    }
    onAttach() {
        Civilopedia.instance.onNavigatePage.on(this.navigateListener);
    }
    onDetach() {
        Civilopedia.instance.onNavigatePage.off(this.navigateListener);
    }
    onActivate(event) {
        if (event.target instanceof HTMLElement) {
            this.onNavigateToElement(event.target);
        }
    }
    onNavigate(page) {
        if (page.sectionID == this.currentSectionID) {
            if (this.currentPageID) {
                const el = this.pageTabs.get(this.currentPageID);
                if (el) {
                    el.removeAttribute('data-selected');
                }
            }
            this.currentPageID = page.pageID;
            const el = this.pageTabs.get(this.currentPageID);
            if (el) {
                el.setAttribute('data-selected', '1');
                // Set focus to the pedia-list-item for this page, which will cause the left column to scroll appropriately
                FocusManager.setFocus(el);
            }
        }
        else {
            this.refresh();
        }
    }
    onNavigateToElement(element) {
        const pageID = element.getAttribute('data-page-id');
        if (this.currentSectionID && pageID) {
            Civilopedia.instance.navigateTo({ sectionID: this.currentSectionID, pageID: pageID });
        }
    }
    onArticleUp() {
        const selection = this.Root.querySelector(".page-item-selected");
        if (selection) {
            const divider = selection.previousElementSibling;
            if (divider) {
                const prevSelection = divider.previousElementSibling;
                if (prevSelection) {
                    this.onNavigateToElement(prevSelection);
                }
            }
        }
    }
    onArticleDown() {
        const selection = this.Root.querySelector(".page-item-selected");
        if (selection) {
            const divider = selection.nextElementSibling;
            if (divider) {
                const nextSelection = divider.nextElementSibling;
                if (nextSelection) {
                    this.onNavigateToElement(nextSelection);
                }
            }
        }
    }
    refresh() {
        const currentPage = Civilopedia.instance.currentPage;
        this.currentSectionID = currentPage.sectionID;
        this.currentPageID = currentPage.pageID;
        this.pageTabs.clear();
        const sectionID = this.currentSectionID;
        while (this.pageItemContainer.hasChildNodes()) {
            this.pageItemContainer.removeChild(this.pageItemContainer.lastChild);
        }
        const pages = Civilopedia.instance.getPages(sectionID) ?? [];
        const pageGroups = Civilopedia.instance.getPageGroups(sectionID) ?? [];
        // Create a list of top level items to enumerate.
        const topLevelItems = [];
        for (const page of pages) {
            if (page.pageGroupID == null) {
                topLevelItems.push(page);
            }
        }
        for (const group of pageGroups) {
            if (group.visibleIfEmpty) {
                topLevelItems.push(group);
            }
            else {
                for (const page of pages) {
                    if (page.pageGroupID == group.pageGroupID) {
                        topLevelItems.push(group);
                        break;
                    }
                }
            }
        }
        topLevelItems.sort((a, b) => {
            return a.sortIndex - b.sortIndex;
        });
        const fragment = document.createDocumentFragment();
        for (const item of topLevelItems) {
            if (item.detailsType == Civilopedia.DetailsType.PageGroup) {
                const groupContainer = document.createElement('div');
                fragment.appendChild(groupContainer);
                const groupElement = document.createElement("pedia-page-group");
                groupElement.setAttribute('data-page--group-id', item.pageGroupID ?? '');
                groupElement.setAttribute('data-name', item.nameKey);
                groupContainer.appendChild(groupElement);
                const parent = groupContainer;
                for (const page of pages) {
                    if (page.pageGroupID == item.pageGroupID) {
                        const el = document.createElement("pedia-page-list-item");
                        el.setAttribute('data-page-id', page.pageID);
                        el.setAttribute('data-text', page.tabText);
                        el.setAttribute("tabindex", "-1");
                        el.setAttribute("data-audio-group-ref", "civilopedia");
                        el.classList.add("ml-3", "w-64", 'hidden');
                        if (currentPage.pageID == page.pageID) {
                            el.setAttribute('data-selected', '1');
                            this.currentPageID = page.pageID;
                        }
                        this.pageTabs.set(page.pageID, el);
                        parent.appendChild(el);
                        el.addEventListener('action-activate', this.activateListener);
                    }
                }
            }
            else if (item.detailsType == Civilopedia.DetailsType.Page) {
                const el = document.createElement("pedia-page-list-item");
                el.setAttribute('data-page-id', item.pageID);
                el.setAttribute('data-text', item.tabText);
                el.setAttribute("tabindex", "-1");
                el.setAttribute("data-audio-group-ref", "civilopedia");
                el.classList.add("ml-3", "w-64");
                if (currentPage.pageID == item.pageID) {
                    el.setAttribute('data-selected', '1');
                    this.currentPageID = item.pageID;
                }
                this.pageTabs.set(item.pageID, el);
                fragment.appendChild(el);
                el.addEventListener('action-activate', this.activateListener);
            }
        }
        this.pageItemContainer.appendChild(fragment);
    }
}
Controls.define('pedia-page-list', {
    createInstance: PediaPageList,
    description: 'Page list for the pedia.',
});
class PediaPageGroup extends ChooserItem {
    onInitialize() {
        super.onInitialize();
        this.Root.addEventListener("action-activate", () => {
            if (this.collapseIcon.classList.toggle("hidden")) {
                this.Root.setAttribute("data-audio-activate-ref", "data-audio-group-expand");
            }
            else {
                this.Root.setAttribute("data-audio-activate-ref", "data-audio-group-collapse");
            }
            this.expandIcon.classList.toggle("hidden");
            const items = this.Root.parentElement?.querySelectorAll("pedia-page-list-item");
            if (items) {
                for (const item of items) {
                    item.classList.toggle("hidden");
                }
            }
        });
    }
    render() {
        super.render();
        const chooserItem = document.createDocumentFragment();
        this.Root.classList.add("text-accent-2", "chooser-item_unlocked");
        this.Root.setAttribute("data-audio-group-ref", "civilopedia");
        this.Root.setAttribute("data-audio-activate-ref", "data-audio-group-collapse");
        const title = document.createElement("div");
        title.role = "heading";
        title.classList.value = "relative font-title-sm break-words uppercase mt-2 pl-4 pr-1 py-1 text-accent-2 pointer-events-auto";
        title.setAttribute("data-l10n-id", this.Root.getAttribute('data-name') ?? "");
        chooserItem.appendChild(title);
        this.collapseIcon = document.createElement("div");
        this.collapseIcon.classList.add("absolute", "size-8", "self-end", "mt-1", "img-questclose", "hidden");
        chooserItem.appendChild(this.collapseIcon);
        this.expandIcon = document.createElement("div");
        this.expandIcon.classList.add("absolute", "size-8", "self-end", "mt-1", "img-questopen");
        chooserItem.appendChild(this.expandIcon);
        this.Root.appendChild(chooserItem);
    }
}
Controls.define('pedia-page-group', {
    createInstance: PediaPageGroup,
    description: 'Page group for the pedia shown in the page list.',
    attributes: [
        {
            name: "data-name",
            description: "The localized name of the item.",
            required: true
        },
        {
            name: "data-selected",
            description: "Whether or not the item is selected.",
            required: false
        }
    ]
});
class PediaPageListItem extends ChooserItem {
    render() {
        super.render();
        const chooserItem = document.createDocumentFragment();
        this.Root.classList.add("text-accent-2", "chooser-item_unlocked");
        const title = document.createElement("div");
        title.role = "heading";
        title.classList.value = "relative font-title-sm break-words uppercase mt-2 pl-4 pr-1 py-1 text-accent-2 pointer-events-auto";
        title.setAttribute("data-l10n-id", this.Root.getAttribute('data-text') ?? "");
        chooserItem.appendChild(title);
        this.Root.appendChild(chooserItem);
    }
}
Controls.define('pedia-page-list-item', {
    createInstance: PediaPageListItem,
    description: 'Page list item for the pedia.',
    attributes: [
        {
            name: "data-name",
            description: "The localized name of the item.",
            required: true
        },
        {
            name: "data-selected",
            description: "Whether or not the item is selected.",
            required: false
        }
    ]
});
class PediaMainContent extends Component {
    constructor() {
        super(...arguments);
        this.boundOnNavigate = () => { this.onNavigate(); };
        this.sidebar = null;
    }
    onInitialize() {
        this.headerElement = MustGetElement(".pedia__header-text", this.Root);
        this.mainTextContainer = MustGetElement(".pedia__main-text-container", this.Root);
        this.sidebar = this.Root.querySelector('pedia-page-content-sidebar');
    }
    onAttach() {
        Civilopedia.instance.onNavigatePage.on(this.boundOnNavigate);
        this.refresh();
    }
    onDetach() {
        Civilopedia.instance.onNavigatePage.off(this.boundOnNavigate);
    }
    onNavigate() {
        this.refresh();
        Audio.playSound("data-audio-turn-page", "civilopedia");
    }
    refresh() {
        while (this.mainTextContainer.hasChildNodes()) {
            this.mainTextContainer.removeChild(this.mainTextContainer.lastChild);
        }
        const panelScroll = this.Root.querySelector('.content-main-scroll');
        panelScroll?.setAttribute('scrollpercent', '0');
        panelScroll?.setAttribute('handle-gamepad-pan', 'true');
        const currentPage = Civilopedia.instance.currentPage;
        const currentPageDetails = Civilopedia.instance.getPage(currentPage.sectionID, currentPage.pageID);
        if (!currentPageDetails) {
            console.error(`PediaMainContent: refresh - no page details found for sectionID ${currentPage.sectionID} and pageID ${currentPage.pageID}`);
            return;
        }
        this.headerElement.setAttribute('title', currentPageDetails.titleText ?? "ErrorTitle");
        const layout = GameInfo.CivilopediaPageLayouts.lookup(currentPageDetails.pageLayoutID);
        if (this.sidebar) {
            if (layout && layout.UseSidebar) {
                this.sidebar.setAttribute('data-section-id', currentPageDetails.sectionID);
                this.sidebar.setAttribute('data-page-id', currentPageDetails.pageID);
                this.sidebar.style.display = '';
            }
            else {
                this.sidebar.removeAttribute('data-section-id');
                this.sidebar.removeAttribute('data-page-id');
                this.sidebar.style.display = 'none';
            }
        }
        const chapters = Civilopedia.instance.getPageChapters(currentPageDetails.pageLayoutID);
        if (!chapters) {
            console.error(`PediaMainContent: refresh - no chapters found for sectionID ${currentPage.sectionID} and pageID ${currentPage.pageID}`);
            return;
        }
        for (const chapter of chapters) {
            const el = document.createElement('pedia-page-content-chapter');
            el.setAttribute('data-page-layout-id', currentPageDetails.pageLayoutID);
            el.setAttribute('data-section-id', currentPageDetails.sectionID);
            el.setAttribute('data-page-id', currentPageDetails.pageID);
            el.setAttribute('data-chapter-id', chapter.chapterID);
            this.mainTextContainer.appendChild(el);
        }
    }
}
Controls.define('pedia-page-content-main', {
    createInstance: PediaMainContent,
    description: 'Main content display for a specific pedia page.',
    classNames: [''],
});
function sortCivilopediaSidebarPanels(a, b) {
    return a.SortIndex - b.SortIndex;
}
class PediaSidebarContent extends Component {
    constructor() {
        super(...arguments);
        this.boundRefresh = this.doRefresh.bind(this);
        this.sectionID = null;
        this.pageID = null;
        this.rafID = 0;
    }
    onAttach() {
        this.sectionID = this.Root.getAttribute('data-section-id');
        this.pageID = this.Root.getAttribute('data-page-id');
        this.doRefresh();
        let panels = [];
        for (let panel of GameInfo.CivilopediaPageSidebarPanels) {
            if ((panel.SectionID == null || panel.SectionID == this.sectionID) &&
                (panel.PageID == null || panel.PageID == this.pageID)) {
                panels.push(panel);
            }
        }
        panels.sort(sortCivilopediaSidebarPanels);
    }
    onDetach() {
        if (this.rafID != 0) {
            cancelAnimationFrame(this.rafID);
            this.rafID = 0;
        }
        this.Root.innerHTML = '';
        this.sectionID = null;
        this.pageID = null;
    }
    onAttributeChanged(name, _oldValue, newValue) {
        if (name == 'data-section-id' && this.sectionID != newValue) {
            this.sectionID = newValue;
            this.queueRefresh();
        }
        else if (name == 'data-page-id' && this.pageID != newValue) {
            this.pageID = newValue;
            this.queueRefresh();
        }
    }
    queueRefresh() {
        if (this.rafID == 0 && this.sectionID && this.pageID) {
            this.rafID = requestAnimationFrame(this.boundRefresh);
        }
    }
    doRefresh() {
        this.rafID = 0;
        this.Root.innerHTML = '';
        if (this.pageID && this.sectionID) {
            let panels = [];
            for (let panel of GameInfo.CivilopediaPageSidebarPanels) {
                if ((panel.SectionID == null || panel.SectionID == this.sectionID) &&
                    (panel.PageID == null || panel.PageID == this.pageID)) {
                    panels.push(panel);
                }
            }
            panels.sort(sortCivilopediaSidebarPanels);
            const frag = document.createDocumentFragment();
            for (const p of panels) {
                const el = document.createElement(p.Component);
                if (this.sectionID) {
                    el.setAttribute('data-section-id', this.sectionID);
                }
                else {
                    el.removeAttribute('data-section-id');
                }
                if (this.pageID) {
                    el.setAttribute('data-page-id', this.pageID);
                }
                else {
                    el.removeAttribute('data-page-id');
                }
                frag.appendChild(el);
            }
            this.Root.appendChild(frag);
        }
    }
}
Controls.define('pedia-page-content-sidebar', {
    createInstance: PediaSidebarContent,
    description: 'Pedia page content sidebar.',
    attributes: [
        {
            'name': 'data-section-id',
            'description': 'The current navigated section.',
        },
        {
            'name': 'data-page-id',
            'description': 'The current navigated page.',
        },
    ]
});
class PediaChapter extends Component {
    onAttach() {
        const sectionID = this.Root.getAttribute('data-section-id');
        const pageID = this.Root.getAttribute('data-page-id');
        const chapterID = this.Root.getAttribute('data-chapter-id');
        const pageLayoutID = this.Root.getAttribute('data-page-layout-id');
        //Manual fetching and layout of more complex data
        if (sectionID == "CIVILIZATIONS") {
            const civTrait = Database.query('config', 'select * from CivilizationItems order by SortIndex')?.find(item => item.CivilizationType == pageID && item.Kind == "KIND_TRAIT");
            const traitHeader = document.createElement('fxs-header');
            traitHeader.classList.value = 'font-title text-lg text-secondary';
            traitHeader.setAttribute('title', civTrait?.Name);
            traitHeader.setAttribute('filigree-style', 'small');
            this.Root.appendChild(traitHeader);
            const traitText = document.createElement("div");
            traitText.role = "paragraph";
            traitText.classList.value = 'px-3 m-3 pb-3 font-body text-base pointer-events-auto';
            traitText.innerHTML = Locale.stylize(civTrait?.Description);
            this.Root.appendChild(traitText);
        }
        else if (sectionID == "LEADERS") {
            const leaderTrait = Database.query('config', 'select * from LeaderItems order by SortIndex')?.find(item => item.LeaderType == pageID && item.Kind == "KIND_TRAIT");
            const traitHeader = document.createElement('fxs-header');
            traitHeader.classList.value = 'font-title text-lg text-secondary';
            traitHeader.setAttribute('title', leaderTrait?.Name);
            traitHeader.setAttribute('filigree-style', 'small');
            this.Root.appendChild(traitHeader);
            const traitText = document.createElement("div");
            traitText.role = "paragraph";
            traitText.classList.value = 'px-3 m-3 pb-3 font-body text-base pointer-events-auto';
            traitText.innerHTML = Locale.stylize(leaderTrait?.Description);
            this.Root.appendChild(traitText);
        }
        if (sectionID && pageID && chapterID && pageLayoutID) {
            const body = Civilopedia.instance.getChapterBody(sectionID, pageID, chapterID, pageLayoutID);
            if (body && body.length > 0) {
                const header = Civilopedia.instance.getChapterHeader(sectionID, pageID, chapterID);
                if (header) {
                    const headerElement = document.createElement('fxs-header');
                    headerElement.setAttribute('title', header);
                    headerElement.classList.value = "font-title text-lg text-secondary";
                    headerElement.setAttribute('filigree-style', 'small');
                    this.Root.appendChild(headerElement);
                }
                for (const paragraph of body) {
                    const paragraphElement = document.createElement("div");
                    paragraphElement.role = "paragraph";
                    paragraphElement.setAttribute("data-l10n-id", paragraph);
                    paragraphElement.classList.value = "px-3 m-3 font-body text-base pointer-events-auto";
                    this.Root.appendChild(paragraphElement);
                }
            }
        }
        else {
            this.Root.classList.add('hidden');
        }
    }
}
Controls.define('pedia-page-content-chapter', {
    createInstance: PediaChapter,
    description: 'Specific chapter of a page in the pedia.',
});

//# sourceMappingURL=file:///base-standard/ui/civilopedia/screen-civilopedia.js.map
