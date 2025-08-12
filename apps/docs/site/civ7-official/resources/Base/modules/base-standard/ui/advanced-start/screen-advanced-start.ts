/**
 * @file screen-advanced-start.ts
 * @copyright 2022 - 2025, Firaxis Games
 * @description Advanced Start screen
 */

import AdvancedStart from '/base-standard/ui/advanced-start/model-advanced-start.js';
import TutorialManager from '/base-standard/ui/tutorial/tutorial-manager.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import Cursor from '/core/ui/input/cursor.js';
import DialogManager, { DialogBoxAction, DialogBoxID } from '/core/ui/dialog-box/manager-dialog-box.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, NavigateInputEvent } from '/core/ui/input/input-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import PlotCursor from '/core/ui/input/plot-cursor.js'
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import ActionHandler from '/core/ui/input/action-handler.js';
import { displayRequestUniqueId } from '/core/ui/context-manager/display-handler.js';

interface AdvancedStartOptions {
	isAgeTransition: boolean;
}

const AdvancedStartBonusPlacementStarted: CustomEvent = new CustomEvent("advanced-start-bonus-placement-started");

class ScreenAdvancedStart extends Panel {

	private engineInputListener = this.onEngineInput.bind(this);

	private availableCardActivateListener = this.onAvailableCardActivate.bind(this);
	private selectedCardActivateListener = this.onSelectedCardActivate.bind(this);
	private removeCardAnimationListener = this.onRemoveListener.bind(this);
	private effectActivateListener = this.onEffectActivate.bind(this);
	private confirmDeckButtonListener = this.onConfirmDeck.bind(this);
	private forceCompleteButtonListener = this.onForceComplete.bind(this);
	private closeButtonListener = this.close.bind(this);
	private autoFillListener = this.autofillDeck.bind(this);
	private cardAddedListener = this.onCardAdded.bind(this);
	private cardRemovedListener = this.onCardRemovedListener.bind(this);
	private effectUsedListener = this.onEffectUsed.bind(this);
	private interfaceModeChangedListener = this.onInterfaceModeChanged.bind(this);
	private flashCostAnimationListener = this.onFlashAnimationEnd.bind(this);

	private filterAvailableCardsListener = this.setFilterAvailableCards.bind(this);
	private preSelectNavListener = this.setPresetLegacies.bind(this);
	private navigateInputListener = this.onNavigateInput.bind(this);
	private dialogId: DialogBoxID = displayRequestUniqueId();

	private isAdvancedStart: boolean = false;
	private filterButtons: string[] = [];
	private filterButtonIndex: number = -1;

	onInitialize(): void {
		super.onInitialize();
		this.Root.classList.add('relative', 'h-full', 'w-full', 'fixed');
	}

	onAttach() {
		super.onAttach();
		AdvancedStart.refreshCardList();
		Audio.playSound('data-audio-advanced-start-enter', 'audio-advanced-start');
		Telemetry.sendCardSelectionStart();

		this.Root.addEventListener('engine-input', this.engineInputListener);
		this.Root.addEventListener('navigate-input', this.navigateInputListener);
		engine.on('AdvancedStartCardAdded', this.cardAddedListener);
		engine.on('AdvancedStartCardRemoved', this.cardRemovedListener);
		engine.on('AdvancedStartEffectUsed', this.effectUsedListener);
		window.addEventListener('interface-mode-changed', this.interfaceModeChangedListener);

		const advStartChooser = MustGetElement('.adv-start__available-legacy-wrapper', this.Root);
		if (advStartChooser && AdvancedStart.deckConfirmed) {
			advStartChooser.classList.add('hidden');
		}
		// Available Cards
		const availableCards: HTMLElement | null = MustGetElement('.available-cards', this.Root);
		if (!availableCards) {
			console.error('screen-advanced-start: onAttach(): Failed to find available-cards!');
			return;
		}

		const cardDiv: HTMLElement = document.createElement('div');
		{
			Databind.for(cardDiv, 'g_AdvancedStartModel.filteredCards', 'entry');
			{
				const cardEntry = document.createElement('fxs-activatable');

				this.buildAvailableCard(cardEntry);
				cardEntry.setAttribute("data-audio-group-ref", "audio-advanced-start");
				cardEntry.setAttribute("data-audio-focus-ref", "data-audio-advanced-start-card-focus");
				cardEntry.setAttribute("data-audio-activate-ref", "data-audio-advanced-start-card-activate");
				cardEntry.setAttribute("data-audio-press-ref", "data-audio-add-press");
				cardEntry.addEventListener('action-activate', this.availableCardActivateListener);
				cardEntry.setAttribute('data-bind-attr-play-error-sound', '{{entry.cannotBeAdded}}');

				cardDiv.appendChild(cardEntry);
			}
		}
		availableCards.appendChild(cardDiv);
		// Selected Cards
		const selectedCards: HTMLElement | null = this.Root.querySelector<HTMLElement>('.adv-start__selected-cards-list-container');
		if (!selectedCards) {
			console.error('screen-advanced-start: onAttach(): Failed to find selected-cards!');
			return;
		}
		const selectedList: HTMLElement | null = selectedCards.querySelector<HTMLElement>('.cards-list--full');
		if (!selectedList) {
			console.error('screen-advanced-start: onAttach(): Failed to find selected-cards subsection!');
			return;
		}

		// Update deck limit header
		this.setupDeckLimitHeader();

		const selectedCardDiv: HTMLElement = document.createElement('div');
		{
			Databind.for(selectedCardDiv, 'g_AdvancedStartModel.selectedCards', 'entry');
			{
				const selectedCardEntry: HTMLElement = document.createElement('fxs-activatable');

				this.buildSelectedCard(selectedCardEntry);
				selectedCardEntry.setAttribute("data-audio-group-ref", "audio-advanced-start");
				selectedCardEntry.setAttribute("data-audio-focus-ref", "data-audio-advanced-start-card-focus");
				selectedCardEntry.setAttribute("data-audio-activate-ref", "data-audio-advanced-start-card-deactivate");
				selectedCardEntry.setAttribute("data-audio-press-ref", "data-audio-remove-press");
				selectedCardEntry.addEventListener('action-activate', this.selectedCardActivateListener);

				selectedCardDiv.appendChild(selectedCardEntry);

			}
		}
		selectedList.appendChild(selectedCardDiv);
		selectedCards.classList.add('contracted');

		// Card Effects
		const cardEffects: HTMLElement | null = this.Root.querySelector<HTMLElement>('.card-effects');
		if (!cardEffects) {
			console.error('screen-advanced-start: onAttach(): Failed to find card-effects!');
			return;
		}

		const cardEffectDiv: HTMLElement = document.createElement('div');
		{
			Databind.for(cardEffectDiv, 'g_AdvancedStartModel.placeableCardEffects', 'entry');
			{
				const cardEffectEntry: HTMLElement = document.createElement('fxs-activatable');

				this.buildSelectedCard(cardEffectEntry);
				cardEffectEntry.setAttribute("data-audio-group-ref", "audio-advanced-start");
				cardEffectEntry.setAttribute("data-audio-focus-ref", "data-audio-advanced-start-card-focus");
				cardEffectEntry.setAttribute("data-audio-press-ref", "data-audio-effect-card-press");
				cardEffectEntry.setAttribute("data-audio-activate-ref", "data-audio-effect-card-activate");
				cardEffectEntry.setAttribute('data-bind-attr-data-type-id', '{{entry.effectID}}');
				cardEffectEntry.setAttribute('data-bind-class-toggle', 'hide: !{{entry.display}}');
				cardEffectEntry.classList.add('advanced-start-effect', 'mr-13');

				cardEffectEntry.addEventListener('action-activate', this.effectActivateListener);

				cardEffectDiv.appendChild(cardEffectEntry);
			}
		}
		cardEffects.appendChild(cardEffectDiv);

		// Filter Cards Buttons
		this.buildFilterButtons();

		this.buildButtonBar();

		const selectedCardsContainer: HTMLElement | null = this.Root.querySelector<HTMLElement>('.adv-start__selected-cards-container');
		if (!selectedCardsContainer) {
			console.error('screen-advanced-start: onAttach(): Failed to find selected-cards-container!');
			return;
		}

		// auto-expand if we are jumping to the placement screen
		if (!AdvancedStart.deckConfirmed) {
			if (selectedCardsContainer) {
				if (!selectedCardsContainer.classList.contains('expanded')) {
					selectedCardsContainer.classList.remove('contracted');
					selectedCardsContainer.classList.add('expanded');
				}
			}
		}

		engine.synchronizeModels();

		AdvancedStart.advancedStartClosed = false;

		InterfaceMode.switchTo("INTERFACEMODE_ADVANCED_START");
	}

	onReceiveFocus(): void {
		super.onReceiveFocus();

		// TODO Modify to use a view with a layout instead of the context manager.
		switch (InterfaceMode.getCurrent()) {
			case "INTERFACEMODE_ADVANCED_START":
				Input.setActiveContext(InputContext.Shell);
				this.setupNavTray();
				break;
			case "INTERFACEMODE_BONUS_PLACEMENT":
				Input.setActiveContext(InputContext.World);
				this.setupNavTray();
				break;
		}

		window.requestAnimationFrame(() => {
			window.requestAnimationFrame(() => {
				// Focus the available legacy initially
				if (AdvancedStart.deckConfirmed) {
					const cardEffects: HTMLElement | null = this.Root.querySelector<HTMLElement>('.card-effects');
					if (cardEffects) {
						FocusManager.setFocus(cardEffects);
					} else {
						console.error("ScreenAdvancedStart: Could not find cardEffects in this.Root");
					}
				} else {
					const advStartCard: HTMLElement | null = this.Root.querySelector<HTMLElement>('.adv-start__card')
					if (advStartCard) {
						FocusManager.setFocus(advStartCard);
					} else {
						console.error("ScreenAdvancedStart: Could not find filterButton in this.Root");
					}
				}

				this.setupNavTray();
			});
		});
	}

	private buildCardEntry(cardEntry: HTMLElement, isSelectedCard: boolean = false) {
		cardEntry.setAttribute("tabindex", "-1");
		cardEntry.classList.add('adv-start__card', 'advanced-start-available-card');
		cardEntry.classList.toggle('adv-start__card--selected', isSelectedCard);
		cardEntry.setAttribute('data-bind-attr-data-type-id', '{{entry.typeID}}');
		cardEntry.setAttribute('data-bind-class', '{{entry.colorClass}}');
		const cardContent: HTMLElement = document.createElement('div');
		cardContent.classList.add('adv-start__card-content', 'mb-3', 'border-2');
		cardContent.classList.toggle('min-h-13', isSelectedCard);
		const cardContentRadial = document.createElement('div');
		cardContentRadial.classList.add('adv-start__card-radial', 'absolute', 'inset-0',);
		cardContent.appendChild(cardContentRadial);
		const cardBgIcon = document.createElement('div');
		cardBgIcon.classList.add('adv-start__card-bg-icon', 'absolute', 'right-0', '-top-2', 'size-32', 'bg-center', 'bg-no-repeat', 'bg-contain', 'opacity-10');
		cardBgIcon.classList.toggle('hidden', isSelectedCard);
		cardContent.appendChild(cardBgIcon);
		const cardHighlight: HTMLElement = document.createElement('div');
		cardHighlight.classList.add('adv-start__card-highlight', 'absolute', 'inset-0', 'z-1', 'opacity-0', 'adv-start__card-highlight-frame');
		cardContent.appendChild(cardHighlight);

		const outerContainer: HTMLElement = document.createElement('fxs-hslot');
		outerContainer.classList.add('adv-start__card-info', 'justify-start', 'px-1\\.5', 'text-accent-1', "items-center");
		const innerContainer: HTMLElement = document.createElement('fxs-vslot');
		innerContainer.classList.add('adv-start__card-text', 'text-accent-1', 'py-4', 'pl-1', 'flex-1');

		// Cards have a mix of by-type and card-specific icons, this is it
		const cardTypeIcon: HTMLElement = document.createElement('div');
		cardTypeIcon.classList.add('adv-start__card-type-icon', 'size-14', 'relative', 'flex', 'bg-no-repeat', 'bg-center', 'bg-contain');
		cardTypeIcon.classList.toggle('mt-2', !isSelectedCard);
		cardTypeIcon.classList.toggle('mt-1', isSelectedCard);
		cardTypeIcon.setAttribute('data-bind-style-background-image-url', '{{entry.typeIcon}}');
		outerContainer.appendChild(cardTypeIcon);
		const entryName: HTMLElement = document.createElement('div');
		entryName.classList.add('adv-start__card-name', 'font-title', 'text-xs', 'uppercase', 'tracking-100', 'w-3\\/4', 'break-words');
		Databind.locText(entryName, 'entry.name');
		innerContainer.appendChild(entryName);

		const entryDescription: HTMLElement = document.createElement('div');
		entryDescription.classList.add('adv-start__card-description', 'font-body-sm', 'flex', 'flex-wrap');
		Databind.locText(entryDescription, 'entry.description');
		innerContainer.appendChild(entryDescription);

		outerContainer.appendChild(innerContainer);

		// TODO: no cards currently have multiple cost categories, so some styling adjustment may be necessary if that happens.
		const costList: HTMLElement = document.createElement('div');
		costList.classList.add("adv-start__card-cost-list", 'flow-row-wrap', 'justify-start', 'items-end', 'max-w-16', 'py-6', 'mr-1', 'self-start');
		const costContainer: HTMLElement = document.createElement('fxs-hslot');
		{
			Databind.for(costContainer, 'entry.costs', 'cost');
			{
				costContainer.classList.add('adv-start__card-cost-container', 'relative', 'flow-row', 'justify-end', 'items-start');

				const entryCostName: HTMLElement = document.createElement('div');
				entryCostName.classList.add('adv-start__card-cost-name', 'font-body', 'text-base', 'mr-0\\.5', 'leading-relaxed');
				Databind.locText(entryCostName, 'cost.value');
				costContainer.appendChild(entryCostName);

				const entryCost: HTMLElement = document.createElement('div');
				entryCost.classList.add('adv-start__card-cost-icon', 'size-8', 'bg-no-repeat', 'bg-contain', 'bg-center');
				entryCost.setAttribute('data-bind-style-background-image-url', '{{cost.icon}}');
				costContainer.appendChild(entryCost);
				costList.appendChild(costContainer);
			}
		}
		outerContainer.appendChild(costList);
		cardContent.appendChild(outerContainer);
		const cardDisabled: HTMLElement = document.createElement('div');
		cardDisabled.classList.add("adv-start__card-disabled", 'absolute', 'inset-0', 'bg-accent-6');
		cardContent.appendChild(cardDisabled);
		const cardOverlay: HTMLElement = document.createElement('div');
		cardOverlay.classList.add('adv-start__card-overlay', 'adv-start__card-frame', 'absolute', 'inset-0', 'bg-cover', 'bg-no-repeat');

		const limitContainer: HTMLElement = document.createElement('div');
		limitContainer.classList.add('font-body-base', 'adv-start__card-limit');
		// That legacies that can be selected multiple times has an indicator
		if (isSelectedCard) {
			Databind.locText(limitContainer, 'entry.multipleInstancesString');
			limitContainer.setAttribute('data-bind-class-toggle', 'display: {{entry.numInstances}} > 1');
		} else {
			Databind.locText(limitContainer, 'entry.instancesLeft');
			limitContainer.setAttribute('data-bind-class-toggle', 'display: {{entry.instancesLeft}} > 1');
			// tooltip works on the top layer
			cardOverlay.setAttribute('data-tooltip-style', 'advanceStart')
			Databind.attribute(cardOverlay, 'node-id', "entry.typeID");
		}
		cardContent.appendChild(cardOverlay);
		cardEntry.appendChild(cardContent);
		cardEntry.appendChild(limitContainer);
		Databind.tooltip(cardContent, 'entry.tooltip');
		if (!isSelectedCard) {
			cardEntry.setAttribute('data-bind-class-toggle',
				'cannot-be-added:{{entry.cannotBeAdded}};selected:{{entry.hasBeenAdded}};short-card:{{entry.oddCard}};insufficent-funds:{{entry.insufficientFunds}}');
		}
	}

	private buildAvailableCard(cardEntry: HTMLElement) {
		this.buildCardEntry(cardEntry, false);
	}

	private buildSelectedCard(cardEntry: HTMLElement) {
		this.buildCardEntry(cardEntry, true);
	}

	private buildFilterButtons(): void {
		const filterList: HTMLElement | null = this.Root.querySelector<HTMLElement>('.filter-list');
		if (!filterList) {
			console.error('screen-advanced-start: onAttach(): Failed to find filter-list!');
			return;
		}
		const navLeftButton = document.createElement('fxs-nav-help');
		navLeftButton.setAttribute('action-key', 'inline-cycle-previous');
		navLeftButton.classList.add('mb-2\\.5');
		filterList.appendChild(navLeftButton);

		const filterText = document.createElement('p');
		filterText.classList.add('adv-start__filter-text', 'font-body', 'text-base')
		filterText.setAttribute('data-l10n-id', 'LOC_ADVANCED_START_FILTER');
		filterList.appendChild(filterText);

		const filterByList: CardCategories[] = [
			CardCategories.CARD_CATEGORY_WILDCARD,
			CardCategories.CARD_CATEGORY_SCIENTIFIC,
			CardCategories.CARD_CATEGORY_CULTURAL,
			CardCategories.CARD_CATEGORY_MILITARISTIC,
			CardCategories.CARD_CATEGORY_ECONOMIC,
		]
		for (let category: number = 0; category < filterByList.length; category++) {
			const filterButton: HTMLElement = document.createElement('fxs-activatable');
			filterButton.classList.add('adv-start__filter-button');
			filterButton.classList.add(`${AdvancedStart.getCardCategoryColor(filterByList[category])}`);
			const categoryClass = `adv-start__category_${AdvancedStart.getCardCategoryColor(filterByList[category])}`
			filterButton.classList.add(categoryClass);
			filterButton.setAttribute('data-bind-filter-by', AdvancedStart.getCardCategoryColor(filterByList[category]));

			const filterIcon: HTMLElement = document.createElement('div');
			filterIcon.classList.add('adv-start__currency-icon', 'size-11', 'flex', 'bg-no-repeat', 'bg-center', 'mb-1', 'bg-contain');
			const icon: string = AdvancedStart.getCardCategoryIconURL(filterByList[category]);
			filterIcon.style.backgroundImage = "url('" + icon + "')";

			filterButton.appendChild(filterIcon);
			filterButton.addEventListener('action-activate', this.filterAvailableCardsListener);
			filterList.appendChild(filterButton);
			this.filterButtons.push(categoryClass);
		}

		const navRightButton = document.createElement('fxs-nav-help');
		navRightButton.setAttribute('action-key', 'inline-cycle-next');
		navRightButton.classList.add('mb-2\\.5', 'ml-1');
		filterList.appendChild(navRightButton);
	}

	private setFilterAvailableCards(event: CustomEvent): void {
		if (event.target instanceof HTMLElement) {
			const filterType: string | null = event.target.getAttribute('data-bind-filter-by');
			if (filterType) {
				const prevSelected: HTMLElement | null = this.Root.querySelector<HTMLElement>('.adv-start__filter-button.selected');
				if (prevSelected) {
					prevSelected.classList.remove('selected');
				}
				const filterCatergory = AdvancedStart.getCardCategoryByColor(filterType);
				if (AdvancedStart.filterForCards === filterCatergory) {
					AdvancedStart.setFilter(CardCategories.CARD_CATEGORY_NONE);
					event.target.classList.remove('selected');
					event.target.setAttribute('data-bind-selected', "false");
				} else {
					AdvancedStart.setFilter(filterCatergory);
					event.target.classList.add('selected');
					event.target.setAttribute('data-bind-selected', "true");
				}
			}
		}
	}

	private setupNavTray() {
		NavTray.clear();

		if (Input.getActiveContext() == InputContext.World) {
			if (this.isAdvancedStart && !AdvancedStart.deckConfirmed) {
				NavTray.addOrUpdateNextAction('LOC_ADVANCED_START_AUTOFILL');
			}
			if (AdvancedStart.deckConfirmed) {
				NavTray.addOrUpdateNotification('LOC_ADVANCED_FORCE_COMPLETE_DECK');
			}
			NavTray.addOrUpdateCenterPlotCursor('LOC_ADVANCED_START_VIEW_MAP');
		} else {
			if (this.isAdvancedStart && !AdvancedStart.deckConfirmed) {
				NavTray.addOrUpdateShellAction2('LOC_ADVANCED_START_AUTOFILL');
			}
			if (AdvancedStart.deckConfirmed) {
				NavTray.addOrUpdateShellAction1('LOC_ADVANCED_FORCE_COMPLETE_DECK');
			}
			NavTray.addOrUpdateShellAction3('LOC_ADVANCED_START_VIEW_MAP');
		}
	}

	onDetach() {
		UI.sendAudioEvent(Audio.getSoundTag('data-audio-advanced-start-exit', 'audio-advanced-start'));

		window.removeEventListener('interface-mode-changed', this.interfaceModeChangedListener);
		this.Root.removeEventListener('engine-input', this.engineInputListener);
		engine.off('AdvancedStartCardAdded', this.cardAddedListener);
		engine.off('AdvancedStartCardRemoved', this.cardRemovedListener);
		engine.off('AdvancedStartEffectUsed', this.effectUsedListener);
		InterfaceMode.switchTo("INTERFACEMODE_DEFAULT");

		super.onDetach();
	}

	close() {
		// Signal to the interface mode that we are OK to leave right now.
		// The model will refresh
		AdvancedStart.advancedStartClosed = true;
		super.close();
	}

	setPanelOptions(options: object) {
		const advancedStartOptions: AdvancedStartOptions = options as AdvancedStartOptions;
		const headerTitle: HTMLElement | null = this.Root.querySelector<HTMLElement>('.adv-start__header-title');
		const cardTitle: HTMLElement | null = this.Root.querySelector<HTMLElement>('.adv-start__subtext');
		if (headerTitle && cardTitle) {
			if (advancedStartOptions.isAgeTransition) {
				headerTitle.innerHTML = Locale.compose("LOC_UI_AGE_TRANSITION_TITLE");
				cardTitle.innerHTML = Locale.compose("LOC_UI_ADVANCED_START_CHOOSE_LEGACIES");
			} else {
				headerTitle.innerHTML = Locale.compose("LOC_UI_ADVANCED_START_TITLE");
				cardTitle.innerHTML = Locale.compose("LOC_ADVANCED_START_SUBTEXT");
				this.isAdvancedStart = true;
				this.buildPreselectedContainer();
				this.buildButtonBar(this.isAdvancedStart);
			}
		} else {
			console.error("screen-advanced-start: couldn't find adv-start__header-title and/or adv-start__subtext");
		}
	}

	private addAutoFillButton(buttonContainer: HTMLElement | null) {
		if (buttonContainer && !NavTray.isTrayActive) {
			const autoFillButton = document.createElement('fxs-button');
			autoFillButton.classList.add('auto-fill-button', 'mx-6');
			autoFillButton.setAttribute('data-bind-if', `{{g_AdvancedStartModel.deckConfirmed}} == false && {{g_NavTray.isTrayRequired}} == false`);
			autoFillButton.setAttribute('data-audio-group-ref', 'audio-advanced-start');
			autoFillButton.setAttribute('data-audio-focus-ref', 'data-audio-advanced-start-focus');
			autoFillButton.setAttribute('data-audio-activate-ref', 'data-audio-advanced-start-autofill');
			autoFillButton.setAttribute('caption', 'LOC_ADVANCED_START_AUTOFILL');
			autoFillButton.addEventListener('action-activate', this.autoFillListener);
			buttonContainer.appendChild(autoFillButton);
		}
	}

	private buildButtonBar(isAdvancedStart: boolean = false) {
		const buttonContainer: HTMLElement | null = MustGetElement('.adv-start__button-container', this.Root);
		if (!buttonContainer && !NavTray.isTrayActive) {
			console.error("screen-advanced-start: unable to find adv-start__button-container");
			return;
		}
		// clean up so the buttons can be created in the correct order
		while (buttonContainer.lastChild) {
			buttonContainer.removeChild(buttonContainer.lastChild);
		};
		const viewMapButton = document.createElement('fxs-button');
		viewMapButton.classList.add('selected-close-button', 'mx-6');
		viewMapButton.setAttribute('data-audio-group-ref', 'audio-advanced-start');
		viewMapButton.setAttribute('data-audio-focus-ref', 'data-audio-advanced-start-focus');
		viewMapButton.setAttribute('data-audio-activate-ref', 'data-audio-advanced-start-map');
		viewMapButton.setAttribute('caption', 'LOC_ADVANCED_START_VIEW_MAP');
		viewMapButton.setAttribute('data-bind-if', `{{g_NavTray.isTrayRequired}} == false`);
		viewMapButton.addEventListener('action-activate', this.closeButtonListener);
		buttonContainer.appendChild(viewMapButton);
		if (isAdvancedStart) {
			this.addAutoFillButton(buttonContainer);
		}
		const forceComplete = document.createElement('fxs-button');
		forceComplete.classList.add('force-complete-button', 'mx-6');
		forceComplete.setAttribute('data-audio-group-ref', 'audio-advanced-start');
		forceComplete.setAttribute('data-audio-focus-ref', 'data-audio-advanced-start-focus');
		forceComplete.setAttribute('data-audio-activate-ref', 'data-audio-advanced-start-finish-activate');
		forceComplete.setAttribute('data-bind-if', `{{g_AdvancedStartModel.deckConfirmed}} && {{g_NavTray.isTrayRequired}} == false`);
		forceComplete.setAttribute('caption', 'LOC_ADVANCED_FORCE_COMPLETE_DECK');
		forceComplete.addEventListener('action-activate', this.forceCompleteButtonListener);
		buttonContainer.appendChild(forceComplete);

		const confirmButton = document.createElement('fxs-button');
		confirmButton.classList.add('confirm-deck-button', 'mx-6');
		confirmButton.setAttribute('data-audio-group-ref', 'audio-advanced-start');
		confirmButton.setAttribute('data-audio-focus-ref', 'data-audio-advanced-start-focus');
		confirmButton.setAttribute('data-audio-activate-ref', 'data-audio-advanced-start-confirm-activate');
		confirmButton.setAttribute('data-bind-if', `{{g_AdvancedStartModel.deckConfirmed}} == false`);
		confirmButton.setAttribute('caption', 'LOC_ADVANCED_START_CONFIRM_LEGACIES');
		confirmButton.setAttribute('action-key', 'inline-shell-action-1');
		confirmButton.addEventListener('action-activate', this.confirmDeckButtonListener);
		buttonContainer.appendChild(confirmButton);
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		// Special case: force to complete the tutorials before accesing the "View Map" input
		if (TutorialManager.isShowing()) {
			return;
		}

		if (inputEvent.isCancelInput() || inputEvent.detail.name == "shell-action-3" || inputEvent.detail.name == "sys-menu") {
			this.close();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
			return;
		}
		switch (inputEvent.detail.name) {
			case 'mousebutton-left':
			case 'accept':
			case 'touch-tap':
				if (Cursor.isOnUI || PlotCursor.plotCursorCoords == null) {
					break;
				}

				if (AdvancedStart.placePlacementEffect(PlotCursor.plotCursorCoords)) {
					inputEvent.stopPropagation();
					inputEvent.preventDefault();
				}
				break;
			case 'shell-action-1':
				if (AdvancedStart.deckConfirmed) {
					this.onForceComplete();
				} else {
					this.onConfirmDeck()
					Audio.playSound("data-audio-advanced-start-confirm-activate", "audio-advanced-start");
				}
				inputEvent.stopPropagation();
				inputEvent.preventDefault();
				break;
			case 'shell-action-2':
				if (this.isAdvancedStart && !AdvancedStart.deckConfirmed) {
					this.autofillDeck()
					inputEvent.stopPropagation();
					inputEvent.preventDefault();
					Audio.playSound("data-audio-advanced-start-autofill", "audio-advanced-start");
				}
				break;
		}
	}
	//
	private onInterfaceModeChanged() {
		// If we're interrupted by a cinematic, hide ourselves.
		// Otherwise, we always want to be visible while we're active.
		switch (InterfaceMode.getCurrent()) {
			case "INTERFACEMODE_CINEMATIC":
				this.Root.style.visibility = "hidden";
				break;
			default:
				this.Root.style.visibility = "visible";
				break;
		}
	}

	private onAvailableCardActivate(event: CustomEvent) {
		if (event.target instanceof HTMLElement) {
			const typeID: string | null = event.target.getAttribute('data-type-id');
			if (typeID) {
				FocusManager.setFocus(event.target);

				const localPlayer: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (!localPlayer) {
					console.error("screen-advanced-start: couldn't get the local player");
					return;
				}
				const playerAdvancedStart: PlayerAdvancedStart | undefined = localPlayer.AdvancedStart;
				if (!playerAdvancedStart) {
					console.error("screen-advanced-start: couldn't get the advanced start info for the local player");
					return;
				}

				const legacyPoints: CardCategoryInstance[] = playerAdvancedStart.getLegacyPoints();
				if (AdvancedStart.addAvailableCard(typeID)) {
					// Find the card's info
					const cardInfo: AgeCardInfo | undefined = playerAdvancedStart.getAvailableCards().find(t => t.id == typeID);
					if (cardInfo) {
						if (cardInfo.id == typeID) {
							// Walk the card's costs
							cardInfo.cost.forEach(cost => {
								const legacyCost: CardCategoryInstance | undefined = legacyPoints.find(t => t.category == cost.category);
								if (legacyCost) {
									if (legacyCost.category == cost.category) {
										// If the user's legacy points can't cover this cost, then wildcard points were used.
										if (legacyCost.value < cost.value) {
											this.animateACost(".adv-start__category_" + AdvancedStart.getCardCategoryColor(CardCategories.CARD_CATEGORY_WILDCARD));
										}

										// ...but the points in this category may still also have been spent from the legacy
										if (legacyCost.value > 0) {
											this.animateACost(".adv-start__category_" + AdvancedStart.getCardCategoryColor(cost.category));
										}
									}
								}
							});
						}
					}
				}

				const selectedCards: HTMLElement | null = this.Root.querySelector<HTMLElement>('.adv-start__selected-cards-container');
				if (selectedCards) {
					if (!selectedCards.classList.contains('expanded')) {
						selectedCards.classList.remove('contracted');
						selectedCards.classList.add('expanded');
					}
				}
			}
		}
	}

	private animateACost(selectorID: string) {
		const categoryEntry: HTMLElement | null = this.Root.querySelector<HTMLElement>(selectorID);
		if (categoryEntry) {
			// If you spam cards, you can be adding multiple animationend handlers to the same icon/text,
			// which gets weird fast.  So remove any existing handler and stop any existing animation before
			// retriggering the animation.
			categoryEntry.removeEventListener("animationend", this.flashCostAnimationListener);
			categoryEntry.classList.remove("adv-start__highlighted");
			categoryEntry.classList.add("adv-start__highlighted");
			categoryEntry.addEventListener("animationend", this.flashCostAnimationListener);
		}
	}

	private buildPreselectedContainer(): void {
		const preSelect: HTMLElement | null = this.Root.querySelector<HTMLElement>('.adv-start__preset-container');
		if (!preSelect) {
			console.error("screen-advanced-start: couldn't get the advanced start preset filter");
			return;
		}
		preSelect.classList.add('flow-row', 'mt-6', 'justify-center', 'items-center', 'py-2', 'w-128', 'h-13', 'border-2', 'border-accent-4', 'uppercase', 'tracking-150')
		// Get Preset List- via model-advanced-start
		const leftArrowDom: HTMLElement = document.createElement('fxs-activatable');
		const leftArrow: HTMLElement = document.createElement('div');
		leftArrow.classList.add('adv-start__left-arrow', 'img-arrow',);
		leftArrowDom.classList.add('adv-start__left-arrow', 'absolute', 'left-0');
		leftArrowDom.classList.toggle('hidden', ActionHandler.isGamepadActive);
		leftArrowDom.setAttribute('data-bind-preselect-direction', 'left');
		leftArrowDom.setAttribute('data-audio-group-ref', 'audio-advanced-start');
		leftArrowDom.setAttribute('data-audio-activate-ref', 'data-audio-advanced-start-paginate');
		leftArrowDom.setAttribute('data-audio-press-ref', 'data-audio-advanced-start-paginate-press');
		leftArrowDom.appendChild(leftArrow);
		leftArrowDom.addEventListener('action-activate', this.preSelectNavListener);

		const preselectText: HTMLElement = document.createElement('div');
		preselectText.classList.add('adv-start__preset-text', 'font-title-sm')

		const rightArrowDom: HTMLElement = document.createElement('fxs-activatable');
		const rightArrow: HTMLElement = document.createElement('div');
		rightArrowDom.classList.add('adv-start__right-arrow', 'absolute', 'right-0');
		rightArrow.classList.add('adv-start__right-arrow', 'img-arrow', 'pointer-events-none');
		rightArrowDom.classList.toggle('hidden', ActionHandler.isGamepadActive);
		rightArrowDom.setAttribute('data-bind-preselect-direction', 'right')
		rightArrowDom.setAttribute('data-audio-group-ref', 'audio-advanced-start');
		rightArrowDom.setAttribute('data-audio-activate-ref', 'data-audio-advanced-start-paginate');
		rightArrowDom.setAttribute('data-audio-press-ref', 'data-audio-advanced-start-paginate-press');
		rightArrowDom.appendChild(rightArrow);
		rightArrowDom.addEventListener('action-activate', this.preSelectNavListener);

		const rightNavHelper = document.createElement('fxs-nav-help');
		rightNavHelper.setAttribute("action-key", "inline-nav-shell-next");
		rightNavHelper.classList.add('absolute', 'right-0')
		const leftNavHelper = document.createElement('fxs-nav-help');
		leftNavHelper.setAttribute("action-key", "inline-nav-shell-previous");
		leftNavHelper.classList.add('absolute', 'left-2')
		preSelect.appendChild(leftNavHelper);
		preSelect.appendChild(leftArrowDom);
		preSelect.appendChild(preselectText);
		preSelect.appendChild(rightArrowDom);
		preSelect.appendChild(rightNavHelper);
		this.onPreselectChange();
	}

	setPresetLegacies(event: CustomEvent): void {
		if (event.target instanceof HTMLElement) {
			const direction: string | null = event.target.getAttribute('data-bind-preselect-direction');
			let shift: number = 0;
			switch (direction) {
				case 'left':
					shift = -1;
					break;
				case 'right':
					shift = 1;
					break;
				default:
					console.error(`screen-advanced-start: unknown direction ${direction}`);
					break;
			}
			AdvancedStart.changePresetLegacies(shift);
			this.onPreselectChange();
		}
	}

	private onPreselectChange(): void {
		let preselectText: HTMLElement | null = this.Root.querySelector<HTMLElement>('.adv-start__preset-text');
		if (!preselectText) {
			console.error("screen-advanced-start: couldn't get the advanced start preset filter text");
			return;
		}
		const locKey = AdvancedStart.preSelectLoc;
		preselectText.innerHTML = Locale.compose(locKey);

		if (AdvancedStart.preSelectIndex == 0) {
			FocusManager.setFocus(MustGetElement(".adv-start__available-cards-list", this.Root));
		}
	}

	private onFlashAnimationEnd(event: AnimationEvent) {
		if (event.animationName == "highlight-currency") {
			if (event.target) {
				const categoryEntry: HTMLElement = event.target as HTMLElement;
				categoryEntry.classList.remove("animate-currency");
				categoryEntry.classList.remove("animate-currency-reverse");
			}
		}
	}

	private onSelectedCardActivate(event: CustomEvent) {
		if (event.currentTarget instanceof HTMLElement) {
			FocusManager.setFocus(event.currentTarget);
			event.currentTarget.addEventListener("animationend", this.removeCardAnimationListener);
			event.currentTarget.classList.add('adv-start__card--remove');
		}
	}

	private onRemoveListener(event: AnimationEvent) {
		if (event.currentTarget instanceof HTMLElement && event.animationName == "adv-start__selected-card-anim-out") {
			event.currentTarget.removeEventListener("animationend", this.removeCardAnimationListener);
			const typeID: string | null = event.currentTarget.getAttribute('data-type-id');
			if (typeID) {
				AdvancedStart.removeAvailableCard(typeID);

				if (AdvancedStart.selectedCards.length <= 0) {
					// If this is the last card, swap focus to the available cards
					const availableCardsSlot: HTMLElement | null = this.Root.querySelector<HTMLElement>('.adv-start__card');
					if (!availableCardsSlot) {
						console.error("screen-advanced-start: Unable to find element with class available-cards!");
						return;
					}
					FocusManager.setFocus(availableCardsSlot);
				} else if (event.currentTarget.parentElement?.classList.contains("adv-start__card--selected") && AdvancedStart.selectedCards.length >= 2) {
					const cardContainer: HTMLElement | null = this.Root.querySelector<HTMLElement>('.adv-start__card--selected');
					if (cardContainer) {
						FocusManager.setFocus(cardContainer);
					}
				}
			}
			event.currentTarget.classList.remove('adv-start__card--remove');
		}
	}

	private onCardAdded() {
		this.updateDeckLimitHeader();
		waitForLayout(() => {
			if (!FocusManager.getFocus().isConnected) {
				const cardContainer: HTMLElement | null = this.Root.querySelector<HTMLElement>('.adv-start__card--selected');
				if (cardContainer) {
					FocusManager.setFocus(cardContainer);
				}
			}
		});
	}

	private onCardRemovedListener() {
		this.updateDeckLimitHeader();
		if (AdvancedStart.selectedCards.length <= 1 && AdvancedStart.selectedCards[0]?.numInstances <= 1) {
			//If this is the last card, and there isnt multiple instances- swap focus to the filter
			const advCardSlot: HTMLElement | null = this.Root.querySelector<HTMLElement>('.adv-start__card');
			if (!advCardSlot) {
				console.error("screen-advanced-start: Unable to find element with class available-cards!");
				return;
			}
			FocusManager.setFocus(advCardSlot);
		} else {
			waitForLayout(() => {
				const cardContainer: HTMLElement | null = this.Root.querySelector<HTMLElement>('.adv-start__card--selected');
				if (cardContainer) {
					FocusManager.setFocus(cardContainer);
				}
			});
		}
	}

	private onConfirmDeck() {
		const playerAdvancedStart: PlayerAdvancedStart | undefined = Players.get(GameContext.localPlayerID)?.AdvancedStart;
		if (!playerAdvancedStart) {
			console.error(`model-advanced-start: Failed to retrieve Resources for Player ${GameContext.localPlayerID}`);
			return;
		}
		const legacyPoints = playerAdvancedStart.getLegacyPoints();
		let hasPointsRemaining: boolean = false;
		for (let i: number = 0; i < legacyPoints.length; i++) {
			if (legacyPoints[i].value > 0) {
				hasPointsRemaining = true;
				break;
			}
		}

		const confirmDeckCallback = (eAction: DialogBoxAction) => {
			if (eAction == DialogBoxAction.Confirm) {
				AdvancedStart.confirmDeck();

				// Wait 2 frames for the DOM to settle and then focus the effects card list
				window.requestAnimationFrame(() => {
					window.requestAnimationFrame(() => {
						const cardEffects: HTMLElement | null = this.Root.querySelector<HTMLElement>('.card-effects');
						if (AdvancedStart.placeableCardEffects.length > 0) {
							window.dispatchEvent(AdvancedStartBonusPlacementStarted);
							this.setupNavTray();
						} else {
							//No cards to place, we can just finish advanced start
							this.close();
						}
						if (cardEffects) {
							const advStartChooser = MustGetElement('.adv-start__available-legacy-wrapper', this.Root);
							if (advStartChooser) {
								advStartChooser.classList.add('hidden');
							}
							FocusManager.setFocus(cardEffects);
						}
					});
				});
			}
		}

		if (hasPointsRemaining) {
			DialogManager.createDialog_ConfirmCancel({
				dialogId: this.dialogId,
				body: "LOC_ADVANCED_START_CONFIRM_UNUSED_POINTS_BODY",
				title: "LOC_ADVANCED_START_CONFIRM_UNUSED_POINTS_TITLE",
				callback: (eAction: DialogBoxAction) => { confirmDeckCallback(eAction) }
			});
		} else {
			confirmDeckCallback(DialogBoxAction.Confirm);
		}
	}

	private onForceComplete() {
		const confirmForceCompleteCallback = (eAction: DialogBoxAction) => {
			if (eAction == DialogBoxAction.Confirm) {
				this.confirmForceComplete();
				Audio.playSound("data-audio-place-effects-confirm", "audio-advanced-start");
			} else {
				Audio.playSound("data-audio-place-effects-confirm-cancel", "audio-advanced-start");
			}
		}
		DialogManager.createDialog_ConfirmCancel({
			body: "LOC_ADVANCED_START_CONFIRM_COMPLETE_BODY",
			title: "LOC_ADVANCED_START_CONFIRM_COMPLETE_TITLE",
			callback: (eAction: DialogBoxAction) => { confirmForceCompleteCallback(eAction) }
		});
	}

	private confirmForceComplete() {
		this.close();
		AdvancedStart.forceComplete();
	}

	private onEffectActivate(event: CustomEvent) {
		if (event.target instanceof HTMLElement) {
			InterfaceMode.switchTo("INTERFACEMODE_BONUS_PLACEMENT");
			Input.setActiveContext(InputContext.World);
			this.setupNavTray();
			const typeID: string | null = event.target.getAttribute('data-type-id');
			if (typeID) {
				AdvancedStart.selectPlacementEffect(typeID);
				FocusManager.SetWorldFocused();
			}
		}
	}

	private onEffectUsed() {
		if (AdvancedStart.deckConfirmed && AdvancedStart.placeableCardEffects.length <= 1) { //TODO THIS LOGIC IS NOW INVALID
			//If this is the last effect being used, we can close
			this.close();
		} else {	// set the focus back to us
			InterfaceMode.switchTo("INTERFACEMODE_ADVANCED_START");
			Input.setActiveContext(InputContext.Shell);
			this.setupNavTray();
			window.requestAnimationFrame(() => {
				window.requestAnimationFrame(() => {
					const cardEffects = this.Root.querySelector<HTMLElement>('.card-effects');
					if (cardEffects) {
						FocusManager.setFocus(cardEffects);
					}
				});
			});
		}
	}

	private setupDeckLimitHeader() {
		const deckLimitContainer: HTMLElement | null = this.Root.querySelector<HTMLElement>('.adv-start__currency-list');
		if (!deckLimitContainer) {
			console.error('screen-advanced-start: onAttach(): Failed to find deck-limit-inner-container!');
			return;
		}
		deckLimitContainer.addEventListener("animationend", this.flashCostAnimationListener);

		// Add background behind selected currency icons
		const uiViewExperience = UI.getViewExperience();
		if (uiViewExperience == UIViewExperience.Mobile) {
			const deckLimitTopContainer: HTMLElement | null = this.Root.querySelector<HTMLElement>('.adv-start__currency-container');
			if (deckLimitTopContainer) {
				const backgroundDiv: HTMLElement = document.createElement('div');
				backgroundDiv.classList.add('absolute', 'w-full', 'h-3\\/4', 'bg-black', 'opacity-60', 'mt-3');
				deckLimitTopContainer.appendChild(backgroundDiv);
				deckLimitTopContainer.classList.add('w-full', 'justify-center');
				deckLimitContainer.classList.add('z-1');
			}
		}

		this.updateDeckLimitHeader(true);
	}

	private autofillDeck() {
		AdvancedStart.autoFillLegacies();
	}

	private updateDeckLimitHeader(setup: boolean = false) {
		const deckLimitContainer: HTMLElement | null = this.Root.querySelector<HTMLElement>('.adv-start__currency-list');
		if (!deckLimitContainer) {
			console.error('screen-advanced-start: onAttach(): Failed to find deck-limit-inner-container!');
			return;
		}

		const localPlayer: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (!localPlayer) {
			console.error(`model-advanced-start: Failed to retrieve PlayerLibrary for Player ${GameContext.localPlayerID}`);
			return;
		}

		const playerAdvancedStart: PlayerAdvancedStart | undefined = localPlayer.AdvancedStart;
		if (!playerAdvancedStart) {
			console.error(`model-advanced-start: Failed to retrieve Resources for Player ${GameContext.localPlayerID}`);
			return;
		}

		const legacyPoints: CardCategoryInstance[] = playerAdvancedStart.getLegacyPoints();
		const orderList: CardCategories[] = [
			CardCategories.CARD_CATEGORY_WILDCARD,
			CardCategories.CARD_CATEGORY_SCIENTIFIC,
			CardCategories.CARD_CATEGORY_CULTURAL,
			CardCategories.CARD_CATEGORY_MILITARISTIC,
			CardCategories.CARD_CATEGORY_ECONOMIC
		];

		for (let category: number = 0; category < orderList.length; category++) {
			const instance: CardCategoryInstance | undefined = legacyPoints.find((target) => { return target.category == orderList[category] });
			const instanceValue = instance?.value || 0;
			let targetCurrency: HTMLElement | null = deckLimitContainer.querySelector(`.${AdvancedStart.getCardCategoryColor(orderList[category])}`);

			if (!targetCurrency) {
				targetCurrency = document.createElement('div');
				targetCurrency.classList.add('adv-start__currency-item');
				targetCurrency.classList.add(`${AdvancedStart.getCardCategoryColor(orderList[category])}`);
				targetCurrency.classList.add(`adv-start__category_${AdvancedStart.getCardCategoryColor(orderList[category])}`);
			}

			let pointsText: HTMLElement | null = targetCurrency.querySelector('.adv-start__currency-text');
			if (!pointsText) {
				pointsText = document.createElement('div');
				pointsText.classList.add('adv-start__currency-text', 'font-body');
				targetCurrency.appendChild(pointsText);

				const icon: string = AdvancedStart.getCardCategoryIconURL(orderList[category]);
				const pointsIcon: HTMLElement = document.createElement('div');
				pointsIcon.classList.add('adv-start__currency-icon', 'size-11', 'flex', 'bg-no-repeat', 'bg-center', 'mb-1', 'bg-contain');
				pointsIcon.style.backgroundImage = "url('" + icon + "')";
				pointsIcon.setAttribute('data-tooltip-style', 'advanceStart')
				pointsIcon.setAttribute('node-id', AdvancedStart.getCardCategoryColor(orderList[category]));
				targetCurrency.appendChild(pointsIcon);
				deckLimitContainer.appendChild(targetCurrency);
			}

			let highlightLayer: HTMLElement | null = targetCurrency.querySelector(`.currency-highlight`);
			if (!highlightLayer) {
				highlightLayer = document.createElement('div');
				highlightLayer.classList.add("adv-start__currency-item", "currency-highlight");
				highlightLayer.innerHTML = targetCurrency.innerHTML;
				targetCurrency.appendChild(highlightLayer);
			}
			pointsText.innerHTML = instanceValue.toString();
			let highlightText: HTMLElement | null = highlightLayer.querySelector('.adv-start__currency-text');
			if (highlightText && highlightText.innerHTML != instanceValue.toString()) {
				const oldNum: number = parseFloat(highlightText.innerHTML);
				highlightText.innerHTML = instanceValue.toString();
				if (!setup) {
					highlightLayer.classList.add(oldNum > instanceValue ? 'animate-currency' : 'animate-currency-reverse');
				}
			}
		}
	}

	private onNavigateInput(navigationEvent: NavigateInputEvent) {
		const live: boolean = this.handleNavigation(navigationEvent);
		if (!live) {
			navigationEvent.preventDefault();
			navigationEvent.stopPropagation();
		}
	}
	/**
	 * @returns true if still live, false if input should stop.
	 */
	private handleNavigation(navigationEvent: NavigateInputEvent): boolean {
		if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
			// Ignore everything but FINISH events
			return true;
		}
		let presetContainerActive = false;
		const preSelect: HTMLElement | null = this.Root.querySelector<HTMLElement>('.adv-start__preset-container');
		if (preSelect && this.isAdvancedStart) {
			presetContainerActive = true;
		}
		let live: boolean = true;
		const direction: InputNavigationAction = navigationEvent.getDirection();
		switch (direction) {
			case InputNavigationAction.SHELL_PREVIOUS: {
				if (presetContainerActive) {
					AdvancedStart.changePresetLegacies(-1);
					this.onPreselectChange();
					Audio.playSound("data-audio-activate", "audio-pager");
				}
				live = false;
				break;
			}
			case InputNavigationAction.SHELL_NEXT: {
				if (presetContainerActive) {
					AdvancedStart.changePresetLegacies(1);
					this.onPreselectChange();
					Audio.playSound("data-audio-activate", "audio-pager");
				}
				live = false;
				break;
			}
			case InputNavigationAction.PREVIOUS: {
				if (!AdvancedStart.deckConfirmed) {
					this.navigateFilters(-1);
				}
				live = false;
				Audio.playSound("data-audio-press");
				break;
			}
			case InputNavigationAction.NEXT: {
				if (!AdvancedStart.deckConfirmed) {
					this.navigateFilters(1);
				}
				live = false;
				Audio.playSound("data-audio-press");
				break;
			}
		}
		return live
	}

	private navigateFilters(indexShift: number) {
		if (this.filterButtons[this.filterButtonIndex]) {
			const prevSelect = MustGetElement(`.${this.filterButtons[this.filterButtonIndex]}`, this.Root);
			prevSelect.classList.remove('selected');
			prevSelect.setAttribute('data-bind-selected', "false");
		}
		this.filterButtonIndex = this.filterButtonIndex + indexShift;
		if (this.filterButtonIndex == -2) {
			this.filterButtonIndex = this.filterButtons.length - 1;
		}
		if (this.filterButtonIndex < 0 || this.filterButtonIndex >= this.filterButtons.length) {
			this.filterButtonIndex = -1;
			AdvancedStart.setFilter(CardCategories.CARD_CATEGORY_NONE);
		} else {
			const nextSelect = MustGetElement(`.${this.filterButtons[this.filterButtonIndex]}`, this.Root);
			const filterType: string | null = nextSelect.getAttribute('data-bind-filter-by');
			if (filterType) {
				const filterCatergory = AdvancedStart.getCardCategoryByColor(filterType);
				AdvancedStart.setFilter(filterCatergory);
				nextSelect.classList.add('selected');
				nextSelect.setAttribute('data-bind-selected', "true");
			}
		}
		const advCardSlot: HTMLElement | null = this.Root.querySelector<HTMLElement>('.adv-start__card');
		if (!advCardSlot) {
			console.error("screen-advanced-start navigateFilters: Unable to find element with class available-cards!");
			return;
		}
		FocusManager.setFocus(advCardSlot);
	}
}

Controls.define('screen-advanced-start', {
	createInstance: ScreenAdvancedStart,
	description: 'Advanced Start screen.',
	classNames: [],
	styles: ['fs://game/base-standard/ui/advanced-start/screen-advanced-start.css'],
	content: ['fs://game/base-standard/ui/advanced-start/screen-advanced-start.html'],
	attributes: []
});