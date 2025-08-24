"use strict";
class model_scene {
    constructor() {
        this.NarrativeBookSceneModelGroup = null;
    }
    build3DScene() {
        // toggle the 3d scene on and off		
        this.NarrativeBookSceneModelGroup = WorldUI.createModelGroup("NarrativeBookSceneModelGroup");
        this.NarrativeBookSceneModelGroup.addModelAtPos("Narrative_Book_Test_Scene", { x: -6.0, y: 31.8, z: -7.55 }, { scale: 0.25, placement: PlacementMode.DEFAULT, foreground: true, initialState: "IDLE" });
    }
    build3DPaintingScene() {
        // toggle the 3d scene on and off		
        this.NarrativeBookSceneModelGroup = WorldUI.createModelGroup("NarrativePaintingSceneModelGroup");
        this.NarrativeBookSceneModelGroup.addModelAtPos("Narrative_Painting_Test_Scene", { x: 0, y: 31.8, z: 0 }, { scale: 0.25, placement: PlacementMode.DEFAULT, foreground: true, initialState: "IDLE", tintColor1: 0xFFD1153A, tintColor2: 0xFF1616D4, selectionScriptParams: { age: "AGE_ANTIQUITY", civilization: "CIVILIZATION_EGYPT" } });
    }
}
class NarrativeBookTest extends Component {
    onAttach() {
        super.onAttach();
    }
}
function add_stuff() {
    let scene = new model_scene();
    scene.build3DScene();
}
function add_painting_stuff() {
    let scene = new model_scene();
    scene.build3DPaintingScene();
}
function toggle_visibility(id) {
    let element = document.getElementById(id);
    if (element.style.display == 'flex')
        element.style.display = 'none';
    else
        element.style.display = 'flex';
}

//# sourceMappingURL=file:///core/ui/sandbox/narrative-book-test/narrative-book-test.js.map
