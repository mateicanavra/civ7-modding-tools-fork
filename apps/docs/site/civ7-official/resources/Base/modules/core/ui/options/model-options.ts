/**
 * @file model-options.ts
 * @copyright 2020-2023, Firaxis Games
 * @description Data backing for options screen.
 */

import { type OptionInfo } from '/core/ui/options/options-helpers.js';

export type GameCoreOptionCategory = 'sound' | 'graphics' | 'application' | 'network' | 'configuration';

export enum OptionType {
	/**
	 * Editor is a button that opens an editor for the option.
	 */
	Editor,
	Checkbox,
	Dropdown,
	Slider,
	Stepper,
	Switch
}

class OptionsModel {

	/** Backing data and callback for all the options across all the sections.  */
	private Options = new Map<string, OptionInfo>();

	/** Pending options, can be modified and applied externally */
	public graphicsOptions = GraphicsOptions.getCurrentOptions();
	public supportedOptions = GraphicsOptions.getSupportedOptions();

	// Consider removing these counts and tracking separately in each Option instance
	/** Reference count of options that have changed and aren't back to their original value */
	private changeRefCount = 0;

	/** Reference count of options that need a reload and aren't back to their original value */
	public needReloadRefCount = 0;

	/** Reference count of options that need a reload and aren't back to their original value */
	public needRestartRefCount = 0;

	private optionsInitCallbacks?: (() => void)[] = [];

	constructor() {
		engine.whenReady.then(() => {
			const playerProfileChangedListener = () => {

			}
			engine.on('PlayerProfileChanged', playerProfileChangedListener); //TODO: wire this up to something legit. 
			engine.on('GraphicsOptionsChanged', () => {
				this.graphicsOptions = GraphicsOptions.getCurrentOptions();
			})
		})
	}

	get data() {
		return this.Options;
	}

	get supportsGraphicOptions(): boolean {
		return this.supportedOptions.profiles.length != 0;
	}

	get showAdvancedGraphicsOptions(): boolean {
		return this.supportedOptions.canShowAdvancedGraphicsOptions;
	}

	get canUseMetalFx() {
		return this.supportedOptions.canUseMetalFx;
	}
	get showCustomGraphicsProfile(): boolean {
		return this.supportedOptions.canShowCustomGraphicsProfile;
	}

	public incRefCount(): number {
		return this.changeRefCount++;
	}


	public init() {
		this.optionsInitCallbacks?.forEach(callback => callback());
		this.optionsInitCallbacks = undefined;

		this.updateHiddenOptions();
	}
	/**
	 * addInitCallback adds a callback to be executed when the options are initialized.
	 * 
	 * an init callback is a function that adds options to the model (i.e., calls addOption)
	 */
	public addInitCallback(callback: () => void) {
		if (!this.optionsInitCallbacks) {
			throw new Error("Options already initialized, cannot add init callback");
		}

		this.optionsInitCallbacks.push(callback);
	}

	/**
	 * addOption is the main method for adding a new option to Civilization.
	 */
	public addOption(info: OptionInfo) {
		switch (info.type) {
			case OptionType.Stepper:
				info.currentValue ??= 0;
				info.min ??= 0;
				info.max ??= 100;
				break;

			case OptionType.Dropdown:
				// nothing here yet
				break;

			case OptionType.Checkbox:
				info.currentValue ??= false;
				break;

			case OptionType.Slider:
				info.min ??= 0;
				info.max ??= 1;
				info.steps ??= 0;
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
	public saveCheckpoints() {
		Configuration.getUser().saveCheckpoint();
		Sound.volumeSetCheckpoint();
	}

	/**
	 * commitOptions saves all categories to disk
	 */
	public commitOptions(category?: GameCoreOptionCategory) {
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
	public resetOptionsToDefault() {
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
	public restore(category?: GameCoreOptionCategory) {
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

	public hasChanges() {
		return this.changeRefCount > 0;
	}

	/**
	 * Check if the changed options will cause the UI to reload.
	 * @returns true if applying the options changes will reload the UI, false otherwise
	 */
	public isUIReloadRequired() {
		return this.needReloadRefCount > 0;
	}

	/**
	 * Check if the pending options require a restart.
	 * @returns true if applying the pending options will require a restart, false otherwise
	 */
	public isRestartRequired() {
		if (this.needRestartRefCount > 0) return true;

		// Show popup only if settings are actually different, they could have been changed back
		const currentOptions = GraphicsOptions.getCurrentOptions();
		return (this.graphicsOptions.deviceID != currentOptions.deviceID || this.graphicsOptions.hdr != currentOptions.hdr);
	}

	private updateHiddenOptions() {
		let crossplayOption = this.Options.get("option-crossplay");
		if (crossplayOption != undefined) {
			crossplayOption.isHidden = !Network.hasCrossPlayPrivilege();
		}
	}
}

export const Options = new OptionsModel();

export { Options as default };
