/**
 * @file fxs-tab-bar.ts
 * @copyright 2023, Firaxis Games
 * @description A tab bar component that renders tabs and fires events when the user to switches tabs.
 */
import { NavigateInputEvent } from '/core/ui/input/input-support.js'
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js'

import * as Validation from '/core/ui/utilities/utilities-validation.js';
import { FxsTabItem } from './fxs-tab-item.js';
import './fxs-tab-item.js'; // The above import is elided during compilation
import { StatefulIcon } from '../stateful-icon/index.js'

export type TabSelectedEventDetail<T = TabItem> = {
	index: number,
	selectedItem: T
}

export class TabSelectedEvent<T extends TabItem = TabItem> extends CustomEvent<TabSelectedEventDetail<T>> {
	constructor(detail: TabSelectedEventDetail<T>) {
		super('tab-selected', {
			bubbles: true,
			cancelable: true,
			detail
		});
	}
}

type RequireKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

export type TabItemIcon = string | StatefulIcon.URLMap;
export type TabItem = {
	disabled?: boolean

	/** className is a per-item space separated list of classes to add to this tab item */
	className?: string
	id: string

	/** icon is an fs:// url or object of fs:// urls (for states) to use as the src of an img element in the tab item */
	icon?: TabItemIcon


	/** iconClass is a space separated list of classes to apply to the icon element */
	iconClass?: string

	/** label is a passed to the tab-item element and used via data-l10n-id */
	label?: string

	/** is the label not wrap on overflow */
	nowrap?: boolean

	/** tooltip is a loc string */
	tooltip?: string

	/** if true adds a tutorial highlight */
	highlight?: boolean

	/** text to go inside an icon */
	iconText?: string
}

export type IconTabItem = Omit<RequireKeys<TabItem, 'icon'>, 'label' | 'labelClass'>;

/**
 * To use the tab bar, include the `fxs-tab-bar` element in your HTML. The `tab-items` attribute should contain a JSON array of objects with the following properties:
 * 
 * - `label`: The label for the tab. This should be a localization ID.
 * - `icon`: The icon for the tab.
 * 
 * The `type` attribute can be set to `'mini'` or `'flipped'` to change the appearance of the tab bar. The default type is `'default'`.
 * 
 * The `tab-for` attribute is an optional selector that can be used to specify the ancestor the tab bar component should attach the navigation event handler to. This should be the "panel" or "screen" that the tab bar is a child of. The default value is `'fxs-frame'`.
 * 
 * For advanced use cases, the tab bar can be customized by subclassing and overriding the following methods:
 * 
 * - `renderTabOrnaments`: Renders ornaments appended directly to the root of the tab bar.
 * - `renderSelectionIndicators`: Renders the ornamental elements used to indicate the selected tab.
 * - `onSelectorPositionUpdate`: Called after a tab is selected to update highlight element positions.
 * - `renderTabDivider`: Renders a divider between tab items.
 * - `renderTab`: Renders a single tab item with the given icon and label.
 * 
 * Update the UI in response to tab selection by listening for the `tab-selected` event. For example:
 * 
 * ```ts
 * // Using a slot group
 * const slotGroup = document.querySelector('fxs-slot-group');
 * 
 * const tabControl = document.querySelector('fxs-tab-bar');
 * tabControl.addEventListener('tab-selected', (event: TabSelectedEvent) => {
 *   slotGroup.setAttribute('selected-slot', `panel-${event.detail.id}`);
 * });
 * ```
 */
export class FxsTabBar extends Component {
	private selectedTabIndex = -1;

	protected containerElement!: HTMLDivElement;
	protected selectionIndicatorElement!: HTMLDivElement;
	protected selectionIndicatorPositionValue = CSS.percent(0);
	private readonly navHelpLeftElement = document.createElement('fxs-nav-help');
	private readonly navHelpRightElement = document.createElement('fxs-nav-help');

	private tabItems: TabItem[] = [];
	private tabElements: ComponentRoot<FxsTabItem>[] = [];

	private useAltControls = false;

	/** 
	 * navHandler is the element to attach the navigation handler to. 
	 * Higher up the tree enables tabbing from anywhere in the screen.
	 */
	private navHandler: Element = this.Root;

	private resizeObserver = new ResizeObserver(this.doSelectorPositionUpdate.bind(this));
	private handleResizeEventListener = this.doSelectorPositionUpdate.bind(this);
	private navigateInputEventListener = this.onNavigateInput.bind(this);


	public get disabled(): boolean {
		return this.Root.getAttribute('disabled') === 'true';
	}

	public set disabled(value: boolean) {
		this.Root.setAttribute('disabled', value ? 'true' : 'false');
	}

	private onNavigateInput(event: NavigateInputEvent) {
		if (event.detail.status != InputActionStatuses.FINISH || this.disabled) {
			return;
		}

		const direction = event.getDirection();
		switch (direction) {
			case InputNavigationAction.PREVIOUS:
			case InputNavigationAction.NEXT: {
				if (!this.useAltControls) {
					let selectedIndex = this.selectedTabIndex;
					selectedIndex = direction === InputNavigationAction.PREVIOUS ? selectedIndex - 1 : selectedIndex + 1;
					selectedIndex = Math.max(0, Math.min(selectedIndex, this.tabItems.length - 1));

					if (selectedIndex !== this.selectedTabIndex) {
						// is the next one in the direction we're going disabled?
						if (this.tabElements[selectedIndex].getAttribute("disabled") == "true") {
							if (direction === InputNavigationAction.PREVIOUS) {
								selectedIndex = this.findPreviousTab(selectedIndex);
								if (selectedIndex == -1) {
									event.preventDefault();
									event.stopImmediatePropagation();
									return;
								}
							} else {
								selectedIndex = this.findNextTab(selectedIndex);
								if (selectedIndex == -1) {
									event.preventDefault();
									event.stopImmediatePropagation();
									return;
								}
							}
						}

						this.tabSelected(selectedIndex);
					}

					event.preventDefault();
					event.stopImmediatePropagation();
					const audioId = this.Root.getAttribute("data-audio-activate-ref");
					if (audioId && audioId != '') {
						this.playSound(audioId);
					}
				}
				break;
			}
			case InputNavigationAction.SHELL_PREVIOUS:
			case InputNavigationAction.SHELL_NEXT: {
				if (this.useAltControls) {
					let selectedIndex = this.selectedTabIndex;
					selectedIndex = direction === InputNavigationAction.SHELL_PREVIOUS ? selectedIndex - 1 : selectedIndex + 1;
					selectedIndex = Math.max(0, Math.min(selectedIndex, this.tabItems.length - 1));

					if (selectedIndex !== this.selectedTabIndex) {
						if (this.tabElements[selectedIndex].getAttribute("disabled") == "true") {
							if (direction === InputNavigationAction.SHELL_PREVIOUS) {
								selectedIndex = this.findPreviousTab(selectedIndex);
								if (selectedIndex == -1) {
									event.preventDefault();
									event.stopImmediatePropagation();
									return;
								}
							} else {
								selectedIndex = this.findNextTab(selectedIndex);
								if (selectedIndex == -1) {
									event.preventDefault();
									event.stopImmediatePropagation();
									return;
								}
							}
						}

						this.tabSelected(selectedIndex);
					}

					event.preventDefault();
					event.stopImmediatePropagation();
					const audioId = this.Root.getAttribute("data-audio-activate-ref");
					if (audioId && audioId != '') {
						this.playSound(audioId);
					}
				}
				break;
			}
		}

	}

	onInitialize() {
		super.onInitialize();
		this.render();
		this.updateNavHelp();
	}

	onAttach() {
		super.onAttach();

		// Find the best element to attach the navigation handler to. Default to fxs-frame.

		const tabForSelector = this.Root.getAttribute('tab-for') ?? 'fxs-frame';
		if (tabForSelector !== '') {
			const navHandler = this.Root.closest(tabForSelector);
			if (!navHandler) {
				console.error(`fxs-tab-bar: could not find nav handler for selector ${tabForSelector}. Attaching to root element instead, navigation will not work unless the tab bar is focused.`);
			} else {
				this.navHandler = navHandler;
			}
		} else {
			this.navHelpLeftElement.classList.add('hidden');
			this.navHelpRightElement.classList.add('hidden');
		}

		this.navHandler.addEventListener('navigate-input', this.navigateInputEventListener);
		this.Root.addEventListener('resize', this.handleResizeEventListener);
		this.Root.setAttribute("data-audio-activate-ref", "data-audio-tab-selected");
	}


	onDetach() {
		this.navHandler.removeEventListener('navigate-input', this.navigateInputEventListener);
		this.Root.removeEventListener('resize', this.handleResizeEventListener);
		super.onDetach();

		// Reset navHandler to avoid any latent connections.
		this.navHandler = this.Root;

		this.resizeObserver.disconnect();
	}

	onAttributeChanged(name: string, _oldValue: string | null, newValue: string | null) {
		switch (name) {
			case 'tab-items': {
				if (newValue) {
					this.updateTabItems(JSON.parse(newValue));
				} else {
					this.updateTabItems([]);
				}
				break;
			}

			case 'selected-tab-index': {
				if (newValue) {
					const index = Validation.number({ value: newValue, min: 0, max: this.tabItems.length - 1 });
					this.tabSelected(index);
				}
				break;
			}

			case 'alt-controls': {
				if (newValue) {
					if (newValue == 'true') {
						this.useAltControls = true;
					} else {
						this.useAltControls = false;
					}

					this.updateNavHelp();
				}
				break;
			}

			case 'disabled': {
				const disabled = newValue === 'true';
				const attributeValue = disabled ? 'true' : 'false';
				this.tabElements.forEach(tab => {
					tab.setAttribute('disabled', attributeValue);
				});
				break;
			}
		}
	}

	tabSelected(index: number) {
		if (index < 0 || index >= this.tabItems.length) {
			console.error(`fxs-tab-bar: invalid tab index ${index}`);
			return;
		}

		if (this.selectedTabIndex === index || this.disabled) {
			return;
		}

		this.Root.setAttribute('selected-tab-index', index.toString());

		const selectedItem = this.tabItems[index];
		const selectedElement = this.tabElements[index];
		const prevIndex = this.selectedTabIndex;
		const cancelled = !this.Root.dispatchEvent(new TabSelectedEvent({ index, selectedItem }));
		if (cancelled) {
			return;
		}

		this.selectedTabIndex = index;

		if (prevIndex >= 0) {
			this.tabElements[prevIndex].setAttribute('selected', 'false');
		}

		selectedElement.setAttribute('selected', 'true');
		this.resizeObserver.observe(selectedElement);
		this.doSelectorPositionUpdate();
	}

	private findPreviousTab(selectedIndex: number): number {
		while (selectedIndex >= 0) {
			if (this.tabElements[selectedIndex].getAttribute("disabled") != "true") {
				break;
			}

			if (selectedIndex > 0) {
				selectedIndex--;
			} else {
				return -1;
			}
		}

		return selectedIndex;
	}

	private findNextTab(selectedIndex: number): number {
		while (selectedIndex <= this.tabItems.length - 1) {
			if (this.tabElements[selectedIndex].getAttribute("disabled") != "true") {
				break;
			}

			if (selectedIndex < this.tabItems.length - 1) {
				selectedIndex++;
			} else {
				return -1;
			}
		}

		return selectedIndex;
	}

	/**
	 * Read in the tab data attribute and update the tab bar state
	 */
	private updateTabItems(tabItems: TabItem[]) {
		this.tabItems = tabItems;
		this.clearTabItems();

		const tabItemClassName = this.Root.getAttribute('tab-item-class') ?? '';
		const fragment = document.createDocumentFragment();
		const ourAudioGroup: string | null = this.Root.getAttribute("data-audio-group-ref");
		const ourFocusGroup: string | null = this.Root.getAttribute("data-audio-focus-ref");


		for (let index = 0; index < this.tabItems.length; index++) {
			const tab = this.tabItems[index];
			const tabElement = document.createElement('fxs-tab-item');

			// have the tab elements inherit our audio group and therefore focus sounds etc.
			if (ourAudioGroup) {
				tabElement.setAttribute("data-audio-group-ref", ourAudioGroup);
			}
			if (ourFocusGroup) {
				tabElement.setAttribute("data-audio-focus-ref", ourFocusGroup);
			}
			tabElement.setAttribute("data-audio-activate-ref", "data-audio-tab-selected");
			if (tab.label) {
				tabElement.setAttribute('label', tab.label);
				if (tab.nowrap) {
					tabElement.setAttribute('nowrap', tab.nowrap ? "true" : "false");
				}
			}

			if (tab.id) {
				tabElement.setAttribute("id", tab.id + "-tab-item");
			}

			if (tab.highlight) {
				tabElement.setAttribute("data-tut-highlight", "techChooserHighlights");
			}

			if (tab.icon) {
				StatefulIcon.SetAttributes(tabElement, tab.icon);
				if (tab.iconClass) {
					tabElement.setAttribute('icon-class', tab.iconClass);
				}
				if (tab.iconText) {
					tabElement.setAttribute('icon-text', tab.iconText);
				}
			}

			tabElement.classList.add(...tabItemClassName.split(' '));
			if (tab.className) {
				tabElement.classList.add(...tab.className.split(' '));
			}

			tabElement.setAttribute('disabled', tab.disabled ? 'true' : 'false');
			tabElement.setAttribute('selected', 'false');

			tabElement.addEventListener('action-activate', () => {
				this.tabSelected(index);
			});

			const tooltip: string | undefined = tabItems[index].tooltip;
			if (tooltip) {
				tabElement.setAttribute("data-tooltip-content", tooltip);
			}

			fragment.appendChild(tabElement);
			this.tabElements.push(tabElement);
		}

		this.containerElement.appendChild(fragment);

		if (this.tabItems.length > 0) {
			if (this.Root.hasAttribute("selected-tab-index")) {
				const index = Validation.number({ value: this.Root.getAttribute("selected-tab-index"), min: 0, max: this.tabItems.length - 1 });
				this.tabSelected(index);
			} else {
				this.tabSelected(0);
			}
		}
	}

	private clearTabItems() {
		const elements = this.containerElement.childNodes;
		for (let i = elements.length - 1; i >= 0; i--) {
			elements[i].remove();
		}

		this.tabElements = [];
		this.selectedTabIndex = -1;
	}

	private updateNavHelp() {
		if (this.useAltControls) {
			this.navHelpLeftElement.setAttribute("action-key", "inline-nav-shell-previous");
			this.navHelpRightElement.setAttribute("action-key", "inline-nav-shell-next");
		} else {
			this.navHelpLeftElement.setAttribute("action-key", "inline-cycle-prev");
			this.navHelpRightElement.setAttribute("action-key", "inline-cycle-next");
		}
		this.navHelpLeftElement.setAttribute("data-audio-activate-ref", "data-audio-tab-selected");
	}

	/**
	 * Called after a tab is selected to update highlight element positions.
	 * 
	 * Override this method to customize how highlight elements are positioned. If you override this method, you must also override `renderSelectionIndicators`.
	 */
	private onSelectorPositionUpdate() {
		const selectedTab = this.tabElements[this.selectedTabIndex];

		const rootRect = this.containerElement.getBoundingClientRect();
		const tabRect = selectedTab.getBoundingClientRect();
		let lineStart = tabRect.x;

		const lineTarget = lineStart - rootRect.x;

		this.selectionIndicatorPositionValue.value = (lineTarget) / rootRect.width * 100;
		this.selectionIndicatorElement.attributeStyleMap.set('left', this.selectionIndicatorPositionValue);

		//set the width of the ornament to the width of the selected tab
		const tabWidth = tabRect.width;
		this.selectionIndicatorElement.style.width = `${tabWidth}px`;
	}

	/**
	 * Calls the `onUpdateSelectorPosition` method after the next layout update.
	 */
	private doSelectorPositionUpdate() {
		waitForLayout(this.onSelectorPositionUpdate.bind(this));
	}

	/**
	 * Render the whole tab bar, but don't worry about the state yet.
	 */
	private render() {
		this.Root.classList.add('relative', 'flex', 'justify-center', 'h-16', 'uppercase', 'font-title', 'text-base', 'text-accent-2', 'tracking-150');
		if (this.Root.getAttribute('rect-render') == "true") {
			this.Root.innerHTML = `
				<div class="absolute inset-0 border-t-primary-3 border-t border-b-primary border-b pointer-events-none"></div>
				<div class="absolute inset-0 bg-primary opacity-10 pointer-events-none"></div>
			`
		} else if (this.Root.getAttribute('tab-style') == 'flat') {
			this.Root.innerHTML = `
				<div class="absolute inset-0 img-tab-bar-flat pointer-events-none"></div>
				<div class="absolute -left-1 img-tab-flat-end-cap pointer-events-none left-border"></div>
				<div class="absolute -right-1 rotate-y-180 img-tab-flat-end-cap pointer-events-none right-border"></div>
			`
		}
		else {
			this.Root.classList.add('px-12'); // padding for the end caps
			this.Root.innerHTML = `
				<div class="absolute inset-0 img-tab-bar pointer-events-none"></div>
				<div class="absolute -left-1\\.5 img-tab-end-cap pointer-events-none left-border"></div>
				<div class="absolute -right-1\\.5 rotate-y-180 img-tab-end-cap pointer-events-none right-border"></div>
			`
		}

		const navHelpLeftClassName = this.Root.getAttribute('nav-help-left-class') ?? 'absolute -left-9';
		this.navHelpLeftElement.classList.add(...navHelpLeftClassName.split(' '));
		this.Root.insertAdjacentElement('beforeend', this.navHelpLeftElement);

		this.Root.insertAdjacentHTML('beforeend', `
			<div class="relative flex flex-auto">
				<div class="flex flex-auto tab-bar__items justify-center"></div>
				<div class="absolute bottom-0 left-0 img-tab-selection-indicator bg-no-repeat bg-center min-h-6 bg-contain tab-bar__selection-indicator transition-left duration-150"></div>
			</div>
		`)

		const navHelpRightClassName = this.Root.getAttribute('nav-help-right-class') ?? 'absolute -right-9';
		this.navHelpRightElement.classList.add(...navHelpRightClassName.split(' '));
		this.Root.insertAdjacentElement('beforeend', this.navHelpRightElement);

		this.containerElement = MustGetElement('.tab-bar__items', this.Root);
		this.selectionIndicatorElement = MustGetElement('.tab-bar__selection-indicator', this.Root);
	}
}

Controls.define('fxs-tab-bar', {
	createInstance: FxsTabBar,
	attributes: [
		{
			name: 'tab-items'
		},
		{
			name: 'selected-tab-index'
		},
		{
			name: 'alt-controls'
		},
		{
			name: 'disabled',
		},
		{
			name: 'tab-style',
			description: 'flat, default is with img-tab-bar and img-tab-end-cap'
		}
	]
});

declare global {
	interface HTMLElementTagNameMap {
		"fxs-tab-bar": ComponentRoot<FxsTabBar>;
	}

	interface HTMLElementEventMap {
		"tab-selected": TabSelectedEvent;
	}
}

export { FxsTabBar as default }