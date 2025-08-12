
export interface AnimationProps {
	element: Element;
	time?: number;
	classname: string;
	startWithPrev?: boolean;
	remove?: boolean;
	offset?: number;
	callback?: Function;
	target?: string;
}

export interface ChainedAnimation {
	timer: number;
	function: Function;
}

let chainedAnimations: ChainedAnimation[] = [];
let isCancellingAnimations: boolean = false;

export function cancelAllChainedAnimations(jumpToEnd: boolean = false) {
	isCancellingAnimations = true;
	chainedAnimations.forEach(({ timer: n, function: f }) => {
		clearTimeout(n);
		if (f && jumpToEnd) {
			f(n);
		}
	})
	chainedAnimations.length = 0;
	isCancellingAnimations = false;
}

export function getNumChainedAnimations(): number {
	return chainedAnimations.length;
}

export async function chainAnimation(...props: AnimationProps[]): Promise<number> {
	let _timer = 0;
	let root: AnimationProps[] = [];
	props[0].element.classList.toggle(props[0].classname, !props[0].remove);
	root.push(props[0]);
	let j = 1;
	for (j; j < props.length; j++) {
		if (props[j].startWithPrev) {
			props[j].element.classList.toggle(props[j].classname, !props[j].remove);
			root.push(props[j]);
		}
		else {
			j--
			break;
		}
	}
	let animProps: AnimationProps = await findAnimationEnd(root, props[0].offset);
	let oldprops = props.splice(0, j + 1);
	let propFunction: Function;
	propFunction = () => {
		for (let prop of oldprops) {
			if (prop.callback) {
				prop.callback();
			}
		}
		if (props.length > 0) {
			chainAnimation(...props);
		}
	}
	if (isCancellingAnimations) {
		propFunction();
		return 0;
	}
	_timer = setTimeout(() => {
		propFunction(_timer);
		chainedAnimations.splice(chainedAnimations.indexOf({ timer: _timer, function: propFunction }, 1));
	}, 1000 * Math.max(0, animProps.time as number));
	let newChainedAnim: ChainedAnimation = { timer: _timer, function: propFunction };
	chainedAnimations.push(newChainedAnim);
	return _timer
}

export async function findAnimationEnd(root: AnimationProps[], addDelay: number = 0): Promise<AnimationProps> {
	let elArr: Element[] = [];
	for (let r of root) {
		let target: string = "*";
		if (r.target) {
			target = `[class*="${r.target}"]`;
		}
		// elArr.push(...Array.from(r.element.getElementsByTagName(target)));
		elArr.push(...Array.from(r.element.querySelectorAll(target)));
		if (!r.target) {
			elArr.push(r.element);
		}
	}
	let total: number = 0;
	let target: HTMLElement = root[0].element as HTMLElement;
	let classname: string = '';
	let animProps: AnimationProps;
	let promise: Promise<AnimationProps> = new Promise((res) => {
		requestAnimationFrame(() => {
			for (let el of elArr) {
				let _de: number = 0;
				let _du: number = 0;
				let _deArr = window.getComputedStyle(el).getPropertyValue('transition-delay').split('s,');
				let _duArr = window.getComputedStyle(el).getPropertyValue('transition-duration').split('s,');
				let _length = (_deArr.length > _duArr.length) ? _deArr.length : _duArr.length;
				for (let i = 0; i < _length; i++) {
					_de = parseFloat((_deArr.length > i) ? _deArr[i] : _deArr[_deArr.length - 1]);
					_du = parseFloat((_duArr.length > i) ? _duArr[i] : _duArr[_duArr.length - 1]);
					if ((_de + _du) > total) {
						total = _de + _du;
						target = el as HTMLElement;
						classname = el.className;
					}
				}
			}
			let _animProps: AnimationProps = { element: target, time: (total + addDelay), classname: classname };
			res(_animProps);
		});
	});
	animProps = await promise
	return animProps;
}

// TODO: See if these can be merged/replaced with fxs-flipbook
export interface SpriteSheet {
	imageName: string;
	rows: number;
	cols: number;
	frames: number;
	startFrame?: number;
}

export namespace SpriteSheet {
	export function from(source: SpriteSheet, startFrame: number, frames: number): SpriteSheet {
		return ({
			imageName: source.imageName,
			rows: source.rows,
			cols: source.cols,
			frames: frames,
			startFrame: startFrame
		});
	}
}

export class SpriteSheetAnimation {
	private isRunning = false;
	private lastFrameTime = 0;
	private elapsed = 0;
	private frameHandler?: number;

	constructor(private element: HTMLElement, private spriteSheet: SpriteSheet, private durationMs: number) {
	}

	public start(spriteSheet?: SpriteSheet) {
		if (spriteSheet) {
			this.spriteSheet = spriteSheet;
		}

		if (!this.isRunning) {
			this.lastFrameTime = 0;
			this.elapsed = 0;

			this.element.style.backgroundImage = `url(${this.spriteSheet.imageName})`;
			this.element.style.backgroundSize = `${Math.floor(this.spriteSheet.cols * 100)}% ${Math.floor(this.spriteSheet.rows * 100)}%`;

			if (this.spriteSheet.frames > 1) {
				this.isRunning = true;
				requestAnimationFrame((time: DOMHighResTimeStamp) => this.doFrame(time));
			} else {
				this.drawFrame(this.spriteSheet.startFrame ?? 0);
			}
		}
	}

	public stop() {
		if (this.isRunning) {
			this.isRunning = false;

			this.element.style.backgroundImage = "";
			this.element.style.backgroundSize = "";
			this.element.style.backgroundPositionX = "";
			this.element.style.backgroundPositionY = "";

			if (this.frameHandler) {
				cancelAnimationFrame(this.frameHandler);
				this.frameHandler = undefined;
			}
		}
	}

	private doFrame(timestamp: DOMHighResTimeStamp) {
		if (!this.isRunning) {
			return;
		}

		if (this.lastFrameTime != 0) {
			this.elapsed += timestamp - this.lastFrameTime;
		}

		this.lastFrameTime = timestamp;

		while (this.elapsed >= this.durationMs) {
			this.elapsed -= this.durationMs;
		}

		const frame = Math.floor((this.spriteSheet.frames * this.elapsed) / this.durationMs) + (this.spriteSheet.startFrame ?? 0);
		this.drawFrame(frame);

		this.frameHandler = requestAnimationFrame((time: DOMHighResTimeStamp) => this.doFrame(time));
	}

	private drawFrame(frame: number) {
		const row = Math.floor(frame / this.spriteSheet.cols);
		const col = Math.floor(frame % this.spriteSheet.cols);
		this.element.style.backgroundPositionX = `${100 * (col / (this.spriteSheet.cols - 1))}%`;
		this.element.style.backgroundPositionY = `${100 * (row / (this.spriteSheet.rows - 1))}%`;
	}
}