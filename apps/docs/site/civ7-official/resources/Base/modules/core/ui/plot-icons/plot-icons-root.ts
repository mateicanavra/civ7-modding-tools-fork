/**
 * @file plot-icons-root.ts
 * @copyright 2021-2022, Firaxis Games
 * @description Root component which builds and contains all plot icons
 */

import PlotIcons from '/core/ui/plot-icons/plot-icons.js'
import PlotIconsManager, { PlotIconDefine } from '/core/ui/plot-icons/plot-icons-manager.js'
/**
 * Root object for all plot icons
 */
class PlotIconsRootComponent extends Component {

	private addIconListener = this.onAddIcon.bind(this);
	private removeIconListener = this.onRemoveIcon.bind(this);

	private globalHidden = false;
	private globalHideListener = this.onGlobalHide.bind(this);
	private globalShowListener = this.onGlobalShow.bind(this);

	onAttach() {
		super.onAttach();

		engine.on('PlotVisibilityChanged', this.onPlotVisibilityChanged, this);

		window.addEventListener('ui-hide-plot-icons', this.globalHideListener);
		window.addEventListener('ui-show-plot-icons', this.globalShowListener);

		this.Root.addEventListener('plot-icons-root-add', this.addIconListener);
		this.Root.addEventListener('plot-icons-root-remove', this.removeIconListener);

		PlotIconsManager.rootAttached(this.Root);
	}

	onDetach() {
		engine.off('PlotVisibilityChanged', this.onPlotVisibilityChanged, this);

		window.removeEventListener('ui-hide-plot-icons', this.globalHideListener);
		window.removeEventListener('ui-show-plot-icons', this.globalShowListener);
		this.Root.removeEventListener('plot-icons-root-add', this.addIconListener);
		this.Root.removeEventListener('plot-icons-root-remove', this.removeIconListener);

		this.Root.innerHTML = '';

		super.onDetach();
	}

	/// Gets the root element for a plot by it's plot coordinates
	private getPlotRoot(x: number, y: number): Element {
		const plotIcons: Component | undefined = PlotIconsManager.getPlotIcon(x, y);
		let plotIconsRoot: HTMLElement | undefined = plotIcons?.Root;
		if (plotIconsRoot == undefined) {
			plotIconsRoot = document.createElement('plot-icons');
			plotIconsRoot.setAttribute('x', x.toFixed(0));
			plotIconsRoot.setAttribute('y', y.toFixed(0));
			this.Root.appendChild(plotIconsRoot);
		}

		return plotIconsRoot;
	}

	/// Create the plot icon on the desired root
	private createIcon(plotData: PlotIconDefine, root: Element) {
		// If our root has an icon of this type already remove the previous one
		const existingIcons: NodeListOf<Element> = root.querySelectorAll(plotData.iconType);
		existingIcons.forEach((child: Element) => {
			root.removeChild(child);
		});

		const plotIcon: HTMLElement = document.createElement(plotData.iconType);
		plotIcon.style.transform = `translateX(-50%) translateY(-50%)`;
		plotIcon.setAttribute("x", plotData.location.x.toFixed(0));
		plotIcon.setAttribute('y', plotData.location.y.toFixed(0));
		plotData.attributes?.forEach((value, key) => {
			plotIcon.setAttribute(key, value);
		});
		root.appendChild(plotIcon);
	}

	private onAddIcon(event: CustomEvent) {
		if (event.detail.plot == null) {
			console.error('plot-icons-root: onAddIcon event detail failed to contain valid "plot" member!');
			return;
		}

		const plotData: PlotIconDefine = event.detail.plot;
		const plotIconsRoot: Element = this.getPlotRoot(plotData.location.x, plotData.location.y);

		this.createIcon(plotData, plotIconsRoot);
	}

	private onRemoveIcon(event: CustomEvent) {
		const type: string | null = event.detail.plotType;
		if (type == null) {
			console.error('plot-icons-root: onRemoveIcon event detail failed to contain valid "plotType" member!');
			return;
		}

		// Location can be null. In that case remove icons of this type from all plots.
		const location: PlotCoord | null = event.detail.plotLocation;
		if (location) {
			const query: string = `[x="${location.x}][y="${location.y}]`;
			const locationRoot: Element | null = this.Root.querySelector(query);
			if (locationRoot) {
				const plotIcon: Element | null = locationRoot.querySelector(type);
				if (plotIcon) {
					locationRoot.removeChild(plotIcon);
				}
			}
		} else {
			const plotIcons: NodeListOf<Element> = this.Root.querySelectorAll(type);
			plotIcons.forEach((plotIcon: Element) => {
				plotIcon.parentElement?.removeChild(plotIcon);
			});
		}
	}

	private onPlotVisibilityChanged(data: PlotVisibilityChanged_EventData) {
		const plotIcons: Component | undefined = PlotIconsManager.getPlotIcon(data.location.x, data.location.y);
		if (plotIcons != undefined && plotIcons instanceof PlotIcons) {
			plotIcons.setVisibility(this.globalHidden ? RevealedStates.HIDDEN : data.visibility);
		}
	}

	private onGlobalHide() {
		this.Root.style.display = 'none';
		this.globalHidden = true;
	}

	private onGlobalShow() {
		this.Root.style.display = '';
		this.globalHidden = false;
	}
}

Controls.define('plot-icons-root', {
	createInstance: PlotIconsRootComponent,
	description: 'Plot Icons Root',
	requires: ['plot-icons'],
	styles: ["fs://game/core/ui/plot-icons/plot-icons.css"]
})
