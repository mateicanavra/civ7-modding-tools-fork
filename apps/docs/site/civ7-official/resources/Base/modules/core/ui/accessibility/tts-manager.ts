/**
 * @file tts-manager.ts 
 * @copyright 2024, Firaxis Games
 * @description Manages text to speech integration with the UI.
 */

import ContextManager from "/core/ui/context-manager/context-manager.js";
import { IEngineInputHandler, InputEngineEvent, NavigateInputEvent } from "/core/ui/input/input-support.js";
import TooltipManager from "/core/ui/tooltips/tooltip-manager.js";

enum TextToSpeechSearchType {
	Hover,
	Focus
}

class TtsManagerImpl implements IEngineInputHandler {
	private lastRequest = 0;
	private readonly textElement = document.createElement("p");
	private textToSpeechOnHoverDelayMs = 1000;
	private textToSpeechOnHoverDelayHandle: number | null = null;
	private textToSpeechOnHoverTarget: WeakRef<Element> | null = null;
	private _isTtsSupported = true;
	private _isTextToSpeechOnHoverEnabled = false;
	private _isTextToSpeechOnChatEnabled = false;

	private mouseOverListener = this.handleHover.bind(this)

	public get isTtsSupported() {
		return this._isTtsSupported;
	}

	public get isTextToSpeechOnHoverEnabled() {
		return this._isTtsSupported && this._isTextToSpeechOnHoverEnabled;
	}

	public get isTextToSpeechOnChatEnabled() {
		return this._isTtsSupported && this._isTextToSpeechOnChatEnabled;
	}

	constructor() {
		this._isTtsSupported = UI.supportsTextToSpeech();
		if (this._isTtsSupported) {
			ContextManager.registerEngineInputHandler(this);
			window.addEventListener("main-menu-return", this.handleUpdateSettings.bind(this));
			this.handleUpdateSettings();
		}
	}

	public handleHover(event: MouseEvent) {
		if (event.target) {
			// If we are already pending a hover for this element ignore this update
			const foundTarget = this.findNearestValidElement(this.reverseScanFromBody(event.target as Element));
			if (this.textToSpeechOnHoverTarget?.deref() == foundTarget) {
				return;
			}

			// If the current mouse hover does not give a valid target, cancel current speech
			if (!foundTarget) {
				if (this.textToSpeechOnHoverDelayHandle) {
					window.clearTimeout(this.textToSpeechOnHoverDelayHandle);
					this.textToSpeechOnHoverDelayHandle = null;
				}
				this.textToSpeechOnHoverTarget = null;
				return;
			}

			this.textToSpeechOnHoverTarget = new WeakRef(foundTarget);

			// Cancel existing timout if one exists
			if (this.textToSpeechOnHoverDelayHandle) {
				window.clearTimeout(this.textToSpeechOnHoverDelayHandle);
			}

			// Start the delay to narrate the text
			this.textToSpeechOnHoverDelayHandle = window.setTimeout(() => {
				const target = this.textToSpeechOnHoverTarget?.deref();
				this.textToSpeechOnHoverDelayHandle = null;
				this.textToSpeechOnHoverTarget = null;

				if (target) {
					this.stopSpeaking();
					this.speakElement(target as Element);
				}
			}, this.textToSpeechOnHoverDelayMs);
		}
	}

	public handleInput(event: InputEngineEvent): boolean {
		if (event.detail.status == InputActionStatuses.FINISH) {
			if (event.detail.name == "text-to-speech-keyboard") {
				this.handleSpeakRequest(TextToSpeechSearchType.Hover);
			} else if (event.detail.name == "text-to-speech-controller") {
				this.handleSpeakRequest(TextToSpeechSearchType.Focus);
			}
		}

		return true;
	}

	public handleNavigation(_navigationEvent: NavigateInputEvent): boolean {
		return true;
	}

	public trySpeakElement(element: Element) {
		const validElement = this.findNearestValidElement(this.reverseScanFromBody(element));
		if (validElement) {
			this.speakElement(validElement);
		}
	}

	private handleUpdateSettings() {
		const config = Configuration.getUser();

		if (config.textToSpeechOnHover != this._isTextToSpeechOnHoverEnabled) {
			this._isTextToSpeechOnHoverEnabled = config.textToSpeechOnHover;

			if (this.isTextToSpeechOnHoverEnabled) {
				window.addEventListener("mouseover", this.mouseOverListener, true);
			} else {
				window.removeEventListener("mouseover", this.mouseOverListener, true);
			}
		}

		if (config.textToSpeechOnChat != this._isTextToSpeechOnChatEnabled) {
			this._isTextToSpeechOnChatEnabled = config.textToSpeechOnChat;
		}

		this.textToSpeechOnHoverDelayMs = config.textToSpeechOnHoverDelay;
	}

	private handleSpeakRequest(type: TextToSpeechSearchType) {
		const element = type == TextToSpeechSearchType.Hover
			? this.findNearestValidElement(this.queryScanFromBody(":hover"))
			: this.findNearestValidElement(this.queryScanFromBody(":focus-within"));

		if (element) {
			this.stopSpeaking();
			this.speakElement(element);
		}
	}

	private isTextContentElement(element: Element) {
		const tag = element.tagName.toLowerCase();
		switch (tag) {
			case "body":
			case "label":
			case "p":
				return true;
		}

		const role = element.role ?? element.getAttribute("role");
		switch (role) {
			case "alert":
			case "article":
			case "banner":
			case "button":
			case "cell":
			case "columnheader":
			case "comment":
			case "definition":
			case "heading":
			case "input":
			case "listitem":
			case "link":
			case "menuitem":
			case "note":
			case "option":
			case "paragraph":
			case "rowheader":
			case "searchbox":
			case "select":
			case "status":
			case "suggestion":
			case "textbox":
			case "tooltip":
				return true;
		}

		return (element.hasAttribute("aria-label")
			|| element.hasAttribute("alt")
			|| element.hasAttribute("data-tooltip-content"));
	}

	private * queryScanFromBody(query: string) {
		let element: HTMLElement | null = document.body;

		while (element) {
			yield element;
			element = element.querySelector(query);
		}
	}

	private reverseScanFromBody(element: Element | null) {
		const elements: Element[] = [];

		while (element && element != document.body) {
			elements.push(element);
			element = element.parentElement;
		}

		return elements.reverse();
	}

	private findNearestValidElement(elementList: Iterable<Element>): Element | null {
		let nearestElement: Element | null = null;

		for (const element of elementList) {
			// Ignore this element and decendants if it is marked as partial text
			if (element.hasAttribute("aria-hidden")) {
				break;
			}

			// Add the element to the list if it is a component that normally contains text
			if (this.isTextContentElement(element)) {
				nearestElement = element;
			}
		}

		return nearestElement;
	}

	private speakElement(element: Element) {
		const foundText = this.findText(element);

		if (foundText != null) {
			if (foundText.length > 0) {
				this.lastRequest = CohtmlSpeechAPI.addSpeechRequest(foundText);
			}

			return true;
		}

		return false;
	}

	private isElement(node: Node): node is Element {
		return node.nodeType == Node.ELEMENT_NODE;
	}

	private isText(node: Node): node is Text {
		return node.nodeType == Node.TEXT_NODE;
	}

	private getElementInnerText(element: Element) {
		const foundText: string[] = [];
		const nodesToSearch: Node[] = [element];
		while (nodesToSearch.length > 0) {
			const node = nodesToSearch.pop()!;

			if (!node) {
				continue;
			}

			if (this.isElement(node)) {
				try {
					// If an element is hidden, skip it
					const style = window.getComputedStyle(node);
					if (node.ariaHidden == "true"
						|| node.getAttribute("aria-hidden") == "true"
						|| style.visibility == "hidden"
						|| style.display == "none") {
						continue;
					}

					// If an element has an aria label, skip the inner elements and use that instead
					const label = node.getAttribute("aria-label") ?? node.ariaLabel;
					if (label != undefined) {
						// Ignore empty labels
						if (label) {
							foundText.push(label)
						}
						continue;
					}

					// Otherwise, search the children for text
					for (let i = node?.childNodes.length - 1; i >= 0; --i) {
						nodesToSearch.push(node.childNodes.item(i));
					}
				} catch {
					// Some psuedo-element nodes cannot have computed styles/attributes, ignore them 
				}
			} else if (this.isText(node)) {
				// If the element is a text node, add the text
				const text = node.textContent;
				if (text && text.length > 0) {
					foundText.push(text.replaceAll("|", ", "))
				}
			}
		}

		return foundText.join(" ");
	}

	private findText(element: Element) {
		const foundText: string[] = [];

		const addText = (text: string | null) => {
			const hasText = text && text.length > 0;

			if (hasText) {
				const plainText = Locale.plainText(text).toLowerCase();
				this.textElement.innerHTML = plainText;
				const strippedText = this.textElement.textContent;
				if (strippedText) {
					foundText.push(strippedText);
				}
			}

			return hasText;
		}

		// If the target is the html body (usually the world) return the global tooltip text being displayed
		if (element == document.body) {
			const curTooltip = TooltipManager.currentTooltip;
			if (curTooltip) {
				addText(this.getElementInnerText(curTooltip));
				return foundText.join(". ");
			} else {
				return "";
			}
		}

		// Add text in the following priority order:
		addText(element.getAttribute("alt"))
			|| addText(element.ariaLabel)
			|| addText(element.ariaValueText)
			|| addText(element.ariaValueNow)
			// '|' is commonly used as a divider but it trips up the plain text sanitizer
			|| addText(this.getElementInnerText(element));

		// Then, add all tooltip text from the element, and it's children (except select control options)
		const tooltipChildren = element.querySelectorAll("[data-tooltip-content]");
		addText(element.getAttribute("data-tooltip-content"));
		if (element.role != "select") {
			for (const tooltipChild of tooltipChildren) {
				addText(tooltipChild.getAttribute("data-tooltip-content"));
			}
		}

		// If this has a tooltip style, we need to get the text from tooltip manager
		if (element.hasAttribute("data-tooltip-style")) {
			const curTooltip = TooltipManager.currentTooltip;
			if (curTooltip) {
				addText(this.getElementInnerText(curTooltip));
			}
		}

		return foundText.length == 0 ? null : foundText.join(". ");
	}

	private stopSpeaking() {
		if (CohtmlSpeechAPI.isScheduledForSpeakingRequest(this.lastRequest)) {
			CohtmlSpeechAPI.abortCurrentRequest();
			CohtmlSpeechAPI.discardRequest(this.lastRequest);
		}
	}
}

export const TtsManager = new TtsManagerImpl();

