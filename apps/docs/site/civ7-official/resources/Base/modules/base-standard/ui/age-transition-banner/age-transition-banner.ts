import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import { realizePlayerColors } from '/core/ui/utilities/utilities-color.js'

const getAttributeDefault = <T extends string>(element: HTMLElement, attributeName: string, defaultValue: T): T => {
	return element.getAttribute(attributeName) as T | null ?? defaultValue;
}

const getAgeBannerText = (ageDefinition: AgeDefinition, type: AgeTransitionAttribute) => {
	if (type === 'age-start') {
		return Locale.stylize('LOC_AGE_BANNER_START_TEXT', ageDefinition.Name);
	} else {
		return Locale.stylize('LOC_AGE_BANNER_END_TEXT', ageDefinition.Name);
	}
}

type AgeTransitionAttribute = 'age-start' | 'age-ending'
export type AgeTransitionBannerAttributes = {
	'age-transition-type': AgeTransitionAttribute
}

export const AGE_TRANSITION_BANNER_FADE_OUT_DURATION = 4250;

class AgeTranstionBanner extends Component {

	private fadeOutTimeoutCallback: number = 0;
	private engineInputListener = this.onEngineInput.bind(this);

	/**
	 * @override
	 */
	onAttach() {
		realizePlayerColors(this.Root, GameContext.localPlayerID);
		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
		const ageTransitionType = getAttributeDefault<AgeTransitionAttribute>(this.Root, 'age-transition-type', 'age-ending');

		const ageDefinition: AgeDefinition | null = GameInfo.Ages.lookup(Game.age);
		if (!ageDefinition) {
			throw new Error("age-transition-banner: unable to determine current age")
		}

		const ageBannerText = getAgeBannerText(ageDefinition, ageTransitionType);

		this.Root.innerHTML = `
			<div class="age-ending__panel mb-16 relative flex flex-col justify-center items-center" id="age-ending-panel">
				<div class="age-ending__panel-main">
					<div class="age-ending__panel-shadow"></div>
					<div class="age-ending__panel-bg absolute inset-0 -my-1 flex-col justify-center align-center"></div>
				<div class="age-ending__small-banner">
					<div class="age-ending__banner-text"></div>
				</div>					
					<div class="age-ending__panel-content">
						<fxs-vslot class="w-full self-center age-ending__small-text">
							<fxs-hslot class="age-ending__big-filligree-hslot age-ending-filligree-top self-center">
								<div class="age-ending__panel-big-ornament w-1\\/2 h-16"></div>
								<div class="age-ending__panel-big-ornament w-1\\/2 -scale-x-100 h-16"></div>
							</fxs-hslot>
							<div class="age-ending__panel-text-ornament"></div>
							<div class="self-center relative font-title text-2xl fxs-header uppercase text-center text-secondary" id="at-age-ending_age-text">${ageBannerText}</div>
							<div class="age-ending__panel-text-ornament age-ending__panel-text-ornament-bottom"></div>
							<fxs-hslot class="age-ending__big-filligree-hslot age-ending-filligree-bottom self-center -scale-y-100">
								<div class="age-ending__panel-big-ornament w-1\\/2 h-16"></div>
								<div class="age-ending__panel-big-ornament w-1\\/2 -scale-x-100 h-16"></div>
							</fxs-hslot>
						</fxs-vslot>
					</div>
					<div class="age-ending__panel-overlay stretch"></div>
					<div class="age-ending__panel-darkening stretch"></div>
				</div>
			</div>
		`

		// If this is the end of an age, determine the specific victory/loss/elimination type and tell Wwise
		if (ageTransitionType == "age-ending") {
			let victoryType: string = "age-end-banner-loss";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);

			if (player) {
				const playerDefeat: DefeatType = Game.VictoryManager.getLatestPlayerDefeat(GameContext.localPlayerID);

				if (playerDefeat !== DefeatTypes.NO_DEFEAT) {
					victoryType = 'age-end-banner-elimination';
				} else {
					const victories: VictoryManagerLibrary_VictoryInfo[] = Game.VictoryManager.getVictories();

					victories.forEach((value: VictoryManagerLibrary_VictoryInfo) => {
						// if this victory is for us and we're first place
						if (player.team == value.team && value.place == 1) {
							const victoryDefinition: VictoryDefinition | null = GameInfo.Victories.lookup(value.victory);
							if (!victoryDefinition) {
								console.error("age-transition-banner: Couldn't find victory definition!");
							} else {
								const victoryName = victoryDefinition.VictoryClassType.slice(14);		// remove "VICTORY_CLASS_"
								victoryType = "age-end-banner-" + victoryName.toLowerCase();
							}
						}
					})
				}
			} else {
				console.error("age-transition-banner: Couldn't get local player definition!");
			}
			Sound.onGameplayEvent(GameplayEvent.WILCO);
			UI.sendAudioEvent(victoryType);
			UI.sendAudioEvent("age-end-banner");
		}
		else if (ageTransitionType == "age-start") {
			UI.sendAudioEvent("age-begin-banner");
		}

		// TODO - Dispatch an event signalling the banner has faded out by listening for the animations driving it to end.
		// Currently hard-coding the delay based on the current animation set.
		this.fadeOutTimeoutCallback = setTimeout(() => {
			this.fadeOutTimeoutCallback = 0;
			this.Root.dispatchEvent(new CustomEvent('age-transition-banner-faded-out', {}));
		}, 10000);
	}

	onDetach(): void {
		if (this.fadeOutTimeoutCallback != 0) {
			clearTimeout(this.fadeOutTimeoutCallback);
		}
		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}
		// stop pause menu from popping up during the banner animation
		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu' || inputEvent.detail.name == 'keyboard-escape') {
			inputEvent.stopPropagation();
			return;
		}
	}
}

Controls.define('age-transition-banner', {
	createInstance: AgeTranstionBanner,
	description: 'Age Transition Banner',
	content: ["fs://game/base-standard/ui/age-transition-banner/age-transition-banner.html"],
	styles: ["fs://game/base-standard/ui/age-transition-banner/age-transition-banner.css"],
	classNames: ["absolute", "size-full", "flex", "items-center", "justify-center"],
});