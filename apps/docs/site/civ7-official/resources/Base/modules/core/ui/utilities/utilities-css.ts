export const SetTransformTranslateScale = (element: HTMLElement, translateX: number, translateY: number, scaleX: number, scaleY: number) => {
	let transform = element.attributeStyleMap.get('transform');
	if (transform) {
		if (transform instanceof CSSTransformValue) {
			if (transform[1] instanceof CSSTranslate) {
				transform[1].x = CSS.px(translateX);
				transform[1].y = CSS.px(translateY);
			} else {
				transform[1] = new CSSTranslate(CSS.px(translateX), CSS.px(translateY));
			}

			if (transform[0] instanceof CSSScale) {
				transform[0].x = scaleX;
				transform[0].y = scaleY;
			} else {
				transform[0] = new CSSScale(scaleX, scaleY);
			}
		}
	} else {
		transform = new CSSTransformValue([
			new CSSScale(scaleX, scaleY),
			new CSSTranslate(CSS.px(translateX), CSS.px(translateY)),
		]);
	}

	element.attributeStyleMap.set('transform', transform);
}