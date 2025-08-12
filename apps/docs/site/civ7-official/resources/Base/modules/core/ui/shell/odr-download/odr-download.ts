/**
 * @file odr-download.ts		
 * @copyright 2025, Firaxis Games
 * @description Download high end assets screen.  
 */

import { MainMenuReturnEvent } from '/core/ui/events/shell-events.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';

class PanelDownloadAssets extends Panel {
	private progressText!: HTMLElement;
	private progressBarFill!: HTMLElement;
	private progressData: number = 0;

	private ODRDownloadProgressListener = this.onODRDownloadProgress.bind(this);
	private ODRDownloadFinishedListener = this.onODRDownloadFinished.bind(this);

	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.Fade;
	}

	onInitialize(): void {
		super.onInitialize();

		this.Root.innerHTML = this.render();

		this.progressText = MustGetElement(".odr-download_progress-text", this.Root);
		this.progressBarFill = MustGetElement(".odr-download_progress-bar-fill", this.Root);
	}

	onAttach() {
		super.onAttach();

		engine.on('ODRDownloadProgress', this.ODRDownloadProgressListener, this);
		engine.on('ODRDownloadFinished', this.ODRDownloadFinishedListener, this);

		this.updateProgressText();
		this.updateProgressBar();
	}

	onDetach(): void {
		super.onDetach();

		engine.off('ODRDownloadProgress', this.ODRDownloadProgressListener, this);
		engine.off('ODRDownloadFinished', this.ODRDownloadFinishedListener, this);
	}

	private render() {
		return `
			<div class="img-bg-panel-chola fullscreen"></div>
			<div class="bg-primary-5 fullscreen opacity-50"></div>
			<div class="fullscreen flow-column">
				<div class="relative odr-download_banner-top w-full flow-column items-center">
					<div class="absolute fullscreen-outside-safezone-x fullscreen-outside-safezone-top bottom-0">
						<div class="size-full bg-primary-4"></div>
					</div>
					<div class="absolute fullscreen-outside-safezone-x fullscreen-outside-safezone-top bottom-0">
						<div class="size-full border-b-secondary-2 border-b-4 opacity-50"></div>
					</div>
					<div class="absolute fullscreen-outside-safezone-x fullscreen-outside-safezone-top bottom-0 flow-row justify-center items-start">
						<div class="img-report_port_glow"></div>
					</div>
				</div>
				<div class="relative flex-auto w-full odr-download_banner-middle">
					<div class="absolute img-lsl_loading w-full h-full"></div>
					<div class="absolute w-full bottom-8 flow-row justify-center">
						<div class="text-lg font-body text-accent-2 text-shadow" data-l10n-id="LOC_UI_ODR_DOWNLOAD_DESCRIPTION"></div>
					</div>
				</div>
				<div class="relative odr-download_banner-bot w-full flow-column items-center">
					<div class="absolute fullscreen-outside-safezone-x fullscreen-outside-safezone-bot top-0">
						<div class="size-full bg-primary-5 opacity-90"></div>
					</div>
					<div class="absolute fullscreen-outside-safezone-x fullscreen-outside-safezone-bot top-0 flow-row justify-center items-end">
						<div class="img-rel_glow_larger"></div>
					</div>
					<div class="absolute fullscreen-outside-safezone-x fullscreen-outside-safezone-bot top-0 flow-row justify-center">
						<div class="absolute w-full odr-download_progress-bar-bg"></div>
						<div class="absolute odr-download_progress-bar-fill top-1 left-0 -right-1 transition-transform transition-width"></div>
						<div class="absolute odr-download_progress-bar-filigree top-0"></div>
					</div>
					<div class="relative odr-download_banner-bot_text">
						<fxs-header filigree-style="h4" class="odr-download_progress-text text-accent-2 text-xl"></fxs-header>
					</div>
				</div>
			</div>
		`
	}

	protected close(): void {
		window.dispatchEvent(new MainMenuReturnEvent());
		super.close();
	}

	private onODRDownloadProgress({data}: ODRDownloadProgressData) {
		this.progressData = data;
		this.updateProgressText();
		this.updateProgressBar();
	}

	private onODRDownloadFinished() {
		this.close();
	}

	private updateProgressText() {
		this.progressText.setAttribute("title", `${(this.progressData*100).toFixed(2)}%`);
	}

	private updateProgressBar() {
		this.progressBarFill.style.setProperty("width", `${(this.progressData)*100}%`);
	}
}

Controls.define('odr-download', {
	createInstance: PanelDownloadAssets,
	description: 'download screen for ODR',
	classNames: ['odr-download', 'fullscreen', 'flow-row', 'justify-center', 'items-center', 'flex-1', 'pointer-events-auto'],
	styles: ['fs://game/core/ui/shell/odr-download/odr-download.css'],
	images: [
		"blp:meter_well.png",
		"blp:meter_fill.png"
	],
	tabIndex: -1
});
