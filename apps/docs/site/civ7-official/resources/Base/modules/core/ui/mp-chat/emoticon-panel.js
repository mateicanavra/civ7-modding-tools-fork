/**
 * @file emoticon-panel.ts
 * @copyright 2023, Firaxis Games
 * @description Multiplayer Chat Emoticon panel
 */
import FocusManager from '/core/ui/input/focus-manager.js';
import { EmoticonSelectEvent } from '/core/ui/mp-chat/screen-mp-chat.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
var GroupIds;
(function (GroupIds) {
    GroupIds["EMOJI"] = "EMOJI";
    GroupIds["RESOURCES"] = "RESOURCES";
    GroupIds["YIELDS"] = "YIELDS";
})(GroupIds || (GroupIds = {}));
export const mapGroupIdsToTooltipText = {
    [GroupIds.EMOJI]: "LOC_UI_CHAT_ICONS_EMOJI",
    [GroupIds.RESOURCES]: "LOC_UI_CHAT_ICONS_RESOURCES",
    [GroupIds.YIELDS]: "LOC_UI_CHAT_ICONS_YIELDS",
};
export class EmoticonPanel extends Panel {
    constructor() {
        super(...arguments);
        this.tabBarSelectedListener = this.onTabBarSelected.bind(this);
        this.iconActivateListener = this.onIconActivate.bind(this);
        this.engineInputListener = this.onEngineInput.bind(this);
        this.windowEngineInputListener = this.onWindowEngineInput.bind(this);
    }
    onInitialize() {
        super.onInitialize();
        this.Root.innerHTML = this.getContent();
        this.tabBar = MustGetElement(".emoticon-panel__tab-bar", this.Root);
        this.iconActivatables = Array.from(this.Root.querySelectorAll(".emoticon-panel__icon-activatable"));
        this.slotGroup = MustGetElement("fxs-slot-group", this.Root);
        this.enableOpenSound = true;
        this.enableCloseSound = true;
        this.Root.setAttribute("data-audio-group-ref", "emoji-panel");
    }
    onAttach() {
        super.onAttach();
        window.addEventListener("engine-input", this.windowEngineInputListener, true);
        this.Root.addEventListener('engine-input', this.engineInputListener);
        this.tabBar.addEventListener("tab-selected", this.tabBarSelectedListener);
        this.iconActivatables.forEach(iconActivatable => iconActivatable.addEventListener("action-activate", this.iconActivateListener));
    }
    onDetach() {
        window.removeEventListener("engine-input", this.windowEngineInputListener, true);
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        FocusManager.setFocus(this.slotGroup);
        NavTray.clear();
    }
    getContent() {
        const iconGroups = UI.getChatIconGroups().map(({ groupID, iconID }) => ({
            id: groupID,
            tooltip: mapGroupIdsToTooltipText[groupID],
            icon: UI.getIconURL(iconID, "CHAT"),
            iconClass: "emoticon-panel__tab-icon flow-row justify-center items-center"
        }));
        const tabItems = JSON.stringify(iconGroups);
        return `
			<div class="bg-primary-5 pt-2 px-2 flow-column flex-1 pointer-events-auto">
				<div class="font-title-sm text-secondary mb-1" data-l10n-id="LOC_UI_CHAT_ICONS"></div>
				<div class="flex-1 flow-column">
					<fxs-tab-bar 
						class="emoticon-panel__tab-bar max-h-10 -mx-2" 
						type="mini"
						tab-items='${tabItems}'
						tab-for=".emoticon-panel"
						alt-controls="false"
						tab-style="flat"
						rect-render="true"
						tab-item-class="emoticon-panel__tab-item group"
					></fxs-tab-bar>
					<fxs-slot-group class="emoticon-panel__slot-group flex-auto px-2">
						${iconGroups.map(({ id: groupId }) => `
							<fxs-spatial-slot id="${groupId}" data-navrule-up="stop" data-navrule-down="stop" data-navrule-left="stop" data-navrule-right="stop">
								<fxs-scrollable handle-gamepad-pan="true">
									<div class="py-1\\.5 flow-row-wrap justify-center">
										${UI.getChatIcons(groupId).map(({ id: iconId }) => `
											<fxs-activatable class="group relative p-1 emoticon-panel__icon-activatable" tabindex="-1" data-icon-id="${iconId}">
												<div class="absolute inset-0 opacity-0 group-hover\\:opacity-30 group-focus\\:opacity-30 transition-opacity bg-accent-4 rounded"></div>
												<fxs-icon class="w-8 h-8" data-icon-id="${iconId}"></fxs-icon>
											</fxs-activatable>
										`).join("")}
									</div>
								</fxs-scrollable>
							</fxs-spatial-slot>
						`).join("")}
					</fxs-slot-group>
				</div>
			</div>
			<fxs-nav-help class="absolute -top-3 -right-5" action-key="inline-cancel"></fxs-nav-help>
		`;
    }
    onTabBarSelected({ detail: { selectedItem: { id } } }) {
        this.slotGroup.setAttribute("selected-slot", id);
    }
    onIconActivate({ target }) {
        const iconId = target.getAttribute("data-icon-id") ?? "";
        this.Root.dispatchEvent(new EmoticonSelectEvent(iconId));
        this.close();
    }
    onEngineInput(inputEvent) {
        if (!this.handleEngineInput(inputEvent)) {
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    handleEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return true;
        }
        if (inputEvent.isCancelInput()) {
            this.close();
            return false;
        }
        return true;
    }
    onWindowEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        switch (inputEvent.detail.name) {
            case 'mousebutton-left':
            case 'touch-tap':
                const target = inputEvent.target;
                if (!this.Root.contains(target) &&
                    target?.tagName != "INPUT" &&
                    target?.tagName != "EMOTICON-PANEL") {
                    this.close();
                }
                if (!this.Root.contains(target)) {
                    inputEvent.stopPropagation();
                    inputEvent.preventDefault();
                }
                break;
        }
    }
}
Controls.define('emoticon-panel', {
    createInstance: EmoticonPanel,
    description: 'Multiplayer Chat Emoticon panel.',
    classNames: ['emoticon-panel', 'trigger-nav-help', 'absolute', 'bottom-0', '-right-3', 'max-w-52', 'w-full', 'min-w-52', 'max-h-60', 'flow-column', 'h-full'],
    styles: ['fs://game/core/ui/mp-chat/emoticon-panel.css']
});
//# sourceMappingURL=file:///core/ui/mp-chat/emoticon-panel.js.map
