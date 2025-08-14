class LeadersTest extends Component {
	private mouseDownListener: EventListener = () => { this.onMouseDown() };
	private leadersTestModelGroup: WorldUI.ModelGroup | null = null;

	private animationMode: boolean = true;
	private leaderNames: string[] = [
		"ADA_LOVELACE",
		"AMINA",
		"ASHOKA",
		"ASHOKA_ALT",
		"AUGUSTUS",
		"BENJAMIN_FRANKLIN",
		"BOLIVAR",
		"CATHERINE",
		"CHARLEMAGNE",
		"CONFUCIUS",
		"FRIEDRICH",
		"FRIEDRICH_ALT",
		"GENGHIS_KHAN",
		"HARRIET_TUBMAN",
		"HATSHEPSUT",
		"HIMIKO",
		"HIMIKO_ALT",
		"IBN_BATTUTA",
		"ISABELLA",
		"JOSE_RIZAL",
		"LAFAYETTE",
		"LAKSHMIBAI",
		"MACHIAVELLI",
		"NAPOLEON",
		"NAPOLEON_ALT",
		"PACHACUTI",
		"TECUMSEH",
		"TRUNG_TRAC",
		"XERXES",
		"XERXES_ALT"
	];


	constructor(root: ComponentRoot) {
		super(root);
	}

	onAttach() {
		super.onAttach();

		this.Root.addEventListener("mousedown", this.mouseDownListener);
		this.leadersTestModelGroup = WorldUI.createModelGroup("leadersTestModelGroup");

		var i: number = 0;
		var column: number = 0;
		var spacing: number = 40;
		// going to make a grid with a row length of 6
		for (i; i < this.leaderNames.length; i++) {
			this.leadersTestModelGroup.addModelAtPos("LEADER_" + this.leaderNames[i] + "_GAME_ASSET", { x: column * spacing, y: (i % 6) * spacing, z: 40 }, { angle: 0, scale: 2, initialState: "IDLE_CharSelect", triggerCallbacks: true });
			if (i > 5 && i % 6 == 0) {
				column++;
			}
		}
		this.Root.classList.add('leaders-test--animated'); //"button" indicator of whether or not they are animated or idle

	}
	onDettach() {
		super.onDetach();
		this.Root.removeEventListener("mousedown", this.mouseDownListener);
		this.leadersTestModelGroup?.clear();
	}

	private onMouseDown() {

		var i: number = 0;
		var column: number = 0;
		var spacing: number = 40;

		if (this.animationMode) { // if they are currently animated
			this.leadersTestModelGroup?.clear();
			this.Root.classList.remove('leaders-test--animated');

			for (i; i < this.leaderNames.length; i++) {
				this.leadersTestModelGroup?.addModelAtPos("LEADER_" + this.leaderNames[i] + "_GAME_ASSET", { x: column * spacing, y: (i % 6) * spacing, z: 40 }, { angle: 0, scale: 2, triggerCallbacks: true });
				if (i > 5 && i % 6 == 0) {
					column++;
				}
			}

			this.animationMode = false;
		} else { // if they are currently a posing 
			this.leadersTestModelGroup?.clear();
			this.Root.classList.add('leaders-test--animated');

			for (i; i < this.leaderNames.length; i++) {
				this.leadersTestModelGroup?.addModelAtPos("LEADER_" + this.leaderNames[i] + "_GAME_ASSET", { x: column * spacing, y: (i % 6) * spacing, z: 40 }, { angle: 0, scale: 2, initialState: "IDLE_CharSelect", triggerCallbacks: true });
				if (i > 5 && i % 6 == 0) {
					column++;
				}
			}

			this.animationMode = true;
		}
	}
}


export { LeadersTest as default };

Controls.define('leaders-test', {
	createInstance: LeadersTest,
	description: '[TEST] Leaders in UI.',
	styles: ["fs://game/core/ui/sandbox/leaders-test/leaders-test.css"],
	attributes: []
});