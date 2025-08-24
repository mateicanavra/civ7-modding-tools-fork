class model_scene2 {

	private NarrativeBookSceneModelGroup: WorldUI.ModelGroup | null = null;

	public build3DScene() {
		// toggle the 3d scene on and off		
		this.NarrativeBookSceneModelGroup = WorldUI.createModelGroup("NarrativeBookSceneModelGroup");
		this.NarrativeBookSceneModelGroup.addModelAtPos("Narrative_Book_Test_Scene", { x: -6.0, y: 31.8, z: -7.55 }, { scale: 0.25, placement: PlacementMode.DEFAULT, foreground: true, initialState: "IDLE" });
	}
}

class NarrativeUnitTest extends Component {
	onAttach() {
		super.onAttach();
	}
}

function add_stuff2() {
	let scene = new model_scene2();
	scene.build3DScene();
}

function extra_stuff2() {

}

function toggle_visibility2(id: string) {

	let element = document.getElementById(id) as HTMLElement;
	if (element.style.display == 'flex')
		element.style.display = 'none';
	else
		element.style.display = 'flex';
}


