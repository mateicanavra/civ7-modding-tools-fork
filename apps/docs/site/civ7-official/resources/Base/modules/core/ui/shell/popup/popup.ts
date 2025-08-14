/**
 * @file popup.ts
 * @copyright 2024, Firaxis Games
 * @description A simple informational box.
 */

class Popup extends Component {
	constructor(root: ComponentRoot) {
		super(root);
	}

	onAttach(): void {
		this.setPosition(this.Root.getAttribute("position") || "bottom-right", "");
		this.setText1(this.Root.getAttribute("text1") || "");
		this.setText2(this.Root.getAttribute("text2") || "");

		super.onAttach();
	}

	onDetach(): void {
		super.onDetach();
	}

	onAttributeChanged(name: string, oldValue: string, newValue: string) {
		switch (name) {
			case 'position': {
				this.setPosition(newValue, oldValue);
				return;
			}

			case 'text1': {
				this.setText1(newValue);
				return;
			}

			case 'text2': {
				this.setText2(newValue);
				return;
			}

		}
		super.onAttributeChanged(name, oldValue, newValue);
	}

	private setText1(text: string) {
		const textElement: HTMLDivElement | null = this.Root.querySelector(".popup-body-text-1");
		if (textElement) {
			textElement.setAttribute("data-l10n-id", text);
		}
	}

	private setText2(title: string) {
		const textElement: HTMLDivElement | null = this.Root.querySelector(".popup-body-text-2");
		if (textElement) {
			textElement.setAttribute("data-l10n-id", title);
		}
	}

	private setPosition(newPosition: string, oldPosition: string) {
		if (oldPosition && oldPosition.length > 0) {
			this.Root.classList.remove(oldPosition);
		}

		this.Root.classList.add(newPosition);
	}
}

export type PopupPositionType = "top-left" | "top-right"
	| "middle-left" | "middle-center" | "middle-right"
	| "bottom-left" | "bottom-center" | "bottom-right";

export function displayPopup(text1: string, text2: string, position: PopupPositionType) {
	const tooltipArea = document.querySelector("#popups");

	if (tooltipArea) {
		const popup = document.createElement("pop-up");

		popup.setAttribute("text1", text1);
		popup.setAttribute("text2", text2);
		popup.setAttribute("position", position);

		tooltipArea.appendChild(popup);

		return popup;
	}

	return null;
}

Controls.define('pop-up', {
	createInstance: Popup,
	description: 'Box to display simple information.',
	styles: ['fs://game/core/ui/shell/popup/popup.css'],
	content: ['fs://game/core/ui/shell/popup/popup.html'],
	attributes: [],
	tabIndex: -1
});
