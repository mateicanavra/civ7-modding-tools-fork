/**
 * @file model-navigation-tray.ts
 * @copyright 2020-2022, Firaxis Games
 * @description Shows the button-hotkey association for activating items in a confined "tray" area.
 */

import ActionHandler, { ActiveDeviceTypeChangedEvent, ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';

interface NavigationTrayEntry {
	icon: string;	//TODO: how do we want to deal with images in future? Enum? 
	action: string;
	text: string;
	description: string;
}

export enum NavigationTrayOrientation {
	Column,
	Row
}

const PS4_OPTIONS_TEXT = "OPTIONS";
const PS4_SHARE_TEXT = "SHARE";

const mapIconToText = {
	"ps4_icon_start": PS4_OPTIONS_TEXT,
	"ps4_icon_share": PS4_SHARE_TEXT,
}

class NavigationTrayModel {

	// Will be connected to the input system. 
	private isGamepadActive = false;
	private activeDeviceTypeListener = (event: ActiveDeviceTypeChangedEvent) => { this.onActiveDeviceTypeChanged(event) };

	/** Map of actions keyed by the input action with value for the desired loc key */
	private actions: Map<string, string> = new Map();

	private entries: NavigationTrayEntry[] = []; // Acts as a map with NavigationTrayEntry.icon as unique keys

	private onUpdate?: (model: NavigationTrayModel) => void;
	private updateGate: UpdateGate = new UpdateGate(() => {
		this.update();
	});

	constructor() {
		engine.whenReady.then(() => {
			this.isGamepadActive = ActionHandler.isGamepadActive;
			window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);

			engine.on('InputContextChanged', this.onActiveContextChanged, this);
			engine.on('InputActionBinded', this.onInputActionBinded, this);
		})
	}

	get isTrayRequired(): boolean {
		return this.isGamepadActive;
	}

	get isTrayActive(): boolean {
		return this.isTrayRequired && !this.isEmpty();
	}

	private isEmpty(): boolean {
		return this.entries.length == 0;
	}

	set updateCallback(callback: (model: NavigationTrayModel) => void) {
		this.onUpdate = callback;
	}

	addOrUpdateGenericAccept() {
		this.addOrUpdateAccept("LOC_GENERIC_ACCEPT");
	}

	removeGenericAccept() {
		this.removeAccept();
	}

	addOrUpdateGenericOK() {
		this.addOrUpdateAccept("LOC_GENERIC_OK");
	}

	removeGenericOK() {
		this.removeAccept();
	}

	addOrUpdateGenericSelect() {
		this.addOrUpdateAccept("LOC_GENERIC_SELECT");
	}

	addOrUpdateGenericDeselect() {
		this.addOrUpdateAccept("LOC_GENERIC_DESELECT");
	}

	removeGenericSelect() {
		this.removeAccept();
	}

	addOrUpdateGenericBack() {
		this.addOrUpdateCancel("LOC_GENERIC_BACK");
	}

	removeGenericBack() {
		this.removeCancel();
	}

	addOrUpdateGenericCancel() {
		this.addOrUpdateCancel("LOC_GENERIC_CANCEL");
	}

	removeGenericCancel() {
		this.removeCancel();
	}

	addOrUpdateGenericClose() {
		this.addOrUpdateCancel("LOC_GENERIC_CLOSE");
	}

	removeGenericClose() {
		this.removeCancel();
	}

	//---

	addOrUpdateAccept(key: string) {
		this.addOrUpdateEntry(key, "accept");
	}

	removeAccept() {
		this.removeEntry("accept");
	}

	addOrUpdateCancel(key: string) {
		this.addOrUpdateEntry(key, "cancel");
	}

	removeCancel() {
		this.removeEntry("cancel");
	}

	addOrUpdateShellAction1(key: string) {
		this.addOrUpdateEntry(key, "shell-action-1");
	}

	removeShellAction1() {
		this.removeEntry("shell-action-1");
	}

	addOrUpdateShellAction2(key: string) {
		this.addOrUpdateEntry(key, "shell-action-2");
	}

	removeShellAction2() {
		this.removeEntry("shell-action-2");
	}

	addOrUpdateShellAction3(key: string) {
		this.addOrUpdateEntry(key, "shell-action-3");
	}

	removeShellAction3() {
		this.removeEntry("shell-action-3");
	}

	addOrUpdateNextAction(key: string) {
		this.addOrUpdateEntry(key, "next-action");
	}

	removeNextAction() {
		this.removeEntry("next-action");
	}

	addOrUpdateNavPrevious(key: string) {
		this.addOrUpdateEntry(key, "nav-previous");
	}

	removeNavPrevious() {
		this.removeEntry("nav-previous");
	}

	addOrUpdateNavNext(key: string) {
		this.addOrUpdateEntry(key, "nav-next");
	}

	removeNavNext() {
		this.removeEntry("nav-next");
	}

	addOrUpdateNavShellPrevious(key: string) {
		this.addOrUpdateEntry(key, "nav-shell-previous");
	}

	removeNavShellPrevious() {
		this.removeEntry("nav-shell-previous");
	}

	addOrUpdateNavShellNext(key: string) {
		this.addOrUpdateEntry(key, "nav-shell-next");
	}

	removeNavShellNext() {
		this.removeEntry("nav-shell-next");
	}

	addOrUpdateNavMove(key: string) {
		this.addOrUpdateEntry(key, "nav-move");
	}

	removeNavMove() {
		this.removeEntry("nav-move");
	}

	addOrUpdateNavBeam(key: string) {
		this.addOrUpdateEntry(key, "nav-beam");
	}

	removeNavBeam() {
		this.removeEntry("nav-beam");
	}

	addOrUpdateToggleTooltip(key: string) {
		this.addOrUpdateEntry(key, "toggle-tooltip");
	}

	removeToggleTooltip() {
		this.removeEntry("toggle-tooltip");
	}

	addOrUpdateCameraPan(key: string) {
		this.addOrUpdateEntry(key, "camera-pan");
	}

	removeCameraPan() {
		this.removeEntry("camera-pan");
	}

	addOrUpdateSysMenu(key: string) {
		this.addOrUpdateEntry(key, "sys-menu");
	}

	addOrUpdateCenterPlotCursor(key: string) {
		this.addOrUpdateEntry(key, 'center-plot-cursor');
	}

	addOrUpdateNotification(key: string) {
		this.addOrUpdateEntry(key, "notification");
	}

	removeSysMenu() {
		this.removeEntry("sys-menu");
	}

	private addOrUpdateEntry(key: string, action: string) {
		this.actions.set(action, key);

		this.updateGate.call('addOrUpdateEntry');
	}

	private removeEntry(action: string) {
		this.actions.delete(action);

		this.updateGate.call('removeEntry');
	}

	clear() {
		this.actions.clear();
		this.updateGate.call('clear');
	}

	private update() {
		this.entries = [];

		for (const action of this.actions) {
			const icon: string | null = Icon.getIconFromActionName(action[0], InputDeviceType.Controller);
			if (!icon) {
				console.error("model-navigation-tray: update(): Invalid icon to add this entry (action: " + action[0] + ")");
				continue;
			}
			let text = "";
			if (["ps4_icon_start", "ps4_icon_share"].includes(icon)) {
				text = mapIconToText[icon as "ps4_icon_start" | "ps4_icon_share"] ?? "";
			}

			this.entries.push({ description: Locale.compose(action[1]), icon: icon, text, action: action[0] });
		}

		if (this.onUpdate) {
			this.onUpdate(this);
		}
	}

	private onActiveDeviceTypeChanged(event: ActiveDeviceTypeChangedEvent) {
		this.isGamepadActive = event.detail?.gamepadActive;
		this.updateGate.call('onActiveDeviceTypeChanged');
	}

	private onActiveContextChanged() {
		this.updateGate.call('onActiveContextChanged');
	}

	private onInputActionBinded() {
		this.updateGate.call('onInputActionBinded');
	}
}

const NavTray = new NavigationTrayModel();
engine.whenReady.then(() => {
	const updateModel = () => {
		engine.updateWholeModel(NavTray);
	}

	engine.createJSModel('g_NavTray', NavTray);
	NavTray.updateCallback = updateModel;
	engine.synchronizeModels();
});

export { NavTray as default };
