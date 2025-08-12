/**
 * @file plot-icon-archeology.ts
 * @copyright 2024, Firaxis Games
 * @description Icon to show plots that have archeology related actions
 */


export class PlotIconArcheology extends Component {

	private location: float2 = { x: -1, y: -1 };

	onInitialize(): void {
		const archeologyType: string | null = this.Root.getAttribute("archeology");

		this.location.x = parseInt(this.Root.getAttribute('x') ?? '-1')
		this.location.y = parseInt(this.Root.getAttribute('y') ?? '-1')

		let iconName = "";
		if (archeologyType) {
			if (archeologyType == "IMPROVEMENT_RUINS") {
				iconName = 'action_excavateartifacts.png'
			}
			else if (archeologyType == "NATURAL_WONDER") {
				iconName = 'action_naturalartifacts.png'
			}
			else {
				iconName = 'action_researchartifacts.png'
			}

			this.Root.style.backgroundImage = `url(fs://game/${iconName})`;
		}

		this.Root.classList.add('size-24', 'bg-cover', 'bg-no-repeat', 'bg-center', 'cursor-info', 'pointer-events-auto');
		this.Root.setAttribute('data-pointer-passthrough', 'true');
		this.Root.dataset.tooltipStyle = 'archeology';
		this.Root.setAttribute('node-id', `${this.location.x},${this.location.y}`);
	}
}


Controls.define('plot-icon-archeology', {
	createInstance: PlotIconArcheology
})