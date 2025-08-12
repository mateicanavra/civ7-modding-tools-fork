/**
 * @file mods-content.ts
 * @copyright 2024, Firaxis Games
 * @description Screen listing the mods with details.
 */

import FocusManager from '/core/ui/input/focus-manager.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import ActionHandler from '/core/ui/input/action-handler.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';

function compareInstalledMods(a: ModHandle[], b: ModHandle[]) {
	if (a.length != b.length) {
		return false;
	}
	else {
		for (let i = 0; i < a.length; ++i) {
			if (a[i] != b[i]) {
				return false;
			}
		}
	}

	return true;
}

export class ModsContent extends Panel {
	private mainSlot!: HTMLElement;
	private modEntries!: NodeListOf<HTMLElement>;
	private modNameHeader!: HTMLElement;
	private modDateText!: HTMLElement;
	private modDescriptionText!: HTMLElement;
	private modDependenciesContent!: HTMLElement;
	private selectedMod: ModInfo | null = null;
	private selectedModIndex: number = 0;
	private selectedModHandle: number | null = null;
	private showNotOwnedContent: boolean = false;

	private onModActivateListener = this.onModActivate.bind(this);
	private onModFocusListener = this.onModFocus.bind(this);
	private focusListener = this.onFocus.bind(this);
	private modToggledActivateListener = this.onModToggled.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);

	private refreshInterval = 0;
	private installedModHandles: ModHandle[] = [];

	constructor(root: ComponentRoot) {
		super(root);
	};

	onInitialize(): void {
		super.onInitialize();

		this.Root.innerHTML = this.getContent();

		this.mainSlot = MustGetElement(".additional-content-mods", this.Root);
		this.modNameHeader = MustGetElement('.selected-mod-name', this.Root);
		this.modDateText = MustGetElement('.mod-date', this.Root);
		this.modDescriptionText = MustGetElement('.mod-description', this.Root);
		this.modDependenciesContent = MustGetElement('.mod-dependencies', this.Root);

		this.installedModHandles = Modding.getInstalledModHandles();
		this.renderModListContent();

		this.modEntries = this.Root.querySelectorAll(".mod-entry");
	}

	getContent() {
		return `
			<fxs-slot id="mods" class="additional-content-mods flex-auto relative flex flex-col items-stretch">
				<div class="no-mods-available w-full flex justify-center items-center flex-auto text-lg hidden" data-l10n-id="LOC_UI_MOD_NONE_AVAILABLE"></div>
				<fxs-hslot class="mods-available w-full justify-start items-stretch flex-auto">
					<fxs-scrollable class="mod-list-scrollable flex-auto w-1\\/2" handle-gamepad-pan="true">
						<fxs-vslot class="mod-list flex mb-8 m-6"></fxs-vslot>
					</fxs-scrollable>
					<fxs-vslot class="w-1\\/2">
						<fxs-scrollable class="mod-details-scrollable flex-auto my-6 ml-6">
							<fxs-header filigree-style="none"
										class="selected-mod-name relative flex justify-center font-title text-2xl uppercase text-secondary mb-3"></fxs-header>
							<p class="mod-description text-lg my-6"></p>
							<fxs-hslot class="justify-between">
								<p class="mod-author relative text-lg w-1\\/2"></p>
								<p class="mod-date relative flex justify-end text-lg w-1\\/2"></p>
							</fxs-hslot>
							<div class="mod-affects-saved-game hidden text-lg"></div>
							<fxs-vslot class="mod-dependencies hidden">
								<fxs-header filigree-style="none"
											class="mod-dependencies-title relative flex font-title text-lg uppercase text-secondary mb-3"
											title="LOC_UI_DEPENDENDENCIES"></fxs-header>
							</fxs-vslot>
						</fxs-scrollable>
						<fxs-hslot class="justify-center items-center" data-bind-class-toggle="hidden:{{g_NavTray.isTrayRequired}}">
							<fxs-button class="toggle-enable" caption="LOC_ADVANCED_OPTIONS_ENABLE"
										tabindex="-1"></fxs-button>
						</fxs-hslot>
					</fxs-vslot>
				</fxs-hslot>
			</fxs-slot>
		`
	}

	renderModListContent() {
		const modList = MustGetElement('.mod-list', this.Root);
		const modsContent = MustGetElement('.mods-available', this.Root);
		const modsContentEmpty = MustGetElement('.no-mods-available', this.Root);

		// Clear the list. It will be rebuilt when we toggle a mod
		while (modList.lastChild) {
			modList.lastChild.removeEventListener('action-activate', this.onModActivateListener);
			modList.lastChild.removeEventListener('focus', this.onModFocusListener);
			modList.removeChild(modList.lastChild);
		}

		let installedMods = Modding.getInstalledMods();

		if (!this.showNotOwnedContent) {
			// Filter out the content that you do not not owned
			installedMods = installedMods.filter(m => !m.official || m.allowance == ModAllowance.Full);
		}

		// Filter out mods that should not be shown in the browser.
		installedMods = installedMods.filter(m => {
			const showInBrowser = Modding.getModProperty(m.handle, "ShowInBrowser");
			return showInBrowser != "0";
		});

		// Sort mods alphabetically.
		installedMods.sort((a, b) => Locale.compare(a.name, b.name));

		const toggleEnableButton = MustGetElement('.toggle-enable', this.Root);
		toggleEnableButton.addEventListener("action-activate", this.modToggledActivateListener);

		// Update Selected Mods handle.
		if (this.selectedModHandle != null) {
			if (installedMods.findIndex(m => m.handle == this.selectedModHandle) == -1) {
				this.selectedModHandle = null;
			}
		}

		modsContent.classList.toggle('hidden', installedMods.length == 0);
		modsContentEmpty.classList.toggle('hidden', installedMods.length > 0);

		// List the Mods
		if (installedMods.length > 0) {
			if (this.selectedModHandle == null) {
				this.selectedModHandle = installedMods[0].handle;
				this.selectedMod = installedMods[0];
			}

			installedMods.forEach((mod, index) => {
				const modActivatable = document.createElement('fxs-activatable');
				modActivatable.classList.add('mod-entry', 'group', 'relative', 'flex', 'w-full', 'grow', 'm-2');
				modActivatable.classList.add(index % 2 === 0 ? '' : 'bg-primary-5');
				modActivatable.setAttribute('tabindex', '-1');
				modActivatable.setAttribute('index', `${index}`)
				modActivatable.setAttribute('mod-handle', mod.handle.toString());
				modActivatable.addEventListener('action-activate', this.onModActivateListener);
				modActivatable.addEventListener('focus', this.onModFocusListener);

				modList.appendChild(modActivatable);

				if (this.selectedModHandle == mod.handle) {
					FocusManager.setFocus(modActivatable);
				}

				const modHoverOverlay = document.createElement('div');
				modHoverOverlay.classList.add('img-mod-hover-overlay', 'absolute', 'inset-0', 'opacity-0',
					"group-hover\\:opacity-100", "group-focus\\:opacity-100", "group-active\\:opacity-100"
				);

				modActivatable.appendChild(modHoverOverlay);

				const modTextContainer = document.createElement('div');
				modTextContainer.classList.add('mod-text-container', 'relative', 'flex', 'pointer-events-none', 'w-full', 'grow', 'p-2');
				modActivatable.appendChild(modTextContainer);

				const prefixModNameWithIcons = true;

				let entry = mod.name;
				if (prefixModNameWithIcons && mod.subscriptionType) {
					switch (mod.subscriptionType) {
						case "CommunityContent":
							entry = `[icon:mod] ${mod.name}`;
							break;
						case "SteamWorkshopContent":
							entry = `[icon:mod-workshop] ${mod.name}`;
							break;
						case "OfficialContent":
						default:
							//entry = `[icon:dlc] ${mod.name}`;
							break;
					}
				}

				const modName = document.createElement('div');
				modName.classList.add('mod-text-name', 'relative', 'flex', 'grow', 'shrink', 'text-lg');
				modName.innerHTML = Locale.stylize(entry);
				modTextContainer.appendChild(modName);

				const modEnabled = document.createElement('div');
				modEnabled.classList.add('mod-text-enabled', 'relative', 'flex', 'justify-end', 'uppercase', 'text-lg', 'font-title');
				modEnabled.setAttribute('data-l10n-id', mod.enabled ? "LOC_UI_ENABLED" : "LOC_UI_DISABLED");

				modTextContainer.appendChild(modEnabled);
			});
		}
	}

	onAttach() {
		super.onAttach();

		this.Root.addEventListener("focus", this.focusListener);
		this.Root.addEventListener("engine-input", this.engineInputListener);

		this.updateDetails();

		if (this.refreshInterval == 0) {
			this.refreshInterval = setInterval(() => {
				const installedMods = Modding.getInstalledModHandles();
				if (!compareInstalledMods(this.installedModHandles, installedMods)) {
					this.installedModHandles = installedMods;
					this.renderModListContent();
				}
			}, 500);
		}
	}

	onDetach(): void {
		super.onDetach();

		this.Root.removeEventListener("focus", this.focusListener);
		this.Root.removeEventListener("engine-input", this.engineInputListener);

		if (this.refreshInterval != 0) {
			clearInterval(this.refreshInterval);
			this.refreshInterval = 0;
		}
	}

	onAttributeChanged(name: string, oldValue: string | null, newValue: string | null) {
		super.onAttributeChanged(name, oldValue, newValue);

		switch (name) {
			case "show-not-owned-content":
				if (newValue) {
					this.showNotOwnedContent = newValue.toLowerCase() === "true";
					this.updateModListContent();
				}
				break;
		}
	}

	updateModListContent() {
		this.renderModListContent();
		this.modEntries = this.Root.querySelectorAll(".mod-entry");
	}

	updateDetails() {
		if (this.selectedModHandle == null || this.selectedMod == null) {
			console.error("screen-extras: showModDetails: Invalid selected mod handle!");
			return;
		}

		this.modNameHeader.setAttribute('title', this.selectedMod.name);

		const authorElement = this.Root.querySelector('.mod-author');
		if (authorElement) {
			if (!this.selectedMod.official) {
				const author = Modding.getModProperty(this.selectedMod.handle, 'Authors');
				if (author) {
					authorElement.textContent = Locale.compose("LOC_UI_MOD_AUTHOR", author);
				}
				else {
					authorElement.textContent = '';
				}
			}
			else {
				authorElement.textContent = '';
			}
		}

		if (this.selectedMod.created) {
			this.modDateText.textContent = Locale.compose("LOC_UI_MOD_DATE", this.selectedMod.created);
		}

		this.modDescriptionText.setAttribute('data-l10n-id', this.selectedMod.description);

		if (this.selectedMod.dependsOn) {
			this.modDependenciesContent.classList.remove('hidden');
			this.selectedMod.dependsOn.forEach(dependecy => {
				const dependencyEntry = document.createElement('div');
				dependencyEntry.classList.add("mod-dependency", "relative");
				dependencyEntry.setAttribute('data-l10n-id', dependecy);
				this.modDependenciesContent.appendChild(dependencyEntry);
			});
		}

		this.determineEnableButtonState();
	}

	private determineEnableButtonState() {
		if (this.selectedModHandle == null || this.selectedMod == null) { return; }
		const toggleEnableButton = MustGetElement('.toggle-enable', this.Root);

		// Get mod info to determine the new enabled state
		const modHandles: number[] = [this.selectedModHandle];

		let allowed = false;
		if (this.selectedMod.enabled) {
			const canDisableModResult = Modding.canDisableMods(modHandles);
			allowed = canDisableModResult.status == 0;
		}
		else {
			const canEnableModResult = Modding.canEnableMods(modHandles, true);
			allowed = canEnableModResult.status == 0;
		}

		toggleEnableButton.setAttribute('disabled', allowed ? 'false' : 'true');
		toggleEnableButton.setAttribute('caption', this.selectedMod.enabled ? "LOC_ADVANCED_OPTIONS_DISABLE" : "LOC_ADVANCED_OPTIONS_ENABLE");
	}

	private onModToggled(event: ActionActivateEvent) {
		if (!(event.target instanceof HTMLElement)) {
			return;
		}

		const attrDisabled = event.target.getAttribute('disabled');
		if (attrDisabled != 'true') {
			this.handleModToggle();
		}
	}

	private handleModToggle() {
		if (this.selectedModHandle == null || this.selectedMod == null) { return; }
		const enabled = this.selectedMod.enabled;
		const modHandles: number[] = [this.selectedModHandle];

		if (enabled) {
			Modding.disableMods(modHandles);
		}
		else {
			Modding.enableMods(modHandles, true);
		}

		// While we rebuild, prevent the player from clicking the toggle enable button
		const toggleEnableButton = MustGetElement('.toggle-enable', this.Root);
		toggleEnableButton.setAttribute('disabled', 'true');

		this.handleSelection(this.selectedModHandle, this.selectedModIndex);
		this.updateModEntry(this.selectedModIndex);
		this.updateNavTray();
	}

	private updateNavTray() {
		NavTray.clear();
		NavTray.addOrUpdateGenericBack();

		if (this.selectedModHandle == null || this.selectedMod == null) { return; }

		const enabled = this.selectedMod.enabled;
		const modHandles: number[] = [this.selectedModHandle];

		if (enabled && Modding.canDisableMods(modHandles).status == 0) {
			NavTray.addOrUpdateAccept("LOC_ADVANCED_OPTIONS_DISABLE");
		}
		else if (!enabled && Modding.canEnableMods(modHandles, true).status == 0) {
			NavTray.addOrUpdateAccept("LOC_ADVANCED_OPTIONS_ENABLE");
		}
	}

	private onFocus() {
		this.resolveFocus();
		this.updateNavTray();
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

		return false;
	}

	private resolveFocus() {
		FocusManager.setFocus(this.mainSlot);
	}

	private onModActivate(event: ActionActivateEvent) {
		if (!(event.target instanceof HTMLElement)) {
			return;
		}

		if (ActionHandler.isGamepadActive) {
			Audio.playSound("data-audio-primary-button-press");
			this.handleModToggle();
		} else {
			this.handleSelection(parseInt(event.target.getAttribute('mod-handle') ?? ""), parseInt(event.target.getAttribute("index") ?? "0"));
		}
	}

	private onModFocus(event: FocusEvent) {
		if (!(event.target instanceof HTMLElement)) {
			return;
		}

		this.handleSelection(parseInt(event.target.getAttribute('mod-handle') ?? ""), parseInt(event.target.getAttribute("index") ?? "0"));

		this.updateNavTray();
	}

	private handleSelection(modHandle: number, index: number) {
		this.selectedModIndex = index;
		this.selectedMod = Modding.getModInfo(modHandle);
		this.selectedModHandle = modHandle

		this.updateDetails();
	}

	private updateModEntry(index: number) {
		const modEnrty = this.modEntries.item(index);
		const modHandleString: string | null = modEnrty.getAttribute('mod-handle');
		if (!modHandleString) {
			return;
		}

		if (this.selectedModHandle == null) { return; }

		const modInfo = Modding.getModInfo(this.selectedModHandle);
		const enabledText = modEnrty.querySelector(".mod-text-enabled");
		if (enabledText) {
			enabledText.setAttribute('data-l10n-id', modInfo.enabled ? "LOC_UI_ENABLED" : "LOC_UI_DISABLED");
		}
	}

}

Controls.define('mods-content', {
	createInstance: ModsContent,
	classNames: ['mods-content'],
	attributes: [
		{
			name: "show-not-owned-content",
			description: "should we show the not owned content (default: false)"
		}
	],
	tabIndex: -1
});
