/**
 * @file Leader Model Manager
 * @copyright 2021-2025, Firaxis Games
 * @description Handles models and animations for the leader 3D models on the diplo interactions
 */

const DEBUG_LOG_TRIGGER = false as const;		// (false) Log when to shoiw triggers advance a sequence


/* Input data for a leader scene */
export interface LeaderSequenceData {
	sequenceType: string;						// The top level sequence type.  Matches the Diplomacy Statement Group type. i.e. MEET, WAR
	sequenceSubType: string;					// Optional sub-type for the sequence.  ex. SURPRISE_WAR
	player1: PlayerId;							// Always a the local human player
	player2: PlayerId;							// The other player, can be AI or human
	initiatingPlayer: PlayerId;					// The player the started the conversation.  Can be used to further refine the sequence.
	focusID: ComponentID;						// Can be 'invalid', i.e. there is no focus object
	focusLocation?: PlotCoord;
}

class LeaderSequenceGate {
	waitingForForegroundCameraId: number = 0;
	waitingForLeftAnimation: boolean = false;
	waitingForRightAnimation: boolean = false;
	voQueued: boolean = false;					// Signal that one of the animations had VO (maybe allow for knowing which one, though there is usually no overlap)

	clear() {
		this.waitingForForegroundCameraId = 0;
		this.waitingForLeftAnimation = false;
		this.waitingForRightAnimation = false;
		this.voQueued = false;
	}

	setWaitForJustLeft() {
		this.waitingForLeftAnimation = true;
		this.waitingForRightAnimation = false;
		this.voQueued = false;
	}

	setWaitForJustRight() {
		this.waitingForLeftAnimation = false;
		this.waitingForRightAnimation = true;
		this.voQueued = false;
	}

	setWaitForLeftAndRight() {
		this.waitingForLeftAnimation = true;
		this.waitingForRightAnimation = true;
		this.voQueued = false;
	}

	setVOQueued() {
		this.voQueued = true;
	}

	isWaiting() {
		return this.waitingForForegroundCameraId != 0 || this.waitingForLeftAnimation || this.waitingForRightAnimation;
	}
}

class LeaderModelManagerClass {
	private static instance: LeaderModelManagerClass | null = null;

	private leaderModelGroup: WorldUI.ModelGroup;
	private closeStartTime: number = 0;
	private sequenceStartTime: number = 0;
	private leftAnimationStartTime: number = 0;
	private rightAnimationStartTime: number = 0;
	readonly SEQUENCE_DEBOUNCE_DURATION: number = 100;   // 0.1 seconds
	private isClosing: boolean = false;
	private fallbackCloseStartTime: number = 0;
	private isClosingFallback: boolean = false;
	private isLeaderShowing: boolean = false;

	private worldCamera: KeyframeCamera | null = null;
	private leaderCameraOffset: float3 = { x: 0, y: 0, z: 0 };
	private cameraDollyRequestStartTime: number = 0;
	private cameraDollyQueued: boolean = false;
	private FIRST_MEET_DELAY: number = 0.3; // This is the delay in seconds before we slide the leaders into view
	private cameraDollyDelayed: boolean = false;
	private cameraAnimationDelayDuration: number = 0;

	private leader3DModelLeft: WorldUI.ModelInstance | null = null;
	private leader3DBannerLeft: WorldUI.ModelInstance | null = null;
	private leader3DModelRight: WorldUI.ModelInstance | null = null;
	private leader3DBannerRight: WorldUI.ModelInstance | null = null;

	private leader3DMarkerLeft: WorldUI.Marker | null = null;
	private leader3DMarkerRight: WorldUI.Marker | null = null;
	private leader3DRevealFlagMarker: WorldUI.Marker | null = null;
	private leader3DMarkerCenter: WorldUI.Marker | null = null;

	private leftAnimState: string = "";
	private rightAnimState: string = "";

	private declareWarCameraActive = false;

	private isRightHostile: boolean = false;
	// These flags are used when an animation is started so that we know to ignore that animation change trigger 
	private leaderLeftAnimationJustStarted = false;
	private leaderRightAnimationJustStarted = false;

	private static readonly OFF_CAMERA_DISTANCE = 130; // In World units	
	private static readonly CAMERA_SUBJECT_DISTANCE: number = 255;
	private static readonly CAMERA_DOLLY_ANIMATION_IN_DURATION = 1;
	private static readonly CAMERA_DOLLY_ANIMATION_OUT_DURATION = 0.55;
	private static readonly DECLARE_WAR_DOLLY_DISTANCE = 20;
	readonly LEADER_EXIT_DURATION: number = LeaderModelManagerClass.CAMERA_DOLLY_ANIMATION_OUT_DURATION;   // 0.6 seconds
	private static readonly DARKENING_VFX_POSITION: float3 = { x: 0, y: 110, z: 0 };
	private static readonly LEFT_MODEL_POSITION: float3 = { x: -11.5, y: 72, z: -13 };
	private static readonly LEFT_BANNER_POSITION: float3 = { x: -16, y: 85, z: 0 };
	private static readonly LEFT_BANNER_ANGLE: number = 45;
	private static readonly RIGHT_MODEL_POSITION: float3 = { x: 11.5, y: 72, z: -13 };
	private static readonly RIGHT_INDEPENDENT_MODEL_POSITION: float3 = { x: 7.7, y: 71.9, z: -23 };
	private static readonly RIGHT_INDEPENDENT_MODEL_SCALE: number = 0.7;
	private static readonly RIGHT_INDEPENDENT_MODEL_ANGLE: number = -32;
	private static readonly RIGHT_INDEPENDENT_BANNER_POSITION: float3 = { x: 15, y: 78, z: -15.5 };
	private static readonly RIGHT_INDEPENDENT_VIGNETTE_OFFSET: float3 = { x: 0, y: -4.25, z: -25 };
	private static readonly RIGHT_INDEPENDENT_CAMERA_OFFSET: float3 = { x: 0, y: 0, z: -30 };
	private static readonly RIGHT_MODEL_AT_WAR_POSITION: float3 = { x: 16.5, y: 72, z: -13 };
	private static readonly RIGHT_BANNER_POSITION: float3 = { x: 16, y: 85, z: 0 };
	private static readonly RIGHT_BANNER_ANGLE: number = -45;
	private static readonly BANNER_SCALE: number = 1.8;
	readonly MAX_LENGTH_OF_ANIMATION_EXIT: number = 550;   // 0.6 seconds
	private static readonly FOREGROUND_CAMERA_IN_ID = Database.makeHash("leader-camera-in");
	private static readonly FOREGROUND_CAMERA_OUT_ID = Database.makeHash("leader-camera-out");
	private static readonly SCREEN_DARKENING_ASSET_NAME = "VFX_Diplomacy_Screen_Darkening";
	private static readonly TRIGGER_HASH_ANIMATION_STATE_END = WorldUI.hash("AnimationStateChange");
	private static readonly TRIGGER_HASH_SEQUENCE_TRIGGER = WorldUI.hash("SEQUENCE");


	private currentSequenceType: string = '';
	private isLocalPlayerInitiator: boolean = false;
	private leaderSequenceStepID: number = 0;
	private leaderSequenceGate: LeaderSequenceGate = new LeaderSequenceGate();

	constructor() {
		if (LeaderModelManagerClass.instance) {
			console.error("Only one instance of the leader model manager class exist at a time, second attempt to create one.")
		}
		LeaderModelManagerClass.instance = this;

		this.leaderModelGroup = WorldUI.createModelGroup("leaderModelGroup");
		engine.on('ModelTrigger', (id: number, hash: number) => { this.handleTriggerCallback(id, hash) });
		engine.on('ForegroundCameraAnimationComplete', (id: number) => { this.handleForegroundCameraAnimationComplete(id) });

		this.leader3DMarkerCenter = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });
	}

	private getIndLeaderAssetName(IndPlayer: PlayerLibrary): string {
		let indCivType: string = "DEFAULT";

		GameInfo.Independents.forEach(indDef => {
			if (IndPlayer.civilizationAdjective == indDef.Name || IndPlayer.civilizationAdjective == indDef.CityStateName) {
				indCivType = indDef.CityStateType;
			};
		});
		return "LEADER_INDEPENDENT_" + indCivType;
	}

	private getIndLeaderBGAssetName(IndPlayer: PlayerLibrary): string {
		let indCivType: string = "DEFAULT";

		GameInfo.Independents.forEach(indDef => {
			if (IndPlayer.civilizationAdjective == indDef.Name || IndPlayer.civilizationAdjective == indDef.CityStateName) {
				indCivType = indDef.CityStateType;
			};
		});
		return "LEADER_INDEPENDENT_BG_" + indCivType;
	}

	// Independent Colors are hard coded for now to match city-banners.js but they should be made data driven at some point
	private getIndPrimaryColor(IndPlayer: PlayerLibrary): number {
		let indColor: number = 0x000000;
		if (IndPlayer.isMinor) {
			indColor = 0xFFFFFF;
		}

		return indColor;
	}

	private getIndSecondaryColor(IndPlayer: PlayerLibrary): number {
		let indCivType: string = "DEFAULT";
		GameInfo.Independents.forEach(indDef => {
			if (IndPlayer.civilizationAdjective == indDef.Name || IndPlayer.civilizationAdjective == indDef.CityStateName) {
				indCivType = indDef.CityStateType;
			}
		});
		switch (indCivType) {
			case "MILITARISTIC":
				return 0xFF1C1BAF;
			case "SCIENTIFIC":
				return 0xFF967C4D;
			case "ECONOMIC":
				return 0xFF53D5FF;
			case "CULTURAL":
				return 0xFFB32B89;
		}
		return 0xFFFFFFFF;
	}

	private getIndBannerAssetName(IndPlayer: PlayerLibrary) {
		let indCivType: string = "DEFAULT";
		GameInfo.Independents.forEach(indDef => {
			if (IndPlayer.civilizationAdjective == indDef.Name || IndPlayer.civilizationAdjective == indDef.CityStateName) {
				indCivType = indDef.CityStateType;
			};
		});
		return "CIVILIZATION_" + indCivType + "_BANNER_GAME_ASSET"
	}

	private getLeftLightingAssetName(): string {
		return "LEADER_LIGHTING_SCENE_DEFAULT_LEFT";
	}

	private getRightLightingAssetName(): string {
		return "LEADER_LIGHTING_SCENE_DEFAULT_RIGHT";
	}

	private getIndependentLightingAssetName(): string {
		return "LEADER_LIGHTING_SCENE_DEFAULT_INDEPENDENT";
	}

	private getLeaderAssetName(leaderName: string): string {
		return leaderName + "_GAME_ASSET";
	}

	private getFallbackAssetName(): string {
		return "LEADER_FALLBACK_GAME_ASSET";
	}

	private getCivBannerName(civilizationName: string): string {
		return civilizationName + "_BANNER_GAME_ASSET";
	}

	private getFallbackBannerAssetName(): string {
		return "CIVILIZATION_DEFAULT_BANNER_GAME_ASSET";
	}

	private isAtWarWithPlayer(playerID: PlayerId): boolean {
		if (playerID == 0) {
			return false;
		}

		const playerDiplomacy: PlayerDiplomacy | undefined = Players.get(playerID)?.Diplomacy;

		if (playerDiplomacy?.isAtWarWith(GameContext.localPlayerID)) {
			return true;
		}
		return false;
	}

	// ------------------------------------------------------------------------
	// Show a specific type of leader sequence.  The panel-diplomacy-hub calls this.
	showLeaderSequence(params: LeaderSequenceData): boolean {
		if ((performance.now() - this.sequenceStartTime) < this.SEQUENCE_DEBOUNCE_DURATION) {
			return true;
		}

		this.sequenceStartTime = performance.now();
		this.isLocalPlayerInitiator = params.player1 == params.initiatingPlayer;

		switch (params.sequenceType) {
			case "MEET":
				this.showLeadersFirstMeet(params);
				return true;
			case "WAR":
				this.showLeadersDeclareWar(params);
				return true;
			case "ACCEPT_PEACE":
				this.showLeadersAcceptPeace(params);
				return true;
			case "REJECT_PEACE":
				this.showLeadersRejectPeace(params);
				return true;
			case "DEFEAT":
				this.showLeadersDefeat(params);
				return true;
		}
		return false;
	}

	// ------------------------------------------------------------------------
	// show some of the boilerplate assets that's required for any leader scene
	showDiplomaticSceneEnvironment(offset: float3 = { x: 0, y: 0, z: 0 }) {
		if (this.leader3DMarkerCenter != null) {
			const vignetteOffset: float3 = {
				x: LeaderModelManagerClass.DARKENING_VFX_POSITION.x + offset.x,
				y: LeaderModelManagerClass.DARKENING_VFX_POSITION.y + offset.y,
				z: LeaderModelManagerClass.DARKENING_VFX_POSITION.z + offset.z
			}
			this.leaderModelGroup.addModel(LeaderModelManagerClass.SCREEN_DARKENING_ASSET_NAME, { marker: this.leader3DMarkerCenter, offset: vignetteOffset }, { angle: 0, scale: 1, foreground: true });
			this.leaderModelGroup.addModel("Diplomatic_Scene_Bounds_Marker", { marker: this.leader3DMarkerCenter, offset: { x: 0, y: 20, z: 0 } }, { angle: 0, scale: 1, foreground: true });
		}
	}

	// ------------------------------------------------------------------------
	// Show the pair of leader models.
	// Their idle animations will be playing
	showLeaderModels(playerID1: PlayerId, playerID2: PlayerId) {
		this.clear();

		//Player 1
		const p1ColorPrimary: number = UI.Player.getPrimaryColorValueAsHex(playerID1)
		const p1ColorSecondary: number = UI.Player.getSecondaryColorValueAsHex(playerID1)

		const player1: PlayerLibrary | null = Players.get(playerID1);
		if (!player1) {
			console.error("leader-model-manager: Unable to get valid player library for player with id: " + playerID1.toString());
			return;
		}
		const leader1: LeaderDefinition | null = GameInfo.Leaders.lookup(player1.leaderType);
		if (!leader1) {
			console.error("leader-model-manager: Unable to get valid leader definition for player with id: " + playerID1.toString());
			return;
		}
		const civ1: CivilizationDefinition | null = GameInfo.Civilizations.lookup(player1.civilizationType);
		if (!civ1) {
			console.error("leader-model-manager: Unable to get valid civilization definition for player with id: " + playerID1.toString());
			return;
		}

		this.leader3DMarkerLeft = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });
		if (this.leader3DMarkerLeft != null) {
			this.leaderModelGroup.addModel(this.getLeftLightingAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true });
			this.leader3DModelLeft = this.leaderModelGroup.addModel(this.getLeaderAssetName(leader1.LeaderType.toString()), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DModelLeft == null) {
				this.leader3DModelLeft = this.leaderModelGroup.addModel(this.getFallbackAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}
			this.leader3DBannerLeft = this.leaderModelGroup.addModel(this.getCivBannerName(civ1.CivilizationType.toString()), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_BANNER_POSITION }, { angle: LeaderModelManagerClass.LEFT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DBannerLeft == null) {
				this.leader3DBannerLeft = this.leaderModelGroup.addModel(this.getFallbackBannerAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_BANNER_POSITION }, { angle: LeaderModelManagerClass.LEFT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}
		}

		//Player 2
		const p2ColorPrimary: number = UI.Player.getPrimaryColorValueAsHex(playerID2)
		const p2ColorSecondary: number = UI.Player.getSecondaryColorValueAsHex(playerID2)

		const player2: PlayerLibrary | null = Players.get(playerID2);
		if (!player2) {
			console.error("leader-model-manager: Unable to get valid player library for player with id: " + playerID2.toString());
			return;
		}
		const leader2: LeaderDefinition | null = GameInfo.Leaders.lookup(player2.leaderType);
		if (!leader2) {
			console.error("leader-model-manager: Unable to get valid leader definition for player with id: " + playerID2.toString());
			return;
		}
		const civ2: CivilizationDefinition | null = GameInfo.Civilizations.lookup(player2.civilizationType);
		if (!civ2) {
			console.error("leader-model-manager: Unable to get valid civilization definition for player with id: " + playerID2.toString());
			return;
		}

		this.leader3DMarkerRight = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });

		if (this.leader3DMarkerRight != null) {
			this.leaderModelGroup.addModel(this.getRightLightingAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true });
			this.leader3DModelRight = this.leaderModelGroup.addModel(this.getLeaderAssetName(leader2.LeaderType.toString()), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_MODEL_POSITION }, { angle: 0, scale: 1, initialState: "IDLE_WaitingOther", foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DModelRight == null) {
				this.leader3DModelRight = this.leaderModelGroup.addModel(this.getFallbackAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_MODEL_POSITION }, { angle: 0, scale: 1, initialState: "IDLE_WaitingOther", foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}
			this.leader3DBannerRight = this.leaderModelGroup.addModel(this.getCivBannerName(civ2.CivilizationType.toString()), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_BANNER_POSITION }, { angle: LeaderModelManagerClass.RIGHT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p2ColorPrimary, tintColor2: p2ColorSecondary, triggerCallbacks: true });
			if (this.leader3DBannerRight == null) {
				this.leader3DBannerRight = this.leaderModelGroup.addModel(this.getFallbackBannerAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_BANNER_POSITION }, { angle: LeaderModelManagerClass.RIGHT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p2ColorPrimary, tintColor2: p2ColorSecondary, triggerCallbacks: true });
			}
		}

		this.showDiplomaticSceneEnvironment();
		this.simpleLeaderPopUpCameraAnimation(false, 0);
		this.isLeaderShowing = true;
		let animationToPlay = "IDLE_WaitingOther";
		this.playLeaderAnimation(animationToPlay, "right");
		let animationToPlayLeft = "IDLE_ListeningPlayer";
		this.playLeaderAnimation(animationToPlayLeft, "left");
	}

	// ------------------------------------------------------------------------
	// Show a leader on the left side of the screen
	// Their idle animations will be playing
	showLeftLeaderModel(playerID: PlayerId) {
		this.clear();

		//Player 1
		const p1ColorPrimary: number = UI.Player.getPrimaryColorValueAsHex(playerID)
		const p1ColorSecondary: number = UI.Player.getSecondaryColorValueAsHex(playerID)

		const player1: PlayerLibrary | null = Players.get(playerID);
		if (!player1) {
			console.error("leader-model-manager: Unable to get valid player library for player with id: " + playerID.toString());
			return;
		}
		const leader1: LeaderDefinition | null = GameInfo.Leaders.lookup(player1.leaderType);
		if (!leader1) {
			console.error("leader-model-manager: Unable to get valid leader definition for player with id: " + playerID.toString());
			return;
		}
		const civ1: CivilizationDefinition | null = GameInfo.Civilizations.lookup(player1.civilizationType);
		if (!civ1) {
			console.error("leader-model-manager: Unable to get valid civilization definition for player with id: " + playerID.toString());
			return;
		}

		this.leader3DMarkerLeft = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });
		if (this.leader3DMarkerLeft != null) {
			this.leaderModelGroup.addModel(this.getLeftLightingAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true });
			this.leader3DModelLeft = this.leaderModelGroup.addModel(this.getLeaderAssetName(leader1.LeaderType.toString()), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DModelLeft == null) {
				this.leader3DModelLeft = this.leaderModelGroup.addModel(this.getFallbackAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}

			this.leader3DBannerLeft = this.leaderModelGroup.addModel(this.getCivBannerName(civ1.CivilizationType.toString()), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_BANNER_POSITION }, { angle: LeaderModelManagerClass.LEFT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DBannerLeft == null) {
				this.leader3DBannerLeft = this.leaderModelGroup.addModel(this.getFallbackBannerAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_BANNER_POSITION }, { angle: LeaderModelManagerClass.LEFT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}
		}

		this.showDiplomaticSceneEnvironment();
		this.simpleLeaderPopUpCameraAnimation(false, 0);
		this.isLeaderShowing = true;
	}

	// ------------------------------------------------------------------------
	// Show a leader on the right side of the screen
	// Their idle animations will be playing
	showRightLeaderModel(playerID: PlayerId) {
		this.clear();

		//Player 2
		const p2ColorPrimary: number = UI.Player.getPrimaryColorValueAsHex(playerID)
		const p2ColorSecondary: number = UI.Player.getSecondaryColorValueAsHex(playerID)

		const player2: PlayerLibrary | null = Players.get(playerID);
		if (!player2) {
			console.error("leader-model-manager: Unable to get valid player library for player with id: " + playerID.toString());
			return;
		}
		const leader2: LeaderDefinition | null = GameInfo.Leaders.lookup(player2.leaderType);
		if (!leader2) {
			console.error("leader-model-manager: Unable to get valid leader definition for player with id: " + playerID.toString());
			return;
		}
		const civ2: CivilizationDefinition | null = GameInfo.Civilizations.lookup(player2.civilizationType);
		if (!civ2) {
			console.error("leader-model-manager: Unable to get valid civilization definition for player with id: " + playerID.toString());
			return;
		}

		let animationToPlay: string = "IDLE_WaitingOther";
		let modelPosition: float3 = LeaderModelManagerClass.RIGHT_MODEL_POSITION;

		const isHostile = player2.Diplomacy?.getRelationshipEnum(GameContext.localPlayerID) == DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HOSTILE;

		if (this.isAtWarWithPlayer(playerID) || isHostile) {
			animationToPlay = "IDLE_DwCenterOther";
			this.rightAnimState = "IDLE_DwCenterOther"
			modelPosition = LeaderModelManagerClass.RIGHT_MODEL_AT_WAR_POSITION;
			this.isRightHostile = true;
		}


		this.leader3DMarkerRight = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });
		if (this.leader3DMarkerRight != null) {
			this.leaderModelGroup.addModel(this.getRightLightingAssetName(), { marker: this.leader3DMarkerRight, offset: modelPosition }, { angle: 0, scale: 1, foreground: true });
			this.leader3DModelRight = this.leaderModelGroup.addModel(this.getLeaderAssetName(leader2.LeaderType.toString()), { marker: this.leader3DMarkerRight, offset: modelPosition }, { angle: 0, scale: 1, initialState: animationToPlay, foreground: true, tintColor1: p2ColorPrimary, tintColor2: p2ColorSecondary, triggerCallbacks: true });
			if (this.leader3DModelRight == null) {
				this.leader3DModelRight = this.leaderModelGroup.addModel(this.getFallbackAssetName(), { marker: this.leader3DMarkerRight, offset: modelPosition }, { angle: 0, scale: 1, initialState: animationToPlay, foreground: true, tintColor1: p2ColorPrimary, tintColor2: p2ColorSecondary, triggerCallbacks: true });
			}

			this.leader3DBannerRight = this.leaderModelGroup.addModel(this.getCivBannerName(civ2.CivilizationType.toString()), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_BANNER_POSITION }, { angle: LeaderModelManagerClass.RIGHT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p2ColorPrimary, tintColor2: p2ColorSecondary, triggerCallbacks: true });
			if (this.leader3DBannerRight == null) {
				this.leader3DBannerRight = this.leaderModelGroup.addModel(this.getFallbackBannerAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_BANNER_POSITION }, { angle: LeaderModelManagerClass.RIGHT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p2ColorPrimary, tintColor2: p2ColorSecondary, triggerCallbacks: true });
			}
		}

		this.showDiplomaticSceneEnvironment();
		this.simpleLeaderPopUpCameraAnimation(false, 0);
		this.isLeaderShowing = true;
		this.playLeaderAnimation(animationToPlay, "right");
	}

	/**
	 *  ------------------------------------------------------------------------
	 * Show an  independent 'leader' on the right side of the screen, which may not be a true leader model.
	 * @param playerID 
	 * @returns 
	 */
	showRightIndLeaderModel(playerID: PlayerId) {
		this.clear();

		//Player 2		
		const player2: PlayerLibrary | null = Players.get(playerID);
		if (!player2) {
			console.error("leader-model-manager: Unable to get valid player library for player with id: " + playerID.toString());
			return;
		}
		const civ2: CivilizationDefinition | null = GameInfo.Civilizations.lookup(player2.civilizationType);
		if (!civ2) {
			console.error("leader-model-manager: Unable to get valid civilization definition for player with id: " + playerID.toString());
			return;
		}

		const p2ColorPrimary: number = this.getIndPrimaryColor(player2);
		const p2ColorSecondary: number = this.getIndSecondaryColor(player2);

		this.leader3DMarkerRight = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });
		if (this.leader3DMarkerRight != null) {
			this.leaderModelGroup.addModel(this.getIndependentLightingAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_INDEPENDENT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true });
			this.leader3DModelRight = this.leaderModelGroup.addModel(this.getIndLeaderAssetName(player2), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_INDEPENDENT_MODEL_POSITION }, { angle: LeaderModelManagerClass.RIGHT_INDEPENDENT_MODEL_ANGLE, scale: LeaderModelManagerClass.RIGHT_INDEPENDENT_MODEL_SCALE, initialState: "IDLE", foreground: true, triggerCallbacks: true, seed: Database.makeHash(player2.civilizationFullName), selectionScriptParams: { player: playerID } });
			if (this.leader3DModelRight == null) {
				this.leader3DModelRight = this.leaderModelGroup.addModel(this.getFallbackAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_MODEL_POSITION }, { angle: 0, scale: 1, initialState: "IDLE", foreground: true, triggerCallbacks: true });
			}
			this.leader3DModelLeft = this.leaderModelGroup.addModel(this.getIndLeaderBGAssetName(player2), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_INDEPENDENT_MODEL_POSITION }, { angle: LeaderModelManagerClass.RIGHT_INDEPENDENT_MODEL_ANGLE, scale: LeaderModelManagerClass.RIGHT_INDEPENDENT_MODEL_SCALE, initialState: "IDLE", foreground: true, triggerCallbacks: true, seed: Database.makeHash(player2.civilizationFullName), selectionScriptParams: { player: playerID } });

			this.leader3DBannerRight = this.leaderModelGroup.addModel(this.getIndBannerAssetName(player2), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_INDEPENDENT_BANNER_POSITION }, { angle: LeaderModelManagerClass.RIGHT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p2ColorPrimary, tintColor2: p2ColorSecondary, triggerCallbacks: true });
			if (this.leader3DBannerRight == null) {
				this.leader3DBannerRight = this.leaderModelGroup.addModel(this.getFallbackBannerAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_INDEPENDENT_BANNER_POSITION }, { angle: LeaderModelManagerClass.RIGHT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p2ColorPrimary, tintColor2: p2ColorSecondary, triggerCallbacks: true });
			}
		}

		this.showDiplomaticSceneEnvironment(LeaderModelManagerClass.RIGHT_INDEPENDENT_VIGNETTE_OFFSET);
		this.simpleLeaderPopUpCameraAnimation(false, 0, LeaderModelManagerClass.RIGHT_INDEPENDENT_CAMERA_OFFSET);
		this.beginLeadersIndependentSequence();
		this.isLeaderShowing = true;
	}

	// ------------------------------------------------------------------------
	// This function does all the interpreting of any animation triggers that come in and uses them to advance whatever sequences are relying on them
	private handleTriggerCallback(id: number, hash: number) {
		// Make sure the ID is for a model we are using
		if (id == this.leader3DModelLeft?.id || id == this.leader3DModelRight?.id) {
			if (DEBUG_LOG_TRIGGER) console.log("A Leader animation trigger was hit: " + id + " " + hash);

			// We only care about triggers produced by an animation ending or an artist set SEQUENCE trigger
			if (hash != LeaderModelManagerClass.TRIGGER_HASH_SEQUENCE_TRIGGER && hash != LeaderModelManagerClass.TRIGGER_HASH_ANIMATION_STATE_END) {
				return;
			}

			// ignore the animation state change trigger if the animation only just changed into this new animation
			if (id == this.leader3DModelLeft?.id && this.leaderLeftAnimationJustStarted) {
				this.leftAnimationStartTime = performance.now();
				this.leaderLeftAnimationJustStarted = false;
				return;
			}
			if (id == this.leader3DModelRight?.id && this.leaderRightAnimationJustStarted) {
				this.rightAnimationStartTime = performance.now();
				this.leaderRightAnimationJustStarted = false;
				return;
			}

			// Ignore triggers within the debounce period
			if (id == this.leader3DModelLeft?.id && (performance.now() - this.leftAnimationStartTime) < this.SEQUENCE_DEBOUNCE_DURATION) {
				return;
			}
			if (id == this.leader3DModelRight?.id && (performance.now() - this.rightAnimationStartTime) < this.SEQUENCE_DEBOUNCE_DURATION) {
				return;
			}

			switch (this.currentSequenceType) {
				case "MEET":
					if (DEBUG_LOG_TRIGGER) { console.log(" - the trigger was used to advance the first meet sequence: " + id + " " + hash); }
					this.advanceFirstMeetSequence(id, hash);
					break;
				case "WAR":
					if (DEBUG_LOG_TRIGGER) { console.log(" - the trigger was used to advance the declare war sequence: " + id + " " + hash); }
					this.advanceDeclareWarPlayerSequence(id, hash);
					break;
				case "ACCEPT_PEACE":
					if (DEBUG_LOG_TRIGGER) { console.log(" - the trigger was used to advance the accept peace sequence: " + id + " " + hash); }
					this.advanceAcceptPeaceSequence(id, hash);
					break;
				case "REJECT_PEACE":
					if (DEBUG_LOG_TRIGGER) { console.log(" - the trigger was used to advance the reject peace sequence: " + id + " " + hash); }
					this.advanceRejectPeaceSequence(id, hash);
					break;
				case "DEFEAT":
					if (DEBUG_LOG_TRIGGER) { console.log(" - the trigger was used to advance the defeat sequence: " + id + " " + hash); }
					this.advanceDefeatSequence(id, hash);
					break;
				case "ACKNOWLEDGE_OTHER_POSITIVE":
					if (DEBUG_LOG_TRIGGER) { console.log(" - the trigger was used to advance the acknowledge other positive sequence: " + id + " " + hash); }
					this.advanceAcknowledgePositiveOtherSequence(id, hash);
					break;
				case "ACKNOWLEDGE_OTHER":
					if (DEBUG_LOG_TRIGGER) { console.log(" - the trigger was used to advance the acknowledge other sequence: " + id + " " + hash); }
					this.advanceAcknowledgeOtherSequence(id, hash);
					break;
				case "ACKNOWLEDGE_OTHER_NEGATIVE":
					if (DEBUG_LOG_TRIGGER) { console.log(" - the trigger was used to advance the acknowledge other negative sequence: " + id + " " + hash); }
					this.advanceAcknowledgeNegativeOtherSequence(id, hash);
					break
				case "ACKNOWLEDGE_PLAYER":
					if (DEBUG_LOG_TRIGGER) { console.log(" - the trigger was used to advance the acknowledge player sequence: " + id + " " + hash); }
					this.advanceAcknowledgePlayerSequence(id, hash);
					break;
				case "ACKNOWLEDGE_HOSTILE_PLAYER":
					if (DEBUG_LOG_TRIGGER) { console.log(" - the trigger was used to advance the acknowledge player sequence hostile: " + id + " " + hash); }
					this.advanceHostileAcknowledgePlayerSequence(id, hash);
					break;
				case "PLAYER_PROPOSAL":
					if (DEBUG_LOG_TRIGGER) { console.log(" - the trigger was used to advance the player proposal sequence: " + id + " " + hash); }
					this.advancePlayerProposeSequence(id, hash);
					break;
				case "SHOW_INDEPENDENT":
					if (DEBUG_LOG_TRIGGER) { console.log(" - the trigger was used to advance the show independent sequence: " + id + " " + hash); }
					if (hash == LeaderModelManagerClass.TRIGGER_HASH_ANIMATION_STATE_END)
						this.advanceLeadersIndependentSequence(id, hash);
					break;
				default:
					break;
			}
		}
	}

	// ------------------------------------------------------------------------
	// Handle when a foreground camera animation completes
	private handleForegroundCameraAnimationComplete(id: number) {
		if (this.leaderSequenceGate.waitingForForegroundCameraId != 0
			&& this.leaderSequenceGate.waitingForForegroundCameraId == id) {
			this.leaderSequenceGate.waitingForForegroundCameraId = 0;
			if (DEBUG_LOG_TRIGGER) { console.log("Foreground camera animation complete"); }


			if (this.currentSequenceType == "WAR") {
				this.advanceDeclareWarPlayerSequence(0, 0);
			}
		}
	}

	// ------------------------------------------------------------------------
	// Use this function to play a leader's animation instead of setting the state directly
	private playLeaderAnimation(stateName: string, leaderSide: string) {

		if (leaderSide.toLowerCase() == "left") {
			if (this.leader3DModelLeft == null) {
				return;
			}
			this.leader3DModelLeft.setState(stateName);
			this.leaderLeftAnimationJustStarted = true;
			this.leftAnimState = stateName;
			this.leftAnimationStartTime = performance.now();
		}
		else if (leaderSide.toLowerCase() == "right") {
			if (this.leader3DModelRight == null) {
				return;
			}
			this.leader3DModelRight.setState(stateName);
			this.leaderRightAnimationJustStarted = true;
			this.rightAnimState = stateName;
			this.rightAnimationStartTime = performance.now();
		}
	}

	// ------------------------------------------------------------------------
	// This is what the UI system calls to exit from the leader scene so this function handles what sort of camera 
	// animation we should do as we exit
	exitLeaderScene() {
		window.requestAnimationFrame((timeStamp: DOMHighResTimeStamp) => { this.onUpdate(timeStamp) });
		this.isClosingFallback = true;
		this.fallbackCloseStartTime = performance.now();
		if (!this.isLeaderShowing) {
			return;
		}

		this.exitSimpleDiplomacyScene();
	}

	// KWG: Overall, a fix needs to go in to get it so that the diplomacy-manager
	// is not trying to directly call this.  It should not be communicating directly with
	// this manager, as it doesn't need to know about the visualization.
	// ------------------------------------------------------------------------

	// ------------------------------------------------------------------------
	exitSimpleDiplomacyScene() {
		this.simpleLeaderPopUpCameraAnimation(true, 0);
		this.clearLeaderModels();
	}

	// ------------------------------------------------------------------------
	clearLeaderModels() {
		this.isClosing = true;
		this.closeStartTime = performance.now();
		window.requestAnimationFrame((timeStamp: DOMHighResTimeStamp) => { this.onUpdate(timeStamp) });
		this.leader3DModelLeft = null;
		this.leader3DModelRight = null;
		this.leader3DBannerLeft = null;
		this.leader3DBannerRight = null;
	}

	// ------------------------------------------------------------------------
	clear() {
		// Clear the model group, reset the camera, and stop the requestAnimationFrame loop
		this.leaderModelGroup.clear();
		WorldUI.releaseMarker(this.leader3DMarkerLeft);
		WorldUI.releaseMarker(this.leader3DMarkerRight);
		WorldUI.releaseMarker(this.leader3DRevealFlagMarker);
		WorldUI.ForegroundCamera.reset();
		if (this.worldCamera) {
			Camera.popCamera()
		}
		Camera.clearAnimation();
		this.worldCamera = null;
		this.isClosing = false;
		this.isClosingFallback = false;
		this.leader3DModelLeft = null;
		this.leader3DModelRight = null;
		this.leader3DBannerLeft = null;
		this.leader3DBannerRight = null;
		this.leader3DMarkerLeft = null;
		this.leader3DMarkerRight = null;
		this.leader3DRevealFlagMarker = null;
		this.currentSequenceType == "";
		this.leaderSequenceStepID = 0;
		this.cameraDollyQueued = false;
		this.cameraDollyDelayed = false;
		this.cameraAnimationDelayDuration = 0;
		this.leaderSequenceGate.clear();
		this.isLeaderShowing = false;
		this.isRightHostile = false;
		this.declareWarCameraActive = false;

		//TODO: Let the diplomacy view know it is safe to exit
	}

	// ------------------------------------------------------------------------
	onUpdate(timeStamp: DOMHighResTimeStamp) {

		if (this.isClosingFallback || this.isClosing || this.cameraDollyQueued || this.cameraDollyDelayed) {
			window.requestAnimationFrame((timeStamp: DOMHighResTimeStamp) => { this.onUpdate(timeStamp) });

			// This is a fallback closing of the diplomacy scene if we somehow miss closing the expected way
			if ((timeStamp - this.fallbackCloseStartTime > this.MAX_LENGTH_OF_ANIMATION_EXIT) && this.isClosingFallback) {
				this.clear();
			}

			// This is the expected way to close the diplomacy screen
			if ((timeStamp - this.closeStartTime > this.MAX_LENGTH_OF_ANIMATION_EXIT) && this.isClosing) {
				this.clear();
			}

			if ((timeStamp - this.cameraDollyRequestStartTime > (this.cameraAnimationDelayDuration * 1000) && this.cameraDollyDelayed)) {
				this.cameraDollyDelayed = false;
				this.doForegroundCameraDolly(false);
			}

			if (this.leaderModelGroup.isLoaded() && this.cameraDollyQueued) {
				this.cameraDollyQueued = false;
				if (this.cameraAnimationDelayDuration > 0) {
					this.cameraDollyDelayed = true;
					this.cameraDollyRequestStartTime = performance.now();
				} else {
					this.doForegroundCameraDolly(false);
				}
			}
		}
	}

	// ------------------------------------------------------------------------
	// Do some shared operations, when a sequence advances to the next step.
	private doSequenceSharedAdvance() {
		if (this.leaderSequenceGate.voQueued) {
			// Send an animation finished event.  This is in reaction to the previous animation finishing, that we know had VO.
			window.dispatchEvent(new CustomEvent('diplomacy-animation-finished', { detail: { isVO: true } }));
			this.leaderSequenceGate.voQueued = false;
		}
	}
	// ========================================================================
	// Code specific to a canned sequence.  i.e. MEET, WAR, etc.
	//
	// We should look into making these more data driven.
	//
	// Please keep all sequence specific code below here.  If we intend on
	// having specific code for sequecing, the code should be in separate
	// controller classes, as this will get quite cluttered with them as we
	// add more.

	// ------------------------------------------------------------------------
	private updateSequenceWaitFromAnimationTrigger(id: number, _hash: number) {
		if (id != 0)		// 0 means the 'advance' was called from something other than a trigger callback.
		{
			if (id == this.leader3DModelLeft?.id) {
				this.leaderSequenceGate.waitingForLeftAnimation = false;
			}
			if (id == this.leader3DModelRight?.id) {
				this.leaderSequenceGate.waitingForRightAnimation = false;
			}
		}
	}

	// ------------------------------------------------------------------------
	// FIRST MEET SEQUENCE
	// This starts the sequencing for the First meet interaction
	private showLeadersFirstMeet(params: LeaderSequenceData) {
		this.clear();

		const playerID1: PlayerId = params.player1;
		const playerID2: PlayerId = params.player2;

		//Player 1
		const p1ColorPrimary: number = UI.Player.getPrimaryColorValueAsHex(playerID1)
		const p1ColorSecondary: number = UI.Player.getSecondaryColorValueAsHex(playerID1)

		const player1: PlayerLibrary | null = Players.get(playerID1);
		if (!player1) {
			console.error("leader-model-manager: Unable to get valid player library for player with id: " + playerID1.toString());
			return;
		}
		const leader1: LeaderDefinition | null = GameInfo.Leaders.lookup(player1.leaderType);
		if (!leader1) {
			console.error("leader-model-manager: Unable to get valid leader definition for player with id: " + playerID1.toString());
			return;
		}
		const civ1: CivilizationDefinition | null = GameInfo.Civilizations.lookup(player1.civilizationType);
		if (!civ1) {
			console.error("leader-model-manager: Unable to get valid civilization definition for player with id: " + playerID1.toString());
			return;
		}

		this.leader3DMarkerLeft = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });
		if (this.leader3DMarkerLeft != null) {
			this.leaderModelGroup.addModel(this.getLeftLightingAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true });
			this.leader3DModelLeft = this.leaderModelGroup.addModel(this.getLeaderAssetName(leader1.LeaderType.toString()), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DModelLeft == null) {
				this.leader3DModelLeft = this.leaderModelGroup.addModel(this.getFallbackAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}
			this.leader3DBannerLeft = this.leaderModelGroup.addModel(this.getCivBannerName(civ1.CivilizationType.toString()), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_BANNER_POSITION }, { angle: LeaderModelManagerClass.LEFT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DBannerLeft == null) {
				this.leader3DBannerLeft = this.leaderModelGroup.addModel(this.getFallbackBannerAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_BANNER_POSITION }, { angle: LeaderModelManagerClass.LEFT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}
		}

		//Player 2
		const p2ColorPrimary: number = UI.Player.getPrimaryColorValueAsHex(playerID2)
		const p2ColorSecondary: number = UI.Player.getSecondaryColorValueAsHex(playerID2)

		const player2: PlayerLibrary | null = Players.get(playerID2);
		if (!player2) {
			console.error("leader-model-manager: Unable to get valid player library for player with id: " + playerID2.toString());
			return;
		}
		const leader2: LeaderDefinition | null = GameInfo.Leaders.lookup(player2.leaderType);
		if (!leader2) {
			console.error("leader-model-manager: Unable to get valid leader definition for player with id: " + playerID2.toString());
			return;
		}
		const civ2: CivilizationDefinition | null = GameInfo.Civilizations.lookup(player2.civilizationType);
		if (!civ2) {
			console.error("leader-model-manager: Unable to get valid civilization definition for player with id: " + playerID2.toString());
			return;
		}

		this.leader3DMarkerRight = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });
		if (this.leader3DMarkerRight != null) {
			this.leaderModelGroup.addModel(this.getRightLightingAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true });
			this.leader3DModelRight = this.leaderModelGroup.addModel(this.getLeaderAssetName(leader2.LeaderType.toString()), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DModelRight == null) {
				this.leader3DModelRight = this.leaderModelGroup.addModel(this.getFallbackAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}
			this.leader3DBannerRight = this.leaderModelGroup.addModel(this.getCivBannerName(civ2.CivilizationType.toString()), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_BANNER_POSITION }, { angle: LeaderModelManagerClass.RIGHT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, foreground: true, tintColor1: p2ColorPrimary, tintColor2: p2ColorSecondary, triggerCallbacks: true });
			if (this.leader3DBannerRight == null) {
				this.leader3DBannerRight = this.leaderModelGroup.addModel(this.getFallbackBannerAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_BANNER_POSITION }, { angle: LeaderModelManagerClass.RIGHT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, foreground: true, tintColor1: p2ColorPrimary, tintColor2: p2ColorSecondary, triggerCallbacks: true });
			}
		}

		this.showDiplomaticSceneEnvironment();
		this.simpleLeaderPopUpCameraAnimation(false, this.FIRST_MEET_DELAY)
		this.beginFirstMeetSequence();
		this.isLeaderShowing = true;
	}

	// ------------------------------------------------------------------------
	private beginFirstMeetSequence() {
		this.playLeaderAnimation("IDLE_ListeningPlayerBreath", "left");
		this.playLeaderAnimation("VO_FirstMeet", "right");
		this.leaderSequenceGate.clear();
		this.leaderSequenceGate.setWaitForJustRight();
		this.leaderSequenceGate.setVOQueued();						// Flag that there is VO in this part of the sequence.
		this.currentSequenceType = "MEET";
		this.leaderSequenceStepID = 1;
	}

	// ------------------------------------------------------------------------
	private advanceFirstMeetSequence(id: number, hash: number) {

		// Update anything we are waiting on.
		this.updateSequenceWaitFromAnimationTrigger(id, hash);

		switch (this.leaderSequenceStepID) {
			case 1: {
				if (this.leaderSequenceGate.isWaiting() == false) {
					this.doSequenceSharedAdvance();
					if (hash == LeaderModelManagerClass.TRIGGER_HASH_SEQUENCE_TRIGGER) {
						// Sometimes the leader's intro has a long idle loop and won't change into the idle state for quite a while,
						// so we pretend that the leader is actually idling once they finish talking
						this.rightAnimState = "IDLE_WaitingOther";
						this.leaderSequenceStepID = 2;
					}
					// If the Leader's animation is missing it's trigger this will advance to the UI choice at the end of the animation
					if (hash == LeaderModelManagerClass.TRIGGER_HASH_ANIMATION_STATE_END) {
						this.playLeaderAnimation("IDLE_WaitingOther", "right");
						this.playLeaderAnimation("IDLE_ListeningPlayer", "left");
						this.leaderSequenceStepID = 0;
						this.leaderSequenceGate.clear();
					}
				}
				break;
			}
			case 2: {
				// if we pretend set the state to WaitingOther, this ensures that the actual WaitingOther state plays once VO ends
				if (hash == LeaderModelManagerClass.TRIGGER_HASH_ANIMATION_STATE_END) {
					this.playLeaderAnimation("IDLE_WaitingOther", "right");
					this.leaderSequenceStepID = 3;
				}
				break;
			}
			case 3: {
				if (this.leaderSequenceGate.isWaiting() == false) {
					this.doSequenceSharedAdvance();
					if (id == this.leader3DModelRight?.id)
						this.playLeaderAnimation("IDLE_WaitingOther", "right");
					if (id == this.leader3DModelLeft?.id)
						this.playLeaderAnimation("IDLE_ListeningPlayer", "left");
					if (this.leftAnimState == "IDLE_ListeningPlayer" && this.rightAnimState == "IDLE_WaitingOther")
						this.leaderSequenceStepID = 0;
					this.leaderSequenceGate.clear();
				}
				break;
			}
		}
	}

	// Declare War from Player Sequence

	// ------------------------------------------------------------------------
	// This starts the sequencing for a declare war statement.
	// This will work for either direction.
	private showLeadersDeclareWar(params: LeaderSequenceData) {
		this.clear();

		const playerID1: PlayerId = params.player1;
		const playerID2: PlayerId = params.player2;

		//Player 1
		const p1ColorPrimary: number = UI.Player.getPrimaryColorValueAsHex(playerID1)
		const p1ColorSecondary: number = UI.Player.getSecondaryColorValueAsHex(playerID1)

		const player1: PlayerLibrary | null = Players.get(playerID1);
		if (!player1) {
			console.error("leader-model-manager: Unable to get valid player library for player with id: " + playerID1.toString());
			return;
		}
		const leader1: LeaderDefinition | null = GameInfo.Leaders.lookup(player1.leaderType);
		if (!leader1) {
			console.error("leader-model-manager: Unable to get valid leader definition for player with id: " + playerID1.toString());
			return;
		}
		const civ1: CivilizationDefinition | null = GameInfo.Civilizations.lookup(player1.civilizationType);
		if (!civ1) {
			console.error("leader-model-manager: Unable to get valid civilization definition for player with id: " + playerID1.toString());
			return;
		}

		this.leader3DMarkerLeft = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });
		if (this.leader3DMarkerLeft != null) {
			this.leaderModelGroup.addModel(this.getLeftLightingAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true });
			this.leader3DModelLeft = this.leaderModelGroup.addModel(this.getLeaderAssetName(leader1.LeaderType.toString()), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DModelLeft == null) {
				this.leader3DModelLeft = this.leaderModelGroup.addModel(this.getFallbackAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}
			this.leader3DBannerLeft = this.leaderModelGroup.addModel(this.getCivBannerName(civ1.CivilizationType.toString()), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_BANNER_POSITION }, { angle: LeaderModelManagerClass.LEFT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DBannerLeft == null) {
				this.leader3DBannerLeft = this.leaderModelGroup.addModel(this.getFallbackBannerAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_BANNER_POSITION }, { angle: LeaderModelManagerClass.LEFT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}
		}

		//Player 2
		const p2ColorPrimary: number = UI.Player.getPrimaryColorValueAsHex(playerID2)
		const p2ColorSecondary: number = UI.Player.getSecondaryColorValueAsHex(playerID2)

		const player2: PlayerLibrary | null = Players.get(playerID2);
		if (!player2) {
			console.error("leader-model-manager: Unable to get valid player library for player with id: " + playerID2.toString());
			return;
		}
		const leader2: LeaderDefinition | null = GameInfo.Leaders.lookup(player2.leaderType);
		if (!leader2) {
			console.error("leader-model-manager: Unable to get valid leader definition for player with id: " + playerID2.toString());
			return;
		}
		const civ2: CivilizationDefinition | null = GameInfo.Civilizations.lookup(player2.civilizationType);
		if (!civ2) {
			console.error("leader-model-manager: Unable to get valid civilization definition for player with id: " + playerID2.toString());
			return;
		}

		this.leader3DMarkerRight = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });
		if (this.leader3DMarkerRight != null) {
			this.leaderModelGroup.addModel(this.getRightLightingAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true });
			this.leader3DModelRight = this.leaderModelGroup.addModel(this.getLeaderAssetName(leader2.LeaderType.toString()), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DModelRight == null) {
				this.leader3DModelRight = this.leaderModelGroup.addModel(this.getFallbackAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}
			this.leader3DBannerRight = this.leaderModelGroup.addModel(this.getCivBannerName(civ2.CivilizationType.toString()), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_BANNER_POSITION }, { angle: LeaderModelManagerClass.RIGHT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, foreground: true, tintColor1: p2ColorPrimary, tintColor2: p2ColorSecondary, triggerCallbacks: true });
			if (this.leader3DBannerRight == null) {
				this.leader3DBannerRight = this.leaderModelGroup.addModel(this.getFallbackBannerAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_BANNER_POSITION }, { angle: LeaderModelManagerClass.RIGHT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, foreground: true, tintColor1: p2ColorPrimary, tintColor2: p2ColorSecondary, triggerCallbacks: true });
			}
		}

		this.showDiplomaticSceneEnvironment();
		this.simpleLeaderPopUpCameraAnimation(false, 0);
		this.beginDeclareWarPlayerSequence();
		this.isLeaderShowing = true;
	}

	// ------------------------------------------------------------------------
	private beginDeclareWarPlayerSequence() {
		if (DEBUG_LOG_TRIGGER) {
			console.log("DW sequence step 0");
			console.log("Player on the left is ID: " + this.leader3DModelLeft?.id);
			console.log("Player on the right is ID: " + this.leader3DModelRight?.id);
		}
		//Conditional DW Sequence
		if (this.isLocalPlayerInitiator) {
			this.playLeaderAnimation("ACTION_DwDecisionPlayer", "left");
			this.playLeaderAnimation("IDLE_WaitingOtherBreath", "right");
			this.leaderSequenceGate.setWaitForJustLeft();
			this.leaderSequenceStepID = 1;
		}
		else {
			this.playLeaderAnimation("IDLE_DwPlayer", "left");
			this.playLeaderAnimation("VO_DwAttacker", "right");
			this.leaderSequenceGate.setWaitForJustRight();
			this.leaderSequenceGate.setVOQueued();						// Set that this animation has VO.  Would be great if this was more automatic.
			this.leaderSequenceStepID = 2;
		}
		this.currentSequenceType = "WAR";
	}

	// ------------------------------------------------------------------------
	private advanceDeclareWarPlayerSequence(id: number, hash: number) {
		// Update anything we are waiting on.
		this.updateSequenceWaitFromAnimationTrigger(id, hash);

		switch (this.leaderSequenceStepID) {
			case 1: {
				if (this.leaderSequenceGate.isWaiting() == false) {
					this.playLeaderAnimation("VO_DwDefender", "right");
					this.leaderSequenceGate.setVOQueued(); // Set that this animation has VO.  Would be great if this was more automatic.
					this.leaderSequenceStepID = 2;
				}
				break;
			}

			case 2: {
				if (this.leaderSequenceGate.isWaiting() == false) {
					this.doSequenceSharedAdvance();
					if (id == this.leader3DModelLeft?.id)
						this.playLeaderAnimation("IDLE_DwPlayer", "left");
					if (id == this.leader3DModelRight?.id) {
						this.playLeaderAnimation("TRANS_DwtoDwCenterPlayer", "left");
						this.startDWCameraAnimations();
						this.leaderSequenceStepID = 3;
					}
				}
				break;

			}
			case 3: {
				if (this.leaderSequenceGate.isWaiting() == false) {
					if (id == this.leader3DModelLeft?.id && hash != LeaderModelManagerClass.TRIGGER_HASH_SEQUENCE_TRIGGER)
						this.playLeaderAnimation("IDLE_DwCenterPlayer", "left");
					if (id == this.leader3DModelRight?.id && hash != LeaderModelManagerClass.TRIGGER_HASH_SEQUENCE_TRIGGER)
						this.playLeaderAnimation("IDLE_DwCenterOther", "right");
					if (this.leftAnimState == "IDLE_DwCenterPlayer" && this.rightAnimState == "IDLE_DwCenterOther") {
						this.leaderSequenceStepID = 0;
					}
				}
				break;
			}
		}
	}

	// ------------------------------------------------------------------------
	// ACCEPT PEACE SEQUENCE
	// This starts the sequencing for the Accept Peace interaction. This sequence can 
	// also be used for other instances of a leader accepting a big proposal, like an alliance
	private showLeadersAcceptPeace(params: LeaderSequenceData) {
		this.clear();

		const playerID1: PlayerId = params.player1;
		const playerID2: PlayerId = params.player2;

		//Player 1
		const p1ColorPrimary: number = UI.Player.getPrimaryColorValueAsHex(playerID1)
		const p1ColorSecondary: number = UI.Player.getSecondaryColorValueAsHex(playerID1)

		const player1: PlayerLibrary | null = Players.get(playerID1);
		if (!player1) {
			console.error("leader-model-manager: Unable to get valid player library for player with id: " + playerID1.toString());
			return;
		}
		const leader1: LeaderDefinition | null = GameInfo.Leaders.lookup(player1.leaderType);
		if (!leader1) {
			console.error("leader-model-manager: Unable to get valid leader definition for player with id: " + playerID1.toString());
			return;
		}
		const civ1: CivilizationDefinition | null = GameInfo.Civilizations.lookup(player1.civilizationType);
		if (!civ1) {
			console.error("leader-model-manager: Unable to get valid civilization definition for player with id: " + playerID1.toString());
			return;
		}

		this.leader3DMarkerLeft = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });
		if (this.leader3DMarkerLeft != null) {
			this.leaderModelGroup.addModel(this.getLeftLightingAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true });
			this.leader3DModelLeft = this.leaderModelGroup.addModel(this.getLeaderAssetName(leader1.LeaderType.toString()), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, initialState: "IDLE_HappyPlayer", foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DModelLeft == null) {
				this.leader3DModelLeft = this.leaderModelGroup.addModel(this.getFallbackAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, initialState: "IDLE_HappyPlayer", foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}
			this.leader3DBannerLeft = this.leaderModelGroup.addModel(this.getCivBannerName(civ1.CivilizationType.toString()), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_BANNER_POSITION }, { angle: LeaderModelManagerClass.LEFT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DBannerLeft == null) {
				this.leader3DBannerLeft = this.leaderModelGroup.addModel(this.getFallbackBannerAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_BANNER_POSITION }, { angle: LeaderModelManagerClass.LEFT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}
		}

		//Player 2
		const p2ColorPrimary: number = UI.Player.getPrimaryColorValueAsHex(playerID2)
		const p2ColorSecondary: number = UI.Player.getSecondaryColorValueAsHex(playerID2)

		const player2: PlayerLibrary | null = Players.get(playerID2);
		if (!player2) {
			console.error("leader-model-manager: Unable to get valid player library for player with id: " + playerID2.toString());
			return;
		}
		const leader2: LeaderDefinition | null = GameInfo.Leaders.lookup(player2.leaderType);
		if (!leader2) {
			console.error("leader-model-manager: Unable to get valid leader definition for player with id: " + playerID2.toString());
			return;
		}
		const civ2: CivilizationDefinition | null = GameInfo.Civilizations.lookup(player2.civilizationType);
		if (!civ2) {
			console.error("leader-model-manager: Unable to get valid civilization definition for player with id: " + playerID2.toString());
			return;
		}

		this.leader3DMarkerRight = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });
		if (this.leader3DMarkerRight != null) {
			this.leaderModelGroup.addModel(this.getRightLightingAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true });
			this.leader3DModelRight = this.leaderModelGroup.addModel(this.getLeaderAssetName(leader2.LeaderType.toString()), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DModelRight == null) {
				this.leader3DModelRight = this.leaderModelGroup.addModel(this.getFallbackAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}
			this.leader3DBannerRight = this.leaderModelGroup.addModel(this.getCivBannerName(civ2.CivilizationType.toString()), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_BANNER_POSITION }, { angle: LeaderModelManagerClass.RIGHT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p2ColorPrimary, tintColor2: p2ColorSecondary, triggerCallbacks: true });
			if (this.leader3DBannerRight == null) {
				this.leader3DBannerRight = this.leaderModelGroup.addModel(this.getFallbackBannerAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_BANNER_POSITION }, { angle: LeaderModelManagerClass.RIGHT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p2ColorPrimary, tintColor2: p2ColorSecondary, triggerCallbacks: true });
			}
		}

		this.showDiplomaticSceneEnvironment();
		this.simpleLeaderPopUpCameraAnimation(false, 0);
		this.beginAcceptPeaceSequence();
		this.isLeaderShowing = true;
	}

	// ------------------------------------------------------------------------
	private beginAcceptPeaceSequence() {
		this.playLeaderAnimation("VO_Accept", "right");
		this.playLeaderAnimation("IDLE_HappyPlayer", "left");
		this.currentSequenceType = "ACCEPT_PEACE";
		this.leaderSequenceGate.setWaitForJustRight();
		this.leaderSequenceGate.setVOQueued(); // Flag that there is VO in this part of the sequence.
		this.leaderSequenceStepID = 1;
	}

	// ------------------------------------------------------------------------
	private advanceAcceptPeaceSequence(id: number, hash: number) {

		// Update anything we are waiting on.
		this.updateSequenceWaitFromAnimationTrigger(id, hash);

		// NOTE: Step 1 is handled outside of this function.
		switch (this.leaderSequenceStepID) {
			case 1: {
				if (this.leaderSequenceGate.isWaiting() == false) {
					this.doSequenceSharedAdvance();
					if (hash == LeaderModelManagerClass.TRIGGER_HASH_SEQUENCE_TRIGGER)
						//this.playLeaderAnimation("IDLE_HappyOther", "right");
						this.leaderSequenceStepID = 2;
				}
				break;
			}
			case 2: {
				if (this.leaderSequenceGate.isWaiting() == false) {
					this.doSequenceSharedAdvance();
					if (id == this.leader3DModelRight?.id)
						this.playLeaderAnimation("IDLE_HappyOther", "right");
					if (id == this.leader3DModelLeft?.id)
						this.playLeaderAnimation("IDLE_HappyPlayer", "left");
					if (this.leftAnimState == "IDLE_HappyPlayer" && this.rightAnimState == "IDLE_HappyOther")
						this.leaderSequenceStepID = 0;
					//this.leaderSequenceGate.clear();
				}
				break;
			}
		}
	}

	// ------------------------------------------------------------------------
	// REJECT PEACE SEQUENCE
	// This starts the sequencing for the Reject Peace interaction. This sequence can 
	// also be used for other instances of a leader rejecting a big proposal, like an alliance
	private showLeadersRejectPeace(params: LeaderSequenceData) {
		this.clear();

		const playerID1: PlayerId = params.player1;
		const playerID2: PlayerId = params.player2;

		//Player 1
		const p1ColorPrimary: number = UI.Player.getPrimaryColorValueAsHex(playerID1)
		const p1ColorSecondary: number = UI.Player.getSecondaryColorValueAsHex(playerID1)

		const player1: PlayerLibrary | null = Players.get(playerID1);
		if (!player1) {
			console.error("leader-model-manager: Unable to get valid player library for player with id: " + playerID1.toString());
			return;
		}
		const leader1: LeaderDefinition | null = GameInfo.Leaders.lookup(player1.leaderType);
		if (!leader1) {
			console.error("leader-model-manager: Unable to get valid leader definition for player with id: " + playerID1.toString());
			return;
		}
		const civ1: CivilizationDefinition | null = GameInfo.Civilizations.lookup(player1.civilizationType);
		if (!civ1) {
			console.error("leader-model-manager: Unable to get valid civilization definition for player with id: " + playerID1.toString());
			return;
		}

		this.leader3DMarkerLeft = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });
		if (this.leader3DMarkerLeft != null) {
			this.leaderModelGroup.addModel(this.getLeftLightingAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true });
			this.leader3DModelLeft = this.leaderModelGroup.addModel(this.getLeaderAssetName(leader1.LeaderType.toString()), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, initialState: "IDLE_HappyPlayer", foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DModelLeft == null) {
				this.leader3DModelLeft = this.leaderModelGroup.addModel(this.getFallbackAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, initialState: "IDLE_HappyPlayer", foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}
			this.leader3DBannerLeft = this.leaderModelGroup.addModel(this.getCivBannerName(civ1.CivilizationType.toString()), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_BANNER_POSITION }, { angle: LeaderModelManagerClass.LEFT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DBannerLeft == null) {
				this.leader3DBannerLeft = this.leaderModelGroup.addModel(this.getFallbackBannerAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_BANNER_POSITION }, { angle: LeaderModelManagerClass.LEFT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}
		}

		//Player 2
		const p2ColorPrimary: number = UI.Player.getPrimaryColorValueAsHex(playerID2)
		const p2ColorSecondary: number = UI.Player.getSecondaryColorValueAsHex(playerID2)

		const player2: PlayerLibrary | null = Players.get(playerID2);
		if (!player2) {
			console.error("leader-model-manager: Unable to get valid player library for player with id: " + playerID2.toString());
			return;
		}
		const leader2: LeaderDefinition | null = GameInfo.Leaders.lookup(player2.leaderType);
		if (!leader2) {
			console.error("leader-model-manager: Unable to get valid leader definition for player with id: " + playerID2.toString());
			return;
		}
		const civ2: CivilizationDefinition | null = GameInfo.Civilizations.lookup(player2.civilizationType);
		if (!civ2) {
			console.error("leader-model-manager: Unable to get valid civilization definition for player with id: " + playerID2.toString());
			return;
		}

		this.leader3DMarkerRight = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });
		if (this.leader3DMarkerRight != null) {
			this.leaderModelGroup.addModel(this.getRightLightingAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true });
			this.leader3DModelRight = this.leaderModelGroup.addModel(this.getLeaderAssetName(leader2.LeaderType.toString()), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DModelRight == null) {
				this.leader3DModelRight = this.leaderModelGroup.addModel(this.getFallbackAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}
			this.leader3DBannerRight = this.leaderModelGroup.addModel(this.getCivBannerName(civ2.CivilizationType.toString()), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_BANNER_POSITION }, { angle: LeaderModelManagerClass.RIGHT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p2ColorPrimary, tintColor2: p2ColorSecondary, triggerCallbacks: true });
			if (this.leader3DBannerRight == null) {
				this.leader3DBannerRight = this.leaderModelGroup.addModel(this.getFallbackBannerAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_BANNER_POSITION }, { angle: LeaderModelManagerClass.RIGHT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, initialState: "IDLE_ListeningPlayer", foreground: true, tintColor1: p2ColorPrimary, tintColor2: p2ColorSecondary, triggerCallbacks: true });
			}
		}

		this.showDiplomaticSceneEnvironment();
		this.simpleLeaderPopUpCameraAnimation(false, 0);
		this.beginRejectPeaceSequence();
		this.isLeaderShowing = true;
	}

	// ------------------------------------------------------------------------
	private beginRejectPeaceSequence() {
		this.playLeaderAnimation("VO_Reject", "right");
		this.playLeaderAnimation("IDLE_UnhappyPlayer", "left");
		this.currentSequenceType = "REJECT_PEACE";
		this.leaderSequenceGate.setWaitForJustRight();
		this.leaderSequenceGate.setVOQueued(); // Flag that there is VO in this part of the sequence.
		this.leaderSequenceStepID = 1;
	}

	// ------------------------------------------------------------------------
	private advanceRejectPeaceSequence(id: number, hash: number) {

		// Update anything we are waiting on.
		this.updateSequenceWaitFromAnimationTrigger(id, hash);

		switch (this.leaderSequenceStepID) {
			case 1: {
				if (this.leaderSequenceGate.isWaiting() == false) {
					this.doSequenceSharedAdvance();
					if (hash == LeaderModelManagerClass.TRIGGER_HASH_SEQUENCE_TRIGGER)
						//this.playLeaderAnimation("IDLE_WaitingOther", "right");
						this.leaderSequenceStepID = 2;
				}
				break;
			}
			case 2: {
				if (this.leaderSequenceGate.isWaiting() == false) {
					this.doSequenceSharedAdvance();
					if (id == this.leader3DModelRight?.id)
						this.playLeaderAnimation("IDLE_WaitingOther", "right");
					if (id == this.leader3DModelLeft?.id)
						this.playLeaderAnimation("IDLE_UnhappyPlayer", "left");
					if (this.leftAnimState == "IDLE_UnhappyPlayer" && this.rightAnimState == "IDLE_WaitingOther")
						this.leaderSequenceStepID = 0;
					//this.leaderSequenceGate.clear();
				}
				break;
			}
		}
	}

	// ------------------------------------------------------------------------
	// DEFEAT SEQUENCE
	// This starts the sequencing for the Leader Defeated Sequence.
	private showLeadersDefeat(params: LeaderSequenceData) {
		this.clear();

		const playerID1: PlayerId = params.player1;
		const playerID2: PlayerId = params.player2;

		//Player 1
		const p1ColorPrimary: number = UI.Player.getPrimaryColorValueAsHex(playerID1)
		const p1ColorSecondary: number = UI.Player.getSecondaryColorValueAsHex(playerID1)

		const player1: PlayerLibrary | null = Players.get(playerID1);
		if (!player1) {
			console.error("leader-model-manager: Unable to get valid player library for player with id: " + playerID1.toString());
			return;
		}
		const leader1: LeaderDefinition | null = GameInfo.Leaders.lookup(player1.leaderType);
		if (!leader1) {
			console.error("leader-model-manager: Unable to get valid leader definition for player with id: " + playerID1.toString());
			return;
		}
		const civ1: CivilizationDefinition | null = GameInfo.Civilizations.lookup(player1.civilizationType);
		if (!civ1) {
			console.error("leader-model-manager: Unable to get valid civilization definition for player with id: " + playerID1.toString());
			return;
		}

		this.leader3DMarkerLeft = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });
		if (this.leader3DMarkerLeft != null) {
			this.leaderModelGroup.addModel(this.getLeftLightingAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true });
			this.leader3DModelLeft = this.leaderModelGroup.addModel(this.getLeaderAssetName(leader1.LeaderType.toString()), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DModelLeft == null) {
				this.leader3DModelLeft = this.leaderModelGroup.addModel(this.getFallbackAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}
			this.leader3DBannerLeft = this.leaderModelGroup.addModel(this.getCivBannerName(civ1.CivilizationType.toString()), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_BANNER_POSITION }, { angle: LeaderModelManagerClass.LEFT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DBannerLeft == null) {
				this.leader3DBannerLeft = this.leaderModelGroup.addModel(this.getFallbackBannerAssetName(), { marker: this.leader3DMarkerLeft, offset: LeaderModelManagerClass.LEFT_BANNER_POSITION }, { angle: LeaderModelManagerClass.LEFT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}
		}

		//Player 2
		const p2ColorPrimary: number = UI.Player.getPrimaryColorValueAsHex(playerID2)
		const p2ColorSecondary: number = UI.Player.getSecondaryColorValueAsHex(playerID2)

		const player2: PlayerLibrary | null = Players.get(playerID2);
		if (!player2) {
			console.error("leader-model-manager: Unable to get valid player library for player with id: " + playerID2.toString());
			return;
		}
		const leader2: LeaderDefinition | null = GameInfo.Leaders.lookup(player2.leaderType);
		if (!leader2) {
			console.error("leader-model-manager: Unable to get valid leader definition for player with id: " + playerID2.toString());
			return;
		}
		const civ2: CivilizationDefinition | null = GameInfo.Civilizations.lookup(player2.civilizationType);
		if (!civ2) {
			console.error("leader-model-manager: Unable to get valid civilization definition for player with id: " + playerID2.toString());
			return;
		}

		this.leader3DMarkerRight = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });
		if (this.leader3DMarkerRight != null) {
			this.leaderModelGroup.addModel(this.getRightLightingAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true });
			this.leader3DModelRight = this.leaderModelGroup.addModel(this.getLeaderAssetName(leader2.LeaderType.toString()), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			if (this.leader3DModelRight == null) {
				this.leader3DModelRight = this.leaderModelGroup.addModel(this.getFallbackAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_MODEL_POSITION }, { angle: 0, scale: 1, foreground: true, tintColor1: p1ColorPrimary, tintColor2: p1ColorSecondary, triggerCallbacks: true });
			}
			this.leader3DBannerRight = this.leaderModelGroup.addModel(this.getCivBannerName(civ2.CivilizationType.toString()), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_BANNER_POSITION }, { angle: LeaderModelManagerClass.RIGHT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, foreground: true, tintColor1: p2ColorPrimary, tintColor2: p2ColorSecondary, triggerCallbacks: true });
			if (this.leader3DBannerRight == null) {
				this.leader3DBannerRight = this.leaderModelGroup.addModel(this.getFallbackBannerAssetName(), { marker: this.leader3DMarkerRight, offset: LeaderModelManagerClass.RIGHT_BANNER_POSITION }, { angle: LeaderModelManagerClass.RIGHT_BANNER_ANGLE, scale: LeaderModelManagerClass.BANNER_SCALE, foreground: true, tintColor1: p2ColorPrimary, tintColor2: p2ColorSecondary, triggerCallbacks: true });
			}
		}

		this.showDiplomaticSceneEnvironment();
		this.simpleLeaderPopUpCameraAnimation(false, 0);
		this.beginDefeatSequence();
		this.isLeaderShowing = true;
	}

	// ------------------------------------------------------------------------
	private beginDefeatSequence() {
		this.playLeaderAnimation("VO_Defeat", "right");
		this.playLeaderAnimation("IDLE_SmugPlayer", "left");
		this.currentSequenceType = "DEFEAT";
		this.leaderSequenceGate.setWaitForJustRight();
		this.leaderSequenceGate.setVOQueued();						// Flag that there is VO in this part of the sequence.
		this.leaderSequenceStepID = 1;
	}

	// ------------------------------------------------------------------------
	private advanceDefeatSequence(id: number, hash: number) {

		// Update anything we are waiting on.
		this.updateSequenceWaitFromAnimationTrigger(id, hash);

		switch (this.leaderSequenceStepID) {
			case 1: {
				if (this.leaderSequenceGate.isWaiting() == false) {
					this.doSequenceSharedAdvance();

					this.playLeaderAnimation("REACT_SmugTauntPlayer", "left");
					this.leaderSequenceStepID = 2;
				}
				break;
			}
			case 2: {
				if (this.leaderSequenceGate.isWaiting() == false) {
					this.doSequenceSharedAdvance();
					if (id == this.leader3DModelLeft?.id)
						this.playLeaderAnimation("IDLE_SmugPlayer", "left");
					if (id == this.leader3DModelRight?.id)
						this.playLeaderAnimation("IDLE_DefeatOther", "right");

					if (this.leftAnimState == "IDLE_SmugPlayer" && this.rightAnimState == "IDLE_DefeatOther")
						this.leaderSequenceStepID = 0;
				}
				break;
			}
		}
	}


	// Player Acknowledge Positive Sequence

	// ------------------------------------------------------------------------
	// This starts the sequencing for the player leader to play their 
	// positive acknowledge animation and then continue to their idle.	

	// ------------------------------------------------------------------------
	beginAcknowledgePlayerSequence() {
		if (this.leftAnimState != "IDLE_ListeningPlayer" && this.leftAnimState != "IDLE_ListeningPlayerBreath")
			return;
		if (DEBUG_LOG_TRIGGER) {
			console.log("Acknowledge Positive Player sequence step 0");
			console.log("Player on the left is ID: " + this.leader3DModelLeft?.id);
			console.log("Player on the right is ID: " + this.leader3DModelRight?.id);
		}
		this.playLeaderAnimation("REACT_ListeningAckldgePlayer", "left");
		this.leaderSequenceGate.setWaitForJustLeft();
		this.currentSequenceType = "ACKNOWLEDGE_PLAYER";
		this.leaderSequenceStepID = 1;
	}

	// ------------------------------------------------------------------------
	private advanceAcknowledgePlayerSequence(id: number, hash: number) {
		// Update anything we are waiting on.
		this.updateSequenceWaitFromAnimationTrigger(id, hash);

		switch (this.leaderSequenceStepID) {
			case 1: {
				if (hash == LeaderModelManagerClass.TRIGGER_HASH_SEQUENCE_TRIGGER)
					break;
				if (this.leaderSequenceGate.isWaiting() == false) {
					this.doSequenceSharedAdvance();
					this.playLeaderAnimation("IDLE_ListeningPlayer", "left");
					this.leaderSequenceStepID = 0;
					this.currentSequenceType = "";
					this.leaderSequenceGate.clear()
				}
				break;
			}
		}
	}
	// Player Acknowledge Negative Sequence

	// ------------------------------------------------------------------------
	// This starts the sequencing for the player leader to play their 
	// hostile acknowledge animation and then continue to their idle.	

	// ------------------------------------------------------------------------
	beginHostileAcknowledgePlayerSequence() {
		if (this.leftAnimState != "IDLE_ListeningPlayer" && this.leftAnimState != "IDLE_ListeningPlayerBreath")
			return;
		if (DEBUG_LOG_TRIGGER) {
			console.log("Acknowledge Hostile Player sequence step 0");
			console.log("Player on the left is ID: " + this.leader3DModelLeft?.id);
			console.log("Player on the right is ID: " + this.leader3DModelRight?.id);
		}
		this.playLeaderAnimation("ACTION_DwDecisionPlayer", "left");
		this.leaderSequenceGate.setWaitForJustLeft();
		this.currentSequenceType = "ACKNOWLEDGE_HOSTILE_PLAYER";
		this.leaderSequenceStepID = 1;
	}
	// ------------------------------------------------------------------------
	private advanceHostileAcknowledgePlayerSequence(id: number, hash: number) {
		// Update anything we are waiting on.
		this.updateSequenceWaitFromAnimationTrigger(id, hash);

		switch (this.leaderSequenceStepID) {
			case 1: {
				if (hash == LeaderModelManagerClass.TRIGGER_HASH_SEQUENCE_TRIGGER)
					break;
				if (this.leaderSequenceGate.isWaiting() == false) {
					this.doSequenceSharedAdvance();
					this.playLeaderAnimation("IDLE_DwPlayer", "left");
					this.leaderSequenceStepID = 0;
					this.currentSequenceType = "";
					this.leaderSequenceGate.clear()
				}
				break;
			}
		}
	}
	// Player Propose Sequence

	// ------------------------------------------------------------------------
	// This starts the sequencing for the player leader to play their 
	// positive acknowledge animation and then continue to their idle.	

	// ------------------------------------------------------------------------
	beginPlayerProposeSequence() {
		if (DEBUG_LOG_TRIGGER) console.log("Acknowledge Player Propose sequence step 0");
		this.playLeaderAnimation("REACT_ListeningAckldgePlayer", "left");
		this.leaderSequenceGate.setWaitForJustLeft();
		this.currentSequenceType = "PLAYER_PROPOSAL";
		this.leaderSequenceStepID = 1;
	}

	// ------------------------------------------------------------------------
	private advancePlayerProposeSequence(id: number, hash: number) {
		// Update anything we are waiting on.
		this.updateSequenceWaitFromAnimationTrigger(id, hash);

		switch (this.leaderSequenceStepID) {
			case 1: {
				if (hash == LeaderModelManagerClass.TRIGGER_HASH_SEQUENCE_TRIGGER)
					break;
				if (this.leaderSequenceGate.isWaiting() == false) {
					this.doSequenceSharedAdvance();

					this.playLeaderAnimation("REACT_PositiveOther", "right");
					this.leaderSequenceStepID = 0;
					this.currentSequenceType = "";
					this.leaderSequenceGate.clear()
				}
				break;
			}
		}
	}

	beginAcknowledgeOtherSequence() {
		if (this.rightAnimState != "IDLE_WaitingOther")
			return;
		if (DEBUG_LOG_TRIGGER) console.log("Acknowledge Positive Other sequence step 0");
		if (this.isRightHostile) {
			this.playLeaderAnimation("REACT_DwPositiveOther", "right");
		}
		else {
			this.playLeaderAnimation("REACT_PositiveOther", "right");
		}
		this.leaderSequenceGate.setWaitForJustRight();
		this.currentSequenceType = "ACKNOWLEDGE_OTHER";
		this.leaderSequenceStepID = 1;
	}

	private advanceAcknowledgeOtherSequence(id: number, hash: number) {
		this.updateSequenceWaitFromAnimationTrigger(id, hash);

		switch (this.leaderSequenceStepID) {
			case 1: {
				if (hash == LeaderModelManagerClass.TRIGGER_HASH_SEQUENCE_TRIGGER)
					break;
				if (id == this.leader3DModelLeft?.id && this.leftAnimState == "REACT_ListeningAckldgePlayer") {
					this.playLeaderAnimation("IDLE_ListeningPlayerBreath", "left");
					break;
				}
				if (this.leaderSequenceGate.isWaiting() == false) {
					this.doSequenceSharedAdvance();

					if (this.isRightHostile) {
						this.playLeaderAnimation("IDLE_DwCenterOther", "right");
					}
					else {
						this.playLeaderAnimation("IDLE_WaitingOther", "right");
					}

					this.leaderSequenceStepID = 0;
					this.currentSequenceType = "";
					this.leaderSequenceGate.clear()
				}
				break;
			}
		}
	}

	// Other Acknowledge Positive Sequence

	// ------------------------------------------------------------------------
	// This starts the sequencing for the other leader to play their 
	// positive acknowledge animation and then continue to their idle.	

	// ------------------------------------------------------------------------
	beginAcknowledgePositiveOtherSequence(forced?: boolean) {
		if (this.rightAnimState != "IDLE_WaitingOther" && this.rightAnimState != "IDLE_DwCenterOther" && forced != true)
			return;
		if (DEBUG_LOG_TRIGGER) { console.log("Acknowledge Positive Other sequence step 0"); }

		if (this.isRightHostile) {
			this.playLeaderAnimation("REACT_DwPositiveOther", "right");
		}
		else {
			this.playLeaderAnimation("REACT_PositiveOther", "right");
		}

		this.leaderSequenceGate.setWaitForJustRight();
		this.currentSequenceType = "ACKNOWLEDGE_OTHER_POSITIVE";
		this.leaderSequenceStepID = 1;
	}


	// ------------------------------------------------------------------------
	private advanceAcknowledgePositiveOtherSequence(id: number, hash: number) {
		// Update anything we are waiting on.
		this.updateSequenceWaitFromAnimationTrigger(id, hash);

		switch (this.leaderSequenceStepID) {
			case 1: {
				if (hash == LeaderModelManagerClass.TRIGGER_HASH_SEQUENCE_TRIGGER)
					break;
				if (id == this.leader3DModelLeft?.id && this.leftAnimState == "REACT_ListeningAckldgePlayer") {
					this.playLeaderAnimation("IDLE_ListeningPlayerBreath", "left");
					break;
				}
				if (this.leaderSequenceGate.isWaiting() == false) {
					this.doSequenceSharedAdvance();

					if (this.isRightHostile) {
						this.playLeaderAnimation("IDLE_DwCenterOther", "right");
					}
					else {
						this.playLeaderAnimation("IDLE_WaitingOther", "right");
					}

					this.leaderSequenceStepID = 0;
					this.currentSequenceType = "";
					this.leaderSequenceGate.clear()
				}
				break;
			}
		}
	}

	// Other Acknowledge Negative Sequence

	// ------------------------------------------------------------------------
	// This starts the sequencing for the other leader to play their 
	// positive acknowledge animation and then continue to their idle.	

	// ------------------------------------------------------------------------
	beginAcknowledgeNegativeOtherSequence(forced?: boolean) {
		if (this.rightAnimState != "IDLE_WaitingOther" && this.rightAnimState != "IDLE_DwCenterOther" && forced != true)
			return;
		if (DEBUG_LOG_TRIGGER) console.log("Acknowledge Negative Other sequence step 0");
		if (this.isRightHostile) {
			this.playLeaderAnimation("REACT_DwNegativeOther", "right");
		}
		else {
			this.playLeaderAnimation("REACT_NegativeOther", "right");
		}

		this.leaderSequenceGate.setWaitForJustRight();
		this.currentSequenceType = "ACKNOWLEDGE_OTHER_NEGATIVE";
		this.leaderSequenceStepID = 1;
	}

	// ------------------------------------------------------------------------
	private advanceAcknowledgeNegativeOtherSequence(id: number, hash: number) {
		// Update anything we are waiting on.
		this.updateSequenceWaitFromAnimationTrigger(id, hash);

		switch (this.leaderSequenceStepID) {
			case 1: {
				if (hash == LeaderModelManagerClass.TRIGGER_HASH_SEQUENCE_TRIGGER)
					break;
				if (id == this.leader3DModelLeft?.id && this.leftAnimState == "REACT_ListeningAckldgePlayer") {
					this.playLeaderAnimation("IDLE_ListeningPlayerBreath", "left");
					break;
				}
				if (this.leaderSequenceGate.isWaiting() == false) {
					this.doSequenceSharedAdvance();
					if (this.isRightHostile) {
						this.playLeaderAnimation("IDLE_DwCenterOther", "right");
					}
					else {
						this.playLeaderAnimation("IDLE_WaitingOther", "right");
					}

					this.leaderSequenceStepID = 0;
					this.currentSequenceType = "";
					this.leaderSequenceGate.clear()
				}
				break;
			}
		}
	}


	// ------------------------------------------------------------------------
	private beginLeadersIndependentSequence() {
		this.playLeaderAnimation("SPAWN", "right");
		this.currentSequenceType = "SHOW_INDEPENDENT";
		this.leaderSequenceGate.setWaitForJustRight();
		this.leaderSequenceStepID = 1;
	}

	// ------------------------------------------------------------------------
	private advanceLeadersIndependentSequence(id: number, hash: number) {

		// Update anything we are waiting on.
		this.updateSequenceWaitFromAnimationTrigger(id, hash);

		// NOTE: Step 1 is handled outside of this function.
		switch (this.leaderSequenceStepID) {
			case 1: {
				if (this.leaderSequenceGate.isWaiting() == false) {
					this.doSequenceSharedAdvance();

					this.playLeaderAnimation("IDLE", "right");
					this.leaderSequenceStepID = 0;
				}
				break;
			}
		}
	}

	// Camera sequences

	// ------------------------------------------------------------------------
	private doForegroundCameraDolly(reverse: boolean) {
		// Trigger the foreground camera to dolly between the leaders
		const yOffset = reverse ? (this.declareWarCameraActive ? LeaderModelManagerClass.DECLARE_WAR_DOLLY_DISTANCE : 0) : LeaderModelManagerClass.OFF_CAMERA_DISTANCE;
		const zOffset = reverse ? (this.declareWarCameraActive ? 1 : 0) : 0;

		const cameraStartPosition: float3 = { x: 0, y: yOffset, z: zOffset };

		const subjectOffset = reverse ? LeaderModelManagerClass.CAMERA_SUBJECT_DISTANCE - LeaderModelManagerClass.OFF_CAMERA_DISTANCE : LeaderModelManagerClass.CAMERA_SUBJECT_DISTANCE;
		const subjectStartPosition: float3 = { x: this.leaderCameraOffset.x, y: this.leaderCameraOffset.y + subjectOffset, z: this.leaderCameraOffset.z + zOffset };

		const moveDistance = reverse ? LeaderModelManagerClass.OFF_CAMERA_DISTANCE : -LeaderModelManagerClass.OFF_CAMERA_DISTANCE;
		const movementDelta: float3 = { x: 0, y: moveDistance, z: 0 };

		// Leader animations were authored to a FOV of 15 degrees which is why we change the FOV during diplomatic moments
		const cameraStartFOV = 15;
		const cameraFinalFOV = reverse ? 35 : 15;

		const cameraId = reverse ? LeaderModelManagerClass.FOREGROUND_CAMERA_OUT_ID : LeaderModelManagerClass.FOREGROUND_CAMERA_IN_ID;
		const moveDuration = reverse ? LeaderModelManagerClass.CAMERA_DOLLY_ANIMATION_OUT_DURATION : LeaderModelManagerClass.CAMERA_DOLLY_ANIMATION_IN_DURATION;

		WorldUI.ForegroundCamera.beginAnimation({ cameraPos: cameraStartPosition, subjectPos: subjectStartPosition, fov: cameraStartFOV }, 0);
		WorldUI.ForegroundCamera.addDeltaKeyframe({ cameraPos: movementDelta, subjectPos: movementDelta, fov: 0 }, moveDuration, 0);
		WorldUI.ForegroundCamera.addDeltaKeyframe({ cameraPos: { x: 0, y: 0, z: 0 }, subjectPos: { x: 0, y: 0, z: 0 }, fov: cameraStartFOV - cameraFinalFOV }, 0, 0);
		WorldUI.ForegroundCamera.setId(cameraId);
		WorldUI.ForegroundCamera.endAnimation();
		this.leaderSequenceGate.waitingForForegroundCameraId = cameraId;				// Signal that we are waiting for the camera movement to complete
	}

	// ------------------------------------------------------------------------
	// This is the camera animation to use for any leader diplomacy screen that doesn't require a more cinematic camera
	private simpleLeaderPopUpCameraAnimation(reverse: boolean, delay: number, cameraOffset?: float3) {

		if (reverse) {
			this.doForegroundCameraDolly(reverse);
		}
		else {
			// Start the camera with the leaders off-screen					
			const startOffset = LeaderModelManagerClass.OFF_CAMERA_DISTANCE;
			const cameraStart: float3 = { x: 0, y: 0 + startOffset, z: 0 };
			const subjectStart: float3 = { x: 0, y: LeaderModelManagerClass.CAMERA_SUBJECT_DISTANCE, z: 0 };
			WorldUI.ForegroundCamera.beginAnimation({ cameraPos: cameraStart, subjectPos: subjectStart }, 0);
			WorldUI.ForegroundCamera.addKeyframe_Translate({ x: 0, y: 0, z: 0 }, 0.1, 0);
			WorldUI.ForegroundCamera.setId(LeaderModelManagerClass.FOREGROUND_CAMERA_IN_ID);
			WorldUI.ForegroundCamera.endAnimation();

			this.leaderCameraOffset = cameraOffset ? cameraOffset : { x: 0, y: 0, z: 0 };
			this.cameraAnimationDelayDuration = delay;
			this.cameraDollyQueued = true;
			window.requestAnimationFrame((timeStamp: DOMHighResTimeStamp) => { this.onUpdate(timeStamp) });
		}
	}

	// ------------------------------------------------------------------------
	startDWCameraAnimations() {
		{ // Trigger the foreground camera to dolly between the leaders
			const startOffset = 0;
			const moveDistance = LeaderModelManagerClass.DECLARE_WAR_DOLLY_DISTANCE;
			const cameraStart: float3 = { x: 0, y: 0 + startOffset, z: 0 };
			const subjectStart: float3 = { x: 0, y: LeaderModelManagerClass.CAMERA_SUBJECT_DISTANCE, z: 0 };

			WorldUI.ForegroundCamera.beginAnimation({ cameraPos: cameraStart, subjectPos: subjectStart, fov: 15 }, 0);
			WorldUI.ForegroundCamera.addKeyframe_Translate({ x: 0, y: moveDistance, z: 1 }, 1.1, 0);
			WorldUI.ForegroundCamera.setId(LeaderModelManagerClass.FOREGROUND_CAMERA_IN_ID);
			WorldUI.ForegroundCamera.endAnimation();
			this.declareWarCameraActive = true;
		}
	}
}

const LeaderModelManager: LeaderModelManagerClass = new LeaderModelManagerClass();
export { LeaderModelManager as default };