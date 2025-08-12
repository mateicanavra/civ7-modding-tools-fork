/**
 * @file panel-player-rewards.ts
 * @copyright 2024, Firaxis Games
 * @description Shows a list of rewards the player can pursue.
 */

import FocusManager from '/core/ui/input/focus-manager.js';
import Panel from '/core/ui/panel-support.js';
import PlayerUnlocks from '/base-standard/ui/unlocks/model-unlocks.js';

class PanelPlayerRewards extends Panel {

	onInitialize(): void {
		this.Root.appendChild(this.buildRewardsPage());
	}

	onAttach() {
		super.onAttach();

		this.Root.addEventListener("focus", this.onFocus);
	}

	onDetach() {
		this.Root.removeEventListener("focus", this.onFocus);

		super.onDetach();
	}

	private onFocus = () => {
		const firstFocusable = this.Root.querySelector(".screen-unlocks__item");
		if (firstFocusable) {
			FocusManager.setFocus(firstFocusable);
		}
	}

	private clearList(root: HTMLElement) {
		let child: Node | undefined | null = null;
		while (child = root.lastChild) {
			root.removeChild(child);
		}
	}

	private buildRewardsPage(): HTMLElement {
		const rewardsPage = document.createElement('div');
		rewardsPage.classList.add('unlock__reward-content', 'flow-column', 'w-full', 'h-full');
		// Text Line
		// Scrollable, using same style as above
		const rewardWrapper = document.createElement('div');
		rewardWrapper.classList.add('unlocks__reward-wrapper', 'h-full', 'flex-col', 'shrink');

		const rewardCurrencyWrapper = document.createElement('div');
		rewardCurrencyWrapper.classList.add('flow-row', 'w-full', 'justify-center');
		const rewardCurrencyText = document.createElement('p');
		rewardCurrencyText.classList.add('font-body', 'text-base', 'leading-relaxed');
		rewardCurrencyText.innerHTML = Locale.compose("LOC_UI_PLAYER_UNLOCKS_ACQUIRED_LEGACY_POINTS");
		rewardCurrencyWrapper.appendChild(rewardCurrencyText);
		this.populatePlayerCurrency(rewardCurrencyWrapper);

		const rewardListWrapper = document.createElement('div');
		rewardListWrapper.classList.add('unlock__scrollable', 'my-1', 'flow-column', 'items-center', 'shrink');
		const rewardListText = document.createElement('p');
		rewardListText.classList.add('reward-instruction', 'font-body', 'text-base', 'mb-2');
		rewardListText.innerHTML = Locale.compose("LOC_UI_PLAYER_UNLOCKS_COMPLETE_LISTED_REQUIREMENTS_LEGACIES");
		const rewardScrollable = document.createElement('fxs-scrollable');
		rewardScrollable.setAttribute("handle-gamepad-pan", "true");
		rewardScrollable.classList.add('civilizations-scrollable', 'w-full', 'shrink', 'px-4', 'mb-12');
		const rewardScrollSlots = document.createElement('fxs-vslot');
		this.populateRewards(rewardScrollSlots);
		rewardScrollable.appendChild(rewardScrollSlots);
		rewardListWrapper.appendChild(rewardListText);
		rewardListWrapper.appendChild(rewardScrollable);

		rewardWrapper.appendChild(rewardCurrencyWrapper);
		rewardWrapper.appendChild(rewardListWrapper);

		rewardsPage.appendChild(rewardWrapper);
		return rewardsPage;
	}

	private populatePlayerCurrency(root: HTMLElement) {
		const rewardPoints = PlayerUnlocks.getLegacyCurrency();
		const orderList: CardCategories[] = [
			CardCategories.CARD_CATEGORY_WILDCARD,
			CardCategories.CARD_CATEGORY_SCIENTIFIC,
			CardCategories.CARD_CATEGORY_CULTURAL,
			CardCategories.CARD_CATEGORY_MILITARISTIC,
			CardCategories.CARD_CATEGORY_ECONOMIC
		];

		for (let category: number = 0; category < orderList.length; category++) {
			const instance: CardCategoryInstance | undefined = rewardPoints.find((target) => { return target.category == orderList[category] });
			const instanceValue = instance?.value || 0;
			const cardCategory = Object.keys(CardCategories).find(key => CardCategories[key as keyof typeof CardCategories] === orderList[category]);
			const targetCurrency = document.createElement('div');
			targetCurrency.classList.add('ml-4', 'flow-row', 'items-center');

			const pointsText = document.createElement('div');
			pointsText.innerHTML = instanceValue.toString();
			pointsText.classList.add('font-body', 'text-lg', 'leading-relaxed')
			const icon = document.createElement('div');
			const iconUrl = UI.getIconURL(cardCategory || '');
			icon.style.backgroundImage = `url('${iconUrl}')`;
			icon.classList.add('size-10', 'bg-contain', 'bg-no-repeat', 'bg-center');

			targetCurrency.appendChild(pointsText);
			targetCurrency.appendChild(icon);
			root.appendChild(targetCurrency);
		}
	}

	private populateRewards(root: HTMLElement) {
		this.clearList(root);
		const rewards = PlayerUnlocks.getRewardItems();
		const playerCivilization: string | null = this.getCivilizationName();
		if (!playerCivilization) {
			console.error("screen-unlocks: buildrewardPage(): failed to get Player Civilization name!");
			return;
		}


		rewards.forEach(reward => {
			const unlocksItem: HTMLElement = document.createElement('fxs-activatable');
			unlocksItem.setAttribute("data-audio-group-ref", "audio-screen-unlocks");
			unlocksItem.setAttribute("data-audio-activate-ref", "data-audio-activate");
			unlocksItem.setAttribute("tabindex", "-1");
			unlocksItem.classList.add('screen-unlocks__item', 'flow-row', 'flex-auto', 'h-32', 'w-full', 'my-1', 'bg-primary', 'justify-between',
				'bg-center', 'relative', 'group'
			);
			unlocksItem.style.backgroundImage = UI.getIconCSS(playerCivilization, "BACKGROUND");

			// background overlay
			const backgroundOverlay: HTMLElement = document.createElement('div');
			backgroundOverlay.classList.add('unlock-frame', 'absolute', 'w-full', 'h-full', 'opacity-70');
			unlocksItem.appendChild(backgroundOverlay);

			// background overlay hover
			const backgroundOverlayHover: HTMLElement = document.createElement('div');
			backgroundOverlayHover.classList.add('unlock-frame-hover', 'absolute', 'w-full', 'h-full', 'opacity-0',
				"group-hover\\:opacity-100", "group-focus\\:opacity-100"
			);
			unlocksItem.appendChild(backgroundOverlayHover);

			// content wrapper
			const contentWrapper: HTMLElement = document.createElement('fxs-hslot');
			contentWrapper.classList.add('unlock-content-wrapper', 'w-full', 'h-full', 'absolute', 'justify-between', 'shrink');
			unlocksItem.appendChild(contentWrapper);

			// icon and text wrapper
			const unlockDetailWrapper = document.createElement('div')
			unlockDetailWrapper.classList.add('icon-text-container', 'flex', 'w-full', 'items-center');

			// icon
			const unlockIcon = document.createElement("img");
			unlockIcon.classList.add('m-5', 'size-16');
			unlockIcon.src = UI.getIconURL(reward.Icon || '');
			unlockDetailWrapper.appendChild(unlockIcon);

			// title
			const unlocksItemTitle: HTMLDivElement = document.createElement("div");
			unlocksItemTitle.classList.add('font-title', 'text-lg');
			unlocksItemTitle.setAttribute('data-l10n-id', reward.Name || '');
			// detail
			const unlockItemDescription = document.createElement('div');
			unlockItemDescription.classList.add('font-body', 'text-sm', 'shrink');
			let description = reward.Description || '';
			if (Game.AgeProgressManager.isFinalAge && reward.DescriptionFinalAge != null) {
				description = reward.DescriptionFinalAge;
			}
			unlockItemDescription.setAttribute('data-l10n-id', description);
			const unlockTextWrapper = document.createElement('div');
			unlockTextWrapper.classList.add('unlock-item-text-wrapper', 'flow-column', 'items-start', 'py-1', 'shrink');

			// Append all containers to fxs-activatable
			unlockTextWrapper.appendChild(unlocksItemTitle);
			unlockTextWrapper.appendChild(unlockItemDescription);

			unlockDetailWrapper.appendChild(unlockTextWrapper);
			contentWrapper.appendChild(unlockDetailWrapper);

			unlocksItem.appendChild(contentWrapper);
			root.appendChild(unlocksItem);
		})

	}

	private getCivilizationName(): string {
		const gameConfig = Configuration.getGame();
		const playerConfig = Configuration.getPlayer(GameContext.localPlayerID);
		if (!gameConfig || !playerConfig) {
			return "";
		}

		const civTypeName: string | null = playerConfig.civilizationTypeName;

		if (!civTypeName) {
			return "";
		}

		return civTypeName;
	}
}

Controls.define('panel-player-rewards', {
	createInstance: PanelPlayerRewards,
	attributes: [{ name: 'reward-type' }],
	description: 'Panel which displays the different rewards a player can pursue',
	classNames: ['panel-player-rewards', 'flex-auto', 'h-auto'],
	tabIndex: -1
});