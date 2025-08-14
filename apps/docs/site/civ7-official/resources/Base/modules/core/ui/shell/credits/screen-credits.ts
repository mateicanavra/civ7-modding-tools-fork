/**
 * @file screen-credits.ts 
 * @copyright 2024, Firaxis Games
 * @description Credits roll.
 * 
 * Credits are represented by lines with a CRLF used to separate.
 * A default style is applied to each line unless a modifer is at the front of the line.
 * A modifier is specified in brackets: [] 
 * A comma between modifiers to specify more than one: [3,r]
 * Sometimes a modifier will mean to not display the line after it, but instead use that line as input: [m]BUILDING_TACO_GONG
 *
 * The list of modifiers are as follows:
 * 	0	no style
 * 	1	title style
 * 	2	sub-title style
 * 	3	role style
 * 	4	name style
 *  l	left align (models only)
 * 	c	center align (models only)
 * 	r	right align (models only)
 *  i	image
 *	m	model
 *	rm	remove model (deprecated)
 *	x	remove model
 *	s	scroll (NOT IMPL, default)
 *	f	fade (NOT IMPL)
 */

import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import Panel from '/core/ui/panel-support.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';

/*	Locales
	en_US
	de_DE
	es_ES
	fr_FR
	it_IT
	ja_JP
	ko_KR
	pl_PL
	pt_BR
	ru_RU
	zh_Hans_CN
	zh_Hant_HK
 */

export const ScreenCreditsOpenedEventName = 'screen-credits-opened' as const;
class ScreenCreditsOpenedEvent extends CustomEvent<{}> {
	constructor() {
		super(ScreenCreditsOpenedEventName, { bubbles: false, cancelable: true });
	}
}

export const ScreenCreditsClosedEventName = 'screen-credits-closed' as const;
class ScreenCreditsClosedEvent extends CustomEvent<{}> {
	constructor() {
		super(ScreenCreditsClosedEventName, { bubbles: false, cancelable: true });
	}
}

const LOADING_MAX_MS = 9000;	// Max ms to wait for loading the credits file.

enum Speeds {
	NORMAL = 24,
	FAST = 64,
	VERY_FAST = 128,
	PLAID = 256		// TODO: Fix speedy items adding gaps.
}

enum Position {
	LEFT,
	CENTER,
	RIGHT,
}

interface XYZ {
	x: number;
	y: number;
	z: number
}

const PositionLookup: { [key in Position]: XYZ } = {
	[Position.LEFT]: { x: 15, y: -36.7115, z: 10 },
	[Position.RIGHT]: { x: -15, y: -36.7115, z: 10 },
	[Position.CENTER]: { x: 0, y: -36.7115, z: 10 }
};


/** State of the credits screen */
enum State {
	LOADING,
	READY,
	PLAY,
	PAUSE,
	CLOSING,
	ERROR
}

/** Operations that can be set on a line */
enum Op {
	no_style = 0,
	title_style = 1,
	subtitle_style = 2,
	role_style = 3,
	name_style = 4,
	left_align = 5,
	center_align = 6,
	right_align = 7,
	image = 8,
	model = 9,
	remove_model = 10,
}

/** Holds an operation and optional value on it. */
class Command {
	constructor(public op: Op, public value: string) { }
}


class ScreenCredits extends Panel {
	// Events
	private engineInputListener = this.onEngineInput.bind(this);
	private fastForwardListener = this.onFastForward.bind(this);
	private pauseListener = this.onPause.bind(this);
	private updateListener = this.onUpdate.bind(this);
	private activeDeviceTypeListener = this.onActiveDeviceTypeChanged.bind(this);

	private UIElements: HTMLElement[] = [];								// Non-screen elements to "turn off" during display.
	private readonly pool: HTMLElement = document.createElement('div');	// Element to pool non-active elements off of.
	private state: State = State.LOADING;								// State of this object.
	private lines: string[] = [];										// Actual credits
	private commands = new Map<number, Command[]>();					// Formatting commands (line #, command)
	private index: number = 0;
	private speed = Speeds.NORMAL;
	private lastTime: number = 0;
	private scroller!: HTMLElement;			// holds scrolling content
	private pauseButton!: HTMLElement;
	private fastForwardButton!: HTMLElement;


	// 3D Model related
	private model3D: WorldUI.ModelInstance | null = null;
	private creditsModelGroup: WorldUI.ModelGroup | null = null;
	private darkCardsModelGroup: WorldUI.ModelGroup | null = null;
	private cameraPushes = 0;



	// Load credits
	constructor(root: ComponentRoot) {
		super(root);
		this.lastTime = Date.now();
		this.fetchCredits('fs://game/core/ui/shell/credits/credits-base.xml')
			.then((creditLines) => {
				if (!(typeof creditLines === 'string')) {
					this.error("Unable to fetch credits.")
					return;
				}
				if (this.parse(creditLines)) {
					this.state = State.READY;
				} else {
					this.error("Error parsing the credits file.");
				}
			})
	}

	private error(message: string) {
		console.error(message);
		this.state = State.ERROR;
	}

	protected requestClose() {
		this.playSound('data-audio-activate', 'data-audio-activate-ref');
		this.state = State.CLOSING;
	}

	public onInitialize(): void {
		super.onInitialize();

		this.scroller = MustGetElement(".credits-scroller", this.Root);
		this.Root.classList.add('size-full', 'relative');

		const closeButton: HTMLElement = document.createElement('fxs-close-button');
		closeButton.addEventListener('action-activate', () => {
			this.requestClose();
		});
		this.Root.appendChild(closeButton);

		const holder = MustGetElement(".credits-buttons", this.Root);

		this.pauseButton = document.createElement("fxs-button");
		this.pauseButton.setAttribute('caption', Locale.compose("LOC_CREDITS_PAUSE"));
		this.pauseButton.addEventListener('action-activate', this.pauseListener);
		holder.appendChild(this.pauseButton);

		this.fastForwardButton = document.createElement("fxs-button");
		this.fastForwardButton.setAttribute('caption', Locale.compose("LOC_CREDITS_FAST_FORWARD"));
		this.fastForwardButton.addEventListener('action-activate', this.fastForwardListener);
		holder.appendChild(this.fastForwardButton);

		this.realizeInputType(ActionHandler.isGamepadActive);
	}


	public onAttach(): void {
		super.onAttach();
		this.hideUI();	// Hide main menu, network elements, etc.

		this.creditsModelGroup = WorldUI.createModelGroup("creditsModelGroup");

		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);
		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
		window.requestAnimationFrame(this.updateListener);
		window.dispatchEvent(new ScreenCreditsOpenedEvent());

		engine.on('InviteAccepted', this.onInviteAccepted.bind(this));

	}


	public onDetach(): void {

		engine.off('InviteAccepted', this.onInviteAccepted.bind(this));

		if (this.state != State.CLOSING) {
			console.warn(`Detatching credits when state isn't closing('${State.CLOSING}') but is '${this.state}'`);
			this.state = State.CLOSING;
		}

		// NOTE: Camera popping should have happened before detatch or it may be mismatched
		// with what is being added by the main menu when heading back.

		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);
		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
		this.creditsModelGroup?.destroy();
		this.darkCardsModelGroup?.destroy();
		this.creditsModelGroup = null;
		this.darkCardsModelGroup = null;

		this.restoreUI();	// Restore the non-credits screen user interface.
		super.onDetach();
	}

	onInviteAccepted() {
		// We've hidden the main menu, and accepted an invite
		// need to initiate the exit flow so the assets are cleaned properly
		this.state = State.CLOSING;
	}

	/**
	 * Received focus from the context manager (not focus manager!)
	 */
	onReceiveFocus() {
		super.onReceiveFocus();
		NavTray.clear();
		NavTray.addOrUpdateGenericBack();
		NavTray.addOrUpdateShellAction1("LOC_CREDITS_PAUSE");
		NavTray.addOrUpdateShellAction2("LOC_CREDITS_FAST_FORWARD");
		FocusManager.setFocus(this.Root);
	}

	/**
	 * Loses focus from the context manager.
	 */
	onLoseFocus() {
		NavTray.clear();
		super.onLoseFocus();
	}


	/**
	 * Main loop driving the credits.
	 */
	public onUpdate(_delta: number) {

		switch (this.state) {
			case State.ERROR:
				console.log("Leaving credits update() due to error.")
				this.state = State.CLOSING;
				break;
			case State.READY:
				if (this.Root.isConnected) {
					this.initScrolling();
					this.state = State.PLAY;
				}
				break;
			case State.LOADING:
				if ((Date.now() - this.lastTime) > LOADING_MAX_MS) {
					this.error("Credits exceeded max time to load the credits; erroring out.");
				}
				break;
			case State.PLAY:
				this.scroll();
				break;
			case State.PAUSE:
				// Nothing to do.
				break;
			case State.CLOSING:
				if (this.pool) {
					while (this.pool.children.length > 0) {
						this.pool.removeChild(this.pool.children[0]);
					}
					this.Root.removeChild(this.pool);
				}
				while (this.cameraPushes > 0) {
					this.clear3DScene();
				}
				window.dispatchEvent(new ScreenCreditsClosedEvent());
				this.close();
				return;		// Leave so as to not re-up the update loop.
			default:
				this.error(`Unknown state ${this.state} in credits update.`);
				break;
		}

		window.requestAnimationFrame(this.updateListener);
	}

	private onPause() {
		const caption: string = (this.state == State.PAUSE) ?
			Locale.compose("LOC_CREDITS_PAUSE") :
			Locale.compose("LOC_CREDITS_PLAY");
		this.pauseButton.setAttribute('caption', caption);	// KBM
		NavTray.addOrUpdateShellAction1(caption);			// Gamepad

		switch (this.state) {
			case State.PAUSE:
				this.state = State.PLAY;
				break;
			case State.PLAY:
				this.state = State.PAUSE;
				break;
			default:
				console.warn(`Unable to pause credit when state is ('${this.state}'`);
				break;
		}
	}

	private onFastForward() {
		const caption: string = (this.speed != Speeds.NORMAL) ?
			Locale.compose("LOC_CREDITS_FAST_FORWARD") :
			Locale.compose("LOC_CREDITS_SLOW_DOWN");
		this.fastForwardButton.setAttribute('caption', caption);	// KBM
		NavTray.addOrUpdateShellAction2(caption);					// Gamepad

		switch (this.speed) {
			case Speeds.NORMAL: this.speed = Speeds.FAST; break;
			case Speeds.FAST: this.speed = Speeds.NORMAL; break;
			case Speeds.VERY_FAST: this.speed = Speeds.NORMAL; break;	// TODO: Fix spacing, Speeds.VERY_FAST; break;
			case Speeds.PLAID: this.speed = Speeds.NORMAL; break;		// TODO: Fix spacing, Speeds.PLAID; break;
			default: this.speed = Speeds.NORMAL;
		}
	}

	public onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}
		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
			this.state = State.CLOSING;
		}
		if (inputEvent.detail.name == "shell-action-1") {
			this.onPause();
		}
		if (inputEvent.detail.name == "shell-action-2") {
			this.onFastForward();
		}
		inputEvent.stopPropagation();
		inputEvent.preventDefault();
	}

	private onActiveDeviceTypeChanged(event: CustomEvent) {
		this.realizeInputType(event.detail?.gamepadActive);
	}

	private realizeInputType(isGamepad: boolean) {
		const closeButton = MustGetElement('fxs-close-button', this.Root);
		closeButton.classList.toggle('hidden', isGamepad);
		this.pauseButton.classList.toggle('hidden', isGamepad);
		this.fastForwardButton.classList.toggle('hidden', isGamepad);
	}


	private initScrolling() {
		this.index = 0;
		this.pool.classList.add('invisible');
		this.Root.appendChild(this.pool);
		while (this.scroller.children.length > 0) {
			this.scroller.removeChild(this.scroller.children[0]);
		}
		if (!this.addNextLine()) {
			this.error("Immediately failed to add a line to the credits scroller.");
		}
	}

	/**
	 * Add the next line of content to the credits.
	 * @returns true if line is added, false otherwise
	 */
	private addNextLine() {
		if (this.index >= this.lines.length) {
			return false;
		}

		const fontClasses: string[] = [];
		const content = this.lines[this.index];
		const commands = this.commands.get(this.index);
		let imageName = "";
		let modelName = "";
		let position: Position = Position.LEFT;
		let removing = false;
		if (commands) {
			commands.forEach((command) => {
				switch (command.op) {
					case Op.right_align:
						position = Position.RIGHT;
						break;
					case Op.left_align:
						position = Position.LEFT;
						break;
					case Op.center_align:
						position = Position.CENTER;
						break;
					case Op.no_style:
						break;
					case Op.title_style:
						fontClasses.push("credits-section__title", "font-title");
						break;
					case Op.subtitle_style:
						fontClasses.push("credits-section__subtitle", "font-body");
						break;
					case Op.role_style:
						fontClasses.push("credits-section__role", "font-body");
						break;
					case Op.name_style:
						fontClasses.push("credits-section__name", "font-title");
						break;
					case Op.image:
						imageName = command.value;
						break;
					case Op.model:
						modelName = command.value;
						break;
					case Op.remove_model:
						modelName = command.value;
						removing = true;
						break;
				}
			});
		}

		this.index++;
		const screenHeight = window.innerHeight;

		if (imageName.length > 1) {
			const el = this.getRow();
			el.classList.add("credits-image-row");
			el.style.transition = "transform 0.1s linear";
			el.style.transform = `translateY(${screenHeight}px)`

			const holder = document.createElement("div");
			holder.classList.add("credits-image-holder");

			const imageElement: HTMLImageElement = document.createElement("img");
			imageElement.classList.add("credits-image");
			imageElement.setAttribute("src", `fs://game/${imageName}`);

			holder.appendChild(imageElement);
			el.appendChild(holder);
			this.scroller.appendChild(el);
		} else if (removing) {
			// TODO: handle removing specific model, currently sledgehammers
			this.clear3DScene();
		} else if (modelName.length > 1) {
			this.build3DScene(modelName, position);
		} else {
			// If no command is associated with the line at all, 
			// and we're adding text, assume it's the common case
			// of adding a name.
			if (!commands) {
				fontClasses.push("credits-section__name");
			}
			const el = this.getRow();
			el.classList.add("credits-text-row", ...fontClasses);
			el.style.transition = "transform 0.1s linear";
			el.style.transform = `translateY(${screenHeight}px)`
			el.innerHTML = content;
			this.scroller.appendChild(el);
		}

		return true;
	}


	// Return to the pool for future use.
	private removeRow(row: HTMLElement) {
		this.pool.appendChild(this.scroller.removeChild(row));
		row.style.transition = "";
	}

	// Obtain row for credits scrolling
	private getRow(): HTMLElement {
		// If pool exists and row is available in it, hand that out.
		if (this.pool && this.pool.children.length > 1) {
			const el = this.pool.children[this.pool.children.length - 1];
			if (el instanceof HTMLElement) {
				el.innerHTML = "";
				el.className = "";
				return el;
			}
		}
		return document.createElement('p');	// no existing row available, create fresh one
	}

	private scroll() {
		const screenHeight = window.innerHeight;
		let add = true;
		for (let i = 0; i < this.scroller.children.length; i++) {
			const child = this.scroller.children[i] as HTMLElement;
			if (child instanceof HTMLImageElement) {
				continue;
			}
			const rect = child.getBoundingClientRect();
			child.style.transform = `translateY(${rect.top - this.speed}px)`;
			if (rect.bottom < 0) {
				this.removeRow(child);
			} else if (rect.bottom > screenHeight) {
				add = false;	// Don't add more, one item still at the fold.
			}
		}

		if (add) {											// Add another line.
			if (!this.addNextLine()) {						// but if it fails
				if (this.scroller.children.length < 1) {	// and scroller is done
					this.close();							// leave.
				}
			}
		}
	}

	private hideUI() {
		if (this.UIElements.length > 0) {
			console.error("Credits hiding UI elements but has existing elements already (left over) in it.");
		}
		this.UIElements.push(MustGetElement('main-menu', document));
		if (Network.supportsSSO()) {
			this.UIElements.push(MustGetElement('.carousel', document));
			this.UIElements.push(MustGetElement('profile-header', document));
			this.UIElements.push(MustGetElement('.connection-icon-img', document));
			this.UIElements.push(MustGetElement('.connection-status', document));
			this.UIElements.push(MustGetElement('.account-status', document));
		}
		this.UIElements.forEach((element) => {
			element.classList.add("invisible");
		})
	}

	private restoreUI() {
		this.UIElements.forEach((element) => {
			element.classList.remove("invisible");
		})
		this.UIElements = [];
	}


	private build3DScene(assetId: string, position: Position) {
		const eye = PositionLookup[position];
		const at = { ...PositionLookup[position], y: 0 };	// zero out "y"
		Camera.pushCamera(eye, at);		// Must be matching pop-camera when leaving the scene.
		this.cameraPushes++;
		const model3dMarker: WorldUI.Marker | null = WorldUI.createFixedMarker({ x: -1.5, y: 0, z: 0 });
		const centerGradientMarker: WorldUI.Marker | null = WorldUI.createFixedMarker({ x: eye.x, y: -10, z: 0 });
		this.creditsModelGroup?.clear();
		if (this.creditsModelGroup && model3dMarker != null && centerGradientMarker != null) {
			this.creditsModelGroup.addVFX("VFX_Credits_Fade_Whole_Screen", { marker: model3dMarker, offset: { x: 0, y: -10, z: 0 } }, { angle: 0, scale: 1.0 });
			this.creditsModelGroup.addModel("VFX_Credits_Fade_Card", { marker: centerGradientMarker, offset: { x: 0, y: 0, z: 0 } }, { angle: 0, scale: 0.6, foreground: true, needsShadows: false });
			this.model3D = this.creditsModelGroup.addModel(assetId, { marker: model3dMarker, offset: { x: 0, y: 0, z: 0 } }, { angle: 0, scale: 0.9, initialState: "IDLE_CharSelect", triggerCallbacks: true });
			if (this.model3D == null) {
				this.model3D = this.creditsModelGroup.addModel("LEADER_FALLBACK_GAME_ASSET", { marker: model3dMarker, offset: { x: 0, y: 0, z: 0 } }, { angle: 0, scale: 0.9, initialState: "IDLE_CharSelect", triggerCallbacks: true });
			}
		}
	}


	private clear3DScene() {
		if (this.model3D) {
			this.creditsModelGroup?.clear();
			this.model3D = null;
		}
		if (this.cameraPushes > 0) {
			Camera.popCamera();
			this.cameraPushes--;
		}
	}


	private async fetchCredits(url: string) {
		try {
			const content = await asyncLoad(url);
			const creditsStartTag = "<credits>";
			const creditsEndTag = "</credits>";

			const startIdx = content.indexOf(creditsStartTag);
			const endIdx = content.indexOf(creditsEndTag, startIdx + creditsStartTag.length);

			if (startIdx === -1 || endIdx === -1) {
				console.error("Invalid XML: <credits> tag not found.");
				return [];
			}

			let creditsContent = content.substring(startIdx + creditsStartTag.length, endIdx).trim();

			// Check if the content is within a CDATA section
			const cdataStartTag = "<![CDATA[";
			const cdataEndTag = "]]>";

			if (creditsContent.startsWith(cdataStartTag) && creditsContent.endsWith(cdataEndTag)) {
				// Strip the CDATA tags
				creditsContent = creditsContent.substring(
					cdataStartTag.length,
					creditsContent.length - cdataEndTag.length
				).trim();
			}
			return creditsContent;

		} catch (error) {
			console.error('Error fetching credits:', error);
			return;
		}
	}

	private parse(blob: string) {
		// Step 1, break into lines:
		//		^ 		= start of line
		//		[ \t]+ 	= match one or more tabs/spaces
		//		g 		= global
		//		m		= multiline
		this.lines = blob.replace(/^[ \t]+/gm, "").split(/\r?\n/);

		// Step 2, extract formatting codes
		this.lines.forEach((line, index) => {
			const matches = line.match(/\[(.*?)\]/g); // Find all bracketed [ ] parts on the line.
			if (!matches) {
				return; //  No commands on the line; skip.
			}

			const commands: Command[] = [];
			let processedLine = line; // Make a copy to hold processed lines.

			matches.forEach(match => {
				const values = match.replace(/[\[\]]/g, '').split(','); // Remove brackets and split by comma
				values.forEach(value => {
					let command: Command | null = null;
					switch (value.trim()) {
						case '0': command = new Command(Op.no_style, ''); break;
						case '1': command = new Command(Op.title_style, ''); break;
						case '2': command = new Command(Op.subtitle_style, ''); break;
						case '3': command = new Command(Op.role_style, ''); break;
						case '4': command = new Command(Op.name_style, ''); break;
						case 'l': command = new Command(Op.left_align, ''); break;
						case 'c': command = new Command(Op.center_align, ''); break;
						case 'r': command = new Command(Op.right_align, ''); break;
						case 'i':
						case 'm':
						case 'rm':
						case 'x':
							command = new Command(
								value.trim() === 'i' ? Op.image :
									value.trim() === 'm' ? Op.model :
										Op.remove_model,
								processedLine.replace(/\[.*?\]/g, '').trim() // Get the value outside of brackets
							);
							processedLine = ""; // Clear the line if a value is taken for these commands
							break;
					}

					if (command) {
						commands.push(command);
					}
				});
			});

			// Update the original lines array to exclude any formatting brackets
			this.lines[index] = processedLine.replace(/\[.*?\]/g, '').trim();

			if (commands.length > 0) {
				this.commands.set(index, commands);
			}
		});

		return true;
	}
}


Controls.define('screen-credits', {
	createInstance: ScreenCredits,
	description: 'Civ Credits Screen',
	classNames: ['screen-credits'],
	styles: ['fs://game/core/ui/shell/credits/screen-credits.css'],
	content: ['fs://game/core/ui/shell/credits/screen-credits.html'],
	tabIndex: -1
});


declare global {
	interface HTMLElementEventMap {
		[ScreenCreditsOpenedEventName]: ScreenCreditsOpenedEvent;
		[ScreenCreditsClosedEventName]: ScreenCreditsClosedEvent;
	}
}