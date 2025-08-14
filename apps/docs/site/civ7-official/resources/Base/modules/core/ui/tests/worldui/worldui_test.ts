
// fs://game/core/ui/tests/worldui/worldui_test.html

let g_TestSceneModels: WorldUI.ModelGroup | null = null;

function SpawnTest() {
	if (g_TestSceneModels) {
		g_TestSceneModels.destroy();
		g_TestSceneModels = null;
	}

	Camera.pushCamera({ x: 50, y: -75, z: 50 }, { x: 0, y: 20, z: 0 });
	g_TestSceneModels = WorldUI.createModelGroup("MainMenuTestScene");

	let pos = (x: number, y: number, height?: number): float3 => {
		return { x: 7.5 * x, y: 15 * y, z: height ? height : 0 };
	};

	// Row 1: Simple tests
	g_TestSceneModels.addModelAtPos("UI_Movement_Pip", pos(1, 0), { tintColor1: 0xFFBB00BB }); // Test color
	g_TestSceneModels.addModelAtPos("UI_Movement_Pip", pos(1, 0, 2), { alpha: 0.5 }); // Test alpha
	g_TestSceneModels.addModelAtPos("UI_Movement_Pip", pos(2, 0)); // Basic test
	g_TestSceneModels.addModelAtPos("UI_Movement_Pip_Empty", pos(2, 0, 2), { scale: 0.5, angle: 15 }); // Test scale and rotation

	// Row 2: Color tint tests
	g_TestSceneModels.addModelAtPos("Test_Shield_Tint", pos(0, 1), { tintColor1: 0xFF000000, tintColor2: 0xFFFFFFFF }); // Black/White
	g_TestSceneModels.addModelAtPos("Test_Shield_Tint", pos(1, 1), { tintColor1: 0xFF0000FF, tintColor2: 0xFF808080 }); // Red/Gray
	g_TestSceneModels.addModelAtPos("Test_Shield_Tint", pos(2, 1), { tintColor1: 0xFFFF0000, tintColor2: 0xFF00FF00 }); // Blue/Green
	g_TestSceneModels.addModelAtPos("Test_Shield_Tint", pos(3, 1), { tintColor1: 0xFF3126D7, tintColor2: 0xFF8A7B07 }); // Reddish/Greenish

	// Row 3: VFX Tests
	g_TestSceneModels.addVFXAtPos("FireFX_Campfire_A", pos(0.5, 2));
	g_TestSceneModels.addVFXAtPos("FireFX_Campfire_A", pos(2.5, 2));

	// Row 4: Advanced asset tests
	g_TestSceneModels.addModelAtPos("Exp1_Euro_Citizen_Male", pos(0, 3), { seed: 0 }); // Basic test with fixed seed
	g_TestSceneModels.addModelAtPos("Exp1_Euro_Citizen_Male", pos(1, 3), { seed: 0, initialState: "IDLE" }); // test animation
	g_TestSceneModels.addModelAtPos("Exp1_Euro_Citizen_Male", pos(2, 3), { seed: 20 }); // Test different seed
	let modelA = g_TestSceneModels.addModelAtPos("Exp1_Euro_Citizen_Male", pos(3, 3)); // Test "random" seed
	modelA?.setState("IDLE"); // Test animating the final citizen model programatically
}

function ClearTest() {
	if (g_TestSceneModels) {
		Camera.popCamera();
		g_TestSceneModels.destroy();
		g_TestSceneModels = null;
	}
}

SpawnTest();