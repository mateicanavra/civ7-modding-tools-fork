/**
 * @file progression-badge.ts
 * @copyright 2020-2024, Firaxis Games
 * @description The player's meta-progression badge
 */
class ProgressionBadge extends Component {
    constructor() {
        super(...arguments);
        this.badgeSize = "";
        this.badgeURL = "";
        this.badgeProgressionLevel = "";
        this.displayLevel = Network.supportsSSO();
    }
    onAttributeChanged(name, _oldValue, newValue) {
        switch (name) {
            case 'badge-size':
                if (newValue) {
                    if (newValue == "base" || newValue == "small" || newValue == "mini" || newValue == "micro") {
                        this.badgeSize = newValue;
                        this.refreshBadge();
                    }
                    else {
                        console.error(`progression-badge: badge-size attribute must be 'base', 'mini', or 'micro'`);
                    }
                }
                else {
                    console.error(`progression-badge: badge-level attribute is empty`);
                }
                break;
            case 'data-badge-url':
                if (newValue) {
                    this.badgeURL = newValue;
                    this.refreshBadge();
                }
                else {
                    console.error(`progression-badge: data-badge-level attribute is empty`);
                }
                break;
            case 'data-badge-progression-level':
                if (newValue) {
                    this.badgeProgressionLevel = newValue;
                    this.refreshBadge();
                }
                else {
                    console.error(`progression-badge: data-badge-progression-level attribute is empty`);
                }
                break;
        }
    }
    refreshBadge() {
        switch (this.badgeSize) {
            case "base":
                this.Root.innerHTML = `
					<div class="ph-badge-container flex flex-auto justify-center">
						<div class="ph-badge w-20 h-20 pl-0\\.5 flex bg-contain bg-no-repeat self-center" style="background-image: url('${this.badgeURL}');">
							${this.displayLevel ? `<div class="ph-level-overlay relative w-7 h-7 left-6 -bottom-9 flex bg-contain bg-no-repeat self-center justify-center left-1\/2 bottom-8" style="background-image: url('fs://game/prof_lvl_bk.png');">
								<div class="ph-level-text font-body text-normal text-sm self-center font-fit-shrink whitespace-nowrap">${this.badgeProgressionLevel}</div>
							</div>` : ""}
						</div>
					</div>					
				`;
                break;
            case "small":
                this.Root.innerHTML = `
					<div class="ph-badge-container flex flex-auto">
						<div class="ph-badge flex bg-contain bg-no-repeat self-center w-16 h-16 pl-0\\.5" style="background-image: url('${this.badgeURL}');">
							${this.displayLevel ? `<div class="ph-level-overlay relative -bottom-7 flex bg-contain bg-no-repeat self-center justify-center w-7 h-7 left-4" style="background-image: url('fs://game/prof_lvl_bk.png');">
								<div class="mx-1\\.25 ph-level-text font-body text-normal text-sm self-center font-fit-shrink whitespace-nowrap">${this.badgeProgressionLevel}</div>
							</div>` : ""}
						</div>
					</div>					
				`;
                break;
            case "mini":
                this.Root.innerHTML = `
					<div class="ph-badge-container flex flex-auto justify-center">
						<div class="ph-badge w-20 h-20 pl-0\\.5 bg-contain bg-no-repeat self-center" style="background-image: url('${this.badgeURL}');">
							${this.displayLevel ? `<div class="ph-level-overlay relative w-7 h-7 left-6 -bottom-10 bg-contain bg-no-repeat self-center justify-center left-1\/2 bottom-8" style="background-image: url('fs://game/prof_lvl_bk.png');">
								<div class="ph-level-text font-body text-normal text-sm self-center font-fit-shrink whitespace-nowrap">${this.badgeProgressionLevel}</div>
							</div>` : ""}
						</div>
					</div>					
				`;
                break;
            case "micro":
                this.Root.innerHTML = `
					<div class="ph-badge-container flex flex-auto">
						<div class="ph-badge w-12 h-12 bg-contain bg-no-repeat self-center" style="background-image: url('${this.badgeURL}');">
							${this.displayLevel ? `<div class="ph-level-overlay relative w-8 h-8 -bottom-9 bg-contain bg-no-repeat self-center justify-center left-1\/2 bottom-8" style="background-image: url('fs://game/prof_lvl_bk.png');">
								<div class="ph-level-text font-body text-normal text-sm self-center mt-1">${this.badgeProgressionLevel}</div>
							</div>` : ""}
						</div>
					</div>					
				`;
                break;
        }
    }
}
Controls.define('progression-badge', {
    createInstance: ProgressionBadge,
    description: 'Player meta-progression badge',
    classNames: ['progression-badge'],
    attributes: [
        {
            name: 'badge-size'
        },
        {
            name: 'data-badge-url'
        },
        {
            name: 'data-badge-progression-level'
        }
    ]
});
export { ProgressionBadge as default };

//# sourceMappingURL=file:///core/ui/progression-badge/progression-badge.js.map
