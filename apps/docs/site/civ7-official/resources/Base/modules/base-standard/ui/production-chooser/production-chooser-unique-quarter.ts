import { ProductionChooserItem } from '/base-standard/ui/production-chooser/production-chooser-item.js'

export class UniqueQuarter {
	public readonly root = document.createElement('div');
	private readonly uqInfoCols = document.createElement('div');
	private readonly nameElement = document.createElement('div');
	private readonly completionStatusText = document.createElement('div');
	private readonly buildingContainer = document.createElement('div');

	private buildingElementOne: ComponentRoot<ProductionChooserItem> | undefined = undefined;
	private buildingElementTwo: ComponentRoot<ProductionChooserItem> | undefined = undefined;

	public set definition(value: UniqueQuarterDefinition) {
		this.nameElement.setAttribute('data-l10n-id', value.Name);
		this.uqInfoCols.setAttribute('data-tooltip-content', value.Description);
	}

	public set numCompleted(value: 0 | 1 | 2) {
		this.completionStatusText.textContent = Locale.compose('LOC_UI_PRODUCTION_QUARTER_BUILDINGS_COMPLETED', value);
	}

	constructor() {
		this.root.className = 'production-chooser__unique-quarter relative flex flex-col pointer-events-auto';

		this.uqInfoCols.className = 'production-chooser-item flex items-stretch mb-2 ml-2 hover\\:text-accent-1 focus\\:text-accent-1';
		this.uqInfoCols.setAttribute('data-tooltip-anchor-offset', '20');
		this.uqInfoCols.setAttribute('tabindex', '-1');

		const uqCol1 = document.createElement('fxs-icon');
		uqCol1.className = 'size-10 mr-2';
		uqCol1.setAttribute('data-icon-id', 'CITY_UNIQUE_QUARTER');
		uqCol1.setAttribute('data-icon-context', 'DEFAULT');

		const uqNameLabelContainer = document.createElement('div');
		uqNameLabelContainer.className = 'flex-auto flex flex-col';

		this.nameElement.className = 'font-title text-base tracking-100 uppercase transition-color';

		const labelElement = document.createElement('div');
		labelElement.className = 'font-body text-sm transition-color';
		labelElement.setAttribute('data-l10n-id', 'LOC_UI_PRODUCTION_UNIQUE_QUARTER');

		uqNameLabelContainer.append(
			this.nameElement,
			labelElement
		);

		this.completionStatusText.className = 'font-body text-sm self-end transition-color';

		this.uqInfoCols.append(
			uqCol1,
			uqNameLabelContainer,
			this.completionStatusText
		)

		this.buildingContainer.className = 'flex flex-col';

		const uqBarDecor = document.createElement('div');
		uqBarDecor.className = 'absolute -left-px h-full w-1\\.5 img-city-tab-line-vert';

		const uqDivider = document.createElement('div');
		uqDivider.className = 'production-chooser__unique-quarter-divider';

		this.root.append(
			this.uqInfoCols,
			this.buildingContainer,
			uqBarDecor,
			uqDivider
		)
	}

	public setBuildings(chooserItemOne: ComponentRoot<ProductionChooserItem>, chooserItemTwo: ComponentRoot<ProductionChooserItem>) {
		if (this.buildingElementOne == chooserItemOne && this.buildingElementTwo == chooserItemTwo) {
			return;
		}

		this.buildingContainer.innerHTML = '';

		this.buildingElementOne = chooserItemOne;
		this.buildingElementTwo = chooserItemTwo;

		this.buildingContainer.append(
			this.buildingElementOne,
			this.buildingElementTwo
		)
	}

	public containsBuilding(item: ComponentRoot<ProductionChooserItem>): boolean {
		return this.buildingElementOne == item
			|| this.buildingElementTwo == item;
	}
}