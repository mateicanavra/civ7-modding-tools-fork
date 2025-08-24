/**
 * @file fxs-header.ts
 * @copyright 2020-2024, Firaxis Games
 */
/**
 * A header for a screen or panel
 * When the element is attached to the DOM, if font classes are not specified, "text-secondary" and "font-title-lg" are added.
 */
export class FxsHeader extends Component {
    constructor() {
        super(...arguments);
        /**
         * Whether or not a render was queued to for the component due to modifications.
         */
        this.renderQueued = false;
    }
    get titleText() {
        return this.Root.getAttribute('title');
    }
    get filigreeStyle() {
        return this.Root.getAttribute("filigree-style") ?? "h3";
    }
    get truncate() {
        return this.Root.getAttribute("truncate") === "true" ? "truncate" : "";
    }
    get fontFitClassName() {
        const mode = this.Root.getAttribute("font-fit-mode");
        switch (mode) {
            case 'shrink':
                return 'font-fit-shrink';
            case 'fit':
                return 'font-fit';
            default:
                return null;
        }
    }
    get whitespaceWrapClassName() {
        const mode = this.Root.getAttribute("wrap");
        switch (mode) {
            case 'nowrap':
                return 'whitespace-nowrap';
            case 'break':
                return 'break-words';
            default:
                return null;
        }
    }
    get fontMinSize() {
        return this.Root.getAttribute("font-min-size");
    }
    onInitialize() {
        super.onInitialize();
        this.Root.role = "heading";
    }
    onAttach() {
        let needsDefaultTextClasses = true;
        for (const className of this.Root.classList) {
            if (className.startsWith("text") || className.startsWith("font")) {
                needsDefaultTextClasses = false;
                break;
            }
        }
        this.Root.classList.add('uppercase', 'tracking-100', 'text-gradient-secondary', 'text-center', 'justify-center', 'max-w-full', 'pointer-events-auto');
        if (needsDefaultTextClasses) {
            this.Root.classList.add('font-title', 'text-lg');
        }
        this.render();
    }
    onDetach() {
        this.Root.innerHTML = '';
    }
    onAttributeChanged(_name, _oldValue, _newValue) {
        if (!this.renderQueued) {
            this.renderQueued = true;
            queueMicrotask(this.render.bind(this));
        }
    }
    render() {
        this.renderQueued = false;
        if (this.Root.isConnected) {
            this.Root.innerHTML = this.getStyleHtml(this.filigreeStyle, this.titleText);
        }
    }
    generateText(text) {
        const textClass = [this.truncate, this.fontFitClassName, this.whitespaceWrapClassName, 'flex-auto', 'max-w-full', this.Root.getAttribute("text-class") ?? ""].filter(Boolean).join(" ");
        return `<div class="${textClass}" ${this.fontMinSize ? `style="coh-font-fit-min-size: ${this.fontMinSize};"` : ""} data-l10n-id="${text}"></div>`;
    }
    getStyleHtml(style, text) {
        if (!text || text?.length === 0) {
            return "";
        }
        switch (style) {
            case "none":
                return this.generateText(text);
            case "h1":
                this.Root.ariaLevel = "1";
                return `
					<div class="flex flex-col items-center max-w-full">
						${this.generateText(text)}
						<div class="filigree-divider-h1"></div>
					</div>
				`;
            case "h2":
                this.Root.ariaLevel = "2";
                return `
					<div class="flex flex-col items-center max-w-full">
						${this.generateText(text)}
						<div class="filigree-divider-h2"></div>
					</div>
				`;
            case "h3":
                this.Root.ariaLevel = "3";
                return `
					<div class="flex flex-col items-center max-w-full">
						${this.generateText(text)}
						<div class="filigree-divider-h3"></div>
					</div>
				`;
            case "h4":
                this.Root.ariaLevel = "4";
                return `
					<div class="flex justify-center max-w-full items-center">
						<div class="filigree-h4-left"></div>
						<div class="flow-row">
							${this.generateText(text)}
						</div>
						<div class="filigree-h4-right"></div>
					</div>
				`;
            case "small":
                this.Root.ariaLevel = "5";
                return `
					<div class="flex flex-col items-center max-w-full">
						${this.generateText(text)}
						<div class="filigree-shell-small mt-2\\.5"></div>
					</div>
				`;
            default:
                console.warn(`fxs-header - Invalid header style "${style}" for text ${text}`);
        }
        return "";
    }
}
Controls.define('fxs-header', {
    createInstance: FxsHeader,
    description: 'A basic header',
    skipPostOnAttach: true,
    classNames: ['fxs-header'],
    attributes: [
        {
            name: 'title'
        },
        {
            name: 'filigree-style',
            description: 'The style of the title from the following list: none, h1, h2, h3, h4, small. Default value: h3'
        },
        {
            name: 'font-fit-mode',
            description: 'Whether to grow or shrink the text to fit the header.'
        },
        {
            name: 'wrap',
            description: 'Wheter to wrap or not the text (default: wrap)'
        },
        {
            name: 'font-min-size',
            description: 'overwrite the text min shrink size (default: 14px)'
        }
    ],
    images: [
        'fs://game/header_filigree.png',
        'fs://game/hud_divider-h2.png',
        'fs://game/hud_sidepanel_divider.png',
        'fs://game/hud_fleur.png',
        'fs://game/hud_fleur.png',
        'fs://game/shell_small-filigree.png',
        'fs://game/hud_paneltop-simple.png',
    ]
});

//# sourceMappingURL=file:///core/ui/components/fxs-header.js.map
