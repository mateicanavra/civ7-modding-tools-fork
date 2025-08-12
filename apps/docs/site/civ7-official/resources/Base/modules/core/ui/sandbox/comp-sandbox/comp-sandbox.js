// @ts-nocheck
import FxsActivatable from '/core/ui/components/fxs-activatable.js';
export * from '/core/ui/components/fxs-activatable.js';
export * from '/core/ui/components/fxs-button.js';
export * from '/core/ui/components/fxs-button-group.js';
export * from '/core/ui/components/fxs-ornate-button.js';
export * from '/core/ui/components/fxs-text-button.js';
export * from '/core/ui/components/fxs-close-button.js';
export * from '/core/ui/components/fxs-switch.js';
export * from '/core/ui/components/fxs-minmax.js';
export * from '/core/ui/components/fxs-minus-plus.js';
export * from '/core/ui/components/fxs-radio-button.js';
export * from '/core/ui/components/fxs-checkbox.js';
export * from '/core/ui/components/fxs-slider.js';
export * from '/core/ui/components/fxs-switch.js';
export * from '/core/ui/components/fxs-tab-bar.js';
Loading.runWhenFinished(() => {
    const tabBarItems = JSON.stringify([
        { label: "Tab One" },
        { label: "Tab Two" },
        { label: "Tab Three" },
        { label: "Tab Four" },
        { label: "Tab Five" },
        { label: "Tab Six" }
    ]);
    const miniTabBarItems = JSON.stringify([
        {
            label: "Tab One",
            icon: "Action_Defend.png"
        },
        {
            label: "Tab Two",
            icon: "Action_Delete.png"
        },
        {
            label: "Tab Three",
            icon: "Action_Ranged.png"
        },
        {
            label: "Tab Four",
            icon: "Action_Heal.png"
        },
        {
            label: "Tab Five",
            icon: "Action_Formation.png"
        },
        {
            label: "Tab Six",
            icon: "Action_Alert.png"
        }
    ]);
    const container = document.querySelector('#tabbar-container');
    if (!container) {
        console.error('Could not find tabbar container');
        return;
    }
    const tabBar = document.createElement('fxs-tab-bar');
    tabBar.setAttribute('tab-items', tabBarItems);
    container.appendChild(tabBar);
    const flippedTabBar = document.createElement('fxs-tab-bar');
    flippedTabBar.setAttribute('type', 'flipped');
    flippedTabBar.setAttribute('tab-items', tabBarItems);
    container.appendChild(flippedTabBar);
    const miniTabBar = document.createElement('fxs-tab-bar');
    miniTabBar.setAttribute('tab-items', miniTabBarItems);
    miniTabBar.setAttribute('type', 'mini');
    container.appendChild(miniTabBar);
});
class ComponentSandbox extends Component {
    constructor(root) {
        super(root);
        this.colorEntries = [];
        this.LTEntries = [];
        this.MLEntries = [];
        this.MDEntries = [];
        this.DKEntries = [];
    }
    onInitialize() {
        super.onInitialize();
        let client = new XMLHttpRequest();
        client.open('GET', '/base-standard/data/colors/playerstandardcolors.xml');
        client.onreadystatechange = () => {
            if (client.readyState === 4) {
                this.rawEntries = client.responseText;
                const rowRegEx = /(?<=<Row>\s*)(.*?)(?=\s*<\/Row>)/gs;
                const typeRegEx = /(?<=<Type>\s*)(.*?)(?=\s*<\/Type>)/gs;
                const colorRegEx = /(?<=<Color>\s*)(.*?)(?=\s*<\/Color>)/gs;
                const mainEntries = this.rawEntries.match(rowRegEx);
                mainEntries.forEach((entry) => {
                    let title = entry.match(typeRegEx)[0];
                    const color = entry.match(colorRegEx)[0].split(',');
                    let targetArray = [];
                    if (title.includes('_LT')) {
                        title = title.replace('_LT', ' LIGHT');
                        targetArray = this.LTEntries;
                    }
                    if (title.includes('_ML')) {
                        title = title.replace('_ML', ' MID-LIGHT');
                        targetArray = this.MLEntries;
                    }
                    if (title.includes('_MD')) {
                        title = title.replace('_MD', ' MID-DARK');
                        targetArray = this.MDEntries;
                    }
                    if (title.includes('_DK')) {
                        title = title.replace('_DK', ' DARK');
                        targetArray = this.DKEntries;
                    }
                    const newColorEntry = {
                        name: title.replace('COLOR_STANDARD_', ''),
                        color: {
                            r: !isNaN(parseInt(color[0])) ? parseInt(color[0]) : 0,
                            g: !isNaN(parseInt(color[1])) ? parseInt(color[1]) : 0,
                            b: !isNaN(parseInt(color[2])) ? parseInt(color[2]) : 0
                        }
                    };
                    targetArray.push(newColorEntry);
                });
                this.colorEntries = [].concat(this.LTEntries, this.MLEntries, this.MDEntries, this.DKEntries);
                console.error(`colorEntries Length: ${this.colorEntries.length}`);
                const primaryDropdown = this.Root.querySelector('.comp-sandbox__primary-color-drop');
                if (primaryDropdown) {
                    const primaryDropdownContent = primaryDropdown.querySelector('.dropdown__list-content');
                    if (primaryDropdownContent) {
                        const currentPrimaryList = Array.from(primaryDropdownContent.querySelectorAll('.dropdown__list-item'));
                        currentPrimaryList.forEach((item) => {
                            primaryDropdownContent.removeChild(item);
                        });
                        this.createListItems(primaryDropdownContent, this.colorEntries);
                        primaryDropdown.setAttribute('content', 'hascontent');
                    }
                }
            }
        };
        client.send();
    }
    onAttach() {
        super.onAttach();
    }
    createListItems(parent, data) {
        data.forEach((item) => {
            const newItem = this.createListItem(item.name, `rgb(${item.color.r},${item.color.g},${item.color.b})`);
            parent.appendChild(newItem);
        });
    }
    createListItem(label, color) {
        const newListItem = document.createElement('fxs-activatable');
        newListItem.classList.add('dropdown__list-item', 'comp-sandbox__color-list-item');
        newListItem.innerHTML = `
			<div class="dropdown__list-highlight stretch"></div>
			<div class="comp-sandbox__color-square" style="background-color:${color};"></div>
			<div class="list-title">
				<div class="list-title--highlight stretch">${label}</div>
				${label}
			</div>
			<div class="dropdown__list-line"></div>
		`;
        newListItem.setAttribute("caption", label);
        return newListItem;
    }
}
Controls.define('comp-sandbox', {
    createInstance: ComponentSandbox,
    description: '',
    classNames: ['comp-sandbox'],
    styles: ["fs://game/core/ui/sandbox/comp-sandbox/comp-sandbox.css"],
    attributes: []
});
class TestButtonContainer extends Component {
    constructor(root) {
        super(root);
    }
    onAttach() {
        super.onAttach();
        const containerType = this.Root.getAttribute("type") ?? "";
        switch (containerType) {
            case "fixed-internal":
                this.setButtonWidth();
                break;
            default:
                break;
        }
    }
    // WARNING: Jank ahead
    // This waits until the buttons have rendered for 1 frame, then sets all of them to the width
    // of the longest one. This isn't possible using just flexbox (we need grid)
    // so a TS workaround was needed. Almost definitely a cleaner way of doing this
    setButtonWidth() {
        waitUntilValue(() => { return this.Root.querySelector('.fxs-button'); }).then(() => {
            let frames = 1;
            const checkWidth = (timeStamp) => {
                const button = this.Root.querySelector('.fxs-button');
                if (button.getBoundingClientRect().width > 0) {
                    const buttonList = this.Root.querySelectorAll('.fxs-button');
                    let length = 0;
                    for (let i = 0; i < buttonList.length; i++) {
                        const buttonRect = buttonList[i].getBoundingClientRect();
                        if (buttonRect.width > length) {
                            length = buttonRect.width;
                        }
                    }
                    buttonList.forEach((button) => { button.style.width = `${length}px`; });
                }
                else if (frames > 0) {
                    console.error(frames);
                    frames--;
                    requestAnimationFrame(checkWidth);
                }
            };
            checkWidth(0);
        });
    }
}
Controls.define('test-button-container', {
    createInstance: TestButtonContainer,
    description: '',
    classNames: ['test-button-container'],
    styles: ["fs://game/core/ui/sandbox/comp-sandbox/comp-sandbox.css"],
    attributes: []
});
class TestTabBar extends FxsActivatable {
    constructor(root) {
        super(root);
        this.testTabs = [
            { label: "Tab One" },
            { label: "Tab Two" },
            { label: "Tab Three" },
            { label: "Tab Four" },
            { label: "Tab Five" },
            { label: "Tab Six" }
        ];
        this.testMiniTabs = [
            {
                label: "Tab One",
                icon: "Action_Defend.png"
            },
            {
                label: "Tab Two",
                icon: "Action_Delete.png"
            },
            {
                label: "Tab Three",
                icon: "Action_Ranged.png"
            },
            {
                label: "Tab Four",
                icon: "Action_Heal.png"
            },
            {
                label: "Tab Five",
                icon: "Action_Formation.png"
            },
            {
                label: "Tab Six",
                icon: "Action_Alert.png"
            }
        ];
        this.tabList = [];
        this.onMouseEnter = () => {
            if (this.disabled) {
                UI.setCursorByType(UIHTMLCursorTypes.NotAllowed);
            }
        };
        this.onMouseLeave = () => {
            if (this.disabled) {
                UI.setCursorByType(UIHTMLCursorTypes.Default);
            }
        };
    }
    get disabled() {
        return this.Root.classList.contains('disabled');
    }
    onAttach() {
        let targetTabs = this.testTabs;
        let tabBGClass = 'fxs-tabbar__bg';
        let tabFrameClass = 'fxs-tabbar__frame';
        super.onAttach();
        this.Root.addEventListener('mouseenter', this.onMouseEnter);
        this.Root.addEventListener('mouseleave', this.onMouseLeave);
        const tabType = this.Root.getAttribute("type") ?? "";
        switch (tabType) {
            case "flipped":
                tabBGClass = 'fxs-tabbar__bg--flipped';
                tabFrameClass = 'fxs-tabbar__frame--flipped';
                break;
            case "mini":
                targetTabs = this.testMiniTabs;
                this.Root.classList.add('text-tabbar--mini');
                tabBGClass = 'fxs-tabbar__bg--mini';
                tabFrameClass = 'fxs-tabbar__frame--mini';
                break;
            default:
                tabBGClass = 'fxs-tabbar__bg';
                tabFrameClass = 'fxs-tabbar__frame';
                break;
        }
        const tabFragment = document.createDocumentFragment();
        const tabBG = document.createElement('div');
        tabBG.classList.add(tabBGClass, 'stretch');
        tabFragment.appendChild(tabBG);
        const tabFrame = document.createElement('div');
        tabFrame.classList.add(tabFrameClass, 'stretch');
        tabFragment.appendChild(tabFrame);
        targetTabs.forEach((tab, index) => {
            const newTab = this.createTab(tab, tabType);
            tabFragment.appendChild(newTab);
            this.tabList.push(newTab);
            if (index < this.testTabs.length - 1) {
                const newDivider = document.createElement('div');
                newDivider.classList.add('fxs-tabbar__divider');
                tabFragment.appendChild(newDivider);
            }
        });
        this.selectorLines = document.createElement('div');
        this.selectorLines.classList.add('fxs-tabbar__selector-lines', 'stretch');
        tabFragment.appendChild(this.selectorLines);
        this.selectorArrow = document.createElement('div');
        this.selectorArrow.classList.add('fxs-tabbar__selector-arrows');
        tabFragment.appendChild(this.selectorArrow);
        this.Root.appendChild(tabFragment);
    }
    createTab(tabData, tabType) {
        const tab = document.createElement('fxs-activatable');
        const tabLabel = document.createElement('div');
        const tabLabelHighlight = document.createElement('div');
        tab.classList.add('fxs-tabbar__item');
        const tabHighlight = document.createElement('div');
        tabHighlight.classList.add('fxs-tabbar__item-highlight', 'stretch');
        tab.appendChild(tabHighlight);
        if (tabType == "mini" && tabData.icon) {
            tabLabel.classList.add('fxs-tabbar__icon');
            tabLabel.style.backgroundImage = `url("fs://game/${tabData.icon}")`;
            tabLabelHighlight.classList.add('fxs-tabbar__icon--highlight', 'stretch');
            tabLabelHighlight.style.backgroundImage = `url("fs://game/${tabData.icon}")`;
            this.Root.setAttribute('data-tooltip-content', tabData.label);
            tab.appendChild(tabLabel);
            tab.appendChild(tabLabelHighlight);
        }
        else {
            tabLabel.classList.add('button-text', 'fxs-tabbar__label', "text-gap-0");
            tabLabel.setAttribute('data-l10n-id', tabData.label);
            tabLabelHighlight.classList.add('fxs-tabbar__label--highlight', 'stretch');
            tabLabelHighlight.setAttribute('data-l10n-id', tabData.label);
            tabLabel.appendChild(tabLabelHighlight);
            tab.appendChild(tabLabel);
        }
        tab.addEventListener('action-activate', () => {
            this.onTabSelected(tab);
        });
        return tab;
    }
    onTabSelected(selectedTab) {
        this.tabList.forEach((tab) => {
            tab.classList.toggle('selected', tab == selectedTab);
        });
        const rootRect = this.Root.getBoundingClientRect();
        const tabRect = selectedTab.getBoundingClientRect();
        const lineTarget = tabRect.x - rootRect.x;
        const arrowTarget = lineTarget + (tabRect.width * .5);
        this.selectorLines.style.transform = `translateX(${lineTarget}px)`;
        this.selectorLines.style.width = `${tabRect.width}px`;
        this.selectorArrow.style.transform = `translateX(${arrowTarget}px)`;
    }
    onDetach() {
        super.onDetach();
        this.Root.removeEventListener('mouseenter', this.onMouseEnter);
        this.Root.removeEventListener('mouseleave', this.onMouseLeave);
    }
}
Controls.define('test-tabbar', {
    createInstance: TestTabBar,
    description: '',
    classNames: ['test-tabbar'],
    styles: ["fs://game/core/ui/sandbox/comp-sandbox/comp-sandbox.css"],
    attributes: []
});
class TestDropdown extends FxsActivatable {
    constructor(root) {
        super(root);
        this.BOTTOM_MEASURE_OFFSET = 24;
        this.isOpen = false;
        this.currentSelection = 'Please Choose an Option';
        this.testSelectionList = [
            { label: 'Option 1' },
            { label: 'Option 2' },
            { label: 'Option 3' },
            { label: 'Option 4' },
            { label: 'Option 5' },
            { label: 'Option 6 Testing a Very Long String' },
            { label: 'Option 7' },
            { label: 'Option 8' },
            { label: 'Option 9' },
            { label: 'Option 10' },
            { label: 'Option 11' },
            { label: 'Option 12' }
        ];
        this.itemList = [];
        this.scrollArea = null;
        this.selector = null;
        this.contentList = null;
        this.onMouseEnter = () => {
            if (this.disabled) {
                UI.setCursorByType(UIHTMLCursorTypes.NotAllowed);
            }
        };
        this.onMouseLeave = () => {
            if (this.disabled) {
                UI.setCursorByType(UIHTMLCursorTypes.Default);
            }
        };
        this.Root.innerHTML = `
				<div class="dropdown__bg stretch"></div>
				<div class="dropdown__overlay stretch"></div>
				<div class="dropdown__content">
					<div class="dropdown__list-container">
						<div class="dropdown__list-bg">
							<div class="dropdown__list-frame"></div>
							<div class="dropdown__list-overlay"></div>
							<div class="dropdown__current-bar-shadow bottom-shadow"></div>
							<div class="dropdown__current-bar bottom-bar"></div>
						</div>
					</div>
				 	<div class="dropdown__current">
					 	<div class="dropdown__highlight"></div>
				 		<div class="dropdown__current-bg stretch">
						 	<div class="dropdown__highlight"></div>
						 	<div class="dropdown__current-overlay stretch"></div>
							<div class="dropdown__current-bar-shadow"></div>
							<div class="dropdown__current-bar"></div>
							<div class="dropdown__current-bar-shadow bottom-shadow"></div>
							<div class="dropdown__current-bar bottom-bar"></div>
						 </div>
						 <div class="dropdown__current-label checkbox-text text-gap-0">Test Dropdown Label</div>
						 <div class="dropdown__current-arrow"></div>						
						 <div class="dropdown__current current--highlight">
							<div class="dropdown__current-label checkbox-text text-gap-0">Test Dropdown Label</div>
							<div class="dropdown__current-arrow"></div>
						</div>
				 	</div>
				</div>

				`;
    }
    get disabled() {
        return this.Root.classList.contains('disabled');
    }
    onAttach() {
        super.onAttach();
        this.Root.addEventListener('mouseenter', this.onMouseEnter);
        this.Root.addEventListener('mouseleave', this.onMouseLeave);
        this.Root.addEventListener('action-activate', () => {
            this.toggleOpen();
        });
        const listContainer = this.Root.querySelector('.dropdown__list-container');
        if (listContainer) {
            const scrollable = document.createElement('fxs-scrollable');
            scrollable.classList.add('dropdown__list');
            this.contentList = document.createElement('fxs-vslot');
            this.contentList.classList.add('dropdown__list-content');
            this.selector = document.createElement('div');
            this.selector.classList.add('dropdown__list-selector');
            this.contentList.appendChild(this.selector);
            scrollable.appendChild(this.contentList);
            listContainer.appendChild(scrollable);
        }
        this.scrollArea = this.Root.querySelector('.fxs-scrollable-content');
        this.Root.addEventListener('wheel', (event) => {
            const target = event.target;
            if (this.Root.contains(target)) {
                const newScrollPos = this.scrollArea.scrollTop / (this.scrollArea.scrollHeight - this.scrollArea.offsetHeight);
                if ((event.deltaY > 0 && newScrollPos >= 1) ||
                    (event.deltaY < 0 && newScrollPos <= 0)) {
                    event.preventDefault();
                }
            }
        });
        this.createListItems(this.contentList, this.testSelectionList);
        this.Root.setAttribute('content', 'hascontent');
    }
    onDetach() {
        super.onDetach();
        this.Root.removeEventListener('mouseenter', this.onMouseEnter);
        this.Root.removeEventListener('mouseleave', this.onMouseLeave);
    }
    toggleOpen(force) {
        this.isOpen = force ?? !this.isOpen;
        if (this.isOpen) {
            // If opening, check if the dropdown will clip past the bottom of its scrollable parent, if it has one, and if so open upwards instead
            // Currently only checks for closest scrollable, but could also be converted to check for other parent types as well
            const content = this.Root.querySelector('.dropdown__content');
            if (content) {
                const contentParent = content.closest('.fxs-scrollable-content');
                if (contentParent) {
                    const contentBottom = this.Root.getBoundingClientRect().y + content.offsetHeight + this.BOTTOM_MEASURE_OFFSET;
                    const parentBottom = contentParent.getBoundingClientRect().y + contentParent.offsetHeight;
                    this.Root.classList.toggle('dropdown--up', contentBottom > parentBottom);
                }
            }
        }
        this.Root.classList.toggle('dropdown--open', this.isOpen);
    }
    createListItems(parent, data) {
        data.forEach((item) => {
            const newItem = this.createListItem(item.label);
            parent.appendChild(newItem);
        });
    }
    createListItem(label) {
        const newListItem = document.createElement('fxs-activatable');
        newListItem.classList.add('dropdown__list-item');
        newListItem.innerHTML = `
			<div class="dropdown__list-highlight stretch"></div>
			<div class="list-title">
				<div class="list-title--highlight stretch">${label}</div>
				${label}
			</div>
			<div class="dropdown__list-line"></div>
		`;
        newListItem.setAttribute("caption", label);
        return newListItem;
    }
    onItemSelected(selectedItem) {
        if (!this.contentList) {
            console.error(`Unable to find content list for dropdown ${this.Root.className}`);
            return;
        }
        this.itemList.forEach((item) => {
            item.classList.toggle('item--selected', item == selectedItem);
        });
        if (this.scrollArea && this.selector) {
            this.selector.classList.add('selector--visible');
            const rootRect = this.scrollArea?.getBoundingClientRect();
            const itemRect = selectedItem.getBoundingClientRect();
            const lineTarget = (selectedItem.offsetTop) + (selectedItem.offsetHeight * .5);
            this.selector.style.transform = `translateY(${lineTarget}px)`;
        }
        this.Root.setAttribute("caption", selectedItem.getAttribute("caption") ?? "");
        // this.toggleOpen(false);
    }
    onAttributeChanged(name, _oldValue, newValue) {
        switch (name) {
            case 'caption':
                {
                    const labels = Array.from(this.Root.querySelectorAll('.checkbox-text'));
                    if (newValue) {
                        labels.forEach((label) => { label.setAttribute('data-l10n-id', newValue); });
                    }
                    else {
                        labels.forEach((label) => { label.removeAttribute('data-l10n-id'); });
                    }
                }
                break;
            case 'content': {
                this.Root.removeAttribute('content');
                this.itemList = [];
                this.itemList = Array.from(this.contentList.querySelectorAll('.dropdown__list-item'));
                this.itemList.forEach((item) => {
                    item.addEventListener('action-activate', () => {
                        this.onItemSelected(item);
                    });
                });
            }
            default:
                super.onAttributeChanged(name, _oldValue, newValue);
                break;
        }
    }
}
Controls.define('test-dropdown', {
    createInstance: TestDropdown,
    description: '',
    classNames: ['test-dropdown'],
    styles: ["fs://game/core/ui/sandbox/comp-sandbox/comp-sandbox.css"],
    attributes: [
        {
            name: "caption",
            description: "The text label of the button."
        },
        {
            name: "content",
            description: "Whether the dropdown has new content to format."
        }
    ]
});
class TestRemove extends FxsActivatable {
    constructor(root) {
        super(root);
        this.onMouseEnter = () => {
            if (this.disabled) {
                UI.setCursorByType(UIHTMLCursorTypes.NotAllowed);
            }
        };
        this.onMouseLeave = () => {
            if (this.disabled) {
                UI.setCursorByType(UIHTMLCursorTypes.Default);
            }
        };
    }
    get disabled() {
        return this.Root.classList.contains('disabled');
    }
    onInitialize() {
        super.onInitialize();
        this.render();
    }
    onAttach() {
        super.onAttach();
    }
    onDetach() {
        super.onDetach();
        this.Root.removeEventListener('mouseenter', this.onMouseEnter);
        this.Root.removeEventListener('mouseleave', this.onMouseLeave);
    }
    render() {
        this.Root.innerHTML = `
			<div class="remove-button__shadow"></div>
			<div class="remove-button__bg stretch"></div>
			<div class="remove-button__highlight stretch"></div>
			<div class="remove-button__icon stretch"></div>
			<div class="remove-button__icon minusplus-button__icon--highlight stretch"></div>
			<div class="remove-button__overlay stretch"></div>
		`;
    }
}
Controls.define('test-remove-button', {
    createInstance: TestRemove,
    description: '',
    classNames: ['test-remove-button'],
    styles: ["fs://game/core/ui/sandbox/comp-sandbox/comp-sandbox.css"],
    attributes: []
});
class TestBumperArrow extends FxsActivatable {
    constructor(root) {
        super(root);
        this.onMouseEnter = () => {
            if (this.disabled) {
                UI.setCursorByType(UIHTMLCursorTypes.NotAllowed);
            }
        };
        this.onMouseLeave = () => {
            if (this.disabled) {
                UI.setCursorByType(UIHTMLCursorTypes.Default);
            }
        };
    }
    get disabled() {
        return this.Root.classList.contains('disabled');
    }
    onInitialize() {
        super.onInitialize();
        this.render();
    }
    onAttach() {
        super.onAttach();
    }
    onDetach() {
        super.onDetach();
        this.Root.removeEventListener('mouseenter', this.onMouseEnter);
        this.Root.removeEventListener('mouseleave', this.onMouseLeave);
    }
    render() {
        this.Root.innerHTML = `
			<div class="bumper-arrow__shadow"></div>
			<div class="bumper-arrow__bg stretch"></div>
			<div class="bumper-arrow__highlight stretch"></div>
			<div class="bumper-arrow__frame stretch"></div>
			<div class="bumper-arrow__overlay stretch"></div>
		`;
    }
}
Controls.define('test-bumper-arrow', {
    createInstance: TestBumperArrow,
    description: '',
    classNames: ['test-bumper-arrow'],
    styles: ["fs://game/core/ui/sandbox/comp-sandbox/comp-sandbox.css"],
    attributes: []
});
export { TestBumperArrow, TestRemove, TestDropdown, TestTabBar, TestButtonContainer, ComponentSandbox as default };

//# sourceMappingURL=file:///core/ui/sandbox/comp-sandbox/comp-sandbox.js.map
