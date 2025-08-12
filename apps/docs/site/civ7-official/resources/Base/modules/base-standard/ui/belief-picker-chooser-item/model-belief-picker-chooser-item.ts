import { ChooserNode } from "/base-standard/ui/chooser-item/model-chooser-item.js";

export interface BeliefPickerChooserNode extends ChooserNode {
	description: string;
	isSwappable?: boolean;
}