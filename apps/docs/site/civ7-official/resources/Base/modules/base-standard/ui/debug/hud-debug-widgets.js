/**
 * @file hud-debug-widgets.ts
 * @copyright 2023, Firaxis Games
 * @description Module to support inobstrusively disabling and re-enabling UI components for debugging purposes.
 */
import ViewManager from '/core/ui/views/view-manager.js';
import * as CityBannersStressTest from '/base-standard/ui/debug/city-banners-stress-test.js';
const subsystemDock = {
    id: 'panel-sub-system-dock',
    category: 'Systems',
    caption: 'Disable Subsystem Dock',
    domainType: 'bool',
    value: false,
};
const panelMinimap = {
    id: 'panel-mini-map',
    category: 'Systems',
    caption: 'Disable Minimap',
    domainType: 'bool',
    value: false,
};
const panelSystemBar = {
    id: 'panel-system-bar',
    category: 'Systems',
    caption: 'Disable System Bar',
    domainType: 'bool',
    value: false,
};
const panelDiploRibbon = {
    id: 'panel-diplo-ribbon',
    category: 'Systems',
    caption: 'Disable Diplomacy Ribbon',
    domainType: 'bool',
    value: false,
};
const panelAction = {
    id: 'panel-action',
    category: 'Systems',
    caption: 'Disable Action Panel',
    domainType: 'bool',
    value: false,
};
const panelNotificationTrain = {
    id: 'panel-notification-train',
    category: 'Systems',
    caption: 'Disable Notification Train',
    domainType: 'bool',
    value: false,
};
// Separately register the HUD widget
const disableHUD = {
    id: 'disableHUD',
    category: 'Systems',
    caption: 'Disable HUD',
    domainType: 'bool',
    value: false,
};
UI.Debug.registerWidget(disableHUD);
// Separately register the City Banners widget
const disableCityBanners = {
    id: 'disableCityBanners',
    category: 'Systems',
    caption: 'Disable City Banners',
    domainType: 'bool',
    value: false,
};
UI.Debug.registerWidget(disableCityBanners);
/** widgetMap provides support for disabling "simple" unmanaged widgets */
const widgetMap = {
    [subsystemDock.id]: subsystemDock,
    [panelMinimap.id]: panelMinimap,
    [panelSystemBar.id]: panelSystemBar,
    [panelDiploRibbon.id]: panelDiploRibbon,
    [panelAction.id]: panelAction,
    [panelNotificationTrain.id]: panelNotificationTrain,
};
const widgetRestoreMap = {};
/**
 * RestoreDebugWidget restores a widget to the DOM by recreating the element
 * in the location it was at before it was removed.
 */
const RestoreDebugWidget = (name, { parent, nextSibling }) => {
    const element = document.createElement(name);
    if (!parent) {
        console.error(`ui-disabler: No parent to restore to!`);
        return;
    }
    if (nextSibling) {
        parent.insertBefore(element, nextSibling);
    }
    else {
        parent.appendChild(element);
    }
};
export const InitDebugWidgets = () => {
    for (const id in widgetMap) {
        const widget = widgetMap[id];
        UI.Debug.registerWidget(widget);
    }
    CityBannersStressTest.Init();
    engine.on('DebugWidgetUpdated', (id, value) => {
        if (id == disableHUD.id) {
            if (value) {
                ViewManager.setCurrentByName("Unset");
                // Unset view does not clear the layout, must do this explicitly.
                ViewManager.switchToEmptyView();
            }
            else {
                ViewManager.setCurrentByName("World");
            }
        }
        else if (id == disableCityBanners.id) {
            let banners = document.querySelector('city-banners');
            let placeholder = document.querySelector('[data-placeholder-for="city-banners"]');
            if (value) {
                if (banners) {
                    placeholder?.remove();
                    placeholder = document.createElement('div');
                    placeholder.setAttribute('data-placeholder-for', 'city-banners');
                    placeholder.style.display = 'none';
                    banners.insertAdjacentElement('afterend', placeholder);
                    banners.parentElement?.removeChild(banners);
                }
            }
            else {
                if (placeholder) {
                    banners?.remove();
                    banners = document.createElement('city-banners');
                    banners.classList.add('fullscreen');
                    placeholder.insertAdjacentElement('beforebegin', banners);
                    placeholder.parentElement?.removeChild(placeholder);
                }
            }
        }
        else {
            // handle simple widgets
            const widget = widgetMap[id];
            if (!widget) {
                return;
            }
            if (value) {
                //collect all instances of the element
                const elements = document.getElementsByTagName(widget.id);
                for (let i = 0; i < elements.length; i++) {
                    const element = elements[i];
                    widgetRestoreMap[id] ?? (widgetRestoreMap[id] = []);
                    // save state
                    widgetRestoreMap[id].push({
                        parent: element.parentElement,
                        nextSibling: element.nextElementSibling,
                    });
                    // remove element
                    element.parentElement?.removeChild(element);
                }
            }
            else {
                const restoreStates = widgetRestoreMap[id];
                if (restoreStates) {
                    for (const restoreState of restoreStates) {
                        RestoreDebugWidget(widget.id, restoreState);
                    }
                    widgetRestoreMap[id] = [];
                }
            }
        }
    });
};

//# sourceMappingURL=file:///base-standard/ui/debug/hud-debug-widgets.js.map
