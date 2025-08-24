"use strict";
let landClaimContainer = document.getElementById("land-claim-page");
let citiesClaimContainer = document.getElementById("cities-page");
let landClaimContainer2 = document.getElementById("land-claim-page-2");
let citiesClaimContainer2 = document.getElementById("cities-page-2");
let pageTracker = 0;
window.addEventListener("mousedown", () => { toggleZoom(); });
function toggleZoom() {
    pageTracker++;
    console.log(landClaimContainer.className);
    switch (pageTracker) {
        case 1:
            landClaimContainer?.classList.remove('inactive');
            break;
        case 2:
            landClaimContainer?.classList.add('prev');
            citiesClaimContainer?.classList.remove('inactive');
            break;
        case 3:
            citiesClaimContainer.classList.add('prev');
            landClaimContainer2.classList.remove('inactive');
            break;
        case 4:
            landClaimContainer2.classList.add('prev');
            citiesClaimContainer2.classList.remove('inactive');
            break;
        case 5:
            landClaimContainer2.classList.remove('prev');
            landClaimContainer2.classList.add('slow-anim');
            citiesClaimContainer2.classList.add('inactive');
            break;
        case 6:
            citiesClaimContainer.classList.add('slow-anim');
            citiesClaimContainer.classList.remove('prev');
            landClaimContainer2.classList.remove('slow-anim');
            landClaimContainer2.classList.add('inactive');
            break;
        case 7:
            landClaimContainer.classList.add('slow-anim');
            landClaimContainer.classList.remove('prev');
            citiesClaimContainer.classList.remove('slow-anim');
            citiesClaimContainer.classList.add('inactive');
            break;
        case 8:
            landClaimContainer.classList.remove('slow-anim');
            landClaimContainer.classList.add('inactive');
            pageTracker = 0;
            break;
    }
    // document.querySelector('.sadvisor').classList.toggle('inactive');
}

//# sourceMappingURL=file:///core/ui/sandbox/super-advisor/sadvisor.js.map
