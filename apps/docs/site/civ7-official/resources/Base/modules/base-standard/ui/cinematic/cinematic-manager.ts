/**
 * @file cinematic-manager.ts
 * @copyright 2021-2024, Firaxis Games
 * @description The manager for the wonder movie animation.
 *  
 */
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { IDisplayRequestBase, DisplayHandlerBase, DisplayHideOptions } from '/core/ui/context-manager/display-handler.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { EndGameScreenCategory } from '/base-standard/ui/endgame/screen-endgame.js';

const enum CinematicTypes {
	WONDER_COMPLETE,
	NATURAL_WONDER_DISCOVERED,
	NATURAL_DISASTER,
	GAME_VICTORY,
}

interface CinematicSettings {
	defaultFog?: string;
	defaultCamera?: string;
	// optional vfx, sound, etc can be added here
}
const CINEMATIC_SETTINGS: Record<CinematicTypes, CinematicSettings> = {
	[CinematicTypes.WONDER_COMPLETE]: {
		defaultFog: "WONDER_COMPLETE_CINEMATIC_FOG_SETTINGS",
		defaultCamera: "WONDER_DEFAULT_CAMERA_SETTINGS", // omitting '_COMPLETE'
	},
	[CinematicTypes.NATURAL_WONDER_DISCOVERED]: {
		defaultFog: "NATURAL_WONDER_DISCOVERED_CINEMATIC_FOG_SETTINGS",
		defaultCamera: "NATURAL_WONDER_DEFAULT_CAMERA_SETTINGS", // omitting '_DISCOVERED'
	},
	[CinematicTypes.NATURAL_DISASTER]: {
		defaultFog: "NATURAL_DISASTER_CINEMATIC_FOG_SETTINGS",
		defaultCamera: "NATURAL_DISASTER_DEFAULT_CAMERA_SETTINGS",
	},
	[CinematicTypes.GAME_VICTORY]: {
		defaultFog: "GAME_VICTORY_CINEMATIC_FOG_SETTINGS",
		defaultCamera: "GAME_VICTORY_DEFAULT_CAMERA_SETTINGS",
	},
} as const;

interface CinematicData {
	cinematicType: CinematicTypes,
	plot: float2,
	cameraSettingName: string | null, // used to find dynamic camera settings asset
	victoryType?: string,
	quoteAudio?: string | null,
	endGame?: boolean
	vfxAsset?: string;
}

interface CinematicRequest extends CinematicData, IDisplayRequestBase { };

class CinematicManagerImpl extends DisplayHandlerBase<CinematicRequest> {
	private wonderCompletedListener = this.onWonderCompleted.bind(this);
	private naturalWonderRevealedListener = this.onNaturalWonderRevealed.bind(this);
	private randomEventOccurredListener = this.onRandomEventOccurred.bind(this);
	private projectCompletedListener = this.onCityProjectCompleted.bind(this);
	private awaitCinematicListener = this.awaitCinematic.bind(this);
	private readyListener = this.onReady.bind(this);

	private previousMode: InterfaceMode.ModeId | null = null;
	private previousModeContext: InterfaceMode.Context | null = null;
	private movieInProgress: boolean = false;
	private eventReference: number = 0;

	private currentCinematicData: CinematicRequest | null = null;

	private CinematicVFXModelGroup: WorldUI.ModelGroup | null = null;
	private CinematicScreenVfx3DMarker: WorldUI.Marker | null = null;

	private currentCinematic: WorldUI.Cinematic | null = null;
	private isCameraDynamic: boolean = false;
	private isFogChanged: boolean = false;

	private musicIndex: number = -1;

	private static readonly FOCUS_HEIGHT: number = 10;
	private static readonly CAMERA_HEIGHT: number = 30;
	private static readonly FALLBACK_DYNAMIC_CAMERA_PARAMS: DynamicCameraParams = {
		focusHeight: CinematicManagerImpl.FOCUS_HEIGHT,
		cameraHeight: CinematicManagerImpl.CAMERA_HEIGHT,
		duration: 22,
		easeInFactor: 1.25,
		easeOutFactor: 2.0
	};

	constructor() {
		super("Cinematic", 7000);
		engine.whenReady.then(this.readyListener);
		this.CinematicVFXModelGroup = WorldUI.createModelGroup("CinematicVFXModelGroup");
	}

	onReady() {
		if (!Configuration.getGame().isAnyMultiplayer) {
			engine.on("WonderCompleted", this.wonderCompletedListener, this);
			engine.on("NaturalWonderRevealed", this.naturalWonderRevealedListener, this);
			engine.on("RandomEventOccurred", this.randomEventOccurredListener, this);
			engine.on("CityProjectCompleted", this.projectCompletedListener, this);
		}

	}

	getCinematicLocation(): float2 {
		if (!this.currentCinematicData) {
			// this should never happen
			console.error("cinematic-manager: Invalid currentCinematicData!");
			return { x: -1, y: -1 };
		}

		return this.currentCinematicData.plot;
	}

	getCinematicAudio(): string | null {
		if (!this.currentCinematicData) {
			console.error("cinematic-manager: Invalid currentCinematicData!");
			return null;
		}

		if (this.currentCinematicData.quoteAudio) {
			return this.currentCinematicData.quoteAudio;
		}

		return null;
	}

	getCinematicDynamicCameraParams(): DynamicCameraParams {
		if (this.currentCinematicData) {
			// Check for a specific asset for the current cinematic
			if (this.currentCinematicData.cameraSettingName) {
				const asset: string = this.currentCinematicData.cameraSettingName + "_CAMERA_SETTINGS";
				const params = Camera.findDynamicCameraSettings(asset);
				if (params) { return params; }
			}

			// Check for a generic asset for the current cinematic type
			const asset = CINEMATIC_SETTINGS[this.currentCinematicData.cinematicType].defaultCamera;
			if (asset) {
				const params = Camera.findDynamicCameraSettings(asset);
				if (params) { return params; }
			}
		}

		// Return default params, or fallback if the asset doesn't exist
		const params = Camera.findDynamicCameraSettings("DEFAULT_CAMERA_SETTINGS");
		return params ? params : CinematicManagerImpl.FALLBACK_DYNAMIC_CAMERA_PARAMS;
	}

	private getCinematicHeightFogParams(): HeightFogParams | null {
		if (this.currentCinematicData) {
			// Check for a specific asset for the current cinematic
			if (this.currentCinematicData.cameraSettingName) {
				const asset: string = this.currentCinematicData.cameraSettingName + "_CINEMATIC_FOG_SETTINGS";
				const params = Environment.findFogSettings(asset);
				if (params) { return params; }
			}

			// Check for a default asset for the current cinematic type
			const asset = CINEMATIC_SETTINGS[this.currentCinematicData.cinematicType].defaultFog;
			if (asset) {
				const params = Environment.findFogSettings(asset);
				if (params) { return params; }
			}
		}

		// Return default params, or null if the asset doesn't exist
		return Environment.findFogSettings("DEFAULT_CINEMATIC_FOG_SETTINGS");
	}

	//Placeholder cinematic triggers for victories
	startEndOfGameCinematic(victoryCinematicType: string, victoryName: string, location: PlotCoord): void {
		let vfxStr: string | undefined = undefined;
		let cameraSetting: string | null = victoryName;
		if (victoryCinematicType == "VICTORY_CINEMATIC_TYPE_NUKE") {
			vfxStr = "VFX_Nuke_01";
			cameraSetting = "NUCLEAR_STRIKE_DEFAULT";
			UI.sendAudioEvent("operation-ivy-cinematic-begin");
		}
		const cinematicData: CinematicData = {
			plot: location,
			cinematicType: CinematicTypes.GAME_VICTORY,
			cameraSettingName: cameraSetting, // TODO name for specialized dynamic camera settings
			victoryType: victoryName,
			endGame: true,
			vfxAsset: vfxStr
		};

		this.addDisplayRequest(cinematicData);
	}

	private getVictoryCinematicAssetName(): string {
		if (this.currentCinematicData) {
			if (this.currentCinematicData.victoryType) {
				return this.currentCinematicData.victoryType + "_CINEMATIC_ASSET";
			}
		}

		return ("");
	}

	private getCinematicPlotVFXAssetName(): string {
		if (this.currentCinematicData) {
			if (this.currentCinematicData.cameraSettingName) {
				return this.currentCinematicData.cameraSettingName + "_CINEMATIC_PLOT_VFX";
			}
		}

		return (this.getFallbackCinematicPlotVFXAssetName());
	}

	private getFallbackCinematicPlotVFXAssetName(): string {
		// Currently we're only using these effects for the natural wonder cinematic, 
		// but we might have versions for other types of cinematics eventually
		if (this.currentCinematicData) {
			if (this.currentCinematicData.cinematicType == CinematicTypes.NATURAL_WONDER_DISCOVERED) {
				return "NATURAL_WONDER_DEFAULT_CINEMATIC_PLOT_VFX"; // omitting '_DISCOVERED'
			}
		}

		return "DEFAULT_CINEMATIC_PLOT_VFX";
	}

	private getCinematicScreenVFXAssetName(): string {
		if (this.currentCinematicData) {
			if (this.currentCinematicData.cameraSettingName) {
				return this.currentCinematicData.cameraSettingName + "_CINEMATIC_SCREEN_VFX";
			}
		}

		return (this.getFallbackCinematicScreenVFXAssetName());
	}

	private getFallbackCinematicScreenVFXAssetName(): string {
		// Currently we're only using these effects for the natural wonder cinematic, 
		// but we might have versions for other types of cinematics eventually
		if (this.currentCinematicData) {
			if (this.currentCinematicData.cinematicType == CinematicTypes.NATURAL_WONDER_DISCOVERED) {
				return "NATURAL_WONDER_DEFAULT_CINEMATIC_SCREEN_VFX"; // omitting '_DISCOVERED'
			}
		}

		return "DEFAULT_CINEMATIC_SCREEN_VFX";
	}

	isMovieInProgress(): boolean {
		return this.movieInProgress;
	}

	stop() {
		if (this.currentCinematicData) {
			if (this.currentCinematicData.endGame && !Game.AgeProgressManager.isExtendedGame) {
				DisplayQueueManager.add({ category: EndGameScreenCategory });
			}

			DisplayQueueManager.close(this.currentCinematicData);
		}
	}

	private releaseCinematic() {
		if (this.currentCinematic) {
			this.currentCinematic.destroy();
			this.currentCinematic = null;
		}

		this.movieInProgress = false;
		UI.releaseEventID(this.eventReference);
		this.eventReference = 0;

		if (this.isCameraDynamic) {
			this.isCameraDynamic = false;
			Camera.popCamera();
		}

		if (this.isFogChanged) {
			this.isFogChanged = false;
			Environment.popFogOverride();
		}

		if (this.CinematicVFXModelGroup) {
			this.CinematicVFXModelGroup.clear();
		}

		UI.sendAudioEvent("stop-cinematic");
	}

	// NOTE: this relies on all of the placard screens being pushed as singletons.  That way the Context Manager
	// does the right thing when startCinematic() attempts to re-push the screen and no issues occur.
	replayCinematic() {
		if (this.currentCinematic) {
			// To avoid waiting for the wonder/victory cinematic to load again, replay the existing one

			// keep fog changes and eventReference
			// The model group is cleared in awaitCinematic()
			// Audio is currently handle inside the cinematic object, should probably move to script
			// Pop the camera, a new one will be created, consider adding a restart method to the camera instance
			if (this.isCameraDynamic) {
				this.isCameraDynamic = false;
				Camera.popCamera();
			}
			this.awaitCinematic();
		} else {
			// restart the cinematic
			this.startCinematic();
		}
	}

	/**
	  * @implements {IDisplayQueue}
	  */
	show(request: CinematicRequest) {
		this.currentCinematicData = request;
		this.startCinematic();

		// switch to the cinematic interface mode, which hides all of the other UI
		this.previousMode = InterfaceMode.getCurrent();
		this.previousModeContext = InterfaceMode.getParameters();
		this.movieInProgress = true;
		InterfaceMode.switchTo("INTERFACEMODE_CINEMATIC");
	}

	isShowing(): boolean {
		return InterfaceMode.isInInterfaceMode("INTERFACEMODE_CINEMATIC");
	}

	private startCinematic() {
		this.releaseCinematic();

		if (!this.currentCinematicData) {
			console.error("cinematic-manager: invalid cinematic data, this shouldn't happen, skipping!");
			return;
		}

		const curtain: HTMLElement | null = document.getElementById('loading-curtain');
		if (curtain) {
			// if the loading curtain exists and hasn't been opened, don't do any cinematics
			if (!curtain.classList.contains('curtain-opened')) {
				console.log("cinematic-manager: don't play cinematics with the loading curtain up");
				return;
			}
		}

		// If found apply the default cinematic distance fog settings			
		const overrideCinematicFogSettings = this.getCinematicHeightFogParams();
		if (overrideCinematicFogSettings != null) {
			Environment.pushFogOverride(overrideCinematicFogSettings);
			this.isFogChanged = true;
		}

		if (this.currentCinematicData.cinematicType == CinematicTypes.WONDER_COMPLETE) {
			ContextManager.push("screen-wonder-complete-placard", { singleton: true, createMouseGuard: true, attributes: { shouldDarken: false } });

			// This may depend on async layout updating, request the cinematic and start it when ready
			this.currentCinematic = WorldUI.requestCinematic(this.currentCinematicData.plot);
			this.awaitCinematic();

			// this must happen last, or the dynamic camera won't work (it sends an event to kick itself off)
			this.eventReference = UI.referenceCurrentEvent();

		} else if (this.currentCinematicData.cinematicType == CinematicTypes.NATURAL_WONDER_DISCOVERED) {
			ContextManager.push("screen-natural-wonder-revealed-placard", { singleton: true, createMouseGuard: true, attributes: { shouldDarken: false } });

			const plotIndex: number = GameplayMap.getIndexFromLocation(this.currentCinematicData.plot);
			const featureInfo: MapFeatureInfo = MapFeatures.getFeatureInfoAt(plotIndex);

			let plotSet: WorldUI.PlotSet = featureInfo.plots;
			if (featureInfo.plots.length == 0) {
				// Fall back to single plot
				plotSet = this.currentCinematicData.plot;
			}

			if (this.CinematicVFXModelGroup) {
				this.CinematicVFXModelGroup.clear();
				this.CinematicScreenVfx3DMarker = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });
				if (this.CinematicVFXModelGroup && this.CinematicScreenVfx3DMarker) {
					var screenVfxAsset = this.CinematicVFXModelGroup.addModel(this.getCinematicScreenVFXAssetName(), { marker: this.CinematicScreenVfx3DMarker, offset: { x: 0, y: 30, z: 0 } }, { angle: 0, scale: .25, foreground: true, needsShadows: false });
					if (screenVfxAsset == undefined) {
						this.CinematicVFXModelGroup.addModel(this.getFallbackCinematicScreenVFXAssetName(), { marker: this.CinematicScreenVfx3DMarker, offset: { x: 0, y: 30, z: 0 } }, { angle: 0, scale: .25, foreground: true, needsShadows: false });
					}

					for (let eachPlot of featureInfo.plots) {
						var plotVfxAsset = this.CinematicVFXModelGroup.addModelAtPlot(this.getCinematicPlotVFXAssetName(), eachPlot, { x: 0, y: 0, z: 0 });
						if (plotVfxAsset == undefined) {
							this.CinematicVFXModelGroup.addModelAtPlot(this.getFallbackCinematicPlotVFXAssetName(), eachPlot, { x: 0, y: 0, z: 0 });
						}
					}
				}
			}

			this.currentCinematic = null;	// we don't use an engine cinematic object here
			Camera.pushDynamicCamera(plotSet, this.getCinematicDynamicCameraParams());
			Camera.lookAtPlot(this.currentCinematicData.plot, { instantaneous: true }); // TODO look at center of multi-hex wonders
			this.isCameraDynamic = true;

			// this must happen last, or the dynamic camera won't work (it sends an event to kick itself off)
			this.eventReference = UI.referenceCurrentEvent();
			this.musicIndex = Sound.play("Play_NaturalWonder_Music");
		} else if (this.currentCinematicData.cinematicType == CinematicTypes.NATURAL_DISASTER) {
			ContextManager.push("screen-natural-disaster-placard", { singleton: true, createMouseGuard: true, attributes: { shouldDarken: false } });

			this.currentCinematic = null;	// we don't use an engine cinematic object here
			Camera.pushDynamicCamera(this.currentCinematicData.plot, this.getCinematicDynamicCameraParams());
			Camera.lookAtPlot(this.currentCinematicData.plot, { instantaneous: true }); // reposition game camera for end of cinematic
			this.isCameraDynamic = true;


			// this must happen last, or the dynamic camera won't work (it sends an event to kick itself off)
			this.eventReference = UI.referenceCurrentEvent();
		}
		else if (this.currentCinematicData.cinematicType == CinematicTypes.GAME_VICTORY) {
			const cameraParams = this.getCinematicDynamicCameraParams();
			ContextManager.push("screen-victory-cinematic", { singleton: true, createMouseGuard: true, attributes: { shouldDarken: false, victoryType: this.currentCinematicData.victoryType, autoCompleteDuration: cameraParams.duration } });

			// This may depend on async layout updating, request the cinematic and start it when ready
			this.currentCinematic = WorldUI.requestCinematic(this.currentCinematicData.plot);
			this.awaitCinematic();

			// this must happen last, or the dynamic camera won't work (it sends an event to kick itself off)
			this.eventReference = UI.referenceCurrentEvent();
		}
	}

	/**
	  * @implements {IDisplayQueue}
	  */
	hide(request: CinematicRequest, _options?: DisplayHideOptions) {
		this.releaseCinematic();

		if (request.cinematicType == CinematicTypes.WONDER_COMPLETE) {
			ContextManager.pop("screen-wonder-complete-placard");
		} else if (request.cinematicType == CinematicTypes.NATURAL_WONDER_DISCOVERED) {
			if (this.musicIndex != -1) {
				Sound.playOnIndex("Stop_NaturalWonder_Music", this.musicIndex);
				this.musicIndex = -1;
			}
			ContextManager.pop("screen-natural-wonder-revealed-placard");
		} else if (request.cinematicType == CinematicTypes.NATURAL_DISASTER) {
			ContextManager.pop("screen-natural-disaster-placard");
		} else if (request.cinematicType == CinematicTypes.GAME_VICTORY) {
			ContextManager.pop("screen-victory-cinematic");
			if (request.victoryType == "VICTORY_MODERN_MILITARY") {
				UI.sendAudioEvent("operation-ivy-cinematic-end");
			}
		} else {
			console.warn("cinematic-manager: unhandled cinematicType " + request.cinematicType);
		}

		if (this.currentCinematicData == request) {
			this.currentCinematicData = null;
		}

		// Switch back to interface mode if possible...
		if (!this.previousMode || (this.previousMode && !InterfaceMode.switchTo(this.previousMode, this.previousModeContext))) {
			InterfaceMode.switchToDefault();	// ... if more context is neeeded, fallback to default mode.
		}
	}

	private awaitCinematic() {
		if (this.currentCinematicData == null || this.currentCinematic == null) {
			// The wonder movie was stopped
			return;
		}

		if (this.isCameraDynamic) {
			// The wonder movie is already playing
			return;
		}

		if (this.currentCinematic.isReady()) {
			// The current cinematic is ready, set things off!
			// be sure to call currentCinematic.destroy() when done

			// It is not required to call Cinematic.isEmpty()
			// All wonders should have an animation, but not all victory types have one
			this.currentCinematic.start();

			Camera.pushDynamicCamera(this.currentCinematicData.plot, this.getCinematicDynamicCameraParams());
			Camera.lookAtPlot(this.currentCinematicData.plot, { instantaneous: true }); // reposition game camera for end of cinematic
			this.isCameraDynamic = true;

			if (this.currentCinematicData.cinematicType == CinematicTypes.WONDER_COMPLETE) {
				// Instantiate the Sky
				if (this.CinematicVFXModelGroup) {
					this.CinematicVFXModelGroup.clear();
					this.CinematicVFXModelGroup.addVFXAtPlot("VFX_TEST_Cinematic_Sky", this.currentCinematicData.plot, { x: 0, y: 0, z: 0 });
				}
			} else if (this.currentCinematicData.cinematicType == CinematicTypes.GAME_VICTORY) {
				if (this.currentCinematicData.vfxAsset) {
					WorldUI.triggerVFXAtPlot(this.currentCinematicData.vfxAsset, this.currentCinematicData.plot, { x: 0, y: 0, z: 0 });
				}

				if (this.CinematicVFXModelGroup) {
					this.CinematicVFXModelGroup.clear();
					this.CinematicVFXModelGroup.addModelAtPlot(this.getVictoryCinematicAssetName(), this.currentCinematicData.plot, { x: 0, y: 0, z: 0 }, { initialState: "REVEAL" });
				}
			}
		} else {
			// Try again next frame, until it succeeds
			window.requestAnimationFrame(this.awaitCinematicListener);
		}
	}

	private onWonderCompleted(data: Constructible_EventData) {
		// is this the local player's wonder?
		if (ContextManager.shouldShowPopup(data.constructible.owner)) {
			const wonder: WonderDefinition | null = GameInfo.Wonders.lookup(data.constructibleType);
			const wonderCompletedCinematicData: CinematicData = {
				plot: data.location,
				cinematicType: CinematicTypes.WONDER_COMPLETE,
				cameraSettingName: wonder ? wonder.ConstructibleType : null,
				quoteAudio: GameInfo.TypeQuotes.lookup(data.constructibleType)?.QuoteAudio
			}

			this.addDisplayRequest(wonderCompletedCinematicData);
		}
	}

	private onNaturalWonderRevealed(data: NaturalWonderRevealed_EventData) {
		if (!Players.isParticipant(GameContext.localPlayerID)) {
			return;
		}

		if (GameplayMap.getRevealedState(GameContext.localPlayerID, data.location.x, data.location.y) != RevealedStates.VISIBLE) {
			return;
		}

		if (ContextManager.shouldShowPopup(data.player)) {
			const feature: FeatureDefinition | null = GameInfo.Features.lookup(data.featureType);
			const wonderRevealedCinematicData: CinematicData = {
				plot: data.location,
				cinematicType: CinematicTypes.NATURAL_WONDER_DISCOVERED,
				cameraSettingName: feature ? feature.FeatureType : null,
				quoteAudio: GameInfo.TypeQuotes.lookup(data.featureType)?.QuoteAudio
			}

			this.addDisplayRequest(wonderRevealedCinematicData);
		}
	}

	private onRandomEventOccurred(data: RandomEvent_EventData) {
		// RandomEventOccurred is a global event and not targeted to any player.
		// Check to see if the local player needs to see it.
		if (ContextManager.shouldShowModalEvent(GameContext.localPlayerID)
			&& GameplayMap.getRevealedState(GameContext.localPlayerID, data.location.x, data.location.y) == RevealedStates.VISIBLE) {
			const randomEvent: RandomEventDefinition | null = GameInfo.RandomEvents.lookup(data.eventType);
			const naturalDisasterCinematicData: CinematicData = {
				plot: data.location,
				cinematicType: CinematicTypes.NATURAL_DISASTER,
				cameraSettingName: randomEvent ? randomEvent.RandomEventType : null
			}

			// If this is a storm, it may have moved.  See if there is a storm with this location as the starting location and
			// overwrite the location with the current location if so.
			const plotIndex: number = GameplayMap.getIndexFromXY(data.location.x, data.location.y);
			for (let storm: number = 0; storm < MapStorms.numActiveStorms; storm++) {
				const stormID: ComponentID | null = MapStorms.getActiveStormIDByIndex(storm);

				if (stormID) {
					const stormInfo: StormInfo | null = MapStorms.getStorm(stormID);
					if (stormInfo?.startPlot == plotIndex) {
						naturalDisasterCinematicData.plot = GameplayMap.getLocationFromIndex(stormInfo.currentPlot);
						break;
					}
				}
			}

			// TO DO: do a more thorough check and only show the cinematic if:
			// - Any plot of the random event is owned by the current player, and
			// - Any of the owned plots actually took damage from the event
			if (GameContext.localPlayerID != GameplayMap.getOwner(naturalDisasterCinematicData.plot.x, naturalDisasterCinematicData.plot.y)) {
				return;
			}

			this.addDisplayRequest(naturalDisasterCinematicData);
		}
	}

	private onCityProjectCompleted(data: CityProjectCompleted_EventData) {
		const completedProject: ProjectDefinition | null = GameInfo.Projects.lookup(data.projectType);
		if (completedProject == null)
			return;

		// For this projects we don't try to show the wonder construction. Going forward we need a better data driven solution.
		if (completedProject.ProjectType == "PROJECT_OPERATION_IVY")
			return;
		if (completedProject.ProjectType == "PROJECT_PRODUCE_WMD")
			return;

		// If the tile is visible where the Project is completed try to play the "REVEAL" Cinematic for that hex. 
		// Most assets don't have one, but they will play it if they do. No cinematic camera for these though since they are minor.
		if (ContextManager.shouldShowModalEvent(GameContext.localPlayerID)
			&& GameplayMap.getRevealedState(GameContext.localPlayerID, data.location.x, data.location.y) == RevealedStates.VISIBLE) {

			WorldUI.triggerCinematic(data.location);
		}
	}

}

export const CinematicManager = new CinematicManagerImpl();
export { CinematicManager as default }

DisplayQueueManager.registerHandler(CinematicManager);