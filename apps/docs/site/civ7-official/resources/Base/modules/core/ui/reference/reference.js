"use strict";
console.log('Loading reference.ts');
engine.whenReady.then(() => {
    const model = {
        ButtonCaption: "Click me to toggle the checkbox!",
        CheckboxCaption: "This is a data-bound caption!",
        Selected: true,
        Toggle: function () {
            this.Selected = !this.Selected;
            engine.updateWholeModel(this);
            engine.synchronizeModels();
        }
    };
    engine.createJSModel("g_SampleData", model);
    engine.synchronizeModels();
});

//# sourceMappingURL=file:///core/ui/reference/reference.js.map
