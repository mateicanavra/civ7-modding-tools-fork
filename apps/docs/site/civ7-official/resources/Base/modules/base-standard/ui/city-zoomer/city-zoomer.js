/**
 * @file city-zoomer.ts
 * @copyright 2024, Firaxis Games
 * @description Helper file used to zoom in and out of a focused city
 */
import { utils } from '/core/ui/graph-layout/utils.js';
// Inversely cooralated maximum zoom value
// Mainly to avoid zooming in super close to a city after it's first founded
const MAX_ZOOM = 0.3;
export var CityZoomer;
(function (CityZoomer) {
    function zoomToCity(city) {
        Camera.saveCameraZoom();
        const region = { min: { x: 0.275, y: 0.025 }, max: { x: 0.975, y: 0.975 } }; // TODO use actual postitions of top and bottom bars
        const calculatedFocus = Camera.calculateCameraFocusAndZoom(city.getPurchasedPlots(), 30, { region: region });
        if (calculatedFocus) {
            // If zoom is greater than 1, it is not possible to fit, but center it anyway
            const cameraFrame = {
                duration: 1,
                tilt: 30,
                focus: { x: calculatedFocus.x, y: calculatedFocus.y },
                zoom: utils.clamp(calculatedFocus.z, MAX_ZOOM, 1),
                func: InterpolationFunc.EaseOutSin,
                writeMask: KeyframeFlag.FLAG_ALL,
                end: true // return to player control once done
            };
            Camera.addKeyframe(cameraFrame);
        }
        else {
            // This will only happen if there is a critical error
            Camera.lookAtPlot(city.location, { zoom: 1.0, tilt: 30 });
        }
    }
    CityZoomer.zoomToCity = zoomToCity;
    function resetZoom() {
        Camera.restoreDefaults(); //Resets the tilt back to default
        Camera.restoreCameraZoom();
        Camera.clearAnimation();
    }
    CityZoomer.resetZoom = resetZoom;
})(CityZoomer || (CityZoomer = {}));

//# sourceMappingURL=file:///base-standard/ui/city-zoomer/city-zoomer.js.map
