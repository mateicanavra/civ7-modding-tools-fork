/**
 * @file root-game-loading.ts
 * @copyright 2020-2024, Firaxis Games
 * @description Full screen content to show between shell and game states.
 */

///<reference path="loading-flipbook.ts" />
/// <reference path="../../../core/ui/themes/default/global-scaling.ts" />

const WAIT_FOR_FADE_IN_TIMEOUT_DURATION = 400;


(function () {

	// ---------- start of: utilities-loading ----------
	// TODO: import this code from another module (can't for now as root-game-loading is not a module)

	interface RequiredLoadingComponent {
		id: number;
		value: number;
	}

	const requiredLoadingComponents: RequiredLoadingComponent[] = [
		{
			id: UIGameLoadingProgressState.ContentIsConfigured,
			value: 5,
		},
		{
			id: UIGameLoadingProgressState.GameCoreInitializationIsStarted,
			value: 2,
		},
		{
			id: UIGameLoadingProgressState.GameIsInitialized,
			value: 2,
		},
		{
			id: UIGameLoadingProgressState.GameCoreInitializationIsDone,
			value: 4,
		},
		{
			id: UIGameLoadingProgressState.GameIsFinishedLoading,
			value: 2,
		},
		{
			id: UIGameLoadingProgressState.UIIsInitialized,
			value: 5,
		},
		{
			id: UIGameLoadingProgressState.UIIsReady,
			value: 3,
		},
	];

	const totalRequiredLoadingComponentsValue = requiredLoadingComponents.reduce((res, { value }) => res + value, 0);

	const rootLoadingRequiredLoadingComponentIds = [
		UIGameLoadingProgressState.ContentIsConfigured,
	]

	function getRootGameLoadingInitialLoadingRatio() {
		const initialRequiredLoadingComponentsValue = requiredLoadingComponents.reduce((res, { id, value }) => res + (rootLoadingRequiredLoadingComponentIds.includes(id) ? value : 0), 0);
		return initialRequiredLoadingComponentsValue / totalRequiredLoadingComponentsValue;
	}

	// ---------- end of: utilities-loading ----------

	const completedUIGameLoadingProgressStates: Set<UIGameLoadingProgressState> = new Set();
	completedUIGameLoadingProgressStates.add(UIGameLoadingProgressState.ContentIsConfigured);

	const loadingBar = document.querySelector(".loading-curtain__loading-bar");
	const loadingBarProgress = document.createElement("div");
	loadingBarProgress.classList.add("loading-curtain__loading-bar-progress", "absolute", "bottom-0", "left-0", "h-2", "bg-secondary-1", "transition-width");
	loadingBarProgress.style.setProperty("transition-timing-function", "linear");
	loadingBarProgress.style.setProperty("width", `${getRootGameLoadingInitialLoadingRatio() * 100}%`);
	loadingBar?.appendChild(loadingBarProgress);

	// These images are necessary to show the hourglass.
	const preloadHourglass = [
		'fs://game/hourglasses01.png',
		'fs://game/hourglasses02.png',
		'fs://game/hourglasses03.png',
	];

	// These are images we want to ensure are fully loaded before fading the screen in.
	// This should be sync'd with the CSS so that all necessary assets are loaded.
	const preloadImages = [
		'fs://game/ntf_next_turn.png',
		'fs://game/Rounded-Hex_112px.png',
		'fs://game/adv_port_bk.png',
		'fs://game/hud_unit-panel_unitframe.png'
	];

	function Preload(images: string[]) {
		const promises: Promise<void>[] = [];
		images.forEach((img) => {
			const promise = new Promise<void>((resolve, _reject) => {
				let image: HTMLImageElement | null = new Image();
				image.src = img;
				image.style.display = 'none';
				image.style.position = 'absolute';
				image.addEventListener('load', () => {
					image = null;
					resolve();
				});

				// Even if the image fails to load, continue.
				image.addEventListener('error', () => {
					image = null;
					resolve();
				});
			});
			promises.push(promise);
		})

		return Promise.all(promises);
	}

	enum FontScale {
		XSmall = 0,
		Small = 1,
		Medium = 2,
		Large = 3,
		XLarge = 4
	}

	function updateCursorType(deviceType: InputDeviceType) {
		if (deviceType != InputDeviceType.Keyboard && deviceType != InputDeviceType.Mouse && deviceType != InputDeviceType.Hybrid) {
			UI.hideCursor();
		} else {
			UI.showCursor();
		}
	}

	// Sets cursor visible if the current input device type supports a cursor
	updateCursorType(Input.getActiveDeviceType());


	function pixelsToScreenPixels(pxValue: number) {
		return GlobalScaling.remToScreenPixels(GlobalScaling.pixelsToRem(pxValue));
	}

	function setElementContent(elementId: string, content: string) {
		const element: HTMLElement | null = document.getElementById(elementId);
		if (!element) {
			console.error(`game-loading: Unable to set loading screen content '${elementId}' element not found on DOM.`);
			return;
		}
		element.setAttribute('data-l10n-id', content);
	}

	function isLayoutCompact(): boolean {
		const height = window.innerHeight;
		const width = window.innerWidth;

		if ((height < pixelsToScreenPixels(1000) || (width / height < 1.34) || UI.getViewExperience() == UIViewExperience.Mobile)) {
			return true;
		}
		return false;
	}

	function getAgeLoadingInfo(): LoadingInfo_AgeDefinition | null {

		const gameConfig = Configuration.getGame();
		const playerConfig = Configuration.getPlayer(GameContext.localPlayerID);
		if (!gameConfig || !playerConfig) {
			return null;
		}

		const ageTypeName = gameConfig.startAgeName;
		const leaderTypeName = playerConfig.leaderTypeName;
		const civTypeName = playerConfig.civilizationTypeName;

		if (ageTypeName && civTypeName && leaderTypeName) {
			// Grab all valid infos.		
			let loadingInfos = GameInfo.LoadingInfo_Ages.filter(info => {

				const civTypeOverride = info.CivilizationTypeOverride;
				const leaderTypeOverride = info.LeaderTypeOverride;

				return info.AgeType == ageTypeName &&
					(civTypeOverride == null || civTypeOverride == civTypeName) &&
					(leaderTypeOverride == null || leaderTypeOverride == leaderTypeName);
			});

			// Sort based on overrides.
			// Sort is based on specificity descending so the first item in the array is the one we want.
			// CivilizationTypeOverride is considered more specific than LeaderTypeOverride.
			loadingInfos.sort((a, b) => {
				let a_score = ((a.CivilizationTypeOverride) ? 10 : 0) + ((a.LeaderTypeOverride) ? 1 : 0);
				let b_score = ((b.CivilizationTypeOverride) ? 10 : 0) + ((b.LeaderTypeOverride) ? 1 : 0);

				// Use less than because this is sort-descending.
				if (a_score == b_score) {
					return 0;
				}
				else {
					return (a_score < b_score) ? -1 : 1;
				}
			});

			// Take the first value.
			if (loadingInfos.length > 0) {
				return loadingInfos[0];
			}
		}

		return null;
	}

	function getCivLoadingInfo(): LoadingInfo_CivilizationDefinition | null {

		const gameConfig = Configuration.getGame();
		const playerConfig = Configuration.getPlayer(GameContext.localPlayerID);
		if (!gameConfig || !playerConfig) {
			return null;
		}

		const ageTypeName = gameConfig.startAgeName;
		const leaderTypeName = playerConfig.leaderTypeName;
		const civTypeName = playerConfig.civilizationTypeName;

		if (ageTypeName && civTypeName && leaderTypeName) {
			// Grab all valid infos.		
			let loadingInfos = GameInfo.LoadingInfo_Civilizations.filter(info => {

				const ageTypeOverride = info.AgeTypeOverride;
				const leaderTypeOverride = info.LeaderTypeOverride;

				return info.CivilizationType == civTypeName &&
					(ageTypeOverride == null || ageTypeOverride == ageTypeName) &&
					(leaderTypeOverride == null || leaderTypeOverride == leaderTypeName);
			});

			// Sort based on overrides.
			// Sort is based on specificity descending so the first item in the array is the one we want.
			// LeaderTypeOverride is considered more specific than AgeTypeOverride.
			loadingInfos.sort((a, b) => {
				let a_score = ((a.LeaderTypeOverride) ? 10 : 0) + ((a.AgeTypeOverride) ? 1 : 0);
				let b_score = ((b.LeaderTypeOverride) ? 10 : 0) + ((b.AgeTypeOverride) ? 1 : 0);

				// Use less than because this is sort-descending.
				if (a_score == b_score) {
					return 0;
				}
				else {
					return (a_score < b_score) ? -1 : 1;
				}
			});

			// Take the first value.
			if (loadingInfos.length > 0) {
				return loadingInfos[0];
			}
		}

		return null;
	}

	function getLeaderLoadingInfo(): LoadingInfo_LeaderDefinition | null {

		const gameConfig = Configuration.getGame();
		const playerConfig = Configuration.getPlayer(GameContext.localPlayerID);
		if (!gameConfig || !playerConfig) {
			return null;
		}

		const ageTypeName = gameConfig.startAgeName;
		const leaderTypeName = playerConfig.leaderTypeName;
		const civTypeName = playerConfig.civilizationTypeName;

		if (ageTypeName && civTypeName && leaderTypeName) {
			// Grab all valid infos.		
			let loadingInfos = GameInfo.LoadingInfo_Leaders.filter(info => {

				const ageTypeOverride = info.AgeTypeOverride;
				const civTypeOverride = info.CivilizationTypeOverride;

				return info.LeaderType == leaderTypeName &&
					(ageTypeOverride == null || ageTypeOverride == ageTypeName) &&
					(civTypeOverride == null || civTypeOverride == civTypeName);
			});

			// Sort based on overrides.
			// Sort is based on specificity descending so the first item in the array is the one we want.
			// CivilizationTypeOverride is considered more specific than AgeTypeOverride.
			loadingInfos.sort((a, b) => {
				let a_score = ((a.CivilizationTypeOverride) ? 10 : 0) + ((a.AgeTypeOverride) ? 1 : 0);
				let b_score = ((b.CivilizationTypeOverride) ? 10 : 0) + ((b.AgeTypeOverride) ? 1 : 0);

				// Use less than because this is sort-descending.
				if (a_score == b_score) {
					return 0;
				}
				else {
					return (a_score < b_score) ? -1 : 1;
				}
			});

			// Take the first value.
			if (loadingInfos.length > 0) {
				return loadingInfos[0];
			}
		}

		return null;
	}

	function realizeInfo() {
		const playerConfig: ConfigurationPlayerAccessor = Configuration.getPlayer(GameContext.localPlayerID);
		if (!playerConfig) {
			return;
		}

		if (!playerConfig.leaderTypeName ||
			!playerConfig.civilizationTypeName) {
			console.error("Missing necessary data for loading screen.");
			return;
		}

		const leaderName: string = playerConfig.leaderName ?? 'ERROR: Missing Leader Name';
		const civName: string = playerConfig.civilizationFullName ?? playerConfig.civilizationName ?? 'ERROR: Missing Civilizaiton Name';
		const civType: string = playerConfig.civilizationTypeName;

		const ageLoadingInfo = getAgeLoadingInfo();
		const civLoadingInfo = getCivLoadingInfo();
		const leaderLoadingInfo = getLeaderLoadingInfo();

		let civTrait: CivilizationTraitDefinition | null = GameInfo.LegacyCivilizationTraits.lookup(civType);

		// Fill Data per User's Choices
		const leaderImageElement = document.querySelector<HTMLElement>(".root-game-loading__leaderPortrait");
		if (leaderImageElement) {
			const imagePath: string | undefined = leaderLoadingInfo?.LeaderImage;
			if (imagePath) {
				leaderImageElement.style.backgroundImage = `url(${imagePath})`;
			}
		}
		const backgroundImageElement = document.querySelector<HTMLElement>(".root-game-loading__scene-fg");
		if (backgroundImageElement) {
			const imagePath: string | undefined = window.innerWidth >= 1080 ? civLoadingInfo?.BackgroundImageHigh : civLoadingInfo?.BackgroundImageLow;
			if (imagePath) {
				backgroundImageElement.style.backgroundImage = `url(${imagePath})`;
			}
		}

		const { uiFontScale } = Configuration.getUser();
		const uiViewingExperience = UI.getViewExperience();
		// for medium scale and up, enable the leader/civ icons since you can't see the backdrop
		const smallIconsBox = document.querySelector<HTMLElement>(".root-game-loading__small-screen-area");
		if (smallIconsBox) {
			if (uiFontScale >= FontScale.Small && uiViewingExperience != UIViewExperience.Mobile) {
				smallIconsBox.classList.remove("hidden");
			}
		}

		// For medium & large
		if (uiFontScale >= FontScale.Medium) {
			// scoot the leader/civ/small uniques div down a little
			if (smallIconsBox) {
				smallIconsBox.classList.remove("-bottom-3");
				smallIconsBox.classList.add("-bottom-8");
			}

			// For large
			if (uiFontScale >= FontScale.Large) {
				// move the click-to-start button to the right edge of the screen
				const clickToStart = document.getElementById("start_game");
				if (clickToStart) {
					clickToStart.classList.add("root-game-loading-icon-large");
				}

				if (uiViewingExperience != UIViewExperience.Mobile) {
					// hide the main unique units/buildings area
					const uniqueIconsArea = document.querySelector<HTMLElement>(".root-game-loading__unique-horizontal-flex-box");
					if (uniqueIconsArea) {
						uniqueIconsArea.classList.add("root-game-loading-uniques-large");
					}

					// show the auxiliary unique units/buildings area
					const smallScreenUniques = document.querySelector<HTMLElement>(".root-game-loading__small-screen-uniques");
					if (smallScreenUniques) {
						smallScreenUniques.classList.add("root-game-loading-small-screen-uniques-large");
					}
				}
			}
			else {	// Medium, just move click-to-start
				// move the click-to-start button to the right edge of the screen
				const clickToStart = document.getElementById("start_game");
				if (clickToStart) {
					clickToStart.classList.add("root-game-loading-icon-medium");
				}
			}
		}

		if (uiViewingExperience == UIViewExperience.Mobile) {
			const uniqueIconsArea = document.querySelector<HTMLElement>(".root-game-loading__unique-horizontal-flex-box");
			if (uniqueIconsArea) {
				uniqueIconsArea.classList.add("absolute", "bottom-0");
			}
		}

		// For smaller screens move hourglass loading to the right
		if (isLayoutCompact()) {
			const loadingAnimContainer = document.getElementById("loading-screen__animation-container");
			if (loadingAnimContainer) {
				loadingAnimContainer.classList.add("root-game-loading-anim-large");
				loadingAnimContainer.classList.remove("loading-screen__animation-container");
			}
		}

		// Update age-specific info
		setElementContent('root-game-loading__intro', civLoadingInfo?.Subtitle ?? ageLoadingInfo?.AgeIntroText ?? 'LOC_LOADING_GENERIC_INTRO_TEXT')

		const leaderNameText = leaderLoadingInfo?.LeaderNameTextOverride ?? leaderName;
		let leaderIntroText = `[STYLE:text-secondary font-title uppercase tracking-100 font-bold]{${leaderNameText}}[/S] `;
		if (leaderLoadingInfo?.LeaderText) {
			leaderIntroText += ` [STYLE:root-game-loading-intro-text font-body]{${leaderLoadingInfo.LeaderText}}[/S]`;
		}
		setElementContent("root-game-loading__leader-info-field", leaderIntroText);

		const civNameText = civLoadingInfo?.CivilizationNameTextOverride ?? civName;
		let civilizationIntroText = `[STYLE:text-secondary font-title uppercase tracking-100 font-bold]{${civNameText}}[/S] `;
		if (civLoadingInfo?.CivilizationText) {
			civilizationIntroText += ` [STYLE:root-game-loading-intro-text font-body]{${civLoadingInfo.CivilizationText}}[/S]`;
		}
		setElementContent("root-game-loading__civilization-info-field", civilizationIntroText);

		const audioTag = civLoadingInfo?.Audio;
		if (audioTag) {
			UI.sendAudioEvent(audioTag);
		}

		const smallLeaderIcon = document.querySelector(".root-game-loading-small-leader-icon") as HTMLElement;
		if (smallLeaderIcon && leaderLoadingInfo) {
			smallLeaderIcon.style.backgroundImage = `${UI.getIconCSS(leaderLoadingInfo.LeaderType, "LEADER")}`;
		}

		const smallCivIcon = document.querySelector(".root-game-loading-small-civ-icon") as HTMLElement;
		if (smallCivIcon && civLoadingInfo) {
			const civIconURL: string = "url('fs://game/civ_sym_" + civLoadingInfo.CivilizationType.slice(13).toLowerCase() + ".png')";
			smallCivIcon.style.backgroundImage = `${civIconURL}`;
		}

		// Find all the exclusive things for this civilization
		// units
		let uniqueUnits: UnitDefinition[] = [];
		GameInfo.Units.forEach((unit) => {
			if (civTrait == null) {
				console.error("No civilization trait found in loading screen. Can not display civilization unique options!");
				return;
			}
			if (civTrait.TraitType == unit.TraitType) {
				// Try to get the BASE_DESCRIPTION, which for tiered units doesn't have text about the tier and is more suitable for this usage.
				const baseDescription: Database.DbRow[] | null = Database.query('config', 'SELECT Description from CivilizationItems where Type=?', unit.UnitType);
				if (baseDescription && baseDescription.length > 0 && baseDescription[0].Description) {
					unit.Description = baseDescription[0].Description as string;
				}

				uniqueUnits.push(unit);
			}
		});

		// Current design is to show one military and one non military unit, so lets grab the first of each
		let militaryUnitIndex: number = uniqueUnits.findIndex((unit => { return unit.CoreClass == "CORE_CLASS_MILITARY" }));
		let nonmilitaryUnitIndex: number = uniqueUnits.findIndex((unit => { return unit.CoreClass != "CORE_CLASS_MILITARY" }));

		// For civs with only military unique units, go ahead and show a second military unique unit
		if (militaryUnitIndex != -1 && nonmilitaryUnitIndex == -1) {
			nonmilitaryUnitIndex = uniqueUnits.length - 1;


			// If there was a collision (a civ with only 1 unique unit and it's a military unit), don't show a second unit
			if (nonmilitaryUnitIndex == militaryUnitIndex) {
				nonmilitaryUnitIndex = -1;
			}
		}

		// For civs with only non-military unique units, do it the other way
		if (nonmilitaryUnitIndex != -1 && militaryUnitIndex == -1) {
			militaryUnitIndex = uniqueUnits.length - 1;

			if (nonmilitaryUnitIndex == militaryUnitIndex) {
				militaryUnitIndex = -1;
			}
		}

		const uniquesContainer = document.querySelector(".root-game-loading_unique-flex-box");
		const smallScreenUniques = document.querySelector(".root-game-loading__small-screen-uniques");

		let uniqueCount: number = 0;
		if (uniquesContainer && smallScreenUniques) {
			if (militaryUnitIndex >= 0) {
				const unitDef = uniqueUnits[militaryUnitIndex];
				const unitIcon = UI.getIconCSS(unitDef.UnitType, "UNIT_FLAG");

				addUniqueCallout(uniquesContainer, smallScreenUniques, unitDef.Name, unitDef.Description ? unitDef.Description : "", unitIcon);
				uniqueCount++;
			}

			if (nonmilitaryUnitIndex >= 0) {
				const unitDef = uniqueUnits[nonmilitaryUnitIndex];
				const unitIcon = UI.getIconCSS(unitDef.UnitType, "UNIT_FLAG");
				addUniqueCallout(uniquesContainer, smallScreenUniques, unitDef.Name, unitDef.Description ? unitDef.Description : "", unitIcon);
				uniqueCount++;
			}

			// buildings
			let uniqueBuildings: BuildingDefinition[] = [];

			for (const building of GameInfo.Buildings) {
				if (civTrait == null) {
					console.error("No civilization trait found in loading screen. Can not display civilization unique options!");
					return;
				}
				if (civTrait.TraitType == building.TraitType) {
					uniqueBuildings.push(building);
				}
			}

			for (const building of uniqueBuildings) {
				const constructible: ConstructibleDefinition | null = GameInfo.Constructibles.lookup(building.ConstructibleType);
				if (constructible && uniqueCount < 4) {
					addUniqueCallout(uniquesContainer, smallScreenUniques, constructible.Name, constructible.Description ? constructible.Description : "",
						UI.getIconCSS(constructible.ConstructibleType, "BUILDING"));

					uniqueCount++;
				}
			}

			// improvements
			let uniqueImprovements: ImprovementDefinition[] = [];
			for (const improvement of GameInfo.Improvements) {
				if (civTrait == null) {
					console.error("No civilization trait found in loading screen. Can not display civilization unique options!");
					return;
				}
				if (civTrait.TraitType == improvement.TraitType) {
					uniqueImprovements.push(improvement);
				}
			}

			for (const improvement of uniqueImprovements) {
				const constructible: ConstructibleDefinition | null = GameInfo.Constructibles.lookup(improvement.ConstructibleType);
				if (constructible && uniqueCount < 4) {
					addUniqueCallout(uniquesContainer, smallScreenUniques, constructible.Name, constructible.Description ? constructible.Description : "",
						UI.getIconCSS(constructible.ConstructibleType, "IMPROVEMENT"));

					uniqueCount++;
				}
			}
		}
	}

	function addUniqueCallout(parent: Element, smallParent: Element, name: string, description: string, iconURL: string) {
		const uiViewingExperience = UI.getViewExperience();
		const { uiFontScale } = Configuration.getUser();

		const container = document.createElement("fxs-hslot");
		container.classList.add("root-game-loading__unique-units-flex-box");
		container.classList.remove("flex-wrap");

		if (uiViewingExperience != UIViewExperience.Mobile) {
			container.classList.add("flex-auto");

			if (uiFontScale > FontScale.Small) {
				if (uiFontScale == FontScale.XLarge) {
					container.classList.add("root-game-loading__four-column-unique");
				}
				else {
					container.classList.add("root-game-loading__two-column-unique");
				}
			}
		}
		parent.appendChild(container);

		container.innerHTML = `
			<div class="root-game-loading__unique-individual-unit-portrait-flexbox flex relative">
				<div class="root-game-loading__unique-individual-unit-portrait-outer-hex absolute inset-0 flex bg-contain bg-no-repeat justify-center">
					<div class="root-game-loading__unique-individual-unit-portrait-masked absolute bg-cover bg-center bg-bottom inset-y-3" style="background-image: ${iconURL}"></div>
				</div>
			</div>

			${uiViewingExperience != UIViewExperience.Mobile ?
				`<div class="root-game-loading__unique-individual-unit-description-flexbox flex flex-auto flex-col">
				<div class="root-game-loading__unique-individual-unit-title-text font-title-base" data-l10n-id="${name}">
				</div>
				<div class="root-game-loading__unique-individual-unit-description-text font-body-sm text-secondary" data-l10n-id="${description}">
				</div>
			</div>`
				: ""}
			
		`;

		const smallContainer = document.createElement("div");
		smallParent.appendChild(smallContainer);

		smallContainer.innerHTML = `
			<div class="root-game-loading__unique-individual-unit-portrait-flexbox relative">
				<div class="root-game-loading__unique-individual-unit-portrait-outer-hex absolute inset-0 flex bg-contain bg-no-repeat justify-center">
					<div class="root-game-loading__unique-individual-unit-portrait-masked absolute bg-cover bg-center bg-bottom inset-y-3" style="background-image: ${iconURL}"></div>
				</div>
			</div>
		`;
	}

	function showLoadingAnimation() {
		const animButtonContainer: HTMLElement | null = document.getElementById('loading-screen__animation-container');
		if (animButtonContainer) {
			const flipbook = document.createElement("flip-book");
			const flipbookDefinition: LoadingFlipbookDefinition = {
				fps: 30,
				atlas: [['fs://game/hourglasses01.png', 128, 128, 512],
				['fs://game/hourglasses02.png', 128, 128, 512],
				['fs://game/hourglasses03.png', 128, 128, 1024, 13]]
			};
			flipbook.setAttribute("data-flipbook-definition", JSON.stringify(flipbookDefinition));
			animButtonContainer.appendChild(flipbook);

			animButtonContainer.classList.remove('hidden');
		}
		else {
			console.error("game-loading: Unable to find container for loading gif.");
		}
	}

	function hideLoadingAnimation() {
		const animButtonContainer: HTMLElement | null = document.getElementById('loading-screen__animation-container');
		if (animButtonContainer) {
			animButtonContainer.remove();
		}
		else {
			console.error("game-loading: Unable to find container for loading gif.");
		}
	}

	function createStartButton(isFirstGame: boolean) {
		const startContainer: HTMLElement | null = document.getElementById('start_game');
		if (!startContainer) {
			console.error("game-loading: Unable to find container for continue button.");
			return;
		}

		const fragment = document.createDocumentFragment();

		const continueButtonParent: HTMLElement = document.createElement("fxs-activatable");
		continueButtonParent.classList.add("root-game-loading__continue-button");

		continueButtonParent.addEventListener('action-activate', () => {
			continueButtonParent.classList.toggle('disabled', true);
			startTextElement.setAttribute('data-l10n-id', 'LOC_LOADING_WAITING_TO_START');
			loadingNavHelpIcon.classList.add('hidden');

			UI.notifyUIReady();
			if (Configuration.getXR()) {
				XR.Atlas.invokeEvent(EViewID.MultiquadFrame, "begin-game", "");
			}
		});

		continueButtonParent.setAttribute('data-audio-group-ref', 'main-menu-audio');
		const activateSoundTag = isFirstGame ? 'data-audio-begin-game' : 'data-audio-continue-game';
		const pressSoundTag = isFirstGame ? 'data-audio-begin-game-press' : 'data-audio-continue-game-press';
		continueButtonParent.setAttribute('data-audio-activate-ref', activateSoundTag);
		continueButtonParent.setAttribute('data-audio-press-ref', pressSoundTag);

		const continueButtonOutline: HTMLElement = document.createElement("div");
		continueButtonOutline.classList.add("root-game-loading__continue-button-bg", "continue-button--outline", "inset-4");
		continueButtonParent.appendChild(continueButtonOutline);

		const continueButtonHighlight: HTMLDivElement = document.createElement("div");
		continueButtonHighlight.classList.add("root-game-loading__continue-button-bg", "continue-button--highlight");
		continueButtonParent.appendChild(continueButtonHighlight);

		const continueButtonIcon: HTMLDivElement = document.createElement("div");
		continueButtonIcon.classList.add("root-game-loading__continue-button-icon");
		continueButtonParent.appendChild(continueButtonIcon);

		fragment.appendChild(continueButtonParent);

		const loadingContainerElement: HTMLDivElement = document.createElement("div");
		loadingContainerElement.classList.add("root-game-loading__start-game-text-container", '-ml-2');
		loadingContainerElement.classList.add("trigger-nav-help");

		const loadingNavHelpIcon: HTMLElement = document.createElement("fxs-nav-help");
		loadingNavHelpIcon.setAttribute('action-key', 'inline-accept');
		loadingContainerElement.appendChild(loadingNavHelpIcon);

		const startTextElement: HTMLDivElement = document.createElement("div");
		startTextElement.classList.add("root-game-loading__loading-gif-text", "font-bold");
		const startButtonText: string = isFirstGame ? 'LOC_LOADING_BEGIN_GAME' : 'LOC_LOADING_CONTINUE_GAME';
		startTextElement.setAttribute('data-l10n-id', startButtonText);
		loadingContainerElement.appendChild(startTextElement);

		fragment.appendChild(loadingContainerElement);

		startContainer.appendChild(fragment);

		delayByFrame(() => {
			startContainer.style.opacity = "1";
		}, 16);
	}

	function updateLoadingBarWidthRatio(numerator: number, denominator: number) {
		const ratio = numerator / denominator;
		loadingBarProgress?.classList.toggle("transition-width", ratio != 1);
		loadingBarProgress?.style.setProperty("width", `${ratio * 100}%`);
	}

	function onUIGameLoadingProgressChanged({ UIGameLoadingProgressState }: UIGameLoadingProgressChangedData) {
		handleUIGameLoadingProgressChanged(UIGameLoadingProgressState);
	}

	function handleUIGameLoadingProgressChanged(UIGameLoadingProgressState: UIGameLoadingProgressState | number) {
		const timeoutDuration = completedUIGameLoadingProgressStates.size == 1 ? WAIT_FOR_FADE_IN_TIMEOUT_DURATION : 0; // we want to wait for the fade in before progressing the loading bar
		completedUIGameLoadingProgressStates.add(UIGameLoadingProgressState);
		const states = [...completedUIGameLoadingProgressStates];
		const totalCurrentLoadingComponentsValue = requiredLoadingComponents.reduce((res, { id, value }) => res + (states.includes(id) ? value : 0), 0);
		setTimeout(() => {
			updateLoadingBarWidthRatio(totalCurrentLoadingComponentsValue, totalRequiredLoadingComponentsValue);
		}, timeoutDuration);
	}

	function applyStyling() {
		const head = document.querySelector('head');
		const link = document.createElement('link');
		link.rel = "stylesheet";
		link.href = "fs://game/base-standard/ui/loading/root-game-loading.css";
		head?.appendChild(link);
		window.removeEventListener('global-scaling-ready', applyStyling);
	}

	// If the game has already started, just skip all of this since the loading curtain will be pulled this frame.
	if (UI.getGameLoadingState() != UIGameLoadingState.GameStarted) {

		const stylingApplied = GlobalScaling.whenReady.then(applyStyling);

		engine.whenReady.then(() => {
			engine.on('UIGameLoadingProgressChanged', onUIGameLoadingProgressChanged);
			engine.on('input-source-changed', updateCursorType);
		});

		const preloadedHourglass = Preload(preloadHourglass);
		Promise.all([stylingApplied, preloadedHourglass]).then(() => {

			const preloaded = Preload(preloadImages);

			preloaded.then(() => {

				UI.notifyLoadingCurtainReady();

				showLoadingAnimation();

				const el = document.getElementById('loading-root');
				if (el) {
					el.classList.add('fade-in');
					el.classList.remove('hidden');
				}

				Loading.runWhenInitialized(() => {
					realizeInfo();

					const el = document.getElementById('loading-content-root');
					if (el) {
						el.classList.add('fade-in');
						el.classList.remove('hidden');
					}
					else {
						console.error("game-loading: Can't apply hide/fade styles to loading's root");
					}
				});

				Loading.runWhenLoaded(() => {
					// add all remaining game loading states to cover up for the case of reloading the root-game-loading (when everything has already been loaded)
					completedUIGameLoadingProgressStates.add(UIGameLoadingProgressState.GameCoreInitializationIsDone);
					completedUIGameLoadingProgressStates.add(UIGameLoadingProgressState.GameCoreInitializationIsStarted);
					completedUIGameLoadingProgressStates.add(UIGameLoadingProgressState.GameIsFinishedLoading);
					completedUIGameLoadingProgressStates.add(UIGameLoadingProgressState.GameIsInitialized);
					completedUIGameLoadingProgressStates.add(UIGameLoadingProgressState.UIIsInitialized);
					handleUIGameLoadingProgressChanged(UIGameLoadingProgressState.UIIsReady);
					UI.lockCursor(false);	// Resume normal cursor functionality
					hideLoadingAnimation();
					engine.off('input-source-changed', updateCursorType);

					if (UI.getGameLoadingState() == UIGameLoadingState.WaitingForUIReady) {
						const gameConfig: ConfigurationGameAccessor = Configuration.getGame();
						const isEraTransition: boolean = gameConfig.previousAgeCount > 0;
						const isFirstGame: boolean = !gameConfig.isSavedGame || !isEraTransition;
						createStartButton(isFirstGame);
						UI.sendAudioEvent('main-menu-load-ready');
					}
				});
			});
		});
	} else {
		applyStyling();
	}
}());	// Immediately execute this
