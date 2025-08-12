// Note: 	This is loaded through root-game.html, so the file is just loaded as a script, rather than a module.
//			Loading as a script, allows for the auto-generated tuner script-lets that the Tuner Panels generate, be able to see this code.
class TunerUtilities {

	/* For now, we are returning the GameValue hierarchy in a flat list, because we don't have the tree-view support in the TunerListener yet */
	getGameValueDisplayItems(tValue: TrackedValue, depthIn?: number): string[] {
		let items: string[] = [];

		let depth: number = (depthIn != undefined) ? depthIn : 0;

		let indentStr: string = "";
		// Add indent.
		// Gotta be a better way to do this, though we won't need this once we have the Tree View working.
		for (let i = 0; i < depth; ++i) {
			indentStr = indentStr + ">";
		}
		let str: string = "";
		if (tValue.description) {
			str = tValue.description;
		} else {
			str = "id=" + tValue.id.toString();
		}
		str = str + ";" + tValue.value.toString();

		items.push(indentStr + str);
		if (tValue.base != undefined) {
			if (tValue.base.value != 0 || tValue.base.steps != undefined) {
				str = ".base;" + tValue.base.value.toString();
				items.push(indentStr + str);
				if (tValue.base.steps != undefined) {
					items.push(indentStr + ".base.steps");
					for (const step of tValue.base.steps) {
						let children = this.getGameValueDisplayItems(step, depth + 1);
						for (const child of children) {
							items.push(child);
						}
					}
				}
			}
		}
		if (tValue.modifier != undefined) {
			if (tValue.modifier.value != 0 || tValue.modifier.steps != undefined) {
				str = ".modifier;" + tValue.modifier.value.toString();
				items.push(indentStr + str);
				if (tValue.modifier.steps != undefined) {
					items.push(indentStr + ".modifier.steps");
					for (const step of tValue.modifier.steps) {
						let children = this.getGameValueDisplayItems(step, depth + 1);
						for (const child of children) {
							items.push(child);
						}
					}
				}
			}
		}

		if (tValue.steps != undefined) {
			items.push(indentStr + "steps");
			for (const step of tValue.steps) {
				let children = this.getGameValueDisplayItems(step, depth + 1);
				for (const child of children) {
					items.push(child);
				}
			}
		}

		return items;
	}

	/* Put the game values 'display' into a simple string hierarcy */
	getGameValueDisplayItemsTree(tValue: TrackedValue, depthIn?: number): object {
		let node: any = {};

		let depth: number = (depthIn != undefined) ? depthIn : 0;

		let str: string = "";
		if (tValue.description) {
			str = tValue.description;
		} else {
			str = "id=" + tValue.id.toString();
		}
		str = str + ";" + tValue.value.toString();

		node.name = str;
		if (tValue.base != undefined) {
			if (tValue.base.value != 0 || tValue.base.steps != undefined) {
				let baseNode: any = {};
				baseNode.name = ".base;" + tValue.base.value.toString();;

				if (tValue.base.steps != undefined) {
					baseNode.children = [];
					for (const step of tValue.base.steps) {
						let childNode = this.getGameValueDisplayItemsTree(step, depth + 1);
						baseNode.children.push(childNode);
					}
				}
				if (node.children == undefined) {
					node.children = [];
				}
				node.children.push(baseNode);
			}
		}
		if (tValue.modifier != undefined) {
			if (tValue.modifier.value != 0 || tValue.modifier.steps != undefined) {
				let modifierNode: any = {};
				modifierNode.name = ".modifier;" + tValue.modifier.value.toString();;
				if (tValue.modifier.steps != undefined) {
					modifierNode.children = [];
					for (const step of tValue.modifier.steps) {
						let childNode = this.getGameValueDisplayItemsTree(step, depth + 1);
						modifierNode.children.push(childNode);
					}
				}
				if (node.children == undefined) {
					node.children = [];
				}
				node.children.push(modifierNode);
			}
		}

		if (tValue.steps != undefined) {
			if (node.children == undefined) {
				node.children = [];
			}
			for (const step of tValue.steps) {
				let childNode = this.getGameValueDisplayItemsTree(step, depth + 1);
				node.children.push(childNode);
			}
		}

		return node;
	}

}

var tunerUtilities: TunerUtilities = new TunerUtilities();
console.log("tunerUtilities active");	// TODO: remove
