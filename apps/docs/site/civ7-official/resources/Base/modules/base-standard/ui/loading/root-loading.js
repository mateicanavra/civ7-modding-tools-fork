"use strict";
/**
 * @file root-loading.ts
 * @copyright 2020-2022, Firaxis Games
 * @description Full screen content to show between shell and game states.
 */
///<reference path="loading-flipbook.ts" />
const requiredLoadingComponents = [
    {
        id: UIGameLoadingProgressState.ContentIsConfigured,
        value: 5,
    },
    {
        id: UIGameLoadingProgressState.GameCoreInitializationIsStarted,
        value: 2,
    },
    {
        id: UIGameLoadingProgressState.GameIsInitialized,
        value: 2,
    },
    {
        id: UIGameLoadingProgressState.GameCoreInitializationIsDone,
        value: 4,
    },
    {
        id: UIGameLoadingProgressState.GameIsFinishedLoading,
        value: 2,
    },
    {
        id: UIGameLoadingProgressState.UIIsInitialized,
        value: 5,
    },
    {
        id: UIGameLoadingProgressState.UIIsReady,
        value: 3,
    },
];
const totalRequiredLoadingComponentsValue = requiredLoadingComponents.reduce((res, { value }) => res + value, 0);
const rootLoadingRequiredLoadingComponentIds = [
    UIGameLoadingProgressState.ContentIsConfigured,
];
function getRootGameLoadingInitialLoadingRatio() {
    const initialRequiredLoadingComponentsValue = requiredLoadingComponents.reduce((res, { id, value }) => res + (rootLoadingRequiredLoadingComponentIds.includes(id) ? value : 0), 0);
    return initialRequiredLoadingComponentsValue / totalRequiredLoadingComponentsValue;
}
// ---------- end of: utilities-loading ----------
const completedUIGameLoadingProgressStates = new Set();
const rootGameLoadingInitialLoadingRatio = getRootGameLoadingInitialLoadingRatio();
function shouldTransition() {
    const loadingState = UI.getGameLoadingState();
    switch (loadingState) {
        case UIGameLoadingState.WaitingForLoadingCurtain:
        case UIGameLoadingState.WaitingForConfiguration:
        case UIGameLoadingState.WaitingForGameCore:
        case UIGameLoadingState.WaitingForVisualization:
        case UIGameLoadingState.WaitingForUIReady:
        case UIGameLoadingState.WaitingToStart:
        case UIGameLoadingState.GameStarted:
            return true;
            break;
        case UIGameLoadingState.NotStarted:
        case UIGameLoadingState.WaitingForGameplayData:
            break;
        default:
            console.error(`Unexpected Loading State - ${loadingState}`);
            return true;
            break;
    }
    return false;
}
window.addEventListener('load', function () {
    function Preload(images) {
        const promises = [];
        images.forEach((img) => {
            const promise = new Promise((resolve, _reject) => {
                let image = new Image();
                image.src = img;
                image.style.display = 'none';
                image.style.position = 'absolute';
                image.addEventListener('load', () => {
                    image = null;
                    resolve();
                });
            });
            promises.push(promise);
        });
        return Promise.all(promises);
    }
    // These are images we want to ensure are fully loaded before fading the screen in.
    // This should be sync'd with the CSS so that all necessary assets are loaded.
    const preloadImages = [
        'blp:hourglasses01',
        'blp:hourglasses02',
        'blp:hourglasses03'
    ];
    const preloaded = Preload(preloadImages);
    preloaded.finally(() => {
        const anim = document.querySelector('.loading-anim-container');
        if (anim) {
            const flipbook = document.createElement("flip-book");
            const flipbookDefinition = {
                fps: 30,
                atlas: [['blp:hourglasses01', 128, 128, 512],
                    ['blp:hourglasses02', 128, 128, 512],
                    ['blp:hourglasses03', 128, 128, 1024, 13]]
            };
            flipbook.setAttribute("data-flipbook-definition", JSON.stringify(flipbookDefinition));
            anim.appendChild(flipbook);
            anim.classList.add('fade-in');
            anim.classList.remove('hidden');
        }
    });
    // Signal that the loading screen is ready.  This will kick off the modding transition.
    UI.notifyUIReady();
    // Lock the cursor so HTML can't change it out from under us
    UI.lockCursor(true);
    // Set the loading cursor
    UI.setCursorByType(UIHTMLCursorTypes.Default);
    // Hide the cursor until the game loading screen appears
    UI.hideCursor();
    function transition() {
        const anim = document.querySelector('.loading');
        if (anim) {
            anim.classList.add('fade-out');
            anim.classList.remove('fade-in');
            setTimeout(() => { window.location.href = "fs://game/root-game.html"; }, 250);
        }
    }
    if (shouldTransition()) {
        transition();
    }
    else {
        // Track the event has triggered via a promise.
        const whenReadyToTransition = new Promise((resolve, _reject) => {
            engine.whenReady.then(() => {
                const eventName = 'UIGameLoadingStateChanged';
                const callback = () => {
                    if (shouldTransition()) {
                        engine.off(eventName, callback);
                        resolve();
                    }
                };
                engine.on(eventName, callback);
            });
        });
        whenReadyToTransition.then(() => {
            transition();
        });
    }
});
function updateLoadingBarWidthRatio(numerator, denominator) {
    const loadingBarProgress = document.querySelector('.loading__loading-bar-progress');
    const ratio = numerator / denominator;
    loadingBarProgress?.style.setProperty("width", `${ratio * 100}%`);
}
function onUIGameLoadingProgressChanged({ UIGameLoadingProgressState }) {
    completedUIGameLoadingProgressStates.add(UIGameLoadingProgressState);
    const states = [...completedUIGameLoadingProgressStates];
    const totalCurrentLoadingComponentsValue = requiredLoadingComponents.reduce((res, { id, value }) => res + (states.includes(id) ? value : 0), 0);
    updateLoadingBarWidthRatio(totalCurrentLoadingComponentsValue, totalRequiredLoadingComponentsValue);
}
// set up CSS global variables
//same function as setComponentSupportSafeMargins in ui\component-support.ts . Would be nice to factor them out.
function setRootLoadingSafeMargins() {
    const rootStyle = document.documentElement.style;
    // Setup Safe Zones 
    const safeAreaMargins = UI.getSafeAreaMargins();
    rootStyle.setProperty("--safezone-top", `${safeAreaMargins.top}px`);
    rootStyle.setProperty("--safezone-bottom", `${safeAreaMargins.bottom}px`);
    rootStyle.setProperty("--safezone-left", `${safeAreaMargins.left}px`);
    rootStyle.setProperty("--safezone-right", `${safeAreaMargins.right}px`);
}
engine.whenReady.then(() => {
    engine.on('UIGameLoadingProgressChanged', onUIGameLoadingProgressChanged);
    engine.on('AppInForeground', setRootLoadingSafeMargins);
    engine.on('update-safe-area', setRootLoadingSafeMargins);
    // Update css properties for scaling.
    setRootLoadingSafeMargins();
});

//# sourceMappingURL=file:///base-standard/ui/loading/root-loading.js.map
