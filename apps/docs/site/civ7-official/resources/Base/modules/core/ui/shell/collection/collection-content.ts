/**
 * @file collection-content.ts
 * @copyright 2020-2023, Firaxis Games
 * @description 2K Store launcher content.
 */

import FocusManager from '/core/ui/input/focus-manager.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import DialogBoxManager from '/core/ui/dialog-box/manager-dialog-box.js';

type ItemType = {
	imageUrl: string;
	contentID: string;
	contentTitle: string;
	contentPrice: string;
	contentDescription: string;
	owned: boolean;
};

const bForceShowPromoLoadingSpinner: boolean = false; // PROMO_TODO: remove this when promo loading spinner is fully implemented by UI.

export class CollectionContent extends Panel {
	private promosRetrievalCompleteListener = (data: PromosDataReceivedData) => { this.createCards(data); };
	private focusListener = this.onFocus.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);
	private mainSlot!: HTMLElement;
	private selectedCard: HTMLElement | null = null;

	private pendingContentSelection: string | null = null;
	// Leader or civilizaiton type -> card + item
	private contentToCardLookup = new Map<string, { card: HTMLElement, item: ItemType }>();

	constructor(root: ComponentRoot) {
		super(root);
	};

	onInitialize(): void {
		this.Root.innerHTML = this.getContent();
	}

	public setPendingContentSelection(contentType: string) {
		this.pendingContentSelection = contentType;
		this.updatePendingSelection();
	}

	getContent() {
		return `
			<fxs-scrollable-horizontal class="scrollable-frame store-launcher-scrollable flex-auto" flex="auto" attached-scrollbar="true">
				<fxs-hslot class="store-launcher-content flex-auto p-6">
				</fxs-hslot>
			</fxs-scrollable-horizontal>
		`
	}

	onAttach() {
		super.onAttach();

		this.mainSlot = MustGetElement(".store-launcher-content", this.Root);
		this.Root.addEventListener("focus", this.focusListener);
		engine.on("PromosRetrievalCompleted", this.promosRetrievalCompleteListener);
		this.Root.addEventListener("engine-input", this.engineInputListener);

		// Request Promos
		Online.Promo.getPromosForPlacement("2kstore");
	}

	onDetach() {
		this.Root.removeEventListener("engine-input", this.engineInputListener);
		this.Root.removeEventListener("focus", this.focusListener);
		engine.off("PromosRetrievalCompleted", this.promosRetrievalCompleteListener);

		super.onDetach();
	}

	private updateNavTray() {
		NavTray.clear();
		NavTray.addOrUpdateGenericBack();
		NavTray.addOrUpdateShellAction1("LOC_GENERIC_REDEEMCODE");
	}

	private onFocus() {
		this.realizeFocus();
		this.updateNavTray();
	}

	private realizeFocus() {
		FocusManager.setFocus(this.selectedCard ? this.selectedCard : this.mainSlot);
	}

	private onActivate(selectedCard: HTMLElement, promo: ItemType) {
		let isFullyLinked = (Network.isFullAccountLinked() && Network.isAccountLinked());
		let isChild = Network.isChildAccount();
		if (isFullyLinked && (!isChild || (isChild && Network.isChildPermittedPurchasing()))) {
			const attributes = {
				contentID: promo.contentID,
				imageUrl: promo.imageUrl,
				contentTitle: promo.contentTitle,
				contentDescription: promo.contentDescription,
				owned: Online.Promo.shouldPromoDisplayOwnership() ? promo.owned : false
			}
			this.selectedCard = selectedCard;
			ContextManager.push('screen-dlc-viewer', { singleton: true, createMouseGuard: true, attributes });
		}
		else {
			// If we don't have SSO, we probably shouldn't have ever gotten this far
			if (!isFullyLinked) {
				DialogBoxManager.createDialog_Confirm({ body: Locale.compose("LOC_JOIN_GAME_LINK_ACCOUNT"), title: Locale.compose("LOC_UI_ACCOUNT_TITLE") });
			}
			else {
				DialogBoxManager.createDialog_Confirm({ body: Locale.compose("LOC_UI_PARENT_PERMISSION_REQUIRED"), title: Locale.compose("LOC_UI_ACCOUNT_TITLE") });
			}
		}
	}

	// PROMO_TODO: We will want to make this animated like the one in loading screen. Waiting on UI/UX design and implementation: https://2kfxs.atlassian.net/browse/IGP-103673
	private showPromoLoadingSpinner() {
		console.log("Showing Promo Loading Spinner!");
	}

	// PROMO_TODO: We will want to make this animated like the one in loading screen. Waiting on UI/UX design and implementation: https://2kfxs.atlassian.net/browse/IGP-103673
	private hidePromoLoadingSpinner() {
		console.log("Hiding Promo Loading Spinner!");
	}
	private createItemCard(item: ItemType, targetElement: HTMLElement) {
		const storeCardActivatable: HTMLElement = document.createElement("fxs-activatable");
		storeCardActivatable.classList.add("store-launcher__card-activatable", "group", "relative", "w-128", "mr-6", "mt-7");
		storeCardActivatable.setAttribute("tabindex", "-1");
		storeCardActivatable.setAttribute("data-content-id", item.contentID);
		storeCardActivatable.setAttribute("data-audio-group-ref", "store-launcher");
		storeCardActivatable.setAttribute("data-audio-activate-ref", "data-audio-clicked-addcontent");
		storeCardActivatable.setAttribute("data-audio-focus-ref", "data-audio-focus-addcontent");
		storeCardActivatable.setAttribute("data-audio-press-ref", "data-audio-press-addcontent");
		storeCardActivatable.addEventListener("action-activate", () => { this.onActivate(storeCardActivatable, item) });
		storeCardActivatable.addEventListener("mouseenter", () => { Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.Extras, MenuAction: TelemetryMenuActionType.Hover, Item: item.contentID }) });

		// Background Image
		if (item.imageUrl && !bForceShowPromoLoadingSpinner) {
			this.hidePromoLoadingSpinner();
			storeCardActivatable.style.backgroundImage = `url('${item.imageUrl}')`;
		}
		else {
			// show loading spinner.
			this.showPromoLoadingSpinner();
		}
		targetElement.appendChild(storeCardActivatable);

		// Content Container
		const contentContainer: HTMLDivElement = document.createElement("div");
		contentContainer.classList.add("store-launcher__card-content", "w-full", "h-full", "absolute", "flex", "flex-col", "items-center", "pointer-events-none", "p-6", 'opacity-0', "group-hover\\:opacity-100", "group-focus\\:opacity-100");

		// Label the Card
		const storeCardLabelContainer: HTMLDivElement = document.createElement("div");
		storeCardLabelContainer.classList.add("store-launcher__card-label-container", "relative");

		// DLC Title
		const storeCardLabelText: HTMLDivElement = document.createElement("div");
		storeCardLabelText.classList.add("store-launcher__card-label-text", "text-shadow-br", "relative", "font-title", "text-xl", "text-center", "text-secondary", "uppercase");
		storeCardLabelText.textContent = item.contentTitle;
		storeCardLabelContainer.appendChild(storeCardLabelText);

		// DLC Price
		const storeCardPriceContainer: HTMLDivElement = document.createElement("div");
		storeCardPriceContainer.classList.add("store-launcher__card-price-container", "relative");

		const storeCardPriceText: HTMLDivElement = document.createElement("div");
		storeCardPriceText.classList.add("store-launcher__card-price-text", "relative");
		storeCardPriceText.innerHTML = Locale.compose(item.contentPrice);
		storeCardPriceContainer.appendChild(storeCardPriceText);

		// DLC Description
		const storeCardDescriptionContainer: HTMLDivElement = document.createElement("div");
		storeCardDescriptionContainer.classList.add("store-launcher__card-description-container");

		// Add Content to container
		contentContainer.appendChild(storeCardLabelContainer);

		if (Online.Promo.shouldPromoDisplayOwnership()) {
			// Ownership Icon
			const storeCardLockIconContainer: HTMLDivElement = document.createElement("div");
			storeCardLockIconContainer.classList.add("store-launcher__card-ownership-icon-wrapper", "relative");

			const storeCardLockIcon: HTMLDivElement = document.createElement("div");
			storeCardLockIcon.classList.add("relative", "size-9", "bg-contain");
			storeCardLockIcon.classList.add(item.owned ? "img-checkbox-on" : "img-checkbox-off");

			storeCardLockIconContainer.appendChild(storeCardLockIcon);
			contentContainer.appendChild(storeCardLockIconContainer);
		}
		contentContainer.appendChild(storeCardDescriptionContainer);
		if (Online.Promo.shouldPromoDisplayOwnership()) {
			// Ownership Text
			const cardOwnershipTextContainer: HTMLDivElement = document.createElement("div");
			cardOwnershipTextContainer.classList.add("store-launcher__card-ownership-text-wrapper", "relative", "grow", "flex", "flex-col", "justify-end");

			const cardOwnershipText: HTMLDivElement = document.createElement("div");
			cardOwnershipText.classList.add("store-launcher__card-ownership-text", "relative", "font-title", "text-xl", "text-center", "text-secondary", "uppercase");
			cardOwnershipText.setAttribute('data-l10n-id', Locale.compose(item.owned ? "LOC_UI_STORE_PURCHASED" : ""));

			cardOwnershipTextContainer.appendChild(cardOwnershipText);
			contentContainer.appendChild(cardOwnershipTextContainer);
		}

		// Decorator container (Hover, focused, active)
		const decoratorContainer: HTMLDivElement = document.createElement("div");
		decoratorContainer.classList.add("store-launcher__card-decorator", "absolute", "w-full", "h-full");

		const idleOverlay: HTMLElement = document.createElement("div");
		idleOverlay.classList.add('border-2', 'border-secondary-1', "absolute", "w-full", "h-full");
		decoratorContainer.appendChild(idleOverlay);

		const hoverOverlay: HTMLElement = document.createElement("div");
		hoverOverlay.classList.add('img-list-focus-frame_highlight', "w-full", "h-full", "absolute",
			"pointer-events-auto", 'opacity-0', "group-hover\\:opacity-100", "group-focus\\:opacity-100");
		const decoratorTopFiligree: HTMLDivElement = document.createElement("div");
		decoratorTopFiligree.classList.add("filigree-panel-top-special", "relative", "bottom-10", "w-full");
		hoverOverlay.appendChild(decoratorTopFiligree);

		decoratorContainer.appendChild(hoverOverlay)


		// Add container in order to the activatable
		storeCardActivatable.appendChild(decoratorContainer);
		storeCardActivatable.appendChild(contentContainer);

		return storeCardActivatable;
	}

	private createCards(data: PromosDataReceivedData) {
		if (data.placement != "2kstore") {
			return;
		}
		if (!data.fullRefresh) {
			return;
		}

		// clear any existing children
		while (this.mainSlot.children.length > 0) {
			this.mainSlot.removeChild(this.mainSlot.children[0]);
		}

		const selectedCardId = this.selectedCard?.getAttribute("data-content-id");
		this.selectedCard = null;

		for (const promo of data.promos) {
			const item: ItemType = {
				imageUrl: promo.primaryImageUrl,
				contentID: promo.contentID,
				contentTitle: promo.localizedTitle,
				contentPrice: promo.contentPrice,
				contentDescription: promo.localizedContent,
				owned: Online.Promo.shouldPromoDisplayOwnership() ? promo.owned : false
			};

			const card = this.createItemCard(item, this.mainSlot);

			if (selectedCardId === promo.contentID) {
				this.selectedCard = card;
			}

			try {
				const metadata = JSON.parse(promo.metadata);
				const content = metadata.content as string[];
				for (const contentId of content) {
					this.contentToCardLookup.set(contentId, { card, item });
				}
			} catch (ex) {
				console.error("collection-content: Unable to parse promo metadata - ", ex);
			}
		}

		this.updatePendingSelection();
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (this.handleEngineInput(inputEvent)) {
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private handleEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return false;
		}

		if (inputEvent.detail.name == "shell-action-1") {
			this.onRedeemButtonActivate();
			return true;
		}

		return false;
	}

	private updatePendingSelection() {
		if (this.pendingContentSelection && this.contentToCardLookup.size > 0) {
			const foundCard = this.contentToCardLookup.get(this.pendingContentSelection);
			if (foundCard) {
				this.selectedCard = foundCard.card;
				this.onActivate(foundCard.card, foundCard.item);
			} else {
				console.warn(`collection-content: Unable to find matching promo for ${this.pendingContentSelection}, showing full collection screen.`);
			}

			this.pendingContentSelection = null;
		}
	}

	private onRedeemButtonActivate() {
		ContextManager.push('screen-twok-code-redemption', { singleton: true, createMouseGuard: true });
	}
}

Controls.define('collection-content', {
	createInstance: CollectionContent,
	description: 'Store Launcher screen.',
	classNames: ['collection-content', 'relative', 'flex-auto'],
	styles: ['fs://game/core/ui/shell/collection/collection-content.css'],
	attributes: [],
	tabIndex: -1
});
