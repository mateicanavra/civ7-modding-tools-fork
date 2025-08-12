/**
 * @file graphic-narrative-event.ts
 * @copyright 2020-2024, Firaxis Games
 * @description Narrative Event screen
 */
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEventName } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import NarrativePopupManager from '/base-standard/ui/narrative-event/narrative-popup-manager.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
class GraphicNarrativeEvent extends Panel {
    constructor(root) {
        super(root);
        this.closeButtonListener = () => { this.close(UIViewChangeMethod.PlayerInteraction), NarrativePopupManager.closePopup(); };
        this.entryListener = (event) => { this.onActivate(event); };
        this.engineInputListener = (inputEvent) => { this.onEngineInput(inputEvent); };
        this.turnEndListener = () => { this.close(UIViewChangeMethod.Automatic), NarrativePopupManager.closePopup(); };
        this.panelOptions = null;
        this.targetStoryId = null;
        this.previousMode = null;
        this.narrativeSceneModelGroup = null;
        this.iconsPayload = [];
        this.Narrative3DModel = null;
        this.storyIdName = null;
        this.playerAge = "";
        this.playerCivilization = "";
        this.leaderCiv = "";
        this.playerPrimaryColor = 0;
        this.playerSecondaryColor = 0;
        this.enableOpenSound = true;
        this.enableCloseSound = true;
        this.Root.setAttribute("data-audio-group-ref", "journal-quest-popup");
    }
    ;
    getNarrativeGameAssetName(narrative_id) {
        return "NARRATIVE_GAME_ASSET_" + narrative_id;
    }
    getFallbackNarrativeGameAssetName() {
        return "Narrative_Painting_Test_Scene";
    }
    getLighitngGameAssetName() {
        return "LEADER_LIGHTING_SCENE_DEFAULT_LEFT";
    }
    onAttach() {
        super.onAttach();
        const mobileViewExperience = UI.getViewExperience() == UIViewExperience.Mobile;
        this.frame = MustGetElement(".fxs-inner-frame-darker", this.Root);
        const closebutton = document.createElement('fxs-close-button');
        closebutton.addEventListener('action-activate', this.closeButtonListener);
        if (mobileViewExperience) {
            this.frame.appendChild(closebutton);
        }
        else {
            this.Root.appendChild(closebutton);
        }
        this.Root.classList.add("w-full", "h-full", "flex", "justify-center", "pointer-events-auto");
        this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
        engine.on("LocalPlayerTurnEnd", this.turnEndListener);
        this.addElements(); // This is what we want, though it will not do anything
        this.previousMode = InterfaceMode.getCurrent();
        InterfaceMode.switchTo("INTERFACEMODE_CINEMATIC");
        //this.build3DPaintingScene(); // can't do this here, because the narrative story definition data isn't available at this point yet
    }
    onDetach() {
        if (!this.previousMode || (this.previousMode && !InterfaceMode.switchTo(this.previousMode))) {
            InterfaceMode.switchToDefault(); // ... if more context is neeeded, fallback to default mode.
        }
        // Get rid of the model scene
        if (this.narrativeSceneModelGroup) {
            this.narrativeSceneModelGroup.clear();
            this.narrativeSceneModelGroup.destroy();
        }
        engine.off("LocalPlayerTurnEnd", this.turnEndListener);
        this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
        super.onDetach();
    }
    getPanelContent() {
        return this.storyIdName ?? "";
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        NavTray.clear();
        NavTray.addOrUpdateGenericSelect();
        NavTray.addOrUpdateGenericClose();
        const entryContainer = this.Root.querySelector('.narrative_model__button-container');
        if (entryContainer) {
            FocusManager.setFocus(entryContainer);
        }
    }
    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
    }
    /** Handle getting options from the request to open. */
    setPanelOptions(options) {
        this.panelOptions = options;
        this.addElements(); // We don't really want to do this here, but we don't get the options until after the onAttach
        this.build3DPaintingScene();
    }
    build3DPaintingScene() {
        this.narrativeSceneModelGroup = WorldUI.createModelGroup("NarrativePaintingSceneModelGroup");
        let scale = 0.25;
        let yCoordinate = 31.8;
        let xCoordinate = 0;
        if (window.innerHeight <= Layout.pixelsToScreenPixels(768)) {
            yCoordinate = 36;
            scale = 0.38;
        }
        let marker = WorldUI.createFixedMarker({ x: 0, y: 0, z: 0 });
        if (marker != null) {
            this.narrativeSceneModelGroup.addModel(this.getLighitngGameAssetName(), { marker: marker, offset: { x: -30 * scale, y: 6.45 * scale + yCoordinate, z: -14.7 } }, { angle: 0, scale: 1, foreground: true });
            if (this.storyIdName != null) {
                this.Narrative3DModel = this.narrativeSceneModelGroup.addModelAtPos(this.getNarrativeGameAssetName(this.storyIdName), { x: xCoordinate, y: yCoordinate, z: 0 }, { scale: scale, placement: PlacementMode.DEFAULT, foreground: true, initialState: "IDLE", tintColor1: this.playerPrimaryColor, tintColor2: this.playerSecondaryColor, selectionScriptParams: { age: this.playerAge, civilization: this.playerCivilization } });
            }
            if (this.Narrative3DModel == null) {
                this.narrativeSceneModelGroup.addModelAtPos(this.getFallbackNarrativeGameAssetName(), { x: xCoordinate, y: yCoordinate, z: 0 }, { scale: scale, placement: PlacementMode.DEFAULT, foreground: true, initialState: "IDLE", tintColor1: this.playerPrimaryColor, tintColor2: this.playerSecondaryColor, selectionScriptParams: { age: this.playerAge, civilization: this.playerCivilization } });
            }
        }
    }
    addElements() {
        if (!(this.panelOptions && this.panelOptions.notificationId)) {
            return;
        }
        const notification = Game.Notifications.find(this.panelOptions.notificationId);
        if (!notification) {
            return;
        }
        // Get the Player the notification is for (should be the local player)
        const player = Players.get(this.panelOptions.notificationId.owner);
        if (!player) {
            return;
        }
        // Get the player's civ age, and colors for the 3D visuals
        const playerCiv = GameInfo.Civilizations.lookup(player.civilizationType);
        const playerAge = GameInfo.Ages.lookup(Game.age);
        if (playerCiv && playerAge) {
            this.playerCivilization = playerCiv.CivilizationType;
            this.playerAge = playerAge.AgeType;
            this.playerPrimaryColor = UI.Player.getPrimaryColorValueAsHex(player.id);
            this.playerSecondaryColor = UI.Player.getSecondaryColorValueAsHex(player.id);
        }
        const playerStories = player.Stories;
        if (playerStories == undefined) {
            return;
        }
        // The notification is just informs the use that there are one or more narrative events to process.  Get the first one.
        // TODO: Will we want to handle the pending narratives out of order?  Will the system try and not have more than one hit at the same time?
        // There is nothing right now precluding more than one hitting.
        const targetStoryId = playerStories.getFirstPendingMetId();
        if (!targetStoryId) {
            return;
        }
        const story = playerStories.find(targetStoryId);
        if (!story) {
            return;
        }
        this.targetStoryId = targetStoryId;
        const storyDef = GameInfo.NarrativeStories.lookup(story.type);
        if (storyDef) {
            this.storyIdName = storyDef.NarrativeStoryType;
            const titleContainer = this.Root.querySelector('.narrative_model__title-text');
            if (titleContainer && storyDef.StoryTitle) {
                titleContainer.innerHTML = Locale.toUpper(storyDef.StoryTitle);
            }
            const bodyContainer = this.Root.querySelector('.narrative_model__text-container');
            if (bodyContainer) {
                if (storyDef.Completion) {
                    bodyContainer.innerHTML = Locale.stylize(storyDef.Completion);
                }
                else {
                    console.error(`Narrative event does not have a storyDef.Completion.  bodyContainer: '${bodyContainer.innerHTML}'`);
                    bodyContainer.innerHTML = "ERROR: Missing storyDef completion";
                }
            }
            const entryContainer = this.Root.querySelector('.narrative_model__button-container');
            if (entryContainer) {
                // Remove any previous entries
                while (entryContainer.lastChild) {
                    entryContainer.removeChild(entryContainer.lastChild);
                }
                const storyLinks = GameInfo.NarrativeStory_Links.filter(def => def.FromNarrativeStoryType == storyDef.NarrativeStoryType);
                let links = 0;
                if (storyLinks && storyLinks.length > 0) {
                    storyLinks.forEach(link => {
                        const linkDef = GameInfo.NarrativeStories.lookup(link.ToNarrativeStoryType);
                        if (linkDef) {
                            if (linkDef?.Activation.toUpperCase() === "LINKED" || (linkDef?.Activation.toUpperCase() === "LINKED_REQUISITE" && playerStories.determineRequisiteLink(linkDef.NarrativeStoryType))) {
                                links = links + 1;
                                const icons = GameInfo.NarrativeRewardIcons.filter(item => {
                                    return item.NarrativeStoryType === link.ToNarrativeStoryType;
                                });
                                const toLinkDef = GameInfo.NarrativeStories.lookup(linkDef.NarrativeStoryType);
                                var action = playerStories.determineNarrativeInjection(targetStoryId, toLinkDef?.$hash ?? -1, StoryTextTypes.IMPERATIVE);
                                var reward = playerStories.determineNarrativeInjection(targetStoryId, toLinkDef?.$hash ?? -1, StoryTextTypes.REWARD);
                                const canAfford = (linkDef?.Cost === 0 || playerStories.canAfford(linkDef.NarrativeStoryType));
                                this.addEntry(entryContainer, Locale.stylize(playerStories.determineNarrativeInjection(targetStoryId, toLinkDef?.$hash ?? -1, StoryTextTypes.OPTION)), Locale.stylize(reward), Locale.stylize(action), link.ToNarrativeStoryType, icons, canAfford);
                            }
                        }
                    });
                }
                if (links == 0) {
                    // No links.  We will add a 'close' entry, that will allow the player to then send back that they acknowlege the end of the story-line.
                    this.addEntry(entryContainer, Locale.stylize("LOC_NARRATIVE_STORY_END_STORY_NAME"), Locale.stylize(playerStories.determineNarrativeInjectionComponentId(targetStoryId, StoryTextTypes.REWARD)), "", "CLOSE", this.iconsPayload, true);
                }
            }
        }
    }
    addEntry(container, descriptiveText, reward, action, key, icons, canAfford) {
        ///==================================REWARD BUTTON DIAGRAM================================+
        //																						  +
        //                                 ON HOVER TOOLTIP --- REWARD                            +
        //                                                                                        +
        //          +********************************************************************         +
        //  QUEST   +                +                                                  *         +
        //  ICON    +     REWARD     +          MAIN (DESCRIPTIVE) TEXT                 *         +
        //  HERE    +     ICONS      +                                                  *         +
        //          *                + **************************************************         +
        //          *                +          ACTION TEXT (OPTIONAL)                  *         +
        //          *+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*         +
        //                                                                                        +
        //  'leaderCiv' INDICATES IF AN OPTION IS AVAILABLE BECAUSE OF YOUR CIV/LEADER CHOICE     +
        //========================================================================================+
        // item elements
        const buttonFXS = document.createElement("fxs-reward-button");
        buttonFXS.addEventListener('action-activate', this.entryListener);
        buttonFXS.setAttribute("narrative-choice-key", key);
        buttonFXS.setAttribute("tabindex", "-1");
        buttonFXS.setAttribute("main-text", descriptiveText);
        buttonFXS.setAttribute("reward", reward);
        buttonFXS.setAttribute("action-text", action);
        buttonFXS.setAttribute('leader-civ', this.leaderCiv);
        buttonFXS.setAttribute("icons", JSON.stringify(icons));
        buttonFXS.setAttribute("story-type", "3DPANEL");
        buttonFXS.setAttribute("data-audio-group-ref", "small-narrative-event");
        if (!canAfford) {
            buttonFXS.classList.add("opacity-50");
        }
        container.appendChild(buttonFXS);
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
            this.close(UIViewChangeMethod.PlayerInteraction);
            NarrativePopupManager.closePopup();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    onActivate(event) {
        if (event.currentTarget instanceof HTMLElement) {
            if (event.currentTarget.classList.contains("fxs-reward-button")) {
                const answerKey = event.currentTarget.getAttribute("narrative-choice-key");
                if (answerKey) {
                    const args = {
                        TargetType: answerKey,
                        Target: this.targetStoryId,
                        Action: PlayerOperationParameters.Activate
                    };
                    const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.CHOOSE_NARRATIVE_STORY_DIRECTION, args, false);
                    if (result.Success) {
                        Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.CHOOSE_NARRATIVE_STORY_DIRECTION, args);
                        // Just close the popup.  The operation, if successfully applied, will clear the notification.
                        NarrativePopupManager.closePopup();
                        this.close(UIViewChangeMethod.PlayerInteraction);
                    }
                }
            }
        }
    }
}
Controls.define('graphic-narrative-event', {
    createInstance: GraphicNarrativeEvent,
    description: 'Graphic Narrative Event screen.',
    classNames: ['graphic-narrative-event'],
    styles: ['fs://game/base-standard/ui/narrative-event/graphic-narrative-event.css'],
    content: ['fs://game/base-standard/ui/narrative-event/graphic-narrative-event.html'],
});

//# sourceMappingURL=file:///base-standard/ui/narrative-event/graphic-narrative-event.js.map
