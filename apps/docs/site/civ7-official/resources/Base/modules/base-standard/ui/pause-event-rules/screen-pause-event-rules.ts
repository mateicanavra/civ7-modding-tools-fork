/**
 * @file screen-pause-event-rules.ts
 * @copyright 2020-2025, Firaxis Games
 * @description Pause event rules panel to remind players of the rules for whatever event they're playing.
 */

import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';

interface GameEventData {
	imageURL: string;
	title: string;
	shortDesc: string;
	endDate: string;
	descriptionText: string;
	rulesText: string;
}

export class ScreenPauseEventRules extends Panel {

	private closeButtonListener: EventListener = () => { this.close(); }
	private engineInputListener: EventListener = (inputEvent: InputEngineEvent) => { this.onEngineInput(inputEvent); };
	private dismissButton: HTMLElement | null = null;

	constructor(root: ComponentRoot) {
		super(root);
	};

	onAttach() {
		super.onAttach();

		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);

		const currentEventPrefix = Network.supportsSSO() ? "LOC_" + Online.LiveEvent.getCurrentLiveEvent() : "";
		const eventExample: GameEventData = {
			imageURL: 'url("fs://game/backg_base_01")',
			title: currentEventPrefix,
			shortDesc: currentEventPrefix + "_SHORT_DESC",
			endDate: Network.supportsSSO() ? Online.LiveEvent.getEndDateofCurrentLiveEvent() : "",
			descriptionText: currentEventPrefix + "_DESCRIPTION",
			rulesText: currentEventPrefix + "_RULES"
		}

		this.render(eventExample);

		this.dismissButton = MustGetElement(".event-rules-dismiss", this.Root);
		this.dismissButton.addEventListener("action-activate", this.closeButtonListener);

		const closeButton = MustGetElement(".events-close-button", this.Root);
		closeButton.addEventListener("action-activate", this.closeButtonListener);
	}

	onDetach() {
		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);

		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		NavTray.clear();
		NavTray.addOrUpdateGenericBack();

		if (this.dismissButton) {
			FocusManager.setFocus(this.dismissButton);
		}
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	protected onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
			this.close();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private render(eventData: GameEventData) {
		let htmlContent = `
			<div class="pause-event-rules flow-column">
				<div class="events-content flex-auto flow-column" tabindex="-1">
					<fxs-hslot class="flex-auto">
						<fxs-vslot class="events-info h-full">
							<div class="inset-x-4 inset-y-0 flex-auto flow-column">
								<fxs-vslot class="events-description flex-auto py-6 self-center">
									<!-- Title and divider-->
									<div class="events-desc-title font-title text-secondary-1 text-2xl self-center uppercase mb-2">${eventData.title}</div>
									<div class="filigree-divider-h3 bg-no-repeat bg-contain self-center"></div>
									<div class="events-banner w-full h-18 bg-cover bg-no-repeat mb-8"></div>
									<!-- scrollable region -->
									<fxs-scrollable class="events-scrollable flex-auto" handle-gamepad-pan="true">
										<div
											class="events-desc-subtitle font-title text-secondary-1 text-xl self-center uppercase mb-2">${eventData.shortDesc}</div>
										<div class="filigree-shell-small bg-no-repeat bg-contain self-center mb-2"></div>
										<!-- Rewards -->
										<div class="events-reward-container self-center">`;

		const rewardData = Online.Achievements.getAvaliableRewardsForLiveEvent(Online.LiveEvent.getCurrentLiveEvent());
		for (let i: number = 0; i < rewardData.length; i++) {
			htmlContent = htmlContent + `	<fxs-hslot class="mt-2 mb-2">
					<div class="bg-cover bg-no-repeat w-16 h-16" style="background-image: url('${rewardData[i].reward}')"></div>
					<fxs-vslot class="ml-2">
						<div class="font-title text-lg text-accent-2 uppercase" data-l10n-id="${rewardData[i].name}"></div>
						<div class="font-body text-base text-primary-1" data-l10n-id="${rewardData[i].description}"></div>
					</fxs-vslot>
				</fxs-hslot>
			`;
		}

		htmlContent = htmlContent + `			
										</div>
										<div class="events-desc-text font-body text-lg text-accent-2 leading-tight" data-l10n-id='${eventData.descriptionText}'></div>
										<div class="font-title text-secondary-1 text-xl self-center uppercase mt-6"></div>
										<div class="filigree-shell-small bg-no-repeat bg-contain self-center mb-2"></div>
										<div class="events-rules-text font-body text-lg text-accent-2 leading-tight" data-l10n-id='${eventData.rulesText}'></div>
										<div class="font-body text-base text-accent-2 leading-tight"></div>
									</fxs-scrollable>
								</fxs-vslot>
							</div>
							<fxs-button caption="LOC_GENERIC_BACK" class="event-rules-dismiss" action-key="inline-cancel"/>
						</fxs-vslot>
					</fxs-hslot>
					<fxs-close-button class="events-close-button absolute"></fxs-close-button>
				</div>
			</div>
		`;

		this.Root.innerHTML = htmlContent;
	}
}

Controls.define('screen-pause-event-rules', {
	createInstance: ScreenPauseEventRules,
	description: 'Pause menu Event Rules screen.',
	classNames: ['pause-event-rules', 'absolute'],
	styles: ['fs://game/base-standard/ui/pause-event-rules/screen-pause-event-rules.css'],
	attributes: []
});