/**
 * @file screen-options-category.ts
 * @copyright 2023, Firaxis Games
 * @description Holds options of a single category in the options screen.
 */

import { FxsVSlot } from '/core/ui/components/fxs-slot.js';
import { CreateOptionComponent, GetGroupLocKey, OptionCategoryGroup, OptionInfo, OptionType } from '/core/ui/options/options-helpers.js';

/**
 * ScreenOptionsCategory holds a collection of options under a certain category.
 */
export class ScreenOptionsCategory extends FxsVSlot {

	groupHeaders: Record<string, HTMLElement | undefined> = {};

	/**
	 * appendOption adds the given option to the group.
	 */
	public appendOption(option: OptionInfo) {
		const optionElement = CreateOptionComponent(option);

		const referenceNode = this.getOptionReferenceNode(option.group);
		const optionRow = document.createElement("div");
		optionRow.classList.value = "flex items-center justify-between mb-2 highlight-row";

		optionRow.addEventListener('mouseenter', this.playSound.bind(this, 'data-audio-focus', 'data-audio-focus-ref'));


		this.Root.insertBefore(optionRow, referenceNode);

		const optionLabel = document.createElement("p");
		optionLabel.classList.add("font-body", "text-base");
		optionLabel.setAttribute("data-l10n-id", option.label);
		optionRow.appendChild(optionLabel);

		if (option.description) {
			const description = Locale.compose(option.description);
			optionElement.setAttribute("data-tooltip-content", description);
			optionElement.setAttribute("data-tooltip-anchor", "left");
			optionLabel.setAttribute("data-tooltip-content", description);
		}

		const optionValue = document.createElement("div");
		optionValue.classList.add('flex', 'flex-col', 'items-end');
		optionValue.setAttribute("optionID", `${option.id}`);
		const optionValueInner = document.createElement("div");
		optionValueInner.classList.add('flex', 'flex-row');
		optionValue.appendChild(optionValueInner);

		optionValueInner.appendChild(optionElement);
		optionRow.appendChild(optionValue);

		if (option.type == OptionType.Slider) {
			const optionNumberWrapper = document.createElement("div");
			optionNumberWrapper.classList.add('flex', 'items-center', 'justify-end', 'min-w-12');
			const optionNumber = document.createElement("div");
			optionNumber.classList.add('font-body', 'text-sm');
			optionNumberWrapper.appendChild(optionNumber);
			option.sliderValue = optionNumber;
			optionValueInner.appendChild(optionNumberWrapper);
		}

		return { optionRow, optionElement };
	}

	/**
	 * getOptionReferenceNode finds the node to insert the option after.
	 * 
	 * This should be the next group header, or if no group is specified, the first group header. 
	 */
	private getOptionReferenceNode(group?: OptionCategoryGroup) {
		if (group) {
			this.groupHeaders[group] ??= this.createGroupHeader(group);
			return this.Root.querySelector<HTMLDivElement>(`[data-group="${group}"] ~ [data-group]`) ?? null;
		} else {
			return this.Root.querySelector<HTMLDivElement>(`[data-group] + .options-row`)?.previousSibling! ?? null;
		}
	}

	private createGroupHeader(group: OptionCategoryGroup) {
		const groupTitle = document.createElement('fxs-header');
		groupTitle.setAttribute('title', GetGroupLocKey(group));
		groupTitle.setAttribute('data-group', group);
		return this.Root.appendChild(groupTitle);
	}

	onInitialize() {
		super.onInitialize();
		this.render();
		this.Root.setAttribute("data-audio-group-ref", "options");
	}

	private render() {
		this.Root.classList.add('flex', 'flex-col')
		this.Root.setAttribute("disable-focus-allowed", "true");
	}
}

const ScreenOptionsCategoryTagName = 'screen-options-category' as const;
Controls.define(ScreenOptionsCategoryTagName, {
	createInstance: ScreenOptionsCategory,
	attributes: [
		{
			name: 'disable-focus-allowed',
			description: 'Determines if focus is allowed to occur on disabled items.'
		},
	],
	tabIndex: -1
});

declare global {
	interface HTMLElementTagNameMap {
		[ScreenOptionsCategoryTagName]: ComponentRoot<ScreenOptionsCategory>;
	}
}