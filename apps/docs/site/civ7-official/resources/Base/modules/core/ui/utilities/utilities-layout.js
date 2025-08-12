/// <reference path="../themes/default/global-scaling.ts" />
const COMPACT_HEIGHT_THRESHOLD = 1000;
export var Layout;
(function (Layout) {
    function pixels(pxValue) {
        return `${Layout.pixelsValue(pxValue)}rem`;
    }
    Layout.pixels = pixels;
    function isCompact() {
        return window.innerHeight < pixelsToScreenPixels(COMPACT_HEIGHT_THRESHOLD);
    }
    Layout.isCompact = isCompact;
    Layout.pixelsValue = (px) => GlobalScaling.pixelsToRem(px);
    Layout.pixelsText = (px) => GlobalScaling.createPixelsTextClass(px);
    function textSizeToScreenPixels(fontSizeName) {
        return pixelsToScreenPixels(GlobalScaling.getFontSizePx(fontSizeName));
    }
    Layout.textSizeToScreenPixels = textSizeToScreenPixels;
    function pixelsToScreenPixels(pxValue) {
        return GlobalScaling.remToScreenPixels(GlobalScaling.pixelsToRem(pxValue));
    }
    Layout.pixelsToScreenPixels = pixelsToScreenPixels;
})(Layout || (Layout = {}));

//# sourceMappingURL=file:///core/ui/utilities/utilities-layout.js.map
