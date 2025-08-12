
import { ChooserItem } from "/base-standard/ui/chooser-item/chooser-item.js";
import { ChooserNode } from "/base-standard/ui/chooser-item/model-chooser-item.js";
import ActionHandler, { ActiveDeviceTypeChangedEvent, ActiveDeviceTypeChangedEventName } from "/core/ui/input/action-handler.js";
import MPBrowserModel from "/core/ui/shell/mp-browser/model-mp-browser-new.js";
import { MustGetElement } from "/core/ui/utilities/utilities-dom.js";

export const ActionConfirmEventName = "browser-item-action-confirm" as const;
export class ActionConfirmEvent extends CustomEvent<{}> {
	constructor() {
		super('browser-item-action-confirm', { bubbles: true, cancelable: true });
	}
}

export enum SortOptions {
	NONE,
	GAME_NAME,
	RULE_SET,
	MAP_TYPE,
	GAME_SPEED,
	CONTENT,
	PLAYERS,
}

export const mapSortOptionsToFlex = {
	[SortOptions.NONE]: "flex-1",
	[SortOptions.GAME_NAME]: "flex-4",
	[SortOptions.RULE_SET]: "flex-4",
	[SortOptions.MAP_TYPE]: "flex-3",
	[SortOptions.GAME_SPEED]: "flex-3",
	[SortOptions.CONTENT]: "flex-2",
	[SortOptions.PLAYERS]: "flex-2",
}

export interface MPBrowseChooserNode extends ChooserNode {
	gameName: string;
	eventName: string;
	ruleSet: string;
	mapType: string;
	gameSpeed: string;
	disabledContent: ModInfo[];
	mods: ModConfiguration[];
	players: string;
	savedGame: boolean;
	hostingPlatform: HostingType;
	hostFriendID_Native: string;
	hostFriendID_T2GP: string
	hostDisplayName: string;
}

export class MPBrowserChooserItem extends ChooserItem {
	public get mpBrowserChooserNode(): MPBrowseChooserNode | null {
		return this._chooserNode as MPBrowseChooserNode;
	}

	public set mpBrowserChooserNode(value: MPBrowseChooserNode | null) {
		this._chooserNode = value;
	}

	private gameName!: HTMLElement;
	private event!: HTMLElement;
	private ruleSet!: HTMLElement;
	private mapType!: HTMLElement;
	private gameSpeed!: HTMLElement;
	private gamepadTooltip!: HTMLElement;
	private dlcs!: HTMLElement;
	private mods!: HTMLElement;
	private players!: HTMLElement;
	private crossplay!: HTMLElement;
	private background!: HTMLElement;

	private handleDoubleClick = this.onDoubleClick.bind(this);
	private handleFocusIn = this.onFocusIn.bind(this);
	private handleActiveDeviceChange = this.onActiveDeviceChange.bind(this);

	onInitialize() {
		super.onInitialize();
	}

	onAttach() {
		super.onAttach();

		this.gameName = MustGetElement(".mp-browser-chooser__gameName", this.Root);
		this.event = MustGetElement(".mp-browser-chooser__event", this.Root);
		this.ruleSet = MustGetElement(".mp-browser-chooser__ruleSet", this.Root);
		this.mapType = MustGetElement(".mp-browser-chooser__mapType", this.Root);
		this.gameSpeed = MustGetElement(".mp-browser-chooser__gameSpeed", this.Root);
		this.gamepadTooltip = MustGetElement(".mp-browser-chooser__gamepad-toolip", this.Root);
		this.dlcs = MustGetElement(".mp-browser-chooser__dlcs", this.Root);
		this.mods = MustGetElement(".mp-browser-chooser__mods", this.Root);
		this.players = MustGetElement(".mp-browser-chooser__players", this.Root);
		this.crossplay = MustGetElement(".mp-browser-chooser__crossplay", this.Root);
		this.background = MustGetElement(".hud_sidepanel_list-bg", this.Root);

		this.Root.ondblclick = this.handleDoubleClick;
		this.Root.addEventListener("focusin", this.handleFocusIn);
		window.addEventListener(ActiveDeviceTypeChangedEventName, this.handleActiveDeviceChange);
	}

	onDetach() {
		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.handleActiveDeviceChange);
	}

	render() {
		this.Root.innerHTML = "";

		super.render();

		const {
			gameName = "",
			eventName = "",
			ruleSet = "",
			mapType = "",
			gameSpeed = "",
			disabledContent = [],
			mods = [],
			players = "",
		} = this.mpBrowserChooserNode ?? {};

		const content = document.createElement("div");
		const index = this.Root.getAttribute("index");
		content.classList.add("flow-row", "min-h-10", "py-1", "relative");

		content.innerHTML = `
			<div class="flow-row items-center ${mapSortOptionsToFlex[1]}">
				<div class="px-3 flex-auto flow-row items-center">
					<div class="mp-browser-chooser__event w-6 h-6 img-ba-default mr-2" data-tooltip-content="${eventName}"></div>
					<div class="mp-browser-chooser__gameName text-base font-body-base text-accent-2 max-w-full truncate" data-l10n-id="${gameName}"></div>
				</div>
			</div>
			<div class="flow-row items-center ${mapSortOptionsToFlex[2]}">
				<div class="px-3 mp-browser-chooser__ruleSet text-base font-body-base text-accent-2 max-w-full truncate" data-l10n-id="${ruleSet}"></div>
			</div>
			<div class="flow-row items-center ${mapSortOptionsToFlex[3]}">
				<div class="px-3 mp-browser-chooser__mapType text-base font-body-base text-accent-2 max-w-full truncate" data-l10n-id="${mapType}"></div>
			</div>
			<div class="flow-row items-center ${mapSortOptionsToFlex[4]}">
				<div class="px-3 mp-browser-chooser__gameSpeed text-base font-body-base text-accent-2 max-w-full truncate" data-l10n-id="${gameSpeed}"></div>
			</div>
			<div class="flow-row items-center ${mapSortOptionsToFlex[5]}">
				<div class="px-3 flex-auto flow-row items-center relative">
					<div class="absolute mp-browser-chooser__gamepad-toolip mp-browser-chooser__gamepad-toolip-${index}"></div>
					<div class="${mods.length ? '' : 'hidden'} pointer-events-auto mp-browser-chooser__dlcs img-dlc-icon w-8 h-8 mr-2"></div>
					<div class="${disabledContent.length ? '' : 'hidden'} pointer-events-auto mp-browser-chooser__mods img-action-upgrade w-8 h-8 -scale-100"></div>
				</div>
			</div>
			<div class="flow-row items-center justify-end ${mapSortOptionsToFlex[6]}">
				<div class="w-6 h-6 img-mp-lobby-crossplay mp-browser-chooser__crossplay tint-bg-accent-2 hidden" data-icon-id="PLATFORM_UNK" data-tooltip-content="LOC_SAVE_LOAD_CROSSPLAYSAVES"></div>
				<div class="px-3 mp-browser-chooser__players text-base font-body-base text-accent-2 max-w-full truncate" data-l10n-id="${players}"></div>
			</div>
		`;

		this.Root.appendChild(content);
	}

	private updateData() {
		const {
			gameName = "",
			ruleSet = "",
			mapType = "",
			gameSpeed = "",
			players = "",
		} = this.mpBrowserChooserNode ?? {};
		this.gameName.setAttribute("data-l10n-id", gameName);
		this.ruleSet.setAttribute("data-l10n-id", ruleSet);
		this.mapType.setAttribute("data-l10n-id", mapType);
		this.gameSpeed.setAttribute("data-l10n-id", gameSpeed);
		this.players.setAttribute("data-l10n-id", players);
		this.players.classList.toggle("mr-9", this.Root.getAttribute("show-report") == "true");

		this.updateCrossplay();
		this.updateEvent();
		this.updateDlcs();
		this.updateMods();
		this.updateGamepadTooltip();
		this.updateRoot();
	}

	onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
		super.onAttributeChanged(name, oldValue, newValue);
		switch (name) {
			case 'node':
				this.mpBrowserChooserNode = newValue ? JSON.parse(newValue) : null;
				this.updateData();
				break;
			case 'grayed':
				this.updateRoot();
				break;
			case 'show-report':
				this.updateBackground();
				this.updateData();
				break;
		}
	}

	private onActiveDeviceChange(_event: ActiveDeviceTypeChangedEvent) {
		this.updateRoot();
	}

	private getModName(mod: ModConfiguration | ModInfo, treatAsUGC: boolean) {
		if (treatAsUGC) {
			// Reuse another string for the time being.
			const safeModName = 'LOC_UI_TOOLTIP_MODS';
			return Locale.fromUGC(safeModName, Locale.compose(mod.name));
		}
		else {
			return Locale.compose(mod.name);
		}
	}

	private getStylizedModsTooltipContent(mods: ModConfiguration[], treatAsUGC: boolean) {
		return `${mods.length ?
			`[STYLE:text-gradient-secondary][STYLE:tracking-100][STYLE:uppercase][STYLE:font-title-sm]${Locale.compose("LOC_UI_TOOLTIP_MODS")}[/S][/S][/S][/S][N]
			${mods.map((dlc) => `
				${MPBrowserModel.installedMods.has(dlc.modID) ? "[STYLE:text-accent-3]" : "[STYLE:text-negative]"}[STYLE:font-body-sm]${this.getModName(dlc, treatAsUGC)}[/S][N]
			`).join("")}`
			:
			""
			}`
	}

	private getStylizedDisabledContentTooltipContent(disableContent: ModInfo[], treatAsUGC: boolean) {
		return `${disableContent.length ?
			`[STYLE:text-gradient-secondary][STYLE:tracking-100][STYLE:uppercase][STYLE:font-title-sm]${Locale.compose("LOC_UI_TOOLTIP_DISABLED_CONTENT")}[/S][/S][/S][/S][N]
			${disableContent.map((dlc) => `[STYLE:text-accent-3][STYLE:font-body-sm]${this.getModName(dlc, treatAsUGC)}[/S][/S][N]`).join("")}`
			:
			""
			}`
	}

	private isMissingMods() {
		const {
			mods = [],
		} = this.mpBrowserChooserNode ?? {};
		const missingMods = mods.filter(mod => !MPBrowserModel.installedMods.has(mod.modID));
		return !!missingMods.length;
	}

	private isDisabled(): boolean {
		const {
			hostFriendID_Native = "",
			hostFriendID_T2GP = "",
		} = this.mpBrowserChooserNode ?? {};

		return this.isMissingMods() || (hostFriendID_Native != "" && Online.Social.isUserBlocked(hostFriendID_Native, false)) || (hostFriendID_T2GP != "" && Online.Social.isUserBlocked(hostFriendID_T2GP, false));
	}

	private updateRoot() {
		const { savedGame = false } = this.mpBrowserChooserNode ?? {};
		const isGrayed = this.isDisabled();
		this.Root.setAttribute("grayed", isGrayed ? "true" : "false");
		this.Root.classList.toggle("bg-primary-5", isGrayed);
		this.Root.classList.toggle("opacity-80", isGrayed);

		this.Root.setAttribute("no-border", savedGame ? "true" : "false");
		this.Root.removeAttribute("data-tooltip-content");
		this.Root.removeAttribute("data-tooltip-alternative-target");
		if (!ActionHandler.isGamepadActive) {
			const tooltipContent = this.isMissingMods() ? "LOC_UI_MP_BROWSER_MISSING_MOD_TOOLTIP" : savedGame ? "LOC_UI_MP_BROWSER_LOADING_SAVE_TOOLTIP" : "";
			if (tooltipContent) {
				this.Root.setAttribute("data-tooltip-content", tooltipContent);
			}
		} else {
			const index = this.Root.getAttribute("index");
			this.Root.setAttribute("data-tooltip-alternative-target", `mp-browser-chooser__gamepad-toolip-${index}`);
		}
	}

	private updateGamepadTooltip() {
		const {
			disabledContent = [],
			mods = [],
			savedGame = false,
			eventName = "",
			hostingPlatform = HostingType.HOSTING_TYPE_UNKNOWN,
			hostDisplayName = "",
		} = this.mpBrowserChooserNode ?? {};
		const tooltipContent = `
			${hostDisplayName ? `[STYLE:text-gradient-secondary][STYLE:font-title-sm][STYLE:tracking-100][STYLE:font-body-base]${hostDisplayName}[/S][/S][/S][/S][N]` : ""}
			${Network.getLocalHostingPlatform() != hostingPlatform ? `[STYLE:accent-2][STYLE:font-body-sm]${Locale.compose("LOC_SAVE_LOAD_CROSSPLAYSAVES")}[/S][/S][N]` : ""}
			${eventName ? `[STYLE:accent-2][STYLE:font-body-sm]${Locale.compose(eventName)}[/S][/S][N]` : ""}
			${savedGame ? `[STYLE:accent-2][STYLE:font-body-sm]${Locale.compose("LOC_UI_MP_BROWSER_LOADING_SAVE_TOOLTIP")}[/S][/S][N]` : ""}
			${this.getStylizedDisabledContentTooltipContent(disabledContent, false)}
			${this.getStylizedModsTooltipContent(mods, true)}
		`;
		this.gamepadTooltip.setAttribute("data-tooltip-content", tooltipContent);
	}

	private updateBackground() {
		this.background.classList.toggle("right-9", this.Root.getAttribute("show-report") == "true");
	}

	private updateDlcs() {
		const {
			disabledContent = [],
		} = this.mpBrowserChooserNode ?? {};
		this.dlcs.setAttribute('data-tooltip-anchor', "bottom");
		const tooltipContent = this.getStylizedDisabledContentTooltipContent(disabledContent, false);
		if (tooltipContent) {
			this.dlcs.setAttribute("data-tooltip-content", tooltipContent);
		} else {
			this.dlcs.removeAttribute("data-tooltip-content");
		}
		this.dlcs.classList.toggle("hidden", !disabledContent.length);
	}

	private updateMods() {
		const {
			mods = [],
		} = this.mpBrowserChooserNode ?? {};
		this.mods.setAttribute('data-tooltip-anchor', "bottom");
		const tooltipContent = this.getStylizedModsTooltipContent(mods, true);
		if (tooltipContent) {
			this.mods.setAttribute("data-tooltip-content", tooltipContent);
		} else {
			this.mods.removeAttribute("data-tooltip-content");
		}
		this.mods.classList.toggle("hidden", !mods.length);
	}

	private updateEvent() {
		const {
			eventName = "",
		} = this.mpBrowserChooserNode ?? {};
		this.event.classList.toggle("hidden", !eventName);
		this.event.setAttribute("data-tooltip-content", eventName);
	}

	private updateCrossplay() {
		const {
			hostingPlatform = HostingType.HOSTING_TYPE_UNKNOWN,
		} = this.mpBrowserChooserNode ?? {};
		this.crossplay.classList.toggle("hidden", Network.getLocalHostingPlatform() == hostingPlatform);
	}

	private onFocusIn(_event: FocusEvent): void {
		this.Root.dispatchEvent(new FocusEvent("focus"));
	}

	private onDoubleClick(): void {
		if (this.Root.getAttribute("grayed") != "true") {
			this.Root.dispatchEvent(new ActionConfirmEvent());
		}
	}
}

Controls.define('mp-browser-chooser-item', {
	createInstance: MPBrowserChooserItem,
	description: 'A chooser item to be used with the save-load screen',
	classNames: ['mp-browser-chooser-item', "chooser-item_unlocked", "relative", "flex-auto", "group"],
	styles: [
		'fs://game/base-standard/ui/chooser-item/chooser-item.css',
	],
	attributes: [{ name: 'node' }, { name: 'disabled' }, { name: "grayed" }, { name: 'index' }, { name: 'selected' }, { name: "no-border" }, { name: "select-highlight" }, { name: "show-report" }]
});

declare global {
	interface HTMLElementTagNameMap {
		'mp-browser-chooser-item': ComponentRoot<MPBrowserChooserItem>
	}
	interface HTMLElementEventMap {
		[ActionConfirmEventName]: ActionConfirmEvent;
	}
}