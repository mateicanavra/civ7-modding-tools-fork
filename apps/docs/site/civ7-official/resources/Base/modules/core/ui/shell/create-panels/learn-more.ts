/**
 * @file learn-more.ts
 * @copyright 2025, Firaxis Games
 */

export class LearnMore extends Component {
	private reasonElement = document.createElement("div");
	private actionElement = document.createElement("fxs-text-button");

	private _contentName: string = "";
	private _tooltip: string = "";
	private _contentPack: string = "";
	private _reason: string | undefined;
	private _action: (() => void) | undefined;

	public get contentName() {
		return this._contentName;
	}

	public set contentName(value) {
		this._contentName = value;
		this.updateReasonText();
	}

	public get contentPack() {
		return this._contentPack;
	}

	public set contentPack(value) {
		this._contentPack = value;
		this.updateReasonText();
	}

	public get reason() {
		return this._reason;
	}

	public set reason(value) {
		this._reason = value;
		this.updateReasonText();
	}

	public get tooltip() {
		return this._tooltip;
	}

	public set tooltip(value) {
		this._tooltip = value;
		this.updateTooltip();
	}

	public get action() {
		return this._action;
	}

	public set action(value) {
		this._action = value;
		this.updateActionButton();
	}

	public get hasAction() {
		return this._action != undefined;
	}

	constructor(root: ComponentRoot<LearnMore>) {
		super(root);

		this.Root.classList.add('relative', 'flex', 'flex-col', 'pointer-events-auto', 'items-center', "img-unit-panelbox");

		const header = document.createElement("div");
		header.classList.add("self-stretch", "learn-more-filigree");
		header.innerHTML = `
			<div class="relative flex items-center justify-center">
				<div class="absolute inset-x-0 flex flex-row">
					<div class="filigree-panel-top-circle flex-auto"></div>
					<div class="filigree-panel-top-circle flex-auto -scale-x-100"></div>
				</div>
				<div class="relative learn-more-icon">
					<div class="absolute inset-0 img-circle learn-more-icon-bg"></div>
					<div class="absolute inset-0 img-civics-icon-frame learn-more-icon-frame"></div>
					<div class="absolute inset-3 bg-center bg-no-repeat bg-contain img-lock2"></div>
				</div>
			</div>
		`;
		this.Root.appendChild(header);

		this.reasonElement.classList.add("font-body-base", "text-accent-2", "text-center", "m-2");
		this.reasonElement.setAttribute("role", "paragraph")
		this.Root.appendChild(this.reasonElement);

		const filigree = document.createElement("div");
		filigree.classList.add("filigree-shell-small");
		this.Root.appendChild(filigree);

		this.actionElement.classList.add("mb-4");
		this.actionElement.setAttribute("type", "big");
		this.actionElement.setAttribute("highlight-style", "decorative");
		this.actionElement.setAttribute("caption", Locale.stylize("LOC_CREATE_GAME_LEARN_MORE").toUpperCase());
		this.actionElement.setAttribute("disabled", "true");
		this.actionElement.addEventListener("action-activate", this.handleAction.bind(this));
		this.Root.appendChild(this.actionElement);
	}

	private updateReasonText() {
		this.reasonElement.innerHTML = Locale.compose(this._reason ?? "LOC_LOCKED_GENERIC", this.contentName, this.contentPack);
	}

	private updateActionButton() {
		this.actionElement.classList.toggle("hidden", !this.hasAction);
		this.actionElement.component.disabled = !this.hasAction;
	}

	private updateTooltip() {
		this.actionElement.setAttribute("data-tooltip-content", this._tooltip);
	}

	private handleAction() {
		if (this._action != undefined) {
			this._action();
		}
	}
}

Controls.define('learn-more', {
	createInstance: LearnMore,
	description: 'Learn more panel, for locked leaders and civs',
	styles: ['fs://game/core/ui/shell/create-panels/learn-more.css'],
	tabIndex: -1
});

declare global {
	interface HTMLElementTagNameMap {
		'learn-more': ComponentRoot<LearnMore>
	}
}