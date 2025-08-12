/**
 * @file fxs-tabcontrol.ts
 * @copyright 2021-2022, Firaxis Games
 * @description A tab control.
 */
import FocusManager from '/core/ui/input/focus-manager.js';
export class FxsTabControl extends ChangeNotificationComponent {
    constructor(root) {
        super(root);
        this.isVertical = false;
        this.selectedTab = -1;
        this.iconWidth = "3rem";
        this.iconHeight = "3rem";
        this.navigateInputListener = this.onNavigateInput.bind(this);
        this.focusListener = this.onFocus.bind(this);
        let isFlipped = false;
        this.tabButtons = [];
        this.tabPanels = [];
        this.numTabs = 0;
        const container = document.createElement('fxs-vslot');
        // tabBar contains the tab buttons
        this.tabBar = document.createElement('fxs-hslot');
        this.tabBar.classList.add('tab-container');
        this.tabBar.classList.add('fxs-tab-control__tab-bar');
        // rootSlot is where all of the tab contents go
        this.rootSlot = document.createElement('fxs-slot');
        this.rootSlot.classList.add('tab-slot');
        const value = this.Root.getAttribute("tab-style");
        if (value) {
            if ((value == "bottom") || (value == "right")) {
                isFlipped = true;
            }
            if ((value == "top") || (value == "bottom")) {
                container.classList.add('fxs-tab-control-h');
                this.isVertical = false;
            }
            else {
                container.classList.add('fxs-tab-control-v');
                this.isVertical = true;
            }
        }
        // swap the order in the flex layout of the tab bar and the container slot
        if (isFlipped) {
            container.appendChild(this.rootSlot);
            container.appendChild(this.tabBar);
        }
        else {
            container.appendChild(this.tabBar);
            container.appendChild(this.rootSlot);
        }
        const iconHeight = this.Root.getAttribute("tab-icon-height");
        if (iconHeight) {
            this.iconHeight = iconHeight;
        }
        const iconWidth = this.Root.getAttribute("tab-icon-width");
        if (iconWidth) {
            this.iconWidth = iconWidth;
        }
        this.Root.appendChild(container);
    }
    /**
     *  Crack a list of tabs in the form 'name;class:name;class:name;class'.
     *  If "name" starts with "//game/" it is assumed to be an image URL rather
     *  than text and shown accordingly.  The control's "tab-icon-width" and
     *  "tab-icon-height" attributes then control the image size shown.
     *
     *  All controls with a class matching "class" will be reparented to the
     *  appropriate tab's slot.
     */
    realizeTabs() {
        const tabClass = this.Root.getAttribute("tab-list");
        if (tabClass) {
            const navHelpLeft = document.createElement("fxs-nav-help");
            navHelpLeft.setAttribute("action-key", "inline-cycle-prev");
            navHelpLeft.classList.add("tab-nav-help-left");
            this.tabBar.appendChild(navHelpLeft);
            let endOfTabs = false;
            let tabIndex = 0;
            let lastIndex = 0;
            let subString = "";
            do {
                // find the next : in the string
                tabIndex = tabClass.indexOf(':', lastIndex);
                // is this the last entry in the string?
                if (tabIndex == -1) {
                    // there isn't another one, so we're on the last tab
                    subString = tabClass.slice(lastIndex);
                    endOfTabs = true;
                }
                else {
                    subString = tabClass.slice(lastIndex, tabIndex);
                    // skip the actual separator when starting our next search
                    lastIndex = tabIndex + 1;
                }
                // now separate the name and class
                let classIdx = subString.indexOf(';');
                if (classIdx != -1) {
                    const title = subString.slice(0, classIdx);
                    const className = subString.slice(classIdx + 1);
                    // create this tab if it doesn't exist, otherwise it returns the existing container
                    let newTabPanel = this.addTab(title, className);
                    if (newTabPanel) {
                        this.numTabs++;
                        this.Root.setAttribute("num-tabs", this.numTabs.toString());
                        // reparent the elements of this class to the tab's container
                        const tabElements = this.Root.querySelectorAll('.' + className);
                        tabElements.forEach((tabElement) => {
                            newTabPanel?.appendChild(tabElement);
                        });
                    }
                }
            } while (!endOfTabs);
            const navHelpRight = document.createElement("fxs-nav-help");
            navHelpRight.setAttribute("action-key", "inline-cycle-next");
            navHelpRight.classList.add("tab-nav-help-right");
            this.tabBar.appendChild(navHelpRight);
        }
        // select the first tab
        this.Root.setAttribute("selected-tab", "0");
    }
    onAttach() {
        super.onAttach();
        this.Root.addEventListener('navigate-input', this.navigateInputListener);
        this.Root.addEventListener('focus', this.focusListener);
        this.realizeTabs();
    }
    onDetach() {
        this.Root.removeEventListener('focus', this.focusListener);
        this.Root.removeEventListener('navigate-input', this.navigateInputListener);
        super.onDetach();
    }
    onAttributeChanged(name, oldValue, newValue) {
        if (name == "selected-tab" && oldValue != newValue) {
            const newSelectedTabIndex = parseInt(newValue || '0');
            this.selectTab(newSelectedTabIndex);
            if (FocusManager.getFocusChildOf(this.Root)) {
                this.onFocus();
            }
        }
    }
    selectTab(newSelectedTabIndex) {
        if (newSelectedTabIndex == this.selectedTab) {
            return;
        }
        if ((newSelectedTabIndex < 0) || (newSelectedTabIndex >= this.numTabs)) {
            console.error("fxs-tabcontrol: selectTab(): Invalid tab index to select!");
            return;
        }
        if (this.numTabs != this.tabPanels.length) {
            console.error("fxs-tabcontrol: selectTab(): Incoherence! There is not the same number of tabs and panels!");
            return;
        }
        if (this.numTabs != this.tabButtons.length) {
            console.error("fxs-tabcontrol: selectTab(): Incoherence! There is not the same number of tabs and buttons!");
            return;
        }
        this.selectedTab = newSelectedTabIndex;
        for (let i = 0; i < this.tabPanels.length; i++) {
            if (i == this.selectedTab) {
                this.tabButtons[i].classList.add("selected");
                this.tabPanels[i].style.display = 'flex';
            }
            else {
                this.tabButtons[i].classList.remove("selected");
                this.tabPanels[i].style.display = 'none';
            }
        }
        // Signal change to any outside listener.
        this.sendValueChange(new CustomEvent("component-value-changed", {
            bubbles: false,
            cancelable: false,
            detail: {
                value: this.selectedTab
            }
        }));
    }
    /** Add a new tab item and creates the tab (and container if necessary). */
    addTab(title, tabID) {
        let tabButton;
        let tabButtonAlreadyExists = false;
        // See if this tab button already exists 
        if (this.tabButtons.length > 0) {
            tabButton = this.tabButtons.find(t => t.getAttribute("tabID") == tabID);
            if (tabButton != undefined) {
                tabButtonAlreadyExists = true;
            }
        }
        // If needed, create the tab button.
        if (!tabButtonAlreadyExists) {
            tabButton = document.createElement("fxs-activatable");
            tabButton.classList.add("fxs-tab-button");
            tabButton.classList.add(`category-tab-${tabID}`);
            const contents = document.createElement('div');
            contents.classList.add("contents");
            tabButton.appendChild(contents);
            // tab label (text or icon URL minus the "fs:")
            if (title.search("//game/") != 0) {
                contents.innerHTML = Locale.compose(title);
            }
            else {
                contents.style.height = this.iconHeight;
                contents.style.width = this.iconWidth;
                contents.style.backgroundImage = "url('fs:" + title + "')";
            }
            tabButton.setAttribute("tabID", tabID);
            const tabNum = this.tabButtons.length;
            this.tabButtons.push(tabButton);
            this.tabBar.appendChild(tabButton);
            tabButton.addEventListener('action-activate', () => {
                this.Root.setAttribute("selected-tab", tabNum.toString());
            });
        }
        // Find or create the display panel 
        let tabPanel;
        // If needed, create the tab panel.
        if (!tabButtonAlreadyExists) {
            if (this.isVertical) {
                tabPanel = document.createElement("fxs-hslot");
            }
            else {
                tabPanel = document.createElement("fxs-vslot");
            }
            tabPanel.classList.add(`category-panel-${tabID}`);
            tabPanel.setAttribute("tabID", tabID);
            this.tabPanels.push(tabPanel);
            this.rootSlot.appendChild(tabPanel);
        }
        return tabPanel;
    }
    onNavigateInput(navigationEvent) {
        const live = this.handleNavigation(navigationEvent);
        if (!live) {
            navigationEvent.preventDefault();
            navigationEvent.stopImmediatePropagation();
        }
    }
    /**
     * @returns true if still live, false if input should stop.
     */
    handleNavigation(navigationEvent) {
        if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
            // Ignore everything but FINISH events
            return true;
        }
        let live = true;
        const direction = navigationEvent.getDirection();
        switch (direction) {
            case InputNavigationAction.PREVIOUS:
            case InputNavigationAction.NEXT: {
                const selectedTabIndexAttribute = this.Root.getAttribute("selected-tab");
                if (selectedTabIndexAttribute) {
                    let selectedTabIndex = parseInt(selectedTabIndexAttribute);
                    selectedTabIndex = direction == InputNavigationAction.PREVIOUS ? selectedTabIndex - 1 : selectedTabIndex + 1;
                    if (selectedTabIndex >= 0 && selectedTabIndex < this.numTabs) {
                        this.Root.setAttribute("selected-tab", selectedTabIndex.toString());
                    }
                }
                live = false;
                break;
            }
        }
        return live;
    }
    /**
     * Respond to being directly set to focus.
     */
    onFocus() {
        FocusManager.setFocus(this.tabPanels[this.selectedTab]);
    }
}
// Standard tab control.  Tab strip can be on any of the 4 primary sides of the content.
// Set tab-style attribute to "top", "bottom", "left", or "right" to choose where the tab strip goes.
Controls.define('fxs-tab-control', {
    createInstance: FxsTabControl,
    description: 'Tab control',
    classNames: ['fxs-tab-control'],
    attributes: [
        {
            name: 'selected-tab'
        },
        {
            name: 'tab-style'
        },
        {
            name: 'tab-list'
        },
        {
            name: 'tab-icon-width'
        },
        {
            name: 'tab-icon-height'
        }
    ],
    tabIndex: -1
});

//# sourceMappingURL=file:///core/ui/components/fxs-tabcontrol.js.map
