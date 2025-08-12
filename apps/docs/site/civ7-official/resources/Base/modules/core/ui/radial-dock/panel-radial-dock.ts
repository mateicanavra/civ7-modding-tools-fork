/**
 * @file Panel-radial-dock.ts
 * @copyright 2021, Firaxis Games
 * @description Panel for the radial dock
 */

import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';

class PanelRadialDock extends Panel {
	readonly SMALL_SCREEN_MODE_MAX_HEIGHT = 768;
	readonly SMALL_SCREEN_MODE_MAX_WIDTH = 1800;

	private container!: HTMLElement;

	private resizeListener = this.onResize.bind(this);

	onInitialize(): void {
		super.onInitialize();

		this.Root.innerHTML = `
			<div class="panel-radial-dock__container relative w-96 h-24">
				<div class="absolute inset-0 flow-row -top-2\\.5 bottom-2\\.5">
					<div class="img-hud-dock flex-auto mt-px"></div>
					<div class="img-hud-dock -rotate-y-180 flex-auto mt-px"></div>
				</div>
				<div class="absolute inset-0 -top-2\\.5 bottom-2\\.5 px-18 pb-2 flow-row justify-center items-center">
					<fxs-nav-help action-key="inline-toggle-radial-menu"></fxs-nav-help>
					<div class="shrink leading-none">
						<div class="font-title-lg text-center" data-l10n-id="LOC_RADIAL_MENU_TITLE_TEXT"></div>
					</div>
				</div>
			</div>
		`

		this.container = MustGetElement(".panel-radial-dock__container", this.Root);
		this.updateContainer();
	}

	onAttach(): void {
		window.addEventListener('resize', this.resizeListener);
	}

	onDetach(): void {
		window.removeEventListener('resize', this.resizeListener);
	}

	private isScreenSmallMode(): boolean {
		return window.innerHeight <= Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_HEIGHT) || window.innerWidth <= Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_WIDTH);
	}

	private onResize() {
		this.updateContainer();
	}

	private updateContainer() {
		this.container.classList.toggle("hidden", this.isScreenSmallMode())
	}
}

// fxs-nav-help to have the same behaviour for visibility
Controls.define('panel-radial-dock', {
	createInstance: PanelRadialDock,
	description: 'Radial dock area showing nav hint info.',
	classNames: ['panel-radial-dock', 'fxs-nav-help'],
	attributes: []
});
