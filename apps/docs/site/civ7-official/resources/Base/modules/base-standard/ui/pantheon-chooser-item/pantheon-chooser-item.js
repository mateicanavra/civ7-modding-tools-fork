import { ChooserItem } from "/base-standard/ui/chooser-item/chooser-item.js";
export class PantheonChooserItem extends ChooserItem {
    get pantheonChooserNode() {
        return this._chooserNode;
    }
    set pantheonChooserNode(value) {
        this._chooserNode = value;
    }
    render() {
        super.render();
        const chooserItem = document.createDocumentFragment();
        const node = this.pantheonChooserNode;
        if (!node) {
            console.error("pantheon-chooser-item: render() - pantheonChooserNode was null!");
            return;
        }
        this.Root.classList.add("text-accent-2", "flex", "my-1", "ml-3", "min-h-24", "grow", node.isLocked ? "chooser-item_locked" : "chooser-item_unlocked");
        this.Root.classList.toggle('cursor-not-allowed', node.isLocked);
        this.Root.classList.toggle('cursor-pointer', !node.isLocked);
        if (node.isLocked) {
            this.Root.setAttribute("focus-disabled", "true");
            this.Root.setAttribute("disabled", "true");
        }
        const primaryIcon = this.createChooserIcon(node.primaryIcon);
        primaryIcon.classList.add("pantheon-chooser-item_icon mb-5 relative");
        chooserItem.appendChild(primaryIcon);
        const textContainer = document.createElement("div");
        textContainer.classList.value = "pantheon-chooser-item_text-container flex flex-col flex-auto relative w-full";
        chooserItem.appendChild(textContainer);
        const title = document.createElement("div");
        title.classList.value = "font-title-sm pantheon-chooser-item_title uppercase mt-2 text-accent-2 font-fit-shrink";
        title.innerHTML = node.name;
        textContainer.appendChild(title);
        const description = document.createElement("div");
        description.classList.value = "font-body-sm pantheon-chooser-item_desc mx-2 text-accent-3";
        description.innerHTML = node.description;
        textContainer.appendChild(description);
        this.Root.appendChild(chooserItem);
    }
}
Controls.define('pantheon-chooser-item', {
    createInstance: PantheonChooserItem,
    description: 'A chooser item to be used with the pantheon chooser',
    classNames: ['pantheon-chooser-item', "relative", "group"],
    styles: [
        'fs://game/base-standard/ui/chooser-item/chooser-item.css'
    ],
    images: ['fs://game/hud_sidepanel_list-bg.png', 'fs://game/hud_list-focus_frame.png', 'fs://game/hud_turn-timer.png', 'fs://game/hud_civics-icon_frame.png'],
    attributes: [{ name: 'reveal' }, { name: 'selected' }, { name: 'disabled' }, { name: 'focus-disabled' }]
});

//# sourceMappingURL=file:///base-standard/ui/pantheon-chooser-item/pantheon-chooser-item.js.map
