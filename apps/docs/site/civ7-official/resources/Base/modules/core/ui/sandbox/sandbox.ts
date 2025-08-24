let current_palette: string = '';

window.addEventListener('load', () => {
	console.log("On Load");
	const colors: NodeListOf<Element> = document.querySelectorAll('[data-palette]');
	colors.forEach((el: Element) => {
		el.addEventListener('click', () => {
			const palette = el.getAttribute('data-palette')!;

			const classList = document.body.classList;
			if (current_palette) {
				classList.remove(current_palette);
			}
			classList.add(palette);
			current_palette = palette;
		});
	});

	let preview = document.getElementById('component-preview');
	if (preview) {
		console.log("Registering custom event in previewr");
		preview.addEventListener('custom-click', () => {
			console.log("EVENT PROPAGATIONNNN ASDFA SZOMG BBQ");
		})
	}

	let itemClickListener: EventListener = (event: MouseEvent) => {
		if (event.target) {
			let el = event.target as HTMLElement;
			if (el) {
				let component = el.getAttribute('data-component');
				let preview = document.getElementById('component-preview');
				if (component && preview) {
					preview.innerHTML = '';

					let custom = document.createElement(component)
					console.log(`Created a thing - ${component}`);
					preview.appendChild(custom);
					preview.insertAdjacentHTML("beforeend", `
						<div id="component-details">
						<div id="component-name">${component}</div>
						<div id="component-desc"></div>
					</div>`);

					/*custom.addEventListener('custom-click', ()=>{
						console.log("My Custom Event Fired!");
					})*/

					Controls.whenInitialized(component).then((definition) => {
						let description = document.getElementById('component-desc');
						if (description) {
							console.log(definition.description);
							description.innerHTML = definition.description!;
						}
					});

				}
			}
		}
	}

	let createItem = (name: string) => {
		console.log(`Component Declared - <${name}>.`);
		const itemList = document.getElementById('component-list');
		if (itemList) {
			let item = document.createElement('div');
			item.classList.add('component-listitem');
			item.setAttribute('data-component', name!);
			item.innerHTML = name!;
			item.addEventListener('click', itemClickListener);
			itemList.appendChild(item);
		}
	}

	const items: NodeListOf<HTMLElement> = document.querySelectorAll<HTMLElement>('.component-listitem');
	items.forEach((item: HTMLElement) => {
		item.addEventListener('click', itemClickListener);
	});

	Controls.componentInitialized.on((name) => {
		createItem(name);
	});
});