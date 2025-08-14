/**
 * @file Leader Select Model Manager
 * @copyright 2022, Firaxis Games
 * @description Handles 3D models and animations for leader selection screen
 */
class LeaderSelectModelManagerClass {
    get isRandomLeader() {
        return this._isRandomLeader;
    }
    constructor() {
        this.leaderSelectModelGroup = null;
        this.leader3DModel = null;
        this.leaderPedestalModelGroup = null;
        this.pedestal3DModel = null;
        this.currentLeaderAssetName = "";
        this.currentLeaderAnimationState = "";
        this.isLeaderCameraActive = false;
        this.leader3dMarker = null;
        this.sequenceStartTime = 0;
        this.isVoPlaying = false;
        this.SEQUENCE_DEBOUNCE_DURATION = 100; // 0.1 seconds
        // This flag is used when an animation is started so that we know to ignore that animation change trigger 
        this.leaderAnimationJustStarted = false;
        // This flag is used to indicate that the Charatcer selection sequence is active for the selected leader
        this.selectedLeaderActive = false;
        this.leaderSequenceStepID = 0;
        this._isRandomLeader = true;
        if (LeaderSelectModelManagerClass.instance) {
            console.error("Only one instance of the leader select model manager class exist at a time, second attempt to create one.");
        }
        LeaderSelectModelManagerClass.instance = this;
        this.leaderSelectModelGroup = WorldUI.createModelGroup("leaderModelGroup");
        this.leaderPedestalModelGroup = WorldUI.createModelGroup("leaderPedestalGroup");
        engine.on('ModelTrigger', (id, hash) => { this.handleTriggerCallback(id, hash); });
    }
    setGrayscaleFilter() {
        WorldUI.popFilter();
        WorldUI.pushGlobalColorFilter({ saturation: 0 });
    }
    clearFilter() {
        WorldUI.popFilter();
    }
    getLeaderAssetName(leader_id) {
        return leader_id + "_GAME_ASSET";
    }
    getFallbackAssetName() {
        return "LEADER_FALLBACK_GAME_ASSET";
    }
    activateLeaderSelectCamera() {
        if (this.isLeaderCameraActive) {
            Camera.popCamera();
        }
        Camera.pushCamera(LeaderSelectModelManagerClass.DEFAULT_CAMERA_POSITION, { x: LeaderSelectModelManagerClass.DEFAULT_CAMERA_TARGET.x, y: LeaderSelectModelManagerClass.DEFAULT_CAMERA_TARGET.y, z: LeaderSelectModelManagerClass.DEFAULT_CAMERA_TARGET.z });
        if (this.currentLeaderAnimationState != "IDLE_CharSelect") {
            this.playLeaderAnimation("IDLE_CharSelect");
        }
        if (this.leaderPedestalModelGroup && this.pedestal3DModel == null) {
            this.pedestal3DModel = this.leaderPedestalModelGroup.addModelAtPos("LEADER_SELECTION_PEDESTAL", { x: 0, y: 0, z: -0.05 }, { angle: 120, scale: 0.9 });
        }
        this.isLeaderCameraActive = true;
    }
    deactivateLeaderSelectCamera() {
        if (this.isLeaderCameraActive) {
            Camera.popCamera();
            this.isLeaderCameraActive = false;
        }
    }
    showLeaderModels(leaderId) {
        this.isVoPlaying = false;
        this.activateLeaderSelectCamera();
        if (leaderId == "" || this.currentLeaderAssetName == leaderId) {
            return;
        }
        this.leader3dMarker = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });
        this.currentLeaderAssetName = leaderId;
        this.leaderSelectModelGroup?.clear();
        this.leader3DModel = null;
        this._isRandomLeader = leaderId == "RANDOM";
        if (this.leaderSelectModelGroup) {
            this.leaderSelectModelGroup.addModelAtPos("LEADER_LIGHTING_SCENE_CHAR_SELECT_GAME_ASSET", { x: 0, y: 0, z: 0 }, { angle: 0 });
        }
        if (this.leaderPedestalModelGroup && this.pedestal3DModel == null) {
            this.pedestal3DModel = this.leaderPedestalModelGroup.addModelAtPos("LEADER_SELECTION_PEDESTAL", { x: 0, y: 0, z: -0.05 }, { angle: 120, scale: 0.9 });
        }
        if (this.leaderSelectModelGroup && this.leader3dMarker != null) {
            if (this._isRandomLeader) {
                this.leader3DModel = this.leaderSelectModelGroup.addModel("LEADER_RANDOM_GAME_ASSET", { marker: this.leader3dMarker, offset: { x: 0, y: 0, z: 0 } }, { angle: 0, triggerCallbacks: true });
            }
            else {
                this.leader3DModel = this.leaderSelectModelGroup.addModel(this.getLeaderAssetName(this.currentLeaderAssetName), { marker: this.leader3dMarker, offset: { x: 0, y: 0, z: 0 } }, { angle: 0, triggerCallbacks: true });
                if (this.leader3DModel == null) {
                    this.leader3DModel = this.leaderSelectModelGroup.addModel(this.getFallbackAssetName(), { marker: this.leader3dMarker, offset: { x: 0, y: 0, z: 0 } }, { angle: 0, triggerCallbacks: true });
                }
            }
        }
        this.playLeaderAnimation("IDLE_CharSelect");
    }
    zoomInLeader() {
        this.deactivateLeaderSelectCamera();
        Camera.pushCamera(LeaderSelectModelManagerClass.VO_CAMERA_CHOOSER_POSITION, LeaderSelectModelManagerClass.VO_CAMERA_CHOOSER_TARGET);
    }
    zoomOutLeader() {
        this.activateLeaderSelectCamera();
    }
    pickLeader() {
        const isMobileViewExperience = UI.getViewExperience() == UIViewExperience.Mobile;
        if (this.isVoPlaying && ((performance.now() - this.sequenceStartTime) < this.SEQUENCE_DEBOUNCE_DURATION)) {
            console.warn("Leader Model Manager: The leader picked sequence was triggered immediately after it was already triggered. requests to trigger it within the debounce duration will be ignored");
            return;
        }
        this.sequenceStartTime = performance.now();
        this.leaderSelectModelGroup?.clear();
        this.leaderPedestalModelGroup?.clear();
        this.leader3DModel = null;
        if (this.leaderSelectModelGroup) {
            this.leaderSelectModelGroup.addModelAtPos("LEADER_LIGHTING_SCENE_CHAR_SELECT_GAME_ASSET", { x: 0, y: 0, z: 0 }, { angle: 0 });
        }
        if (this.leaderPedestalModelGroup) {
            this.leaderPedestalModelGroup.addModelAtPos("LEADER_SELECTION_PEDESTAL", { x: 0, y: 0, z: -0.5 }, { angle: 0, scale: 0.01 }); // Spawn the pedestal but make it really small so that it stays loaded but doesn't contribute to the shadow bounds
            this.pedestal3DModel = null;
        }
        if (!isMobileViewExperience) {
            this.zoomInLeader();
        }
        if (this._isRandomLeader || this.currentLeaderAssetName == "") {
            if (this.leaderSelectModelGroup) {
                this.leader3DModel = this.leaderSelectModelGroup.addModelAtPos("LEADER_RANDOM_GAME_ASSET", { x: 0, y: 0, z: 0 }, { angle: 0, triggerCallbacks: true });
                return;
            }
        }
        if (this.leaderSelectModelGroup) {
            this.leader3DModel = this.leaderSelectModelGroup.addModelAtPos(this.getLeaderAssetName(this.currentLeaderAssetName), { x: 0, y: 0, z: 0 }, { angle: 0, triggerCallbacks: true });
            if (this.leader3DModel == null) {
                this.leader3DModel = this.leaderSelectModelGroup.addModelAtPos(this.getFallbackAssetName(), { x: 0, y: 0, z: 0 }, { angle: 0, triggerCallbacks: true });
            }
        }
        // Indicate that the first animation callback needs to be ignored
        this.leaderAnimationJustStarted = true;
        this.beginLeaderSelectedSequence();
    }
    clearLeaderModels() {
        this.leaderSelectModelGroup?.clear();
        this.leaderPedestalModelGroup?.clear();
        this.pedestal3DModel = null;
        this.leader3DModel = null;
        this.leaderAnimationJustStarted = false;
        this.leaderSequenceStepID = 0;
        this.currentLeaderAssetName = "";
        this.isVoPlaying = false;
        this.deactivateLeaderSelectCamera();
    }
    // This function does all the interpreting of any animation triggers that come in and uses them to advance whatever sequences are relying on them
    handleTriggerCallback(id, hash) {
        // We only care about triggers produced by an animation ending or an artist set SEQUENCE trigger
        if (hash != LeaderSelectModelManagerClass.TRIGGER_HASH_SEQUENCE_TRIGGER && hash != LeaderSelectModelManagerClass.TRIGGER_HASH_ANIMATION_STATE_END) {
            return;
        }
        // Ignore the animation state change trigger if the animation only just changed into this new animation
        if (this.leaderAnimationJustStarted) {
            this.sequenceStartTime = performance.now();
            this.leaderAnimationJustStarted = false;
            return;
        }
        // Ignore triggers within the debounce period
        if ((performance.now() - this.sequenceStartTime) < this.SEQUENCE_DEBOUNCE_DURATION) {
            return;
        }
        if (this.selectedLeaderActive) {
            this.advanceLeaderSelectedSequence(id, hash);
        }
    }
    // Use this function to play a leader's animation instead of setting the state directly
    playLeaderAnimation(stateName) {
        if (this.leader3DModel == null) {
            return;
        }
        this.leader3DModel.setState(stateName);
        this.currentLeaderAnimationState = stateName;
        this.leaderAnimationJustStarted = true;
    }
    // First meet sequence
    beginLeaderSelectedSequence() {
        this.playLeaderAnimation("VO_CharSelect");
        this.isVoPlaying = true;
        this.selectedLeaderActive = true;
        this.leaderSequenceStepID = 1;
    }
    advanceLeaderSelectedSequence(id, hash) {
        if (hash == LeaderSelectModelManagerClass.TRIGGER_HASH_ANIMATION_STATE_END && id == this.leader3DModel?.id && this.leaderSequenceStepID == 1) {
            this.playLeaderAnimation("IDLE_CharSelect");
            this.leaderSequenceStepID = 0;
            this.isVoPlaying = false;
        }
    }
}
LeaderSelectModelManagerClass.instance = null;
LeaderSelectModelManagerClass.DEFAULT_CAMERA_POSITION = { x: 0, y: -40, z: 11 };
LeaderSelectModelManagerClass.DEFAULT_CAMERA_TARGET = { x: -15, y: 5, z: 10.5 };
LeaderSelectModelManagerClass.VO_CAMERA_CHOOSER_POSITION = { x: -1.834, y: -23.0713, z: 15.2000 };
LeaderSelectModelManagerClass.VO_CAMERA_CHOOSER_TARGET = { x: -2.7588, y: -17.4867, z: 14.8042 };
LeaderSelectModelManagerClass.TRIGGER_HASH_ANIMATION_STATE_END = WorldUI.hash("AnimationStateChange");
LeaderSelectModelManagerClass.TRIGGER_HASH_SEQUENCE_TRIGGER = WorldUI.hash("SEQUENCE");
const LeaderSelectModelManager = new LeaderSelectModelManagerClass();
export { LeaderSelectModelManager as default };

//# sourceMappingURL=file:///core/ui/shell/leader-select/leader-select-model-manager.js.map
