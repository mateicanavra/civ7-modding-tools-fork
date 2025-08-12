/**
 * @file crisis-meter.ts
 * @copyright 2025, Firaxis Games
 * @description Crisis ring meter control that shows when a crisis will occur on the ring
 */

import { FxsRingMeter } from '/core/ui/components/fxs-ring-meter.js'

export class CrisisMeter extends FxsRingMeter {

	static readonly stages = [
		{ 
			tooltip: 'LOC_UI_POLICIES_CRISIS_BEGINS',
			triggerPercent: Game.CrisisManager.getCrisisStageTriggerPercent(0) 
		},
		{ 
			tooltip: 'LOC_UI_POLICIES_CRISIS_INTENSIFIES',
			triggerPercent: Game.CrisisManager.getCrisisStageTriggerPercent(1) 
		},
		{ 
			tooltip: 'LOC_UI_POLICIES_CRISIS_CULMINATES',
			triggerPercent: Game.CrisisManager.getCrisisStageTriggerPercent(2) 
		}
	] as const;

	onInitialize(): void {
		super.onInitialize();
		this.Root.classList.add('relative');
		const pipsContainer = document.createElement('div');
		pipsContainer.classList.add('z-0', 'absolute', 'inset-5');
		this.Root.appendChild(pipsContainer);
		// Position the pips around the outside of the ring based on the crisis stage trigger percentage
		for (let i = 0; i < CrisisMeter.stages.length; i++) {
			const { triggerPercent, tooltip } = CrisisMeter.stages[i];
			if (triggerPercent === -1) {
				continue;
			}
			const triggerPercentage = triggerPercent / 100;
			const pip = document.createElement('div');
			pip.setAttribute('data-tooltip-content', tooltip);
			pip.classList.add('absolute', 'size-4', '-ml-2', '-mt-2', 'pointer-events-auto', 'img-crisis-blk');

			// Polar to cartesian conversion
			// Add π/2 (90 degrees) to start at 6 o'clock position
			const angle = (Math.PI * 2 * triggerPercentage) + (Math.PI / 2);
			const x = Math.cos(angle) * 50 + 50;
			const y = Math.sin(angle) * 50 + 50;
			pip.attributeStyleMap.set('left', CSS.percent(x));
			pip.attributeStyleMap.set('top', CSS.percent(y));


			const pipArrow = document.createElement('div');
			pipArrow.classList.add('-z-1', 'absolute', 'size-2', '-ml-1', '-mt-1', 'img-car-rightarrow');
			const deg = (angle + Math.PI) * 180 / Math.PI;
			pipArrow.style.transform = `rotate(${deg}deg)`;
			//position the arrow between the pip and the ring
			const xArrow = Math.cos(angle + Math.PI) * 60 + 50;
			const yArrow = Math.sin(angle + Math.PI) * 60 + 50;
			pipArrow.attributeStyleMap.set('left', CSS.percent(xArrow));
			pipArrow.attributeStyleMap.set('top', CSS.percent(yArrow));
			pip.append(pipArrow);

			pipsContainer.appendChild(pip);
		}
	}
}

Controls.define('crisis-meter', {
	createInstance: CrisisMeter,
	attributes: [
		{
			name: "max-value",
			description: "The maximum value of the ring meter (default 100)"
		},
		{
			name: "min-value",
			description: "The minimum value of the ring meter (default 0)"
		},
		{
			name: "value",
			description: "The current value of the ring meter (default 0)"
		},
		{
			name: "animation-duration",
			description: "The duration of the animation in millseconds (default 1500)"
		},
		{
			name: "ring-class",
			description: "A css class to add to the ring element"
		}
	],
})

declare global {
	interface HTMLElementTagNameMap {
		'crisis-meter': ComponentRoot<CrisisMeter>
	}
}