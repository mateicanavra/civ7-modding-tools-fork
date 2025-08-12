/**
 * @file panel-pantheon-complete.ts
 * @copyright 2024, Firaxis Games
 * @description Screen to display pantheon choices after choosing them
 */
import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEventName } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
class ScreenPantheonComplete extends Panel {
    constructor() {
        super(...arguments);
        this.engineInputListener = this.onEngineInput.bind(this);
    }
    onInitialize() {
        this.pantheonFrame = MustGetElement(".pantheon-frame", this.Root);
        this.yourPantheonText = MustGetElement(".pantheon-chooser_your-pantheon", this.Root);
        this.enableOpenSound = true;
        this.enableCloseSound = true;
    }
    onAttach() {
        this.playAnimateInSound();
        this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
        this.pantheonFrame.addEventListener('subsystem-frame-close', () => { this.close(); });
        const player = Players.get(GameContext.localPlayerID);
        if (!player) {
            console.error("panel-pantheon-complete: onAttach() - no local player found!");
            return;
        }
        const playerReligion = player.Religion;
        if (!playerReligion) {
            console.error("panel-pantheon-complete: onAttach() - no player religion found!");
            return;
        }
        this.yourPantheonText.innerHTML = Locale.compose("LOC_UI_PANTHEON_YOUR_PANTHEON", playerReligion.getNumPantheons());
        const playerPantheons = playerReligion.getPantheons();
        for (const pantheon of playerPantheons) {
            const pantheonDef = GameInfo.Beliefs.lookup(pantheon);
            if (!pantheonDef) {
                console.error(`panel-pantheon-complete: displayPantheonChoices() - No belief def found for type ${pantheon}`);
                continue;
            }
            const pantheonListContainer = MustGetElement(".pantheon-finished-container", this.Root);
            const pantheonListContainerItem = document.createElement("div");
            pantheonListContainerItem.classList.value = "pantheon-list-container-item max-w-72 flex flex-col items-center mt-4";
            const pantheonIconContainer = document.createElement("div");
            pantheonIconContainer.classList.value = "pantheon-list-container_icon flex items-center justify-center pointer-events-none bg-cover m-3";
            pantheonListContainerItem.appendChild(pantheonIconContainer);
            const pantheonIcon = document.createElement("div");
            pantheonIcon.classList.value = "pantheon-list-container_icon-image relative flex flex-col items-center size-14 bg-center";
            pantheonIcon.style.backgroundImage = UI.getIconCSS(pantheonDef.BeliefType, "PANTHEONS");
            pantheonIconContainer.appendChild(pantheonIcon);
            const pantheonListTitle = document.createElement("p");
            pantheonListTitle.classList.value = "pantheon-list_title font-title-base text-accent-2";
            pantheonListTitle.setAttribute("data-l10n-id", pantheonDef.Name);
            pantheonListContainerItem.appendChild(pantheonListTitle);
            const pantheonListDescription = document.createElement("div");
            pantheonListDescription.role = "paragraph";
            pantheonListDescription.classList.value = "pantheon-list_desc font-body-sm text-center flex flex-col text-accent-3 pointer-events-auto";
            pantheonListDescription.setAttribute("data-l10n-id", pantheonDef.Description);
            pantheonListContainerItem.appendChild(pantheonListDescription);
            pantheonListContainer.appendChild(pantheonListContainerItem);
            FocusManager.setFocus(this.Root);
        }
    }
    onDetach() {
        this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        NavTray.clear();
        NavTray.addOrUpdateGenericBack();
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
            this.close();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
}
Controls.define('panel-pantheon-complete', {
    createInstance: ScreenPantheonComplete,
    description: 'Screen to display pantheon choices after choosing them.',
    classNames: ['screen-pantheon-complete', 'fullscreen', 'pointer-events-none', 'flex'],
    content: ['fs://game/base-standard/ui/pantheon-complete/panel-pantheon-complete.html'],
    styles: ["fs://game/base-standard/ui/pantheon-complete/panel-pantheon-complete.css"],
    attributes: []
});

//# sourceMappingURL=file:///base-standard/ui/pantheon-complete/panel-pantheon-complete.js.map
