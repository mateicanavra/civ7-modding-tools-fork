import { getModifierTextByContext, parseConstructibleAdjacency } from "/core/ui/utilities/utilities-core-textprovider.js";
export class PediaSidebarPanel extends Component {
    constructor() {
        super(...arguments);
        this.boundRefresh = this.doRefresh.bind(this);
        this.sectionID = null;
        this.pageID = null;
        this.rafID = 0;
    }
    onAttach() {
        this.sectionID = this.Root.getAttribute('data-section-id');
        this.pageID = this.Root.getAttribute('data-page-id');
        this.doRefresh();
    }
    onDetach() {
        if (this.rafID != 0) {
            cancelAnimationFrame(this.rafID);
            this.rafID = 0;
        }
        this.Root.innerHTML = '';
        this.sectionID = null;
        this.pageID = null;
    }
    onAttributeChanged(name, _oldValue, newValue) {
        if (name == 'data-section-id' && this.sectionID != newValue) {
            this.sectionID = newValue;
            this.queueRefresh();
        }
        else if (name == 'data-page-id' && this.pageID != newValue) {
            this.pageID = newValue;
            this.queueRefresh();
        }
    }
    queueRefresh() {
        if (this.rafID == 0 && this.sectionID && this.pageID) {
            this.rafID = requestAnimationFrame(this.boundRefresh);
        }
    }
    doRefresh() {
        if (this.sectionID && this.pageID) {
            this.refresh(this.sectionID, this.pageID);
        }
    }
}
class PediaSidebarPortrait extends PediaSidebarPanel {
    refresh(sectionId, pageId) {
        // TODO - ICON KLUDGE!!! 
        // Progression tree node icons are not using the icon system but their own 'IconString'
        // Remove this when tree nodes are swapped over.
        const progressionTreeNode = GameInfo.ProgressionTreeNodes.lookup(pageId);
        let iconCSS = null;
        if (progressionTreeNode && progressionTreeNode.IconString) {
            iconCSS = `url('fs://game/${progressionTreeNode.IconString}')`;
        }
        if (sectionId == "UNITS") {
            this.Root.classList.add("pedia-unit-portrait");
        }
        if (sectionId == "LEADERS") {
            iconCSS = UI.getIconCSS(pageId, "CIRCLE_MASK");
            this.Root.classList.add("flex", "items-center");
            const iconFrame = document.createElement("img");
            iconFrame.src = "fs://game/pedia_circle_frame";
            iconFrame.classList.add("self-center", "size-full");
            this.Root.appendChild(iconFrame);
        }
        // 90% of the time the pageId is a gameplay type, look up an icon by its type.
        if (!iconCSS) {
            iconCSS = UI.getIconCSS(pageId);
        }
        // The other 10% it's a bespoke type for the pedia.
        if (!iconCSS) {
            iconCSS = UI.getIconCSS(`${sectionId}_${pageId}`);
        }
        if (iconCSS) {
            this.Root.classList.add('bg-no-repeat', 'bg-cover', 'bg-center', 'self-center');
            this.Root.classList.remove('hidden');
            this.Root.style.backgroundImage = iconCSS;
        }
        else {
            this.Root.classList.add('hidden');
        }
    }
}
Controls.define('pedia-page-sidebar-portrait', {
    createInstance: PediaSidebarPortrait,
    description: 'Display a large icon for the portrat.',
    classNames: ['size-64']
});
class PediaSidebarQuote extends PediaSidebarPanel {
    onDetach() {
        this.Root.innerHTML = '';
        super.onDetach();
    }
    refresh(_sectionId, pageId) {
        this.Root.innerHTML = '';
        const quotes = this.getQuotes(pageId);
        if (quotes.length > 0) {
            const frag = document.createDocumentFragment();
            for (const q of quotes) {
                const div = document.createElement('div');
                div.classList.add('pedia__sidebar-quote-container', 'relative', 'max-w-56');
                const text = document.createElement('div');
                text.role = "paragraph";
                text.classList.add('pedia__sidebar-quote-container-text', 'relative', 'font-body-sm', 'p-6', 'my-px', 'bg-primary-5', "pointer-events-auto");
                text.setAttribute('data-l10n-id', q.quote);
                const topFiligree = document.createElement('div');
                topFiligree.classList.value = "h-4 w-16 absolute -top-1 self-center";
                topFiligree.style.backgroundImage = "url('fs://game/popup_middle_decor')";
                const filigreeInnerTop = document.createElement('div');
                filigreeInnerTop.classList.add('filigree-inner-frame-top', 'absolute', 'top-0', 'inset-x-0');
                const filigreeInnerBottom = document.createElement('div');
                filigreeInnerBottom.classList.add('filigree-inner-frame-bottom', 'absolute', 'bottom-0', 'inset-x-0');
                div.appendChild(text);
                div.appendChild(filigreeInnerTop);
                div.appendChild(filigreeInnerBottom);
                div.appendChild(topFiligree);
                frag.appendChild(div);
            }
            this.Root.appendChild(frag);
            this.Root.classList.remove('hidden');
        }
        else {
            this.Root.classList.add('hidden');
        }
    }
    /**
     * There can exist 0-N quotes for a given type.  In the past, leaders had several quotes while wonders and techs often only had one.
     * For the pedia, we want to enumerate all quote and provide the optional audio event (NYI).
     * This is currently implemented
     * @param typeName The gameplay type name to lookup.
     */
    getQuotes(typeName) {
        const quotes = [];
        const quote = GameInfo.TypeQuotes.lookup(typeName);
        if (quote) {
            quotes.push({ quote: quote.Quote, quoteAuthor: quote.QuoteAuthor, quoteAudio: quote.QuoteAudio });
        }
        return quotes;
    }
}
Controls.define('pedia-page-sidebar-quote', {
    createInstance: PediaSidebarQuote,
    description: 'Display any associated quotes',
    classNames: ['pedia__sidebar-quote-container']
});
class PediaSidebarUnitCosts extends PediaSidebarPanel {
    onDetach() {
        this.Root.innerHTML = '';
        super.onDetach();
    }
    getUnitCosts(pageId) {
        const unitCosts = [];
        GameInfo.Unit_Costs.forEach(cost => {
            if (cost.UnitType == pageId) {
                unitCosts.push({
                    name: Locale.stylize(Locale.compose("LOC_TERM_BASE_COST") + `[icon:${cost.YieldType}]` + cost.Cost.toString())
                });
            }
        });
        return unitCosts;
    }
    refresh(_sectionId, pageId) {
        this.Root.innerHTML = '';
        this.Root.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        const costs = this.getUnitCosts(pageId);
        if (costs.length > 0) {
            const costTitle = document.createElement('div');
            costTitle.role = "heading";
            costTitle.classList.value = "font-title text-xl self-center uppercase tracking-150 pointer-events-auto";
            costTitle.innerHTML = Locale.compose("LOC_UI_TECH_TREE_HEX_COST");
            this.Root.appendChild(costTitle);
            const divider = document.createElement("div");
            divider.classList.value = "filigree-divider-inner-frame white-filigree-divider w-40 mb-2 self-center";
            this.Root.appendChild(divider);
            costs.forEach(cost => {
                const costText = document.createElement("div");
                costText.role = "paragraph";
                costText.classList.value = "font-body text-base mb-1 pointer-events-auto";
                costText.innerHTML = cost.name;
                this.Root.appendChild(costText);
            });
            this.Root.classList.remove('hidden');
            const unitDef = GameInfo.Units.lookup(pageId);
            if (unitDef) {
                const maintenanceText = document.createElement("div");
                maintenanceText.role = "paragraph";
                maintenanceText.classList.value = "font-body text-base mb-1 pointer-events-auto";
                maintenanceText.innerHTML = Locale.stylize(Locale.compose("LOC_UI_PRODUCTION_MAINTENANCE") + "[icon:YIELD_GOLD]" + unitDef.Maintenance);
                this.Root.appendChild(maintenanceText);
            }
        }
        else {
            this.Root.classList.add('hidden');
        }
    }
    getCosts(unitType) {
        const costs = [];
        for (const def of GameInfo.Unit_Costs) {
            if (def.UnitType == unitType) {
                costs.push({ yieldType: def.YieldType, amount: def.Cost });
            }
        }
        return costs;
    }
}
Controls.define('pedia-page-sidebar-unit-costs', {
    createInstance: PediaSidebarUnitCosts,
    description: 'Display basic unit costs',
    classNames: ['self-stretch', 'mt-4', 'flex', "flex-col", "w-64", 'p-2']
});
class PediaSidebarUnitStats extends PediaSidebarPanel {
    onDetach() {
        this.Root.innerHTML = '';
        super.onDetach();
    }
    getUnitUpgrades(pageId) {
        const unitUpgrades = [];
        //Check for upgrades from/to
        GameInfo.UnitUpgrades.forEach(upgrade => {
            if (upgrade.Unit == pageId) {
                const unitDef = GameInfo.Units.lookup(upgrade.UpgradeUnit);
                if (unitDef) {
                    unitUpgrades.push({
                        header: Locale.compose("LOC_PEDIA_SIDEBAR_UPGRADES_TO"),
                        icon: UI.getIconCSS(upgrade.UpgradeUnit),
                        name: Locale.compose("LOC_CIVILOPEDIA_UNIT_NAME_WITH_TIER", unitDef.Name, unitDef.Tier),
                    });
                }
            }
            else if (upgrade.UpgradeUnit == pageId) {
                const unitDef = GameInfo.Units.lookup(upgrade.Unit);
                if (unitDef) {
                    unitUpgrades.push({
                        header: Locale.compose("LOC_PEDIA_SIDEBAR_UPGRADE_FROM"),
                        icon: UI.getIconCSS(upgrade.Unit),
                        name: Locale.compose("LOC_CIVILOPEDIA_UNIT_NAME_WITH_TIER", unitDef.Name, unitDef.Tier),
                    });
                }
            }
        });
        return unitUpgrades;
    }
    getUnitStats(pageId) {
        const unitStats = [];
        GameInfo.Unit_Stats.forEach(stats => {
            if (stats.UnitType == pageId) {
                if (stats.Range > 0) {
                    unitStats.push({
                        amount: stats.Range,
                        name: Locale.compose("LOC_UNIT_INFO_RANGE"),
                        icon: 'url("fs://game/action_rangedattack.png")'
                    });
                }
                if (stats.Combat > 0) {
                    unitStats.push({
                        amount: stats.Combat,
                        name: Locale.compose("LOC_COMBAT_PREVIEW_MELEE_STRENGTH"),
                        icon: 'url("fs://game/Action_Attack.png")'
                    });
                }
                if (stats.RangedCombat > 0) {
                    unitStats.push({
                        amount: stats.RangedCombat,
                        name: Locale.compose("LOC_COMBAT_PREVIEW_RANGED_STRENGTH"),
                        icon: 'url("fs://game/Action_Ranged.png")'
                    });
                }
                if (stats.Bombard > 0) {
                    unitStats.push({
                        amount: stats.Bombard,
                        name: Locale.compose("LOC_COMBAT_PREVIEW_BOMBARD_STRENGTH"),
                        icon: 'url("fs://game/cPromo_bombardment.png")'
                    });
                }
            }
        });
        return unitStats;
    }
    refresh(_sectionId, pageId) {
        this.Root.innerHTML = '';
        this.Root.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        const unitDefinition = GameInfo.Units.lookup(pageId);
        const upgrades = this.getUnitUpgrades(pageId);
        if (unitDefinition) {
            const traitsTitle = document.createElement('div');
            traitsTitle.role = "heading";
            traitsTitle.classList.value = "font-title text-xl self-center uppercase tracking-150 pointer-events-auto";
            traitsTitle.innerHTML = Locale.compose("LOC_PEDIA_SIDEBAR_TRAITS");
            this.Root.appendChild(traitsTitle);
            const divider = document.createElement("div");
            divider.classList.value = "filigree-divider-inner-frame white-filigree-divider w-40 mb-2 self-center";
            this.Root.appendChild(divider);
            upgrades.forEach(upgrade => {
                if (upgrade.header) {
                    const upgradeName = document.createElement("div");
                    upgradeName.role = "heading";
                    upgradeName.classList.value = "font-title text-base pointer-events-auto";
                    upgradeName.innerHTML = Locale.compose(upgrade.header);
                    this.Root.appendChild(upgradeName);
                }
                const upgradeRow = document.createElement("div");
                upgradeRow.role = "paragraph";
                upgradeRow.classList.value = "flex flex-row pl-4 items-center mb-1 items-center pointer-events-auto";
                this.Root.appendChild(upgradeRow);
                if (upgrade.icon) {
                    const upgradeIcon = document.createElement("div");
                    upgradeIcon.classList.value = "bg-no-repeat bg-center bg-cover size-10";
                    upgradeIcon.style.backgroundImage = upgrade.icon;
                    upgradeRow.appendChild(upgradeIcon);
                }
                const upgradeUnitName = document.createElement("div");
                upgradeUnitName.classList.value = "font-base text-base flex-auto ";
                upgradeUnitName.innerHTML = upgrade.name;
                upgradeRow.appendChild(upgradeUnitName);
            });
            if (upgrades.length > 0) {
                const divider = document.createElement("div");
                divider.classList.value = "filigree-divider-inner-frame white-filigree-divider w-40 my-2 self-center";
                this.Root.appendChild(divider);
            }
            const stats = this.getUnitStats(pageId);
            stats.push({
                amount: unitDefinition.BaseMoves,
                name: Locale.compose("LOC_PEDIA_SIDEBAR_UNIT_MOVE_RANGE"),
                icon: "url('blp:Action_Move')" // Case sensitive!
            });
            stats.push({
                amount: unitDefinition.BaseSightRange,
                name: Locale.compose("LOC_PEDIA_SIDEBAR_UNIT_SIGHT_RANGE"),
                icon: "url('blp:action_showall')"
            });
            stats.forEach(stat => {
                const statRow = document.createElement("div");
                statRow.role = "paragraph";
                statRow.classList.value = "flex flex-row items-center mb-1 items-center pointer-events-auto";
                this.Root.appendChild(statRow);
                if (stat.icon) {
                    const statIcon = document.createElement("div");
                    statIcon.classList.value = "bg-center bg-cover size-7";
                    statIcon.style.backgroundImage = stat.icon;
                    statRow.appendChild(statIcon);
                }
                const statText = document.createElement("div");
                statText.classList.value = "font-base text-base flex-auto";
                statText.innerHTML = stat.amount + " " + stat.name;
                statRow.appendChild(statText);
            });
            this.Root.classList.remove('hidden');
        }
        else {
            this.Root.classList.add('hidden');
        }
    }
}
Controls.define('pedia-page-sidebar-unit-stats', {
    createInstance: PediaSidebarUnitStats,
    description: 'Display basic unit stats',
    classNames: ['font-body-sm', 'self-stretch', 'mt-4', 'flex', "flex-col", "w-64", 'p-2']
});
class PediaSidebarUnitRequirements extends PediaSidebarPanel {
    onDetach() {
        this.Root.innerHTML = '';
        super.onDetach();
    }
    getUnitRequirements(pageId) {
        const unitRequirements = [];
        const civBonusItems = Database.query('config', 'select * from CivilizationItems order by SortIndex');
        civBonusItems?.forEach(item => {
            if (item.Type == pageId) {
                const civDef = GameInfo.Civilizations.lookup(item.CivilizationType);
                if (civDef) {
                    unitRequirements.push({
                        icon: UI.getIconCSS(civDef.CivilizationType),
                        name: Locale.compose(civDef.FullName)
                    });
                }
            }
        });
        GameInfo.Unit_RequiredConstructibles.forEach(constructible => {
            if (constructible.UnitType == pageId) {
                const constructibleDef = GameInfo.Constructibles.lookup(constructible.ConstructibleType);
                if (constructibleDef) {
                    unitRequirements.push({
                        icon: UI.getIconCSS(constructibleDef.ConstructibleType),
                        name: Locale.compose(constructibleDef.Name)
                    });
                }
            }
        });
        GameInfo.ProgressionTreeNodeUnlocks.forEach(node => {
            if (node.TargetType == pageId) {
                const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(node.ProgressionTreeNodeType);
                if (nodeInfo) {
                    unitRequirements.push({
                        icon: `url('${nodeInfo.IconString}')`,
                        name: Locale.compose(nodeInfo.Name)
                    });
                }
            }
        });
        return unitRequirements;
    }
    refresh(_sectionId, pageId) {
        this.Root.innerHTML = '';
        this.Root.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        const requirements = this.getUnitRequirements(pageId);
        if (requirements.length > 0) {
            const requirementsTitle = document.createElement('div');
            requirementsTitle.role = "heading";
            requirementsTitle.classList.value = "font-title text-xl self-center uppercase tracking-50 pointer-events-auto";
            requirementsTitle.innerHTML = Locale.compose("LOC_PEDIA_SIDEBAR_REQUIRES");
            this.Root.appendChild(requirementsTitle);
            const divider = document.createElement("div");
            divider.classList.value = "filigree-divider-inner-frame white-filigree-divider w-40 mb-2 self-center";
            this.Root.appendChild(divider);
            requirements.forEach(requirement => {
                const requirementRow = document.createElement("div");
                requirementRow.role = "paragraph";
                requirementRow.classList.value = "flex flex-row mb-1 items-center pointer-events-auto";
                if (requirement.icon) {
                    const requirementIcon = document.createElement("div");
                    requirementIcon.classList.value = "bg-center bg-cover size-10";
                    requirementIcon.style.backgroundImage = requirement.icon;
                    requirementRow.appendChild(requirementIcon);
                }
                const requirementText = document.createElement("div");
                requirementText.classList.value = "font-body text-base ml-1";
                requirementText.innerHTML = requirement.name;
                requirementRow.appendChild(requirementText);
                this.Root.appendChild(requirementRow);
            });
        }
        else {
            this.Root.classList.add("hidden");
        }
    }
}
Controls.define('pedia-page-sidebar-unit-requirements', {
    createInstance: PediaSidebarUnitRequirements,
    description: 'Display basic unit stats',
    classNames: ['font-body-sm', 'self-stretch', 'mt-4', 'flex', "flex-col", "w-64", 'p-2']
});
class PediaSideBarCivTraits extends PediaSidebarPanel {
    onDetach() {
        this.Root.innerHTML = '';
        super.onDetach();
    }
    getCivSidebarTraits(pageId) {
        const civUniques = [];
        const civBonusItems = Database.query('config', 'select * from CivilizationItems order by SortIndex')?.filter(item => item.CivilizationType == pageId);
        civBonusItems?.forEach(item => {
            switch (item.Kind) {
                case 'KIND_UNIT':
                    civUniques.push({
                        name: item.Name ? Locale.compose(item.Name) : "",
                        icon: item.Type ? UI.getIconCSS(item.Type, "UNIT_FLAG") : "",
                        header: Locale.compose("LOC_UNIT_UNIQUE_TITLE")
                    });
                    break;
                case 'KIND_IMPROVEMENT':
                    civUniques.push({
                        name: item.Name ? Locale.compose(item.Name) : "",
                        icon: item.Type ? UI.getIconCSS(item.Type, "IMPROVEMENT") : "",
                        header: Locale.compose("LOC_BUILDING_UNIQUE_TITLE")
                    });
                    break;
                case 'KIND_BUILDING':
                    civUniques.push({
                        name: item.Name ? Locale.compose(item.Name) : "",
                        icon: item.Type ? UI.getIconCSS(item.Type, "BUILDING") : "",
                        header: Locale.compose("LOC_BUILDING_UNIQUE_TITLE")
                    });
                    break;
                case 'KIND_QUARTER':
                    civUniques.push({
                        name: item.Name ? Locale.compose(item.Name) : "",
                        icon: item.Type ? UI.getIconCSS("CITY_UNIQUE_QUARTER") : "",
                        header: Locale.compose("LOC_UI_PRODUCTION_UNIQUE_QUARTER")
                    });
                    break;
                default:
                    break;
            }
        });
        return civUniques;
    }
    refresh(_sectionId, pageId) {
        this.Root.innerHTML = '';
        this.Root.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        const civUniques = this.getCivSidebarTraits(pageId);
        if (civUniques.length > 0) {
            const traitsTitle = document.createElement('div');
            traitsTitle.role = "heading";
            traitsTitle.classList.value = "font-title text-xl self-center uppercase tracking-150 pointer-events-auto";
            traitsTitle.innerHTML = Locale.compose("LOC_PEDIA_SIDEBAR_TRAITS");
            this.Root.appendChild(traitsTitle);
            const divider = document.createElement("div");
            divider.classList.value = "filigree-divider-inner-frame white-filigree-divider w-40 mb-2 self-center";
            this.Root.appendChild(divider);
            civUniques.forEach(trait => {
                if (trait.header) {
                    const traitName = document.createElement("div");
                    traitName.role = "heading";
                    traitName.classList.value = "font-title text-base pointer-events-auto";
                    traitName.innerHTML = Locale.compose(trait.header);
                    this.Root.appendChild(traitName);
                }
                const traitRow = document.createElement("div");
                traitRow.role = "paragraph";
                traitRow.classList.value = "flex flex-row pl-4 items-center mb-2 items-center pointer-events-auto";
                this.Root.appendChild(traitRow);
                if (trait.icon) {
                    const traitIcon = document.createElement("div");
                    traitIcon.classList.value = "bg-center bg-cover size-14";
                    traitIcon.style.backgroundImage = trait.icon;
                    traitRow.appendChild(traitIcon);
                }
                const traitName = document.createElement("div");
                traitName.classList.value = "font-base text-base flex-auto";
                traitName.innerHTML = trait.name;
                traitRow.appendChild(traitName);
            });
        }
        else {
            this.Root.classList.add("hidden");
        }
    }
}
Controls.define('pedia-page-sidebar-civ-traits', {
    createInstance: PediaSideBarCivTraits,
    description: 'Display basic unit stats',
    classNames: ['font-body-sm', 'self-stretch', 'mt-4', 'flex', "flex-col", "w-64", 'p-2']
});
class PediaSideBarBaseYields extends PediaSidebarPanel {
    onDetach() {
        this.Root.innerHTML = '';
        super.onDetach();
    }
    getYields(pageId) {
        const yields = [];
        GameInfo.Constructible_YieldChanges.forEach(yieldChange => {
            if (yieldChange.ConstructibleType == pageId) {
                const yieldDef = GameInfo.Yields.lookup(yieldChange.YieldType);
                if (yieldDef) {
                    yields.push({
                        name: Locale.stylize("LOC_UI_POS_YIELD", yieldChange.YieldChange, yieldDef.Name)
                    });
                }
            }
        });
        for (let element of GameInfo.Constructible_Adjacencies) {
            if (element.ConstructibleType == pageId) {
                const yieldChangeDef = GameInfo.Adjacency_YieldChanges.find(o => o.ID == element.YieldChangeId);
                if (yieldChangeDef) {
                    yields.push({
                        name: Locale.stylize(parseConstructibleAdjacency(yieldChangeDef))
                    });
                }
            }
        }
        GameInfo.ConstructibleModifiers.forEach(element => {
            if (element.ConstructibleType == pageId) {
                const modifierText = getModifierTextByContext(element.ModifierId, "Description");
                if (modifierText) {
                    yields.push({
                        name: Locale.stylize(modifierText)
                    });
                }
            }
        });
        return yields;
    }
    refresh(_sectionId, pageId) {
        this.Root.innerHTML = '';
        this.Root.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        const yields = this.getYields(pageId);
        if (yields.length > 0) {
            const traitsTitle = document.createElement('div');
            traitsTitle.role = "heading";
            traitsTitle.classList.value = "font-title text-xl self-center uppercase tracking-150 pointer-events-auto";
            traitsTitle.innerHTML = Locale.compose("LOC_UI_CHAT_ICONS_YIELDS");
            this.Root.appendChild(traitsTitle);
            const divider = document.createElement("div");
            divider.classList.value = "filigree-divider-inner-frame white-filigree-divider w-40 mb-2 self-center";
            this.Root.appendChild(divider);
            yields.forEach(yieldData => {
                const yieldElement = document.createElement("div");
                yieldElement.role = "paragraph";
                yieldElement.classList.value = "font-base text-base w-full h-auto pointer-events-auto";
                yieldElement.innerHTML = yieldData.name;
                this.Root.appendChild(yieldElement);
            });
        }
        else {
            this.Root.classList.add("hidden");
        }
    }
}
Controls.define('pedia-page-sidebar-base-yields', {
    createInstance: PediaSideBarBaseYields,
    description: 'Display yields and adjacencies for buildings/improvements',
    classNames: ['font-body-sm', 'self-stretch', 'mt-4', 'flex', "flex-col", "w-64", 'p-2']
});
class PediaSideBarBuildingCost extends PediaSidebarPanel {
    onDetach() {
        this.Root.innerHTML = '';
        super.onDetach();
    }
    getCosts(pageId) {
        const costs = [];
        const constructible = GameInfo.Constructibles.lookup(pageId);
        if (constructible && constructible.Cost > 0) {
            costs.push({ name: Locale.stylize(Locale.compose("LOC_TERM_BASE_COST") + `[icon:YIELD_PRODUCTION]` + constructible.Cost.toString()) });
        }
        return costs;
    }
    getMaintenances(pageId) {
        const maintenances = [];
        GameInfo.Constructible_Maintenances.forEach(maintenance => {
            if (maintenance.ConstructibleType == pageId && maintenance.Amount > 0) {
                maintenances.push({
                    name: Locale.stylize(Locale.compose("LOC_UI_PRODUCTION_MAINTENANCE") + `[icon:${maintenance.YieldType}]` + maintenance.Amount)
                });
            }
        });
        return maintenances;
    }
    refresh(_sectionId, pageId) {
        this.Root.innerHTML = '';
        this.Root.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        const costs = this.getCosts(pageId);
        const maintenances = this.getMaintenances(pageId);
        if (costs.length > 0 || maintenances.length > 0) {
            const costTitle = document.createElement('div');
            costTitle.role = "heading";
            costTitle.classList.value = "font-title text-xl self-center uppercase tracking-150 pointer-events-auto";
            costTitle.innerHTML = Locale.compose("LOC_UI_TECH_TREE_HEX_COST");
            this.Root.appendChild(costTitle);
            const divider = document.createElement("div");
            divider.classList.value = "filigree-divider-inner-frame white-filigree-divider w-40 mb-2 self-center";
            this.Root.appendChild(divider);
            costs.forEach(cost => {
                const costText = document.createElement("div");
                costText.role = "paragraph";
                costText.classList.value = "font-body flex-auto text-base mb-1 pointer-events-auto";
                costText.innerHTML = cost.name;
                this.Root.appendChild(costText);
            });
            maintenances.forEach(maintenance => {
                const costText = document.createElement("div");
                costText.role = "paragraph";
                costText.classList.value = "font-body flex-auto text-base mb-1 pointer-events-auto";
                costText.innerHTML = maintenance.name;
                this.Root.appendChild(costText);
            });
        }
        else {
            this.Root.classList.add("hidden");
        }
    }
}
Controls.define('pedia-page-sidebar-building-cost', {
    createInstance: PediaSideBarBuildingCost,
    description: 'Display costs for buildings/improvements',
    classNames: ['font-body-sm', 'self-stretch', 'mt-4', 'flex', "flex-col", "w-64", 'p-2']
});
class PediaSideBarBuildingRequirements extends PediaSidebarPanel {
    onDetach() {
        this.Root.innerHTML = '';
        super.onDetach();
    }
    getRequirements(pageId) {
        const requirements = [];
        let routeInfo = null;
        const gameplayType = GameInfo.Types.lookup(pageId);
        if (gameplayType?.Kind == "KIND_ROUTE") {
            routeInfo = GameInfo.Routes.lookup(pageId);
        }
        const civBonusItems = Database.query('config', 'select * from CivilizationItems order by SortIndex');
        civBonusItems?.forEach(item => {
            if (item.Type == pageId) {
                const civDef = GameInfo.Civilizations.lookup(item.CivilizationType);
                if (civDef) {
                    requirements.push({
                        header: Locale.compose("LOC_PEDIA_SIDEBAR_UNIQUE_TO"),
                        icon: UI.getIconCSS(civDef.CivilizationType),
                        name: Locale.compose(civDef.FullName)
                    });
                }
            }
        });
        GameInfo.ProgressionTreeNodeUnlocks.forEach(node => {
            if (node.TargetType == pageId) {
                const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(node.ProgressionTreeNodeType);
                if (nodeInfo) {
                    const progressionTree = GameInfo.ProgressionTrees.lookup(nodeInfo.ProgressionTree);
                    if (progressionTree) {
                        requirements.push({
                            header: progressionTree.SystemType == "SYSTEM_TECH" ? Locale.compose("LOC_PEDIA_SIDEBAR_REQUIRED_TECH") : Locale.compose("LOC_PEDIA_SIDEBAR_REQUIRED_CIVIC"),
                            icon: `url('${nodeInfo.IconString}')`,
                            name: Locale.compose(nodeInfo.Name)
                        });
                    }
                }
            }
        });
        if (routeInfo && routeInfo.RequiredConstructible) {
            const constructible = GameInfo.Constructibles.lookup(routeInfo.RequiredConstructible);
            if (constructible) {
                let header = null;
                let iconCSS = UI.getIconCSS(constructible.ConstructibleType);
                switch (constructible.ConstructibleClass) {
                    case "BUILDING":
                        header = "LOC_PEDIA_SIDEBAR_REQUIRED_BUILDING";
                        break;
                    case "IMPROVEMENT":
                        header = "LOC_PEDIA_SIDEBAR_REQUIRED_IMPROVEMENT";
                        break;
                    case "WONDER":
                        header = "LOC_PEDIA_SIDEBAR_REQUIRED_WONDER";
                        break;
                }
                if (header) {
                    requirements.push({
                        header: Locale.compose(header),
                        icon: iconCSS,
                        name: Locale.compose(constructible.Name)
                    });
                }
            }
        }
        return requirements;
    }
    refresh(_sectionId, pageId) {
        this.Root.innerHTML = '';
        this.Root.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        const requirements = this.getRequirements(pageId);
        if (requirements.length > 0) {
            const requirementsTitle = document.createElement('div');
            requirementsTitle.role = "heading";
            requirementsTitle.classList.value = "font-title text-xl self-center uppercase tracking-50 pointer-events-auto";
            requirementsTitle.innerHTML = Locale.compose("LOC_PEDIA_SIDEBAR_REQUIRES");
            this.Root.appendChild(requirementsTitle);
            const divider = document.createElement("div");
            divider.classList.value = "filigree-divider-inner-frame white-filigree-divider w-40 mb-2 self-center";
            this.Root.appendChild(divider);
            requirements.forEach(requirement => {
                if (requirement.header) {
                    const requirementHeader = document.createElement("div");
                    requirementHeader.role = "heading";
                    requirementHeader.classList.value = "mt-2 text-lg font-title pointer-events-auto";
                    requirementHeader.innerHTML = requirement.header;
                    this.Root.appendChild(requirementHeader);
                }
                const requirementRow = document.createElement("div");
                requirementRow.role = "paragraph";
                requirementRow.classList.value = "flex flex-row mb-1 items-center pointer-events-auto";
                if (requirement.icon) {
                    const requirementIcon = document.createElement("div");
                    requirementIcon.classList.value = "bg-center bg-cover size-10";
                    requirementIcon.style.backgroundImage = requirement.icon;
                    requirementRow.appendChild(requirementIcon);
                }
                const requirementText = document.createElement("div");
                requirementText.classList.value = "font-body text-base ml-1";
                requirementText.innerHTML = requirement.name;
                requirementRow.appendChild(requirementText);
                this.Root.appendChild(requirementRow);
            });
        }
        else {
            this.Root.classList.add("hidden");
        }
    }
}
Controls.define('pedia-page-sidebar-building-requirements', {
    createInstance: PediaSideBarBuildingRequirements,
    description: 'Display requirements for buildings/improvements',
    classNames: ['font-body-sm', 'self-stretch', 'mt-4', 'flex', "flex-col", "w-64", 'p-2']
});

//# sourceMappingURL=file:///base-standard/ui/civilopedia/civilopedia-sidebar-panels.js.map
