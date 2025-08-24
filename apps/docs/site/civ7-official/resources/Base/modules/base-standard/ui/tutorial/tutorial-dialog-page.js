/**
 * @file tutorial-dialog.ts
 * @copyright 2021, Firaxis Games
 * @description A dialog box that is used to show (paginated) tutorial content.
 */
//! MODULES SUPPORT
/// <reference path="../../../core/ui/component-support.ts" />
import * as StyleChecker from '/core/ui/utilities/utilities-core-stylechecker.js';
export default class TutorialDialogPage extends Component {
    constructor() {
        super(...arguments);
        this._index = -1;
        this.title = "";
        this.subtitle = "";
        this.body = "";
        this.titleImage = "";
        this.backgroundImages = [];
    }
    /// The index of the page this represents
    get index() { return this._index; }
    onAttach() {
        super.onAttach();
        this.Root.setAttribute("role", "paragraph");
        this._index = parseInt(this.Root.getAttribute('index'));
        this.title = this.Root.getAttribute('title') ?? "";
        this.subtitle = this.Root.getAttribute('subtitle') ?? "";
        this.body = this.Root.getAttribute('body') ?? "";
        this.backgroundImages = (this.Root.getAttribute('backgroundImages') ?? "").split(",");
        this.setBackgroundImageInDiv(this.titleImage, "tutorial-dialog-page-image");
        this.setStringInDivClass(this.title, "tutorial-dialog-page-title");
        this.setStringInDivClass(this.subtitle, "tutorial-dialog-page-subtitle");
        this.setStringInDivClass(this.body, "tutorial-dialog-page-body");
        this.setImages();
        // Create overlapping background images for zoom effect; at least one needs to exist.
        const element = this.Root.querySelector(".tutorial-dialog-backgrounds");
        if (element) {
            this.backgroundImages.forEach((imageURL, i) => {
                let img = document.createElement("div");
                img.classList.add('tutorial-dialog-page-bg', 'top-0', 'left-0', 'size-full', 'absolute');
                img.style.backgroundImage = `url("${imageURL}")`;
                // Assign a unique class to parallax BG layers 0-3; anything past that defaults to '.tut-bg-3' styling
                img.classList.add(`tut-bg-${(i <= 2) ? i : 3}`);
                element.appendChild(img);
            });
        }
        else {
            console.error("tutorial-dialog-page: onAttach(): Missing element with '.tutorial-dialog-backgrounds'");
        }
        // Signal this has loaded and been realized.
        StyleChecker.waitForElementStyle(this.Root, 'opacity', 0).then(_ready => {
            this.Root.classList.remove('no-anim');
            window.dispatchEvent(new CustomEvent('tutorial-dialog-page-ready', { detail: { index: this._index } }));
        }).catch((error) => {
            console.log("tutorial-dialog-page: onAttach(): " + error);
        });
    }
    setImages() {
        const images = this.Root.querySelectorAll('.tutorial-image');
        images.forEach((image) => {
            image.classList.remove('tutorial-image');
            image.classList.add('tutorial-dialog-page-image', 'absolute', 'left-0', 'top-0');
            image.style.backgroundImage = `url('${image.getAttribute('image')}')`;
            //TODO: find a better way to preserve defaults
            if (image.getAttribute('width') != '') {
                image.style.width = `${image.getAttribute('width')}rem`;
            }
            if (image.getAttribute('height') != '') {
                image.style.height = `${image.getAttribute('height')}rem`;
            }
            if (image.getAttribute('x') != '') {
                image.style.left = `${image.getAttribute('x')}rem`;
            }
            if (image.getAttribute('y') != '') {
                image.style.top = `${image.getAttribute('y')}rem`;
            }
            const imageContainer = this.Root.querySelector('.tutorial-dialog-page-image-container');
            if (imageContainer) {
                imageContainer.appendChild(image);
            }
        });
    }
    setBackgroundImageInDiv(value, cssClassName) {
        if (value == undefined || value == null) {
            console.error("tutorial-dialog-page: setBackgroundImageInDiv(): Missing value to set background image in tutorial page.  (Empty string required to clear.)");
            return false;
        }
        const element = (this.Root.querySelector(`.${cssClassName}`));
        if (!element) {
            return false;
        }
        const imageURL = `url(${value})`;
        element.style.backgroundImage = imageURL;
        return true;
    }
    setStringInDivClass(value, cssClassName) {
        if (value == undefined || value == null) {
            console.error("tutorial-dialog-page: setStringInDivClass(): Missing value to set div '" + cssClassName + "' in tutorial page.  (Empty string required to clear.)");
            return false;
        }
        const element = this.Root.querySelector(`.${cssClassName}`);
        if (!element) {
            return false;
        }
        element.innerHTML = Locale.stylize(value);
        return true;
    }
}
Controls.define('tutorial-dialog-page', {
    createInstance: TutorialDialogPage,
    description: 'Dialog box containing a series of tutorial information.',
    classNames: ['inactive', 'no-anim', 'pointer-events-none', 'size-full', 'absolute', 'flow-row', 'justify-center', 'items-end'],
    styles: ['fs://game/base-standard/ui/tutorial/tutorial-dialog.css'],
    content: ['fs://game/base-standard/ui/tutorial/tutorial-dialog-page.html'],
    attributes: []
});
export { TutorialDialogPage as Default };

//# sourceMappingURL=file:///base-standard/ui/tutorial/tutorial-dialog-page.js.map
