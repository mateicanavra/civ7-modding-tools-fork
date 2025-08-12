/**
 * @file tts-manager.ts
 * @copyright 2024, Firaxis Games
 * @description Manages text to speech integration with the UI.
 */
import ContextManager from "/core/ui/context-manager/context-manager.js";
import TooltipManager from "/core/ui/tooltips/tooltip-manager.js";
var TextToSpeechSearchType;
(function (TextToSpeechSearchType) {
    TextToSpeechSearchType[TextToSpeechSearchType["Hover"] = 0] = "Hover";
    TextToSpeechSearchType[TextToSpeechSearchType["Focus"] = 1] = "Focus";
})(TextToSpeechSearchType || (TextToSpeechSearchType = {}));
class TtsManagerImpl {
    get isTtsSupported() {
        return this._isTtsSupported;
    }
    get isTextToSpeechOnHoverEnabled() {
        return this._isTtsSupported && this._isTextToSpeechOnHoverEnabled;
    }
    get isTextToSpeechOnChatEnabled() {
        return this._isTtsSupported && this._isTextToSpeechOnChatEnabled;
    }
    constructor() {
        this.lastRequest = 0;
        this.textElement = document.createElement("p");
        this.textToSpeechOnHoverDelayMs = 1000;
        this.textToSpeechOnHoverDelayHandle = null;
        this.textToSpeechOnHoverTarget = null;
        this._isTtsSupported = true;
        this._isTextToSpeechOnHoverEnabled = false;
        this._isTextToSpeechOnChatEnabled = false;
        this.mouseOverListener = this.handleHover.bind(this);
        this._isTtsSupported = UI.supportsTextToSpeech();
        if (this._isTtsSupported) {
            ContextManager.registerEngineInputHandler(this);
            window.addEventListener("main-menu-return", this.handleUpdateSettings.bind(this));
            this.handleUpdateSettings();
        }
    }
    handleHover(event) {
        if (event.target) {
            // If we are already pending a hover for this element ignore this update
            const foundTarget = this.findNearestValidElement(this.reverseScanFromBody(event.target));
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
                    this.speakElement(target);
                }
            }, this.textToSpeechOnHoverDelayMs);
        }
    }
    handleInput(event) {
        if (event.detail.status == InputActionStatuses.FINISH) {
            if (event.detail.name == "text-to-speech-keyboard") {
                this.handleSpeakRequest(TextToSpeechSearchType.Hover);
            }
            else if (event.detail.name == "text-to-speech-controller") {
                this.handleSpeakRequest(TextToSpeechSearchType.Focus);
            }
        }
        return true;
    }
    handleNavigation(_navigationEvent) {
        return true;
    }
    trySpeakElement(element) {
        const validElement = this.findNearestValidElement(this.reverseScanFromBody(element));
        if (validElement) {
            this.speakElement(validElement);
        }
    }
    handleUpdateSettings() {
        const config = Configuration.getUser();
        if (config.textToSpeechOnHover != this._isTextToSpeechOnHoverEnabled) {
            this._isTextToSpeechOnHoverEnabled = config.textToSpeechOnHover;
            if (this.isTextToSpeechOnHoverEnabled) {
                window.addEventListener("mouseover", this.mouseOverListener, true);
            }
            else {
                window.removeEventListener("mouseover", this.mouseOverListener, true);
            }
        }
        if (config.textToSpeechOnChat != this._isTextToSpeechOnChatEnabled) {
            this._isTextToSpeechOnChatEnabled = config.textToSpeechOnChat;
        }
        this.textToSpeechOnHoverDelayMs = config.textToSpeechOnHoverDelay;
    }
    handleSpeakRequest(type) {
        const element = type == TextToSpeechSearchType.Hover
            ? this.findNearestValidElement(this.queryScanFromBody(":hover"))
            : this.findNearestValidElement(this.queryScanFromBody(":focus-within"));
        if (element) {
            this.stopSpeaking();
            this.speakElement(element);
        }
    }
    isTextContentElement(element) {
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
    *queryScanFromBody(query) {
        let element = document.body;
        while (element) {
            yield element;
            element = element.querySelector(query);
        }
    }
    reverseScanFromBody(element) {
        const elements = [];
        while (element && element != document.body) {
            elements.push(element);
            element = element.parentElement;
        }
        return elements.reverse();
    }
    findNearestValidElement(elementList) {
        let nearestElement = null;
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
    speakElement(element) {
        const foundText = this.findText(element);
        if (foundText != null) {
            if (foundText.length > 0) {
                this.lastRequest = CohtmlSpeechAPI.addSpeechRequest(foundText);
            }
            return true;
        }
        return false;
    }
    isElement(node) {
        return node.nodeType == Node.ELEMENT_NODE;
    }
    isText(node) {
        return node.nodeType == Node.TEXT_NODE;
    }
    getElementInnerText(element) {
        const foundText = [];
        const nodesToSearch = [element];
        while (nodesToSearch.length > 0) {
            const node = nodesToSearch.pop();
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
                            foundText.push(label);
                        }
                        continue;
                    }
                    // Otherwise, search the children for text
                    for (let i = node?.childNodes.length - 1; i >= 0; --i) {
                        nodesToSearch.push(node.childNodes.item(i));
                    }
                }
                catch {
                    // Some psuedo-element nodes cannot have computed styles/attributes, ignore them 
                }
            }
            else if (this.isText(node)) {
                // If the element is a text node, add the text
                const text = node.textContent;
                if (text && text.length > 0) {
                    foundText.push(text.replaceAll("|", ", "));
                }
            }
        }
        return foundText.join(" ");
    }
    findText(element) {
        const foundText = [];
        const addText = (text) => {
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
        };
        // If the target is the html body (usually the world) return the global tooltip text being displayed
        if (element == document.body) {
            const curTooltip = TooltipManager.currentTooltip;
            if (curTooltip) {
                addText(this.getElementInnerText(curTooltip));
                return foundText.join(". ");
            }
            else {
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
    stopSpeaking() {
        if (CohtmlSpeechAPI.isScheduledForSpeakingRequest(this.lastRequest)) {
            CohtmlSpeechAPI.abortCurrentRequest();
            CohtmlSpeechAPI.discardRequest(this.lastRequest);
        }
    }
}
export const TtsManager = new TtsManagerImpl();
//# sourceMappingURL=file:///core/ui/accessibility/tts-manager.js.map
