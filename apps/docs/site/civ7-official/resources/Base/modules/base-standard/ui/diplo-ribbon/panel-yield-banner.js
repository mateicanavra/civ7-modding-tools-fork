/**
 * @file panel-yield-banner.ts
 * @copyright 2024-2025, Firaxis Games
 * @description Houses the player's yields and yield configuration
 */
import { FxsActivatable } from '/core/ui/components/fxs-activatable.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEventName } from '/core/ui/input/input-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import * as Validation from '/core/ui/utilities/utilities-validation.js';
import ViewManager from '/core/ui/views/view-manager.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
const yieldBarEntryClassMap = {
    'YIELD_GOLD': 'text-yield-gold',
    'YIELD_CULTURE': 'text-yield-culture',
    'YIELD_SCIENCE': 'text-yield-science',
    'YIELD_DIPLOMACY': 'text-yield-influence',
    'YIELD_HAPPINESS': 'text-yield-happiness',
    'YIELD_CITIES': 'text-secondary'
};
class YieldBarEntry extends FxsActivatable {
    constructor() {
        super(...arguments);
        this.type = null;
        this.value = 0;
        this.yieldIcon = document.createElement('img');
        this.valueText = document.createElement('span');
    }
    addOrRemoveWarning() {
        //const warn = this.max !== undefined && this.value >= this.max;
        //this.Root.classList.toggle('text-negative-light', warn);
    }
    updateValueText() {
        switch (true) {
            // <current>/<max> | 4/6
            case this.max !== undefined: {
                this.valueText.textContent = `${this.value}/${this.max}`;
                break;
            }
            // <stored> (+<value-per-turn) | 88 (+5)
            case this.stored !== undefined: {
                const prefix = this.value >= 0 ? "+" : "";
                this.valueText.textContent = `${this.stored} (${prefix}${this.value})`;
                break;
            }
            // +<value-per-turn> | +5
            default: {
                const prefix = this.value >= 0 ? "+" : "";
                this.valueText.textContent = `${prefix}${this.value}`;
            }
        }
    }
    onInitialize() {
        this.Root.setAttribute("data-audio-group-ref", "audio-yield-panel");
        super.onInitialize();
        this.render();
    }
    onAttributeChanged(name, oldValue, newValue) {
        switch (name) {
            case 'data-icon':
                this.type = newValue;
                if (this.type) {
                    this.yieldIcon.style.backgroundImage = `url("${UI.getIconURL(this.type)}")`;
                    if (oldValue) {
                        this.Root.classList.remove(yieldBarEntryClassMap[oldValue]);
                    }
                    this.Root.classList.add(yieldBarEntryClassMap[this.type]);
                }
                break;
            case 'data-value':
                this.value = Validation.number({ value: newValue, defaultValue: 0 });
                this.updateValueText();
                this.addOrRemoveWarning();
                break;
            case 'data-stored':
                this.stored = Validation.number({ value: newValue, defaultValue: 0 });
                this.updateValueText();
                this.addOrRemoveWarning();
                break;
            case 'data-max':
                this.max = Validation.number({ value: newValue, defaultValue: 0 });
                this.updateValueText();
                this.addOrRemoveWarning();
                break;
        }
    }
    render() {
        const isMobileViewExperience = UI.getViewExperience() == UIViewExperience.Mobile;
        this.Root.setAttribute('tabindex', '-1');
        this.Root.classList.add('flex', 'items-center', 'text-base', 'font-title');
        this.yieldIcon.classList.add('size-8', 'mr-0\\.5', 'bg-center', 'bg-no-repeat', 'bg-contain');
        this.yieldIcon.classList.toggle("size-8", !isMobileViewExperience);
        this.Root.classList.toggle("font-title", !isMobileViewExperience);
        this.yieldIcon.classList.toggle("size-10", isMobileViewExperience);
        this.Root.classList.toggle("font-body-lg", isMobileViewExperience);
        this.valueText.classList.add('whitespace-nowrap');
        this.Root.appendChild(this.yieldIcon);
        this.Root.appendChild(this.valueText);
    }
}
Controls.define('yield-bar-entry', {
    createInstance: YieldBarEntry,
    attributes: [
        { name: 'data-icon' },
        { name: 'data-value' },
        { name: 'data-stored' },
        { name: 'data-max' }
    ]
});
export class PanelYieldBanner extends Panel {
    constructor(root) {
        super(root);
        this.engineInputListener = this.onEngineInput.bind(this);
        this.advancedStartEffectUsedListener = this.onAdvancedStartEffectUsed.bind(this);
        this.yieldElementMap = {
            [YieldTypes.YIELD_GOLD]: document.createElement('yield-bar-entry'),
            [YieldTypes.YIELD_SCIENCE]: document.createElement('yield-bar-entry'),
            [YieldTypes.YIELD_CULTURE]: document.createElement('yield-bar-entry'),
            [YieldTypes.YIELD_HAPPINESS]: document.createElement('yield-bar-entry'),
            [YieldTypes.YIELD_DIPLOMACY]: document.createElement('yield-bar-entry')
        };
        this.settlementCapElement = document.createElement('yield-bar-entry');
        this.onUnitRemovedFromMap = ({ unit }) => {
            if (unit.owner !== GameContext.localObserverID) {
                return;
            }
            const player = Players.get(GameContext.localObserverID);
            if (!player?.Stats) {
                console.error("panel-yield-banner.ts: Could not get local player stats");
                return;
            }
            const goldYieldElement = this.yieldElementMap[YieldTypes.YIELD_GOLD];
            goldYieldElement.dataset.value = player.Stats.getNetYield(YieldTypes.YIELD_GOLD).toString();
        };
        this.onCityAddedToMap = (data) => {
            if (data.player !== GameContext.localObserverID) {
                return;
            }
            const player = Players.get(GameContext.localObserverID);
            if (!player?.Stats) {
                console.error("panel-yield-banner.ts: Could not get local player stats");
                return;
            }
            this.settlementCapElement.dataset.value = player.Stats.numSettlements.toString();
        };
        if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG") || InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB")) {
            this.animateInType = this.animateOutType = AnchorType.RelativeToTop;
        }
        else {
            this.animateInType = this.animateOutType = AnchorType.RelativeToTopLeft;
        }
    }
    onInitialize() {
        super.onInitialize();
        this.render();
    }
    onAttach() {
        super.onAttach();
        const player = Players.get(GameContext.localObserverID);
        if (!player?.Stats) {
            console.error("panel-yield-banner.ts: Could not get local player stats");
            return;
        }
        this.Root.listenForEngineEvent('UnitRemovedFromMap', this.onUnitRemovedFromMap, this);
        this.Root.listenForEngineEvent('CityAddedToMap', this.onCityAddedToMap, this);
        this.Root.listenForEngineEvent('DiplomacyTreasuryChanged', this.onDiplomacyTreasuryChanged, this);
        this.Root.listenForEngineEvent('TreasuryChanged', this.onTreasuryChanged, this);
        this.Root.listenForEngineEvent('PlayerYieldChanged', this.onPlayerYieldChanged, this);
        this.Root.listenForEngineEvent('PlayerSettlementCapChanged', this.onPlayerSettlementCapChanged, this);
        this.Root.listenForEngineEvent('TraditionChanged', this.onPolicyChanged, this);
        this.Root.listenForEngineEvent('AdvancedStartEffectUsed', this.advancedStartEffectUsedListener, this);
        this.Root.listenForEngineEvent('ConstructibleAddedToMap', this.onConstructableAddedToMap, this);
        this.Root.listenForEngineEvent('AttributeNodeCompleted', this.updateAll, this);
        this.Root.listenForEngineEvent('CityReligionChanged', this.updateAll, this);
        this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
    }
    onDetach() {
        this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
        super.onDetach();
    }
    onConstructableAddedToMap(_data) {
        this.updateAll();
    }
    onPlayerYieldChanged(data) {
        if (data.player !== GameContext.localObserverID) {
            return;
        }
        const player = Players.get(GameContext.localObserverID);
        if (!player?.Stats) {
            console.error("panel-yield-banner.ts: Could not get local player stats");
            return;
        }
        if (data.yield in this.yieldElementMap) {
            const element = this.yieldElementMap[data.yield];
            element.dataset.value = player.Stats.getNetYield(data.yield).toString();
        }
    }
    onPlayerSettlementCapChanged(data) {
        if (data.player !== GameContext.localObserverID) {
            return;
        }
        const player = Players.get(GameContext.localObserverID);
        if (!player?.Stats) {
            console.error("panel-yield-banner.ts: Could not get local player stats");
            return;
        }
        this.settlementCapElement.dataset.value = player.Stats.numSettlements.toString();
        this.settlementCapElement.dataset.max = player.Stats.settlementCap.toString();
    }
    onTreasuryChanged(data) {
        if (data.player !== GameContext.localObserverID) {
            return;
        }
        const goldYieldElement = this.yieldElementMap[YieldTypes.YIELD_GOLD];
        goldYieldElement.dataset.value = data.goldYield.toString();
        goldYieldElement.dataset.stored = data.goldBalance.toString();
    }
    onDiplomacyTreasuryChanged(data) {
        if (data.player !== GameContext.localObserverID) {
            return;
        }
        const player = Players.get(GameContext.localObserverID);
        if (!player?.Stats) {
            console.error("panel-yield-banner.ts: Could not get local player stats");
            return;
        }
        const diplomacyYieldElement = this.yieldElementMap[YieldTypes.YIELD_DIPLOMACY];
        diplomacyYieldElement.dataset.value = data.diplomacyYield.toString();
        diplomacyYieldElement.dataset.stored = data.diplomacyBalance.toString();
    }
    onPolicyChanged(data) {
        if (data.player !== GameContext.localObserverID) {
            return;
        }
        //we don't know which yield a policy changed, if any... just update them all!
        this.updateAll();
    }
    updateAll() {
        const player = Players.get(GameContext.localObserverID);
        if (!player) {
            console.error("panel-yield-banner.ts: Could not get local player in updateAll!");
            return;
        }
        const playerStats = player.Stats;
        if (!playerStats) {
            console.error("panel-yield-banner.ts: Could not get local player stats in updateAll");
            return;
        }
        const playerTreasury = player.Treasury;
        if (!playerTreasury) {
            console.error("panel-yield-banner.ts: Could not get local player treasury in updateAll");
            return;
        }
        const playerDiploTreasury = player.DiplomacyTreasury;
        if (!playerDiploTreasury) {
            console.error("panel-yield-banner.ts: Could not get local player diplo treasury in updateAll");
            return;
        }
        this.yieldElementMap[YieldTypes.YIELD_GOLD].dataset.value = playerStats.getNetYield(YieldTypes.YIELD_GOLD).toString();
        this.yieldElementMap[YieldTypes.YIELD_GOLD].dataset.stored = playerTreasury.goldBalance.toString();
        this.yieldElementMap[YieldTypes.YIELD_DIPLOMACY].dataset.value = playerStats.getNetYield(YieldTypes.YIELD_DIPLOMACY).toString();
        this.yieldElementMap[YieldTypes.YIELD_DIPLOMACY].dataset.stored = playerDiploTreasury.diplomacyBalance.toString();
        this.yieldElementMap[YieldTypes.YIELD_HAPPINESS].dataset.value = playerStats.getNetYield(YieldTypes.YIELD_HAPPINESS).toString();
        this.yieldElementMap[YieldTypes.YIELD_CULTURE].dataset.value = playerStats.getNetYield(YieldTypes.YIELD_CULTURE).toString();
        this.yieldElementMap[YieldTypes.YIELD_SCIENCE].dataset.value = playerStats.getNetYield(YieldTypes.YIELD_SCIENCE).toString();
        this.settlementCapElement.dataset.value = playerStats.numSettlements.toString();
        this.settlementCapElement.dataset.max = playerStats.settlementCap.toString();
    }
    onEngineInput(event) {
        let live = true;
        switch (event.detail.name) {
            case 'sys-menu':
            case 'cancel':
                ContextManager.pop("panel-diplo-ribbon-fake"); // TODO: fix DiploRibbon to not need this context for best gamepad focus.
                Input.setActiveContext(InputContext.World);
                FocusManager.SetWorldFocused();
                ViewManager.getHarness()?.classList.add("trigger-nav-help");
                live = false;
                break;
        }
        if (!live) {
            event.stopImmediatePropagation();
            event.preventDefault();
        }
    }
    render() {
        this.Root.classList.add('flex');
        const isMobileViewExperience = UI.getViewExperience() == UIViewExperience.Mobile;
        const onYieldElementActivated = (_event) => {
            ContextManager.push("player-yields-report-screen", { singleton: true, createMouseGuard: true });
        };
        const player = Players.get(GameContext.localObserverID);
        if (!player?.Stats || !player?.Treasury || !player?.DiplomacyTreasury) {
            console.error("panel-yield-banner.ts: Required player libraries were missing.");
            return;
        }
        if ((this.Root.getAttribute('display-nav-help') ?? "true") != "false") {
            const navHelpContainer = document.createElement('div');
            Databind.classToggle(navHelpContainer, "hidden", "!{{g_NavTray.isTrayRequired}}");
            navHelpContainer.classList.add('w-12', 'h-8', 'pt-2', 'pl-2');
            navHelpContainer.classList.toggle("pt-2", !isMobileViewExperience);
            navHelpContainer.classList.toggle("-mt-0\.5", isMobileViewExperience);
            navHelpContainer.classList.toggle("mr-1", isMobileViewExperience);
            const navHelp = document.createElement('fxs-nav-help');
            navHelp.setAttribute('action-key', 'inline-navigate-yields');
            navHelp.setAttribute('decoration-mode', 'border');
            navHelp.classList.add("relative");
            navHelpContainer.appendChild(navHelp);
            this.Root.appendChild(navHelpContainer);
        }
        const hSlot = document.createElement('fxs-hslot');
        hSlot.setAttribute("ignore-focus", "true");
        hSlot.setAttribute('data-navrule-left', 'stop');
        hSlot.setAttribute('data-navrule-right', 'stop');
        hSlot.setAttribute('data-navrule-up', 'stop');
        hSlot.setAttribute('data-navrule-down', 'stop');
        hSlot.setAttribute('ignore-prior-focus', 'true');
        hSlot.classList.add("panel-yield__top-bar-content");
        this.Root.appendChild(hSlot);
        const goldYieldElement = this.yieldElementMap[YieldTypes.YIELD_GOLD];
        const goldBalance = player.Treasury.goldBalance;
        const goldYield = player.Stats.getNetYield(YieldTypes.YIELD_GOLD);
        goldYieldElement.addEventListener('action-activate', onYieldElementActivated);
        goldYieldElement.dataset.value = goldYield.toString();
        goldYieldElement.dataset.stored = goldBalance.toString();
        goldYieldElement.dataset.tooltipContent = 'LOC_YIELD_GOLD_TREASURY';
        goldYieldElement.dataset.icon = 'YIELD_GOLD';
        hSlot.appendChild(goldYieldElement);
        const scienceYieldElement = this.yieldElementMap[YieldTypes.YIELD_SCIENCE];
        scienceYieldElement.addEventListener('action-activate', onYieldElementActivated);
        scienceYieldElement.dataset.value = player.Stats.getNetYield(YieldTypes.YIELD_SCIENCE).toString();
        scienceYieldElement.dataset.tooltipContent = 'LOC_YIELD_SCIENCE';
        scienceYieldElement.dataset.icon = 'YIELD_SCIENCE';
        hSlot.appendChild(scienceYieldElement);
        const cultureYieldElement = this.yieldElementMap[YieldTypes.YIELD_CULTURE];
        cultureYieldElement.addEventListener('action-activate', onYieldElementActivated);
        cultureYieldElement.dataset.value = player.Stats.getNetYield(YieldTypes.YIELD_CULTURE).toString();
        cultureYieldElement.dataset.tooltipContent = 'LOC_YIELD_CULTURE';
        cultureYieldElement.dataset.icon = 'YIELD_CULTURE';
        hSlot.appendChild(cultureYieldElement);
        const happinessYieldElement = this.yieldElementMap[YieldTypes.YIELD_HAPPINESS];
        happinessYieldElement.addEventListener('action-activate', onYieldElementActivated);
        happinessYieldElement.dataset.value = player.Stats.getNetYield(YieldTypes.YIELD_HAPPINESS).toString();
        happinessYieldElement.dataset.tooltipContent = 'LOC_YIELD_HAPPINESS';
        happinessYieldElement.dataset.icon = 'YIELD_HAPPINESS';
        hSlot.appendChild(happinessYieldElement);
        const diplomacyYieldElement = this.yieldElementMap[YieldTypes.YIELD_DIPLOMACY];
        const diplomacyBalance = player.DiplomacyTreasury.diplomacyBalance;
        const diplomacyYield = player.Stats.getNetYield(YieldTypes.YIELD_DIPLOMACY);
        diplomacyYieldElement.addEventListener('action-activate', onYieldElementActivated);
        diplomacyYieldElement.dataset.value = diplomacyYield.toString();
        diplomacyYieldElement.dataset.stored = diplomacyBalance.toString();
        diplomacyYieldElement.dataset.tooltipContent = 'LOC_YIELD_DIPLOMACY_TREASURY';
        diplomacyYieldElement.dataset.icon = 'YIELD_DIPLOMACY';
        hSlot.appendChild(diplomacyYieldElement);
        this.settlementCapElement.addEventListener('action-activate', onYieldElementActivated);
        this.settlementCapElement.dataset.value = player.Stats.numSettlements.toString();
        this.settlementCapElement.dataset.max = player.Stats.settlementCap.toString();
        this.settlementCapElement.dataset.tooltipContent = "LOC_YIELD_MAX_CITIES";
        this.settlementCapElement.dataset.icon = 'YIELD_CITIES';
        hSlot.appendChild(this.settlementCapElement);
    }
    onAdvancedStartEffectUsed() {
        this.updateAll();
    }
}
Controls.define('panel-yield-banner', {
    createInstance: PanelYieldBanner,
    description: "Houses the player's yields and yield configuration",
    classNames: ['allowCameraMovement'],
    attributes: [
        {
            name: "display-nav-help",
            description: "Should the yield banner include the nav help"
        }
    ]
});

//# sourceMappingURL=file:///base-standard/ui/diplo-ribbon/panel-yield-banner.js.map
