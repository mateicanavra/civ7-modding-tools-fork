/**
 * @file model-options.ts
 * @copyright 2020-2023, Firaxis Games
 * @description Data backing for options screen.
 */
export var OptionType;
(function (OptionType) {
    /**
     * Editor is a button that opens an editor for the option.
     */
    OptionType[OptionType["Editor"] = 0] = "Editor";
    OptionType[OptionType["Checkbox"] = 1] = "Checkbox";
    OptionType[OptionType["Dropdown"] = 2] = "Dropdown";
    OptionType[OptionType["Slider"] = 3] = "Slider";
    OptionType[OptionType["Stepper"] = 4] = "Stepper";
    OptionType[OptionType["Switch"] = 5] = "Switch";
})(OptionType || (OptionType = {}));
class OptionsModel {
    constructor() {
        /** Backing data and callback for all the options across all the sections.  */
        this.Options = new Map();
        /** Pending options, can be modified and applied externally */
        this.graphicsOptions = GraphicsOptions.getCurrentOptions();
        this.supportedOptions = GraphicsOptions.getSupportedOptions();
        // Consider removing these counts and tracking separately in each Option instance
        /** Reference count of options that have changed and aren't back to their original value */
        this.changeRefCount = 0;
        /** Reference count of options that need a reload and aren't back to their original value */
        this.needReloadRefCount = 0;
        /** Reference count of options that need a reload and aren't back to their original value */
        this.needRestartRefCount = 0;
        this.optionsInitCallbacks = [];
        engine.whenReady.then(() => {
            const playerProfileChangedListener = () => {
            };
            engine.on('PlayerProfileChanged', playerProfileChangedListener); //TODO: wire this up to something legit. 
            engine.on('GraphicsOptionsChanged', () => {
                this.graphicsOptions = GraphicsOptions.getCurrentOptions();
            });
        });
    }
    get data() {
        return this.Options;
    }
    get supportsGraphicOptions() {
        return this.supportedOptions.profiles.length != 0;
    }
    get showAdvancedGraphicsOptions() {
        return this.supportedOptions.canShowAdvancedGraphicsOptions;
    }
    get canUseMetalFx() {
        return this.supportedOptions.canUseMetalFx;
    }
    get showCustomGraphicsProfile() {
        return this.supportedOptions.canShowCustomGraphicsProfile;
    }
    incRefCount() {
        return this.changeRefCount++;
    }
    init() {
        this.optionsInitCallbacks?.forEach(callback => callback());
        this.optionsInitCallbacks = undefined;
        this.updateHiddenOptions();
    }
    /**
     * addInitCallback adds a callback to be executed when the options are initialized.
     *
     * an init callback is a function that adds options to the model (i.e., calls addOption)
     */
    addInitCallback(callback) {
        if (!this.optionsInitCallbacks) {
            throw new Error("Options already initialized, cannot add init callback");
        }
        this.optionsInitCallbacks.push(callback);
    }
    /**
     * addOption is the main method for adding a new option to Civilization.
     */
    addOption(info) {
        switch (info.type) {
            case OptionType.Stepper:
                info.currentValue ?? (info.currentValue = 0);
                info.min ?? (info.min = 0);
                info.max ?? (info.max = 100);
                break;
            case OptionType.Dropdown:
                // nothing here yet
                break;
            case OptionType.Checkbox:
                info.currentValue ?? (info.currentValue = false);
                break;
            case OptionType.Slider:
                info.min ?? (info.min = 0);
                info.max ?? (info.max = 1);
                info.steps ?? (info.steps = 0);
                break;
            case OptionType.Editor:
                break;
        }
        this.Options.set(info.id, info);
        info.initListener?.(info);
    }
    /**
     * saveCheckpoints creates a checkpoint for sound and configuration options
     */
    saveCheckpoints() {
        Configuration.getUser().saveCheckpoint();
        Sound.volumeSetCheckpoint();
    }
    /**
     * commitOptions saves all categories to disk
     */
    commitOptions(category) {
        switch (category) {
            case 'sound':
                Sound.volumeWriteSettings();
                break;
            case 'graphics':
                GraphicsOptions.applyOptions(this.graphicsOptions);
                break;
            case 'application':
                UI.commitApplicationOptions();
                break;
            case 'network':
                UI.commitNetworkOptions();
                break;
            case 'configuration':
                Configuration.getUser().saveCheckpoint();
                break;
            default:
                Sound.volumeWriteSettings();
                GraphicsOptions.applyOptions(this.graphicsOptions);
                UI.commitApplicationOptions();
                UI.commitNetworkOptions();
                Configuration.getUser().saveCheckpoint();
        }
        // if we're in game, live update
        if (UI.isInGame()) {
            if (this.isUIReloadRequired()) {
                UI.refreshPlayerColors();
                UI.reloadUI();
            }
        }
        this.changeRefCount = 0;
        this.needReloadRefCount = 0;
        this.needRestartRefCount = 0;
    }
    /**
     * default restores most settings to their engine-defined default values.
     */
    resetOptionsToDefault() {
        // TODO when in-game, this function currently has a few issues:
        //  - colorblindness changes only work for some things in-game, requires a reload to apply fully
        //  - graphics options will currently not be reset in-game, it should work when possible:
        //      - texture detail and asset quality require a reload to work properly
        //      - graphics profile can only be changed if it would not modify those two
        //      - certain settings are not set to defaults, like GPU selection and window mode
        UI.defaultApplicationOptions();
        UI.defaultAudioOptions();
        UI.defaultUserOptions();
        UI.defaultTutorialOptions();
        if (!UI.isInGame()) {
            this.graphicsOptions = GraphicsOptions.getDefaultOptions();
            GraphicsOptions.applyOptions(this.graphicsOptions);
        }
        Sound.volumeSetMaster(Sound.volumeGetMaster());
        Sound.volumeSetMusic(Sound.volumeGetMusic());
        Sound.volumeSetSFX(Sound.volumeGetSFX());
        Sound.volumeSetUI(Sound.volumeGetUI());
        Sound.volumeSetCinematics(Sound.volumeGetCinematics());
        Sound.volumeSetVoice(Sound.volumeGetVoice());
        Sound.volumeWriteSettings();
        UI.commitApplicationOptions();
        UI.commitNetworkOptions();
        if (UI.isInGame()) {
            if (this.isUIReloadRequired()) {
                UI.refreshPlayerColors();
                UI.reloadUI();
            }
        }
        this.changeRefCount = 0;
        this.needReloadRefCount = 0;
        this.needRestartRefCount = 0;
    }
    /**
     * restore resets all categories to their on disk values
     */
    restore(category) {
        switch (category) {
            case 'sound':
                Sound.volumeRestoreCheckpoint();
                break;
            case 'graphics':
                this.graphicsOptions = GraphicsOptions.getCurrentOptions();
                break;
            case 'application':
                UI.revertApplicationOptions();
                break;
            case 'network':
                UI.revertNetworkOptions();
                break;
            case 'configuration':
                Configuration.getUser().restoreCheckpoint();
                break;
            default:
                Sound.volumeRestoreCheckpoint();
                UI.revertApplicationOptions();
                UI.revertNetworkOptions();
                Configuration.getUser().restoreCheckpoint();
                this.graphicsOptions = GraphicsOptions.getCurrentOptions();
        }
        this.changeRefCount = 0;
        this.needReloadRefCount = 0;
        this.needRestartRefCount = 0;
        for (const option of this.Options.values()) {
            option.restoreListener?.(option);
            option.initListener?.(option);
        }
    }
    hasChanges() {
        return this.changeRefCount > 0;
    }
    /**
     * Check if the changed options will cause the UI to reload.
     * @returns true if applying the options changes will reload the UI, false otherwise
     */
    isUIReloadRequired() {
        return this.needReloadRefCount > 0;
    }
    /**
     * Check if the pending options require a restart.
     * @returns true if applying the pending options will require a restart, false otherwise
     */
    isRestartRequired() {
        if (this.needRestartRefCount > 0)
            return true;
        // Show popup only if settings are actually different, they could have been changed back
        const currentOptions = GraphicsOptions.getCurrentOptions();
        return (this.graphicsOptions.deviceID != currentOptions.deviceID || this.graphicsOptions.hdr != currentOptions.hdr);
    }
    updateHiddenOptions() {
        let crossplayOption = this.Options.get("option-crossplay");
        if (crossplayOption != undefined) {
            crossplayOption.isHidden = !Network.hasCrossPlayPrivilege();
        }
    }
}
export const Options = new OptionsModel();
export { Options as default };

//# sourceMappingURL=file:///core/ui/options/model-options.js.map
