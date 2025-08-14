/**
 * @file navigation-tray.ts
 * @copyright 2020-2021, Firaxis Games
 */

import '/core/ui/navigation-tray/model-navigation-tray.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';

class NavigationTray extends Component {

	onAttach() {
		super.onAttach();

		const container = document.createElement('div');
		container.classList.add("flex", "flex-auto", "p-4", "pr-0");

		Databind.if(container, "g_NavTray.isTrayActive");
		{
			const content = document.createElement("div");
			content.classList.add("flow-row", "flex", "relative", "w-full");

			const bgl = document.createElement("div");
			bgl.classList.add("nav-tray-bg", "absolute", "-ml-3", "right-full", "-inset-y-4", "bg-black", "opacity-40");
			content.appendChild(bgl);

			const item = document.createElement('div');
			item.classList.add("item", "mr-4", "flow-row", "spacing-sm", "relative", "spaced", 'items-center', 'shrink');
			Databind.for(item, 'g_NavTray.entries', 'item');
			{
				const iconContainer = document.createElement("div");
				iconContainer.classList.add("flow-row", "justify-center", "relative", "mr-2");

				const bg = document.createElement("div");
				bg.classList.add("absolute", "left-0", "-right-4", "-inset-y-4", "bg-black", "opacity-40");
				item.appendChild(bg);

				const icon = document.createElement("div");
				icon.classList.add("spaced", "w-8", "h-8", "relative", "bg-center", "bg-contain", "bg-no-repeat");
				Databind.bgImg(icon, "item.icon");
				iconContainer.appendChild(icon);

				const iconStartText = document.createElement("div");
				iconStartText.classList.add("absolute", "bottom-7", "text-accent-1", "text-shadow", "text-2xs", "z-1");
				iconContainer.appendChild(iconStartText);
				Databind.if(iconStartText, "{{item.text}} != ''");
				Databind.locText(iconStartText, "item.text");

				item.appendChild(iconContainer);

				const captionContainer = document.createElement("div");
				captionContainer.classList.add("flex-auto");

				const caption = document.createElement("div");
				caption.classList.add("spaced", "text-base", "text-accent-2", "font-body-base", "relative", 'font-fit-shrink', 'whitespace-nowrap');
				Databind.locText(caption, "item.description");

				captionContainer.appendChild(caption);
				item.appendChild(captionContainer);
			};

			content.appendChild(item);
			container.appendChild(content);
		}

		this.Root.appendChild(container);
	}
}

Controls.define('nav-tray', {
	createInstance: NavigationTray,
	description: 'Display and management of the corner nav help info.',
	classNames: ['nav-tray', 'h-16', 'absolute', 'w-full', 'pointer-events-none'],
	styles: ["fs://game/core/ui/navigation-tray/navigation-tray.css"],
	attributes: [
		{
			name: 'align'
		}
	]
});