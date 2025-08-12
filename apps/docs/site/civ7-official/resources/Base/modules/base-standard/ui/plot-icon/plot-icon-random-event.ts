/**
 * @file plot-icon-random-event.ts
 * @copyright 2024, Firaxis Games
 * @description Icon to show plots that are susceptible to random events
 */

class PlotIconRandomEvent extends Component {

	private location: float2 = { x: -1, y: -1 };


	onInitialize(): void {
		this.location.x = parseInt(this.Root.getAttribute('x') ?? '-1')
		this.location.y = parseInt(this.Root.getAttribute('y') ?? '-1')

		const eventName = this.Root.getAttribute("data-event-class");
		if (!eventName) {
			console.error('plot-icon-random-event: Missing data-event-class attribute');
			return;
		}

		const data = GameInfo.RandomEventUI.lookup(eventName);
		if (!data) {
			console.error(`plot-icon-random-event: Unable to find random event data for ${eventName}`);
			return;
		}

		this.Root.classList.add('size-16', 'bg-cover', 'bg-no-repeat', 'bg-center');
		this.Root.setAttribute('data-pointer-passthrough', 'true');
		this.Root.style.backgroundImage = `url(${UI.getIconURL(data.EventClass)})`;
		this.Root.dataset.tooltipStyle = 'random-event';
		this.Root.setAttribute('node-id', `${this.location.x},${this.location.y}`);
	}
}


Controls.define('plot-icon-random-event', {
	createInstance: PlotIconRandomEvent
})