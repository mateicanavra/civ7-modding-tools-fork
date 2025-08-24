/**
 * @file plot-icon-random-event.ts
 * @copyright 2024, Firaxis Games
 * @description Icon to show plots that are susceptible to random events
 */


export class PlotIconSuggestedSettlement extends Component {

	private location: float2 = { x: -1, y: -1 };

	onInitialize(): void {
		this.location.x = parseInt(this.Root.getAttribute('x') ?? '-1')
		this.location.y = parseInt(this.Root.getAttribute('y') ?? '-1')

		this.Root.classList.add('size-16', 'bg-cover', 'bg-no-repeat', 'bg-center', 'cursor-info', 'pointer-events-auto');
		this.Root.setAttribute('data-pointer-passthrough', 'true')
		this.Root.style.backgroundImage = `url(fs://game/city_recommend)`;
		this.Root.dataset.tooltipStyle = 'settlement-recommendation';
		this.Root.setAttribute('node-id', `${this.location.x},${this.location.y}`);
	}
}


Controls.define('plot-icon-suggested-settlement', {
	createInstance: PlotIconSuggestedSettlement
})