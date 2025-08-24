/**
 * @file editor-language-select.ts
 * @copyright Firaxis Games, 2023
 * @description language select options subscreen component definition
 */

import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js'
import { FxsButton } from '/core/ui/components/fxs-button.js'
import { FxsCloseButton } from '/core/ui/components/fxs-close-button.js'
import { RadioButtonChangeEvent } from '/core/ui/components/fxs-radio-button.js'
import { CategoryData, CategoryType, ShowReloadUIPrompt, ShowRestartGamePrompt } from '/core/ui/options/options-helpers.js'
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js'
import { Options } from '/core/ui/options/model-options.js'
import ContextManager from '/core/ui/context-manager/context-manager.js'
import FocusManager from '/core/ui/input/focus-manager.js'
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js'
import Panel from '/core/ui/panel-support.js'
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js'

/**
 * EditorLanguageSelect supports configuring the language options of Civilization.
 * 
 * Set the `editor-commit-on-apply` attribute to `true` to commit the changes when the user clicks the apply button.
 */
class EditorLanguageSelect extends Panel {

	displayList!: HTMLDivElement;
	audioList!: HTMLDivElement;
	acceptBtn!: ComponentRoot<FxsButton>;
	cancelBtn!: ComponentRoot<FxsButton>;
	closeBtn!: ComponentRoot<FxsCloseButton>;
	mainSlot!: Element;

	/**
	 * currentAudioIdx is the index of the audio language option that was selected when the screen was opened.
	 */
	readonly currentAudioIdx = Locale.getCurrentAudioLanguageOption();

	/**
	 * currentDisplayIdx is the index of the display language option that was selected when the screen was opened.
	 */
	readonly currentDisplayIdx = Locale.getCurrentDisplayLanguageOption();

	selectedAudioIdx = this.currentAudioIdx;
	selectedDisplayIdx = this.currentDisplayIdx;

	get didChangeLanguage() {
		return this.selectedAudioIdx !== this.currentAudioIdx || this.selectedDisplayIdx !== this.currentDisplayIdx;
	}

	private commitOnApply = this.Root.getAttribute('editor-commit-on-apply') === 'true';

	private engineInputListener = this.onEngineInput.bind(this);


	onInitialize() {
		this.render();
		super.onInitialize();
		this.Root.classList.add("absolute");
	}

	onAttach() {
		super.onAttach();

		this.acceptBtn.addEventListener('action-activate', this.onAcceptChanges);
		this.cancelBtn.addEventListener('action-activate', this.onCancelChanges);
		this.closeBtn.addEventListener('action-activate', this.onCancelChanges);
		this.displayList.addEventListener('component-value-changed', this.onDisplayLanguageChange);
		this.audioList.addEventListener('component-value-changed', this.onAudioLanguageChange);

		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
	}

	onDetach() {
		this.acceptBtn.removeEventListener('action-activate', this.onAcceptChanges);
		this.cancelBtn.removeEventListener('action-activate', this.onCancelChanges);
		this.closeBtn.removeEventListener('action-activate', this.onCancelChanges);
		this.displayList.removeEventListener('component-value-changed', this.onDisplayLanguageChange);
		this.audioList.removeEventListener('component-value-changed', this.onAudioLanguageChange);

		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);

		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		FocusManager.setFocus(this.mainSlot);

		NavTray.addOrUpdateGenericCancel();
		NavTray.addOrUpdateSysMenu('LOC_GENERIC_ACCEPT');
	}

	private onEngineInput(event: InputEngineEvent) {
		if (event.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		let live = true;

		switch (event.detail.name) {
			case 'cancel':
				this.close();
				live = false;
				break;
			case 'sys-menu':
				this.applyChanges();
				live = false;
				break;
		}

		if (!live) {
			event.stopPropagation();
			event.preventDefault();
		}
	}

	private onAudioLanguageChange = (event: RadioButtonChangeEvent) => {
		if (event.detail.isChecked) {
			this.selectedAudioIdx = parseInt(event.detail.value);
		}
	}

	private onDisplayLanguageChange = (event: RadioButtonChangeEvent) => {
		if (event.detail.isChecked) {
			this.selectedDisplayIdx = parseInt(event.detail.value);
		}
	}

	private onAcceptChanges = (_event: ActionActivateEvent) => {
		this.applyChanges();
	}

	private applyChanges() {
		const audioResult = Locale.changeAudioLanguageOption(this.selectedAudioIdx);
		const displayResult = Locale.changeDisplayLanguageOption(this.selectedDisplayIdx);
		const didChangeLanguage = this.selectedAudioIdx !== this.currentAudioIdx || this.selectedDisplayIdx !== this.currentDisplayIdx;

		let action = LanguageChangeFollowupAction.NoAction;
		switch (true) {
			case (audioResult === LanguageChangeFollowupAction.RestartGame
				|| displayResult === LanguageChangeFollowupAction.RestartGame)
				&& didChangeLanguage:
				action = LanguageChangeFollowupAction.RestartGame;
				break;

			case (audioResult === LanguageChangeFollowupAction.ReloadUI
				|| displayResult === LanguageChangeFollowupAction.ReloadUI)
				&& didChangeLanguage:
				action = LanguageChangeFollowupAction.ReloadUI;
				break;
			default:
				action = LanguageChangeFollowupAction.NoAction;
		}

		const closeCallback = () => ContextManager.pop(this.Root);
		switch (action) {
			case LanguageChangeFollowupAction.NoAction:
				closeCallback();
				break;
			case LanguageChangeFollowupAction.RestartGame:
				if (this.commitOnApply) {
					UI.commitApplicationOptions();
					ShowRestartGamePrompt(closeCallback);
				} else {
					Options.needRestartRefCount += 1;
					closeCallback();
				}
				break;
			case LanguageChangeFollowupAction.ReloadUI:
				if (this.commitOnApply) {
					UI.commitApplicationOptions();
					ShowReloadUIPrompt(closeCallback);
				} else {
					Options.needReloadRefCount += 1;
					closeCallback();
				}
				break;
		}
	}

	private onCancelChanges = (_event: ActionActivateEvent) => {
		this.close();
	}

	private renderLanguageOption(language: string, index: number, selected: boolean, group: 'display' | 'audio') {
		const wrapper = document.createElement('div');
		wrapper.classList.add('flex', 'flex-col');

		const option = document.createElement('div');
		option.className = 'flex flex-row items-center justify-between'
		wrapper.appendChild(option);

		const optionLabel = document.createElement('div');
		optionLabel.className = 'flex mr-4 font-body text-base'
		optionLabel.setAttribute('data-l10n-id', language);
		option.appendChild(optionLabel);

		const optionRadio = document.createElement('fxs-radio-button');
		optionRadio.setAttribute("data-audio-group-ref", "options");
		optionRadio.setAttribute("data-audio-activate-ref", "data-audio-language-radiobutton");
		optionRadio.setAttribute('value', index.toString());
		optionRadio.setAttribute('selected', selected.toString());
		optionRadio.setAttribute('group-tag', group);
		optionRadio.setAttribute('tabindex', '-1');
		option.appendChild(optionRadio);

		return wrapper;
	}

	private render() {
		const audioLanguages = Locale.getAudioLanguageOptionNames();
		const displayLanguages = Locale.getDisplayLanguageOptionNames();
		const currentAudioLanguage = audioLanguages[this.currentAudioIdx];
		const currentDisplayLanguage = displayLanguages[this.currentDisplayIdx];

		this.Root.innerHTML = `
			<fxs-frame title="LOC_OPTIONS_LANGUAGE" subtitle="${CategoryData[CategoryType.Interface].title}">
				<fxs-hslot class="flex flex-row flex-auto mb-6 justify-center px-6 editor-language-select__section-container">
					<div class="flex flex-col flex-auto pr-14 ml-8">
						<div class="flex flex-row font-title mb-6 justify-center">
							<p class="flex font-title text-lg" data-l10n-id="LOC_OPTIONS_LANGUAGE_DISPLAY"></p>
							&nbsp;
							<p class="flex font-title text-lg" data-l10n-id="${currentDisplayLanguage}"></p>
						</div>
						<fxs-scrollable>
							<fxs-vslot class="pl-2 pr-6" language-list="display"></fxs-vslot>
						</fxs-scrollable>
					</div>
					<div class="flex flex-col flex-auto pr-14 ml-8">
						<div class="flex flex-row font-title mb-6 justify-center">
							<p class="flex font-title text-lg" data-l10n-id="LOC_OPTIONS_LANGUAGE_AUDIO"></p>
							&nbsp;
							<p class="flex font-title text-lg" data-l10n-id="${currentAudioLanguage}"></p>
						</div>
						<fxs-scrollable>
							<fxs-vslot class="pl-2 pr-6" language-list="audio"></fxs-vslot>
						</fxs-scrollable>
					</div>
				</fxs-hslot>
				<fxs-button-group class="mt-4" data-bind-if="!{{g_NavTray.isTrayRequired}}">
					<fxs-button id="editor-language-select__accept-button" caption="LOC_OPTIONS_ACCEPT" data-audio-group-ref="options" data-audio-activate="options-language-accept"></fxs-button>
					<fxs-button id="editor-language-select__cancel-button" caption="LOC_OPTIONS_CANCEL" data-audio-group-ref="options" data-audio-activate="options-language-cancel"></fxs-button>
				</fxs-button-group>
				<fxs-close-button></fxs-close-button>
			</fxs-frame>
		`;

		this.displayList = MustGetElement('[language-list="display"]', this.Root);
		this.audioList = MustGetElement('[language-list="audio"]', this.Root);
		this.acceptBtn = MustGetElement('#editor-language-select__accept-button', this.Root);
		this.cancelBtn = MustGetElement('#editor-language-select__cancel-button', this.Root);
		this.mainSlot = MustGetElement('.editor-language-select__section-container', this.Root);
		this.closeBtn = MustGetElement('fxs-close-button', this.Root);

		for (const [index, language] of displayLanguages.entries()) {
			const option = this.renderLanguageOption(language, index, index === this.selectedDisplayIdx, 'display');
			this.displayList.appendChild(option);
		}

		for (const [index, language] of audioLanguages.entries()) {
			const option = this.renderLanguageOption(language, index, index === this.selectedAudioIdx, 'audio');
			this.audioList.appendChild(option);
		}
	}
}

const EditorLanguageSelectTagName = 'editor-language-select';
Controls.define(EditorLanguageSelectTagName, {
	createInstance: EditorLanguageSelect,
	attributes: [
		{ name: 'title' },
		{ name: 'subtitle' }
	]
});

declare global {
	interface HTMLElementTagNameMap {
		[EditorLanguageSelectTagName]: ComponentRoot<EditorLanguageSelect>;
	}
}