import PlayerColors, { PlayerColorVariants } from '/core/ui/utilities/utilities-color.js';
class TestCivicsCard extends Component {
	constructor(root: ComponentRoot) {
		super(root);
	}

	onAttach() {
		super.onAttach();

		// Main Containers
		const mainContainer: HTMLElement = document.createElement('div');
		mainContainer.classList.add('test-civics__main-container');

		// Tier Container - Two nested containers to force the width of the main card to stretch if the tiers' width is greater, without stretching the main card's height
		// const tierOuterContainer: HTMLElement = document.createElement('div');
		// tierOuterContainer.classList.add('test-civics-card__tier-container');

		const tierContainer: HTMLElement = document.createElement('div');
		tierContainer.classList.add('test-civics-card__tier-inner-container');

		const tierHitbox: HTMLElement = document.createElement('div');
		tierHitbox.classList.add('test-civics-card__tier-hitbox');
		tierContainer.appendChild(tierHitbox);

		const tierShadow: HTMLElement = document.createElement('div');
		tierShadow.classList.add('test-civics-card__bg-shadow', 'test-civics-card__bg-shadow--tier');
		tierContainer.appendChild(tierShadow);

		const tierHighlight: HTMLElement = document.createElement('div');
		tierHighlight.classList.add('test-civics-card__bg-shape');
		tierHighlight.classList.add('test-civics-card__main-highlight');
		tierHighlight.classList.add('test-civics-card__tier-highlight');
		tierContainer.appendChild(tierHighlight);

		// tierOuterContainer.appendChild(tierContainer);

		mainContainer.appendChild(tierContainer);

		// Main Card
		const mainCard: HTMLElement = document.createElement('div');
		mainCard.classList.add('test-civics-card__card', 'test-civics-card__card--main');

		const mainCardHitbox: HTMLElement = document.createElement('div');
		mainCardHitbox.classList.add('test-civics-card__hitbox');
		mainCard.appendChild(mainCardHitbox);

		// Main Shadow Layer
		const cardShadow: HTMLElement = document.createElement('div');
		cardShadow.classList.add('test-civics-card__bg-shadow');

		const iconBigShadow: HTMLElement = document.createElement('div');
		iconBigShadow.classList.add('test-civics-card__icon-shadow', 'test-civics-card__icon-shadow--main-big');
		cardShadow.appendChild(iconBigShadow);

		const progressShadow: HTMLElement = document.createElement('div');
		progressShadow.classList.add('test-civics-card__progress-shadow');
		cardShadow.appendChild(progressShadow);

		mainCard.appendChild(cardShadow);

		// Main Highlight Layer
		const progressHighlight: HTMLElement = document.createElement('div');
		progressHighlight.classList.add('test-civics-card__progress-highlight');
		mainCard.appendChild(progressHighlight);

		const iconHighlight: HTMLElement = document.createElement('div');
		iconHighlight.classList.add('test-civics-card__icon-highlight', 'test-civics-card__icon-highlight--main');
		mainCard.appendChild(iconHighlight);

		const mainHighlight: HTMLElement = document.createElement('div');
		mainHighlight.classList.add('test-civics-card__bg-shape');
		mainHighlight.classList.add('test-civics-card__main-highlight');
		mainCard.appendChild(mainHighlight);

		// Progress Bar
		const progressBarContainer: HTMLElement = document.createElement('div');
		progressBarContainer.classList.add('test-civics-card__progress-container');
		const progressBarBG: HTMLElement = document.createElement('div');
		progressBarBG.classList.add('test-civics-card__progress-bg');
		progressBarContainer.appendChild(progressBarBG);
		const progressBar: HTMLElement = document.createElement('div');
		progressBar.classList.add('test-civics-card__progress-bar');
		progressBarContainer.appendChild(progressBar);
		const progressFrame: HTMLElement = document.createElement('div');
		progressFrame.classList.add('test-civics-card__progress-frame');
		progressBarContainer.appendChild(progressFrame);

		mainCard.appendChild(progressBarContainer);

		const cardBG: HTMLElement = document.createElement('div');
		cardBG.classList.add('test-civics-card__bg-shape');
		cardBG.classList.add('test-civics-card__base-bg');
		mainCard.appendChild(cardBG);

		const cardBGThinFrame: HTMLElement = document.createElement('div');
		cardBGThinFrame.classList.add('test-civics-card__thin-frame');
		mainCard.appendChild(cardBGThinFrame);

		const cardBGGradient: HTMLElement = document.createElement('div');
		cardBGGradient.classList.add('test-civics-card__bg-shape');
		cardBGGradient.classList.add('test-civics-card__bg-gradient');
		mainCard.appendChild(cardBGGradient);

		const cardBGThickFrame: HTMLElement = document.createElement('div');
		cardBGThickFrame.classList.add('test-civics-card__thick-frame');
		mainCard.appendChild(cardBGThickFrame);

		const cardTitle: HTMLElement = document.createElement('div');
		cardTitle.classList.add('test-civics-card__title');
		cardTitle.setAttribute('data-l10n-id', 'Citizenship');
		mainCard.appendChild(cardTitle);

		const cardBonuses: HTMLElement = document.createElement('div');
		cardBonuses.classList.add('test-civics-card__bonus-container');

		// Main Bonuses
		const mainBonusLeftPattern: HTMLElement = document.createElement("div");
		{
			mainBonusLeftPattern.classList.add("test-civics-card__bonus-pattern-container");
			mainBonusLeftPattern.classList.add("pattern-left");
			const pattern: HTMLElement = document.createElement("div");
			{
				pattern.classList.add("test-civics-card__bonus-pattern");
			}
			mainBonusLeftPattern.appendChild(pattern);
		}
		cardBonuses.appendChild(mainBonusLeftPattern);

		const mainBonusCount: number = parseInt(this.Root.getAttribute('data-main-bonus-count') ?? "0");

		for (let i: number = 0; i < mainBonusCount; i++) {
			const bonus: HTMLElement = document.createElement('test-hex-icon');
			bonus.classList.add('test-civics-card__bonus');
			cardBonuses.appendChild(bonus);
		}

		const mainBonusRightPattern: HTMLElement = document.createElement("div");
		{
			mainBonusRightPattern.classList.add("test-civics-card__bonus-pattern-container");
			mainBonusRightPattern.classList.add("pattern-right");
			const pattern: HTMLElement = document.createElement("div");
			{
				pattern.classList.add("test-civics-card__bonus-pattern");
			}
			mainBonusRightPattern.appendChild(pattern);
		}
		cardBonuses.appendChild(mainBonusRightPattern);

		mainCard.appendChild(cardBonuses);

		// Main Overlay/Shading
		const cardBGLightGradient: HTMLElement = document.createElement('div');
		cardBGLightGradient.classList.add('test-civics-card__bg-shape');
		cardBGLightGradient.classList.add('test-civics-card__overlay-light');
		mainCard.appendChild(cardBGLightGradient);

		const cardBGDarkGradient: HTMLElement = document.createElement('div');
		cardBGDarkGradient.classList.add('test-civics-card__bg-shape');
		cardBGDarkGradient.classList.add('test-civics-card__overlay-dark');
		mainCard.appendChild(cardBGDarkGradient);

		// Main Checkmark
		const checkMarkContainer: HTMLElement = document.createElement('div');
		checkMarkContainer.classList.add('checkmark-container');
		checkMarkContainer.classList.add('test-civics-card__checkmark');
		const checkMark: HTMLElement = document.createElement('div');
		checkMark.classList.add('absolute', 'inset-3', 'bg-accent-1', 'mask-center-contain', 'checkmark-icon');
		checkMarkContainer.appendChild(checkMark);
		mainCard.appendChild(checkMarkContainer);

		mainContainer.appendChild(mainCard);

		this.Root.appendChild(mainContainer);

		// Main Icon
		const iconContainer: HTMLElement = document.createElement('div');
		iconContainer.classList.add('test-civics-card__icon-container');

		const iconShadow: HTMLElement = document.createElement('div');
		iconShadow.classList.add('test-civics-card__icon-shadow', 'test-civics-card__icon-shadow--main-tight');
		iconContainer.appendChild(iconShadow);

		const iconBG: HTMLElement = document.createElement('div');
		iconBG.classList.add('test-civics-card__icon-bg', 'test-civics-card__icon-bg--main');
		iconContainer.appendChild(iconBG);

		const iconFrame: HTMLElement = document.createElement('div');
		iconFrame.classList.add('test-civics-card__icon-frame', 'test-civics-card__icon-frame--main');
		iconContainer.appendChild(iconFrame);

		const iconImage: HTMLElement = document.createElement('div');
		iconImage.classList.add('test-civics-card__icon-image');
		iconContainer.appendChild(iconImage);

		const iconOverlay: HTMLElement = document.createElement('div');
		iconOverlay.classList.add('test-civics-card__icon-overlay', 'test-civics-card__icon-overlay--main');
		iconContainer.appendChild(iconOverlay);

		const iconTurnCounter: HTMLElement = document.createElement('test-turn-counter');
		iconTurnCounter.classList.add('test-civics-card__turn-counter');
		iconContainer.appendChild(iconTurnCounter);

		mainCard.appendChild(iconContainer);

		// Calculate player colors (only for this sandbox example)
		const primaryColor: string | null = this.Root.getAttribute('data-primary-color');
		const secondaryColor: string | null = this.Root.getAttribute('data-secondary-color');

		if (primaryColor && secondaryColor) {
			this.realizePlayerColors(this.Root, primaryColor, secondaryColor);
		}

		// Apply relevant classes (only for this sandbox example)
		const mainCardStatus: string | null = this.Root.getAttribute('data-main-card');
		switch (mainCardStatus) {
			case "complete":
				mainCard.classList.add('test-civics-card--complete');
				break;
			case "researching":
				this.Root.classList.add('test-civics-card--in-progress');
				mainCard.classList.add('test-civics-card--in-progress');
				break;
			case "locked":
				mainCard.classList.add('test-civics-card--locked');
				break;
		}

		// If tiers exist, create them and apply classes (only for this sandbox example)
		// Tiers --MUST-- be added in reverse order, for the z-ordering to work properly with column-reverse
		const secondTierStatus: string | null = this.Root.getAttribute('data-second-tier');
		if (secondTierStatus) {
			const bonusCount: number = parseInt(this.Root.getAttribute('data-second-tier-bonus-count') ?? "0");
			const tier2: HTMLElement = this.createTierCard("III", bonusCount);
			tierContainer.appendChild(tier2);
			switch (secondTierStatus) {
				case "complete":
					tier2.classList.add('test-civics-card--complete');
					break;
				case "researching":
					this.Root.classList.add('test-civics-card--in-progress');
					tier2.classList.add('test-civics-card--in-progress');
					break;
				case "locked":
					tier2.classList.add('test-civics-card--locked');
					break;
			}
		}

		const firstTierStatus: string | null = this.Root.getAttribute('data-first-tier');
		if (firstTierStatus) {
			const bonusCount: number = parseInt(this.Root.getAttribute('data-first-tier-bonus-count') ?? "0");
			const tier1: HTMLElement = this.createTierCard("II", bonusCount);
			tierContainer.appendChild(tier1);
			this.Root.classList.add('test-civics-card--has-tiers');
			switch (firstTierStatus) {
				case "complete":
					tier1.classList.add('test-civics-card--complete');
					break;
				case "researching":
					this.Root.classList.add('test-civics-card--in-progress');
					tier1.classList.add('test-civics-card--in-progress');
					break;
				case "locked":
					tier1.classList.add('test-civics-card--locked');
					break;
			}
		}
	}

	private createTierCard(iconText: string, bonusCount: number): HTMLElement {
		const tier: HTMLElement = document.createElement('div');
		{
			tier.classList.add('test-civics-card__card', 'test-civics-card__card--tier');

			// Icon Shadow & Highlight

			const iconBigShadow: HTMLElement = document.createElement('div');
			iconBigShadow.classList.add('test-civics-card__icon-shadow', 'test-civics-card__icon-shadow--tier-big');
			tier.appendChild(iconBigShadow);

			const tierHighlight: HTMLElement = document.createElement('div');
			tierHighlight.classList.add('test-civics-card__icon-highlight', 'test-civics-card__icon-highlight--tier');
			tier.appendChild(tierHighlight);

			// BG
			const tierBG: HTMLElement = document.createElement('div');
			tierBG.classList.add('test-civics-card__bg-shape');
			tierBG.classList.add('test-civics-card__base-bg');
			tier.appendChild(tierBG);

			const tierThinFrame: HTMLElement = document.createElement('div');
			tierThinFrame.classList.add('test-civics-card__thin-frame');
			tier.appendChild(tierThinFrame);

			const tierGradient: HTMLElement = document.createElement('div');
			tierGradient.classList.add('test-civics-card__bg-shape');
			tierGradient.classList.add('test-civics-card__bg-gradient');
			tier.appendChild(tierGradient);

			const tierThickFrame: HTMLElement = document.createElement('div');
			tierThickFrame.classList.add('test-civics-card__thick-frame');
			tier.appendChild(tierThickFrame);

			// Tier Bonuses
			const tierBonuses: HTMLElement = document.createElement('div');
			tierBonuses.classList.add('test-civics-card__bonus-container');

			const tierLeftPattern: HTMLElement = document.createElement("div");
			{
				tierLeftPattern.classList.add("test-civics-card__bonus-pattern-container");
				tierLeftPattern.classList.add("pattern-left");
				const pattern: HTMLElement = document.createElement("div");
				{
					pattern.classList.add("test-civics-card__bonus-pattern");
				}
				tierLeftPattern.appendChild(pattern);
			}
			tierBonuses.appendChild(tierLeftPattern);

			for (let i: number = 0; i < bonusCount; i++) {
				const bonus: HTMLElement = document.createElement('test-hex-icon');
				bonus.classList.add('test-civics-card__bonus');
				tierBonuses.appendChild(bonus);
			}

			const tierRightPattern: HTMLElement = document.createElement("div");
			{
				tierRightPattern.classList.add("test-civics-card__bonus-pattern-container");
				tierRightPattern.classList.add("pattern-right");
				const pattern: HTMLElement = document.createElement("div");
				{
					pattern.classList.add("test-civics-card__bonus-pattern");
				}
				tierRightPattern.appendChild(pattern);
			}
			tierBonuses.appendChild(tierRightPattern);

			tier.appendChild(tierBonuses);

			// Tier Overlay & Shading
			const tierLightGradient: HTMLElement = document.createElement('div');
			tierLightGradient.classList.add('test-civics-card__bg-shape');
			tierLightGradient.classList.add('test-civics-card__overlay-light');
			tier.appendChild(tierLightGradient);

			const tierDarkGradient: HTMLElement = document.createElement('div');
			tierDarkGradient.classList.add('test-civics-card__bg-shape');
			tierDarkGradient.classList.add('test-civics-card__overlay-dark');
			tier.appendChild(tierDarkGradient);

			const tierShadow: HTMLElement = document.createElement('div');
			tierShadow.classList.add('test-civics-card__tier-top-shadow');
			tier.appendChild(tierShadow);

			// Tier Icon
			const iconContainer: HTMLElement = document.createElement('div');
			iconContainer.classList.add('test-civics-card__tier-icon-container');

			const iconShadow: HTMLElement = document.createElement('div');
			iconShadow.classList.add('test-civics-card__icon-shadow', 'test-civics-card__icon-shadow--tier-tight');
			iconContainer.appendChild(iconShadow);

			const iconBG: HTMLElement = document.createElement('div');
			iconBG.classList.add('test-civics-card__icon-bg', 'test-civics-card__icon-bg--tier');
			iconContainer.appendChild(iconBG);

			const iconFrame: HTMLElement = document.createElement('div');
			iconFrame.classList.add('test-civics-card__icon-frame');
			iconContainer.appendChild(iconFrame);

			const iconInnerBG: HTMLElement = document.createElement('div');
			iconInnerBG.classList.add('test-civics-card__icon-bg', 'test-civics-card__icon-bg--tier-inner');
			iconInnerBG.textContent = iconText;
			iconContainer.appendChild(iconInnerBG);

			const iconOverlay: HTMLElement = document.createElement('div');
			iconOverlay.classList.add('test-civics-card__icon-overlay', 'test-civics-card__icon-overlay--tier');
			iconContainer.appendChild(iconOverlay);

			const iconTurnCounter: HTMLElement = document.createElement('test-turn-counter');
			iconTurnCounter.classList.add('test-civics-card__tier-turn-counter');
			iconContainer.appendChild(iconTurnCounter);

			// Arrow to indicate this tier is the active one
			const progressArrow = document.createElement('div');
			progressArrow.classList.add("fxs-arrow-button", "right-arrow", "test-civics-card__progress-arrow");
			{
				const arrowShadow: HTMLElement = document.createElement("div");
				arrowShadow.classList.add("fxs-arrow-button__bg", "arrow-shadow");

				const arrowShape: HTMLElement = document.createElement("div");
				arrowShape.classList.add("fxs-arrow-button__bg", "arrow-shape");

				progressArrow.appendChild(arrowShadow);
				progressArrow.appendChild(arrowShape);
			}
			iconContainer.appendChild(progressArrow);

			tier.appendChild(iconContainer);

			// Checkmark
			const checkMarkContainer: HTMLElement = document.createElement('div');
			checkMarkContainer.classList.add('checkmark-container');
			checkMarkContainer.classList.add('test-civics-card__tier-checkmark');
			const checkMark: HTMLElement = document.createElement('div');
			checkMark.classList.add('absolute', 'inset-3', 'bg-accent-1', 'mask-center-contain', 'checkmark-icon');
			checkMarkContainer.appendChild(checkMark);
			tier.appendChild(checkMarkContainer);
		}

		return tier
	}

	private realizePlayerColors(target: HTMLElement, playerColorPri: string, playerColorSec: string) {
		// set colors based on the player's colors
		const playerColorVariants: PlayerColorVariants = PlayerColors.createPlayerColorVariants(playerColorPri, playerColorSec);
		target.style.setProperty('--player-color-primary', playerColorPri);
		target.style.setProperty('--player-color-secondary', playerColorSec);

		target.style.setProperty('--player-color-primary-text', playerColorVariants.primaryColor.textColor);
		target.style.setProperty('--player-color-primary-accent', playerColorVariants.primaryColor.accentColor);
		target.style.setProperty('--player-color-secondary-text', playerColorVariants.secondaryColor.textColor);
		target.style.setProperty('--player-color-secondary-accent', playerColorVariants.secondaryColor.accentColor);
		target.style.setProperty('--player-color-primary-more', playerColorVariants.primaryColor.moreColor ?? playerColorPri);
		target.style.setProperty('--player-color-primary-less', playerColorVariants.primaryColor.lessColor ?? playerColorPri);
		target.style.setProperty('--player-color-secondary-more', playerColorVariants.secondaryColor.moreColor ?? playerColorSec);
		target.style.setProperty('--player-color-secondary-less', playerColorVariants.secondaryColor.lessColor ?? playerColorSec);
		target.classList.toggle("primary-color-is-lighter", playerColorVariants.isPrimaryLighter);
	}
}

Controls.define('test-civics-card', {
	createInstance: TestCivicsCard,
	description: '[TEST] Civics Card',
	styles: ["fs://game/core/ui/sandbox/components/test_components.css"],
	attributes: []
});

class TestHexIcon extends Component {
	constructor(root: ComponentRoot) {
		super(root);
	}

	onAttach() {
		super.onAttach();
		// Shadow
		const stepIconShadow: HTMLElement = document.createElement('div');
		stepIconShadow.classList.add('test-hex-icon__bg-shape', 'test-hex-icon__bg-shadow');
		this.Root.appendChild(stepIconShadow);
		// Outer border
		const stepIconOuterBg: HTMLElement = document.createElement('div');
		stepIconOuterBg.classList.add('test-hex-icon__bg-shape', 'test-hex-icon__bg-outer');
		this.Root.appendChild(stepIconOuterBg);
		// Inner shape
		const stepIconInnerBg: HTMLElement = document.createElement('div');
		stepIconInnerBg.classList.add('test-hex-icon__bg-shape', 'test-hex-icon__bg-inner');
		this.Root.appendChild(stepIconInnerBg);
		// Icon
		const stepIcon: HTMLDivElement = document.createElement("div");
		stepIcon.classList.add("test-hex-icon__image");
		this.Root.appendChild(stepIcon);
	}
}

Controls.define('test-hex-icon', {
	createInstance: TestHexIcon,
	description: '[TEST] Hex Icon',
	styles: ["fs://game/core/ui/sandbox/components/test_components.css"],
	attributes: []
});

class TestTurnCounter extends Component {
	constructor(root: ComponentRoot) {
		super(root);
	}

	onAttach() {
		super.onAttach();
		// Shadow
		const turnCounterShadow: HTMLElement = document.createElement('div');
		turnCounterShadow.classList.add('test-turn-counter__shadow');
		this.Root.appendChild(turnCounterShadow);
		// Outer border
		const turnCounterOuterBG: HTMLElement = document.createElement('div');
		turnCounterOuterBG.classList.add('test-turn-counter__bg-shape');
		turnCounterOuterBG.classList.add('test-turn-counter__outer-bg');
		this.Root.appendChild(turnCounterOuterBG);
		// Inner shape
		const turnCounterFrame: HTMLElement = document.createElement('div');
		turnCounterFrame.classList.add('test-turn-counter__bg-shape');
		turnCounterFrame.classList.add('test-turn-counter__frame');
		this.Root.appendChild(turnCounterFrame);
		// Icon
		const turnCounterNumber: HTMLDivElement = document.createElement("div");
		turnCounterNumber.classList.add("test-turn-counter__number");
		turnCounterNumber.setAttribute("data-l10n-id", "8");
		this.Root.appendChild(turnCounterNumber);
		// Overlay
		const turnCounterOverlay: HTMLElement = document.createElement('div');
		turnCounterOverlay.classList.add('test-turn-counter__bg-shape');
		turnCounterOverlay.classList.add('test-turn-counter__overlay');
		this.Root.appendChild(turnCounterOverlay);
	}
}

export { TestCivicsCard, TestHexIcon, TestTurnCounter as default };

Controls.define('test-turn-counter', {
	createInstance: TestTurnCounter,
	description: '[TEST] Turn Counter',
	styles: ["fs://game/core/ui/sandbox/components/test_components.css"],
	attributes: []
});

