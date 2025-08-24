/**
 * @file fxs-subsystem-frame.ts
 * @copyright 2024, Firaxis Games
 */


export class SubsystemFrameCloseEvent extends CustomEvent<void> {
	constructor() {
		super("subsystem-frame-close", { bubbles: false });
	}
}

/**
 * A subsystem frame with built-in close button, scrolling, and header/footer.
 * 
 * - Use data-slot="header" or data-slot="footer" in HTML to put elements in specific areas (if not specified, the content area will be used).
 * - Query for .subsystem-frame__header, .subsystem-frame__content, or .subsystem-frame__footer to find these areas in TypeScript.
 * - Close events can be captured with a "subsystem-frame-close" event listener
 * - Use data-header-class and data-footer-class to add classes to the header and footer
 * This class is designed to be as static as possible so attribute updates are not supported.
 */
export class FxsSubsystemFrame extends Component {
	private topBar!: HTMLElement;
	private frameBg!: HTMLElement;
	private content!: HTMLElement;
	private closeButton?: HTMLElement;

	onInitialize() {
		super.onInitialize();
		this.render();
	}

	private handleClose() {
		this.Root.dispatchEvent(new SubsystemFrameCloseEvent());
	}

	private render() {
		this.Root.classList.add("pointer-events-auto");
		const childNodes = Array.from(this.Root.children);
		const fragment = document.createDocumentFragment();

		this.topBar = document.createElement("div");
		this.topBar.classList.add("fxs-subsystem-frame__topbar");
		fragment.appendChild(this.topBar);

		const backDropAttribute: string | null = this.Root.getAttribute("backDrop");
		if (backDropAttribute) {
			const backgroundImageContainer = document.createElement("div");
			backgroundImageContainer.classList.value = "absolute size-full pointer-events-none";
			fragment.appendChild(backgroundImageContainer);

			const backgroundImage = document.createElement("div");
			backgroundImage.style.backgroundImage = `url(${backDropAttribute})`;
			backgroundImage.classList.value = "relative bg-no-repeat bg-cover mx-3\\.5 -mb-4 grow";
			backgroundImageContainer.appendChild(backgroundImage);
		}

		const interior = document.createElement("fxs-vslot");
		interior.classList.add("flex-auto", "max-w-full");
		fragment.appendChild(interior);

		const header = document.createElement("div");
		const headerClass = this.Root.getAttribute("data-header-class");
		if (headerClass) {
			header.classList.add(...headerClass.split(" "));
		}
		header.classList.add("subsystem-frame__header");
		interior.appendChild(header);

		const noScrollContent: boolean = this.Root.hasAttribute("no-scroll");

		this.content = document.createElement(noScrollContent ? "div" : "fxs-scrollable");
		this.content.setAttribute("attached-scrollbar", "true");
		this.content.setAttribute("handle-gamepad-pan", "true");
		this.content.classList.add("subsystem-frame__content", "flex-auto");
		interior.appendChild(this.content);

		const footer = document.createElement("div");
		const footerClass = this.Root.getAttribute("data-footer-class");
		if (footerClass) {
			footer.classList.add(...footerClass.split(" "));
		}
		footer.classList.add("subsystem-frame__footer");

		interior.appendChild(footer);

		this.Root.appendChild(fragment);

		for (const childNode of childNodes) {
			const slotName = childNode.getAttribute("data-slot");

			if (slotName === "header") {
				header.appendChild(childNode);
			} else if (slotName === "footer") {
				footer.appendChild(childNode);
			} else {
				this.content.appendChild(childNode);
			}
		}

		this.frameBg = document.createElement("div");
		this.frameBg.classList.add("inset-0", "absolute", "-z-1");
		this.Root.appendChild(this.frameBg);

		this.updateSubFrameDecorators();
		this.updateContentSpacing();
		this.updateTopBar();
		this.updateFrameBg();
		this.updateRootFrameClass();

		//Make sure the close button is added last so it appears on top of everything else
		if (!this.Root.hasAttribute("no-close")) {
			this.closeButton = document.createElement("fxs-close-button");
			this.closeButton.addEventListener('action-activate', this.handleClose.bind(this));
			this.closeButton.classList.add("absolute");
			const closeGroup = this.Root.getAttribute("data-audio-close-group-ref");
			if (closeGroup) {
				this.closeButton.setAttribute("data-audio-group-ref", closeGroup);
			}

			this.Root.appendChild(this.closeButton);
		}

		this.updateCloseButton();
	}

	private updateFrameBg() {
		const outsideSafezoneMode = this.Root.getAttribute("outside-safezone-mode") ?? "none";
		this.frameBg.classList.remove("fullscreen-outside-safezone-y", "fullscreen-outside-safezone-x", "fullscreen-outside-safezone");
		switch (outsideSafezoneMode) {
			case "vertical":
				this.frameBg.classList.add('fullscreen-outside-safezone-y');
				break;
			case "horizontal":
				this.frameBg.classList.add('fullscreen-outside-safezone-x');
				break;
			case "full":
				this.frameBg.classList.add('fullscreen-outside-safezone');
				break;
		}
	}

	private updateTopBar() {
		const style: string = this.Root.getAttribute("box-style") ?? "b1";
		this.topBar.innerHTML = "";
		this.topBar.classList.remove('h-px', 'overflow-visible');
		switch (style) {
			case "b1":
				const filigree = document.createElement("div");
				filigree.classList.add("fxs-subsystem-frame__filigree");
				this.topBar.appendChild(filigree);

				const filigreeLeft = document.createElement("div");
				filigreeLeft.classList.add("filigree-panel-top-left");
				filigree.appendChild(filigreeLeft);

				const filigreeRight = document.createElement("div");
				filigreeRight.classList.add("filigree-panel-top-right");
				filigree.appendChild(filigreeRight);
				break;
			case "b2":
				const simpleFiligree = document.createElement("div");
				simpleFiligree.classList.value = "fxs-subsystem-frame__filigree w-full";
				this.topBar.appendChild(simpleFiligree);

				const simpleFiligreeImage = document.createElement("div");
				simpleFiligreeImage.classList.value = "filigree-panel-top-simplified grow mt-1 -ml-4 -mr-4";
				simpleFiligree.appendChild(simpleFiligreeImage);
				break;
			case "b3":
				this.topBar.classList.add('h-px', 'overflow-visible')
				const diploFiligree = document.createElement("div");
				diploFiligree.classList.value = "subsystem-frame__filigree-dip relative -mt-1 bg-cover w-full";
				this.topBar.appendChild(diploFiligree);
				break;
			case "b4":
				const noFrillFiligree = document.createElement("div");
				noFrillFiligree.classList.value = "fxs-subsystem-frame__filigree w-full";
				this.topBar.appendChild(noFrillFiligree);
				break;
		}
	}

	private updateContentSpacing() {
		const style: string = this.Root.getAttribute("box-style") ?? "b1";
		this.content.classList.remove("mx-3\\.5", "mx-8");
		switch (style) {
			case "b1":
				this.content.classList.add("mx-3\\.5");
				break;
			case "b2":
				this.content.classList.add("mx-3\\.5");
				break;
			case "b3":
				this.content.classList.add('mx-8');
				break;
			case "b4":
				this.content.classList.add("mx-3\\.5");
				break;
		}
	}

	private updateRootFrameClass() {
		const style: string = this.Root.getAttribute("box-style") ?? "b1";
		this.Root.classList.remove("pt-4", "m-0", "pt-14", "px-10", "pb-10");
		this.frameBg.classList.remove("frame-top-curve", "frame-box", "frame-diplo", "img-frame-f1");
		switch (style) {
			case "b1":
				this.Root.classList.add('pt-4');
				this.frameBg.classList.add("frame-top-curve");
				break;
			case "b2":
				this.Root.classList.add("frame-box", 'pt-4');
				this.frameBg.classList.add("frame-box");
				break;
			case "b3":
				this.Root.classList.add("frame-diplo");
				this.frameBg.classList.add("frame-diplo");
				break;
			case "b4":
				this.Root.classList.add('pt-4');
				this.frameBg.classList.add("frame-box");
				break;
			case "fullscreen":
				this.Root.classList.add("m-0", "pt-14", "px-10", "pb-10");
				this.frameBg.classList.add("img-frame-f1");
		}
	}

	private updateCloseButton() {
		this.closeButton?.classList.remove('top-1', 'right-1', 'top-10', 'right-10');
		const style: string = this.Root.getAttribute("box-style") ?? "b1";
		switch (style) {
			case "b1":
				this.closeButton?.classList.add('top-1', 'right-1');
				break;
			case "b2":
				this.closeButton?.classList.add('top-1', 'right-1');
				break;
			case "b3":
				this.closeButton?.classList.add('top-1', 'right-1');
				break;
			case "b4":
				this.closeButton?.classList.add('top-1', 'right-1');
				break;
			case "fullscreen":
				this.closeButton?.classList.add('top-10', 'right-10');
		}
	}

	private updateSubFrameDecorators() {
		const style: string = this.Root.getAttribute("box-style") ?? "b1";
		const filigrees = this.Root.querySelectorAll(".img-frame-filigree");
		filigrees.forEach(elem => this.Root.removeChild(elem));
		const diploTint = this.Root.querySelector(".subsystem-frame__diplo-tint");
		if (diploTint) {
			this.Root.removeChild(diploTint);
		}
		switch (style) {
			case "b3":
				this.Root.insertAdjacentHTML('afterbegin', '<div class="subsystem-frame__diplo-tint absolute inset-0 bg-top bg-no-repeat"></div>')
				break;
			case "fullscreen":
				this.Root.insertAdjacentHTML('afterbegin', `
					<div class="absolute top-0 left-4 bottom-0 h-1\\/2 w-64 mt-4 img-frame-filigree pointer-events-none"></div>
					<div class="absolute top-0 right-4 bottom-0 h-1\\/2 w-64 mt-4 rotate-y-180 img-frame-filigree pointer-events-none"></div>
				`);
		}
	}

	onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
		super.onAttributeChanged(name, oldValue, newValue);
		switch (name) {
			case "box-style":
				this.updateSubFrameDecorators();
				this.updateRootFrameClass();
				this.updateFrameBg();
				this.updateContentSpacing();
				this.updateTopBar();
				this.updateCloseButton();
				break;
			case "outside-safezone-mode":
				this.updateFrameBg();
		}
	}
}

Controls.define('fxs-subsystem-frame', {
	createInstance: FxsSubsystemFrame,
	description: 'A subsystem frame',
	classNames: ['fxs-subsystem-frame', 'z-1'],
	attributes: [
		{
			name: "box-style",
		},
		{
			name: "outside-safezone-mode",
		}
	],
	images: [
		'fs://game/hud_sidepanel_bg.png',
		'fs://game/hud_squarepanel-bg.png',
	],
});

declare global {
	interface HTMLElementTagNameMap {
		'fxs-subsystem-frame': ComponentRoot<FxsSubsystemFrame>;
	}

	interface HTMLElementEventMap {
		"subsystem-frame-close": SubsystemFrameCloseEvent;
	}
}
