import FxsActivatable from '/core/ui/components/fxs-activatable.js'

export class FxsMinMaxButton extends FxsActivatable {

	private arrowIsUp = true;
	private mouseEnterEventListener: EventListener = this.onMouseEnter.bind(this);
	private mouseLeaveEventListener: EventListener = this.onMouseLeave.bind(this);
	private actionActivateEventListener: EventListener = this.onActionActivate.bind(this);

	public get disabled(): boolean {
		return this.Root.classList.contains('disabled');
	}

	constructor(root: ComponentRoot) {
		super(root);

		this.toggle(this.Root.classList.contains('minmax-button--up'));
	}

	private onMouseEnter(): void {
		if (this.disabled) {
			UI.setCursorByType(UIHTMLCursorTypes.NotAllowed);
		}
	}

	private onMouseLeave(): void {
		if (this.disabled) {
			UI.setCursorByType(UIHTMLCursorTypes.Default);
		}
	}

	private onActionActivate(): void {
		if (this.disabled) {
			return;
		}

		this.toggle();
	}

	private toggle(force: boolean | undefined = undefined) {
		this.arrowIsUp = force ?? !this.arrowIsUp;
		this.Root.classList.toggle('minmax-button--up', this.arrowIsUp);
	}

	onInitialize() {
		super.onInitialize();

		this.render();
	}

	onAttach() {
		super.onAttach();

		this.Root.addEventListener('mouseenter', this.mouseEnterEventListener);
		this.Root.addEventListener('mouseleave', this.mouseLeaveEventListener);
		this.Root.addEventListener('action-activate', this.actionActivateEventListener);
	}

	onDetach() {
		this.Root.removeEventListener('mouseenter', this.mouseEnterEventListener);
		this.Root.removeEventListener('mouseleave', this.mouseLeaveEventListener);
		this.Root.removeEventListener('action-activate', this.actionActivateEventListener);

		super.onDetach();
	}

	private render() {
		this.Root.innerHTML = `
			<div class="minmax-button__shadow"></div>
			<div class="minmax-button__bg absolute inset-0"></div>
			<div class="minmax-button__highlight absolute inset-0"></div>
			<div class="minmax-button__arrow"></div>
			<div class="minmax-button__arrow minmax-button__arrow--highlight"></div>
			<div class="minmax-button__overlay absolute inset-0"></div>
		`;
	}
}

Controls.define('fxs-minmax-button', {
	createInstance: FxsMinMaxButton,
	description: '',
	classNames: ['fxs-minmax-button'],
	tabIndex: -1
});

declare global {
	interface HTMLElementTagNameMap {
		'fxs-minmax-button': ComponentRoot<FxsMinMaxButton>;
	}
}