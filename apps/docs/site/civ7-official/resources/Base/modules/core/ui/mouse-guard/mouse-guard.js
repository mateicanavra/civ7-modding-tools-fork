"use strict";
/**
 * @file mouse-guard.ts
 * @copyright 2021-2022, Firaxis Games
 */
/**
 * Used by ContextManager request for capturing mouse behavior from leaking down.
 */
class MouseGuard extends Component {
    onReceiveFocus() { } //override
    onLoseFocus() { } //override
}
Controls.define('mouse-guard', {
    createInstance: MouseGuard,
    description: 'Used by ContextManager request for capturing mouse behavior from leaking down.',
    classNames: ['mouse-guard', 'fixed', 'inset-0', 'pointer-events-auto'],
    styles: ['fs://game/core/ui/mouse-guard/mouse-guard.css'],
});
//# sourceMappingURL=file:///core/ui/mouse-guard/mouse-guard.js.map
