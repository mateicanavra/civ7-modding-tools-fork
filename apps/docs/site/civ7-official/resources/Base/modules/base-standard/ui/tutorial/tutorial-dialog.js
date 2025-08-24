/**
 * @file tutorial-dialog.ts
 * @copyright 2021-2023, Firaxis Games
 * @description A dialog box that is used to show (paginated) tutorial content.
 */
import ContextManager from '/core/ui/context-manager/context-manager.js';
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
class LowerTutorialDialogEvent extends CustomEvent {
    constructor(itemID) {
        super('lower-tutorial-dialog-event', {
            bubbles: true,
            detail: { itemID },
        });
    }
}
class TutorialDialogPanel extends Panel {
    constructor(root) {
        super(root);
        this.nextButton = null;
        this.previousButton = null;
        this.pageCounter = null;
        this.itemID = "";
        this.page = 0;
        this.lastPage = -1;
        this.pages = [];
        this.radioButtons = [];
        this.pagesReady = -1;
        this.tutorialDialogPageReadyListener = (event) => { this.onPageReady(event); };
        this.activeDeviceTypeListener = () => { this.onActiveDeviceTypeChanged(); };
        this.navigateInputListener = (navigationEvent) => { this.onNavigateInput(navigationEvent); };
        this.engineInputListener = (inputEvent) => { this.onEngineInput(inputEvent); };
        this.animateInType = this.animateOutType = AnchorType.RelativeToTop;
        this.enableOpenSound = true;
        this.enableCloseSound = true;
        this.Root.setAttribute("data-audio-group-ref", "tutorial-intro");
    }
    onAttach() {
        super.onAttach();
        const dialogDataSerialized = this.Root.getAttribute("value");
        if (!dialogDataSerialized) {
            console.error("tutorial-dialog: onAttach(): Could not raise tutorial dialog because no dialog data was passed in.");
            return;
        }
        window.addEventListener('tutorial-dialog-page-ready', this.tutorialDialogPageReadyListener);
        window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);
        this.Root.addEventListener('navigate-input', this.navigateInputListener);
        this.Root.addEventListener('engine-input', this.engineInputListener);
        this.pagesReady = 0;
        this.itemID = this.Root.getAttribute("itemID") ?? "";
        if (this.itemID == "") {
            console.warn("tutorial-dialog: onAttach(): Loading a tutorial dialog but no associate tutorial item ID was passed in.");
        }
        const dialogData = JSON.parse(dialogDataSerialized);
        if (dialogData == null) {
            console.error("tutorial-dialog: onAttach(): Could not raise tutorial dialog because data provided wasn't a valid definition.");
            console.log("tutorial-dialog: onAttach(): Dialog data: ", dialogDataSerialized);
        }
        const closeButton = this.Root.querySelector("fxs-close-button");
        if (closeButton) {
            closeButton.addEventListener('action-activate', (event) => {
                event.stopPropagation();
                event.preventDefault();
                this.close();
            });
        }
        else {
            console.error("tutorial-dialog: onAttach(): closeButton with 'fxs-close-button'");
        }
        this.nextButton = this.Root.querySelector(".tutorial-dialog-next-button");
        if (this.nextButton) {
            this.nextButton.setAttribute('caption', Locale.compose("LOC_TUTORIAL_NEXT_PAGE"));
            this.nextButton.setAttribute("data-audio-group-ref", "tutorial-intro");
            this.nextButton.setAttribute("data-audio-activate-ref", "none");
            // Note this.nextButton is hidden in Gamepad mod that is why it has no action-key attribute
            this.nextButton.addEventListener('action-activate', (event) => {
                event.stopPropagation();
                event.preventDefault();
                this.onNextPage();
            });
        }
        else {
            console.error("tutorial-dialog: onAttach(): this.nextButton with '.tutorial-dialog-next-button'");
        }
        this.previousButton = this.Root.querySelector(".tutorial-dialog-previous-button");
        if (this.previousButton) {
            this.previousButton.setAttribute('caption', Locale.compose("LOC_TUTORIAL_PREVIOUS_PAGE"));
            this.previousButton.setAttribute("data-audio-group-ref", "tutorial-intro");
            this.previousButton.setAttribute("data-audio-activate-ref", "none");
            // Note this.previousButton is hidden in Gamepad mod that is why it has no action-key attribute
            this.previousButton.addEventListener('action-activate', (event) => {
                event.stopPropagation();
                event.preventDefault();
                this.onPreviousPage();
            });
        }
        else {
            console.error("tutorial-dialog: onAttach(): this.previousButton with '.tutorial-dialog-previous-button'");
        }
        this.pageCounter = MustGetElement('.tutorial-dialog-counter', this.Root);
        this.initializePages(dialogData);
    }
    onDetach() {
        window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);
        window.removeEventListener('tutorial-dialog-page-ready', this.tutorialDialogPageReadyListener);
        this.Root.removeEventListener('navigate-input', this.navigateInputListener);
        this.Root.removeEventListener('engine-input', this.engineInputListener);
        super.onDetach();
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        NavTray.clear();
        NavTray.addOrUpdateAccept("LOC_TUTORIAL_NEXT_PAGE");
        NavTray.addOrUpdateCancel("LOC_TUTORIAL_PREVIOUS_PAGE");
        NavTray.addOrUpdateNavNext("LOC_TUTORIAL_SKIP");
    }
    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
    }
    setButtonVisible(button, isVisible) {
        if (button) {
            button.classList.toggle("hidden", !isVisible);
        }
    }
    onActiveDeviceTypeChanged() {
        this.setButtonVisible(this.previousButton, !ActionHandler.isGamepadActive);
        this.setButtonVisible(this.nextButton, !ActionHandler.isGamepadActive);
    }
    close() {
        window.dispatchEvent(new LowerTutorialDialogEvent(this.itemID));
        super.close();
    }
    open() {
        ContextManager.pushElement(this.Root);
        // Note: there is no matching UI.panelEnd() here because it's performed by the context manager on close.
        UI.panelStart(this.Root.typeName, "", 2, true);
        // TODO: HACK: Remove 3 frame wait for DOM to build when Coherent fixes attachment.
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => {
                    this.onNextPage();
                });
            });
        });
    }
    initializePages(dialogData) {
        if (!(dialogData?.series)) {
            console.error("tutorial-dialog: initializePages(): Cannot raise tutorial dialog as it only supports a series.");
            console.log("tutorial-dialog: initializePages(): Dialog data: ", JSON.stringify(dialogData));
            return;
        }
        const pagesElement = this.Root.querySelector(".tutorial-dialog-pages");
        if (!pagesElement) {
            console.error("tutorial-dialog: initializePages(): Missing pagesElement with '.tutorial-dialog-pages'");
            return;
        }
        const max = (dialogData.series.length - 1).toString();
        dialogData.series.forEach((data, index) => {
            const page = data;
            const pageElement = document.createElement("tutorial-dialog-page");
            pageElement.setAttribute("index", index.toString()); // this page index
            pageElement.setAttribute("max", max); // max page index
            pageElement.setAttribute("title", page.title ?? "");
            pageElement.setAttribute("subtitle", page.subtitle ?? "");
            pageElement.setAttribute("body", page.body ?? "");
            if (page.images && page.images.length > 0) {
                page.images.forEach((data) => {
                    let img = document.createElement('div');
                    img.classList.add('tutorial-image');
                    img.setAttribute("image", data.image ?? "");
                    img.setAttribute("width", data.width?.toString() ?? "");
                    img.setAttribute("height", data.height?.toString() ?? "");
                    img.setAttribute("x", data.x?.toString() ?? "");
                    img.setAttribute("y", data.y?.toString() ?? "");
                    pageElement.appendChild(img);
                });
            }
            if (page.backgroundImages && page.backgroundImages.length > 0) {
                pageElement.setAttribute("backgroundImages", page.backgroundImages.toString());
            }
            else {
                console.warn("tutorial-dialog: initializePages(): No background images for the tutorial dialog! index:", index, "'" + JSON.stringify(data) + "'");
            }
            pagesElement.appendChild(pageElement);
            this.pages.push(pageElement);
            //page number pips
            const item = document.createElement("fxs-radio-button");
            item.classList.add("relative", "flex", "bg-no-repeat", "bg-cover", this.pages.length > 0 ? 'ml-1' : '');
            item.style.pointerEvents = "none";
            if (page.title) {
                item.setAttribute("data-item-id", page.title.toString());
                item.setAttribute("group-tag", "overview-breadcrumbs");
                item.setAttribute("value", index.toString());
                this.radioButtons.push(item);
                this.pageCounter?.appendChild(item);
            }
            ;
            this.page = -1;
        });
    }
    updatePreviousButtonState() {
        const onFirstPage = this.page == 0;
        const onSecondPage = this.page == 1;
        if (this.previousButton) {
            if (onFirstPage) { // can not go on previous page (disabled)
                this.previousButton.style.display = "none";
            }
            else if (onSecondPage) { // can go on previous page (enabled)
                this.previousButton.style.display = "flex";
            } // Else: any other page (already enabled)
        }
    }
    onPreviousPage() {
        if (this.page <= 0) {
            console.error("tutorial-dialog: onPreviousPage(): Attempt for tutorial dialog to go past page 0.");
            return;
        }
        if (this.page + 1 >= this.pages.length) {
            this.nextButton?.setAttribute('caption', Locale.compose("LOC_TUTORIAL_NEXT_PAGE"));
        }
        this.lastPage = this.page--;
        this.realize();
        this.radioButtons[this.page].setAttribute('selected', 'true');
        this.updatePreviousButtonState();
        Audio.playSound("data-audio-activate", "tutorial-intro");
    }
    onNextPage() {
        if (this.page + 1 >= this.pages.length) {
            // We tried to move beyond the last page, so we're done here. 
            this.close();
        }
        else {
            this.lastPage = this.page++;
            this.realize();
            if (this.page + 1 >= this.pages.length) {
                this.nextButton?.setAttribute('caption', Locale.compose("LOC_TUTORIAL_FINISH"));
            }
            this.radioButtons[this.page].setAttribute('selected', 'true');
            this.updatePreviousButtonState();
        }
        Audio.playSound("data-audio-activate", "tutorial-intro");
    }
    onNavigateInput(navigationEvent) {
        const live = this.handleNavigation(navigationEvent);
        if (!live) {
            navigationEvent.preventDefault();
            navigationEvent.stopImmediatePropagation();
        }
    }
    /**
     * @returns true if still live, false if input should stop.
     */
    handleNavigation(navigationEvent) {
        if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
            // Ignore everything but FINISH events
            return true;
        }
        let live = true;
        const direction = navigationEvent.getDirection();
        switch (direction) {
            case InputNavigationAction.DOWN:
            case InputNavigationAction.RIGHT:
                this.onNextPage();
                live = false;
                break;
            case InputNavigationAction.UP:
            case InputNavigationAction.LEFT:
                this.onPreviousPage();
                live = false;
                break;
            case InputNavigationAction.NEXT:
                this.close();
                live = false;
        }
        return live;
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.detail.name == 'accept') {
            this.onNextPage();
            window.dispatchEvent(new SetActivatedComponentEvent(null));
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
        else if (inputEvent.detail.name == 'cancel') {
            this.onPreviousPage();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    realize() {
        if (!this.pages[this.page]) {
            console.warn(`tutorial-dialog: realize(): No current tutorial dialog page at ${this.page}`);
            return;
        }
        if (this.lastPage >= 0 && !this.pages[this.lastPage]) {
            console.warn(`tutorial-dialog: realize(): No previous tutorial dialog page at ${this.lastPage}`);
            return;
        }
        this.pages[this.page].classList.remove('no-anim');
        if (this.lastPage < this.page) { // going to the next page
            if (this.lastPage >= 0) {
                this.pages[this.lastPage].classList.remove('slow-anim', 'pointer-events-auto');
                this.pages[this.lastPage].classList.add('prev', 'pointer-events-none');
            }
            this.pages[this.page].classList.remove('inactive', 'pointer-events-none');
            this.pages[this.page].classList.add('pointer-events-auto');
        }
        else { // going to the previous page
            this.pages[this.lastPage].classList.remove('slow-anim', 'pointer-events-auto');
            this.pages[this.lastPage].classList.add('inactive', 'pointer-events-none');
            this.pages[this.page].classList.remove('prev', 'pointer-events-none');
            this.pages[this.page].classList.add('slow-anim', 'pointer-events-auto');
        }
    }
    /// Track which tutorial pages are ready
    onPageReady(event) {
        if (!event.detail || (event.detail.index == undefined)) {
            console.error("tutorial-dialog: onPageReady(): Tutorial dialog received a page-is-ready event but no page index was passed in!");
            return;
        }
        const pageIndex = event.detail.index;
        if (pageIndex < 0 || pageIndex > (this.pages.length - 1)) {
            console.error("tutorial-dialog: onPageReady(): Tutorial dialog received a page-is-ready event but page index '" + pageIndex + "' is out-of-bounds. length: ", this.pages.length);
            return;
        }
        this.pagesReady++;
        if (this.pagesReady == this.pages.length) {
            FocusManager.setFocus(this.Root);
            this.open(); // Content of all pages are loaded, ready to open
        }
        else if (this.pagesReady > this.pages.length) {
            console.warn("tutorial-dialog: onPageReady(): Tutorial dialog has more pages reported being ready than max. pages: " + this.pagesReady + ", length: " + this.pages.length);
        }
    }
}
Controls.define('tutorial-dialog', {
    createInstance: TutorialDialogPanel,
    description: 'Dialog box containing a series of tutorial information.',
    styles: ['fs://game/base-standard/ui/tutorial/tutorial-dialog.css'],
    content: ['fs://game/base-standard/ui/tutorial/tutorial-dialog.html'],
    attributes: [],
    tabIndex: -1
});

//# sourceMappingURL=file:///base-standard/ui/tutorial/tutorial-dialog.js.map
