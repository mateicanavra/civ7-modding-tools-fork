export type NavigationDirection = 'left' | 'right' | 'up' | 'down';

export interface Configuration {
  straightOnly?: boolean;
  rememberSource?: boolean;
  visualDebug?: boolean;
  straightOverlapThreshold?: number;
  diagonalOverlapThreshold?: number;
  enterTo?: string;
  leaveFor?: string;
  restrict?: string;
  straightSkip?: Selector;
  diagonalSkip?: Selector;
  enterToDisabled?: boolean;
  leaveForDisabled?: boolean;
  restrictDisabled?: boolean;
  straightSkipDisabled?: boolean;
  diagonalSkipDisabled?: boolean;
  enterToCallback?: (element: HTMLElement) => void;
  leaveForCallback?: (element: HTMLElement) => void;
  restrictCallback?: (element: HTMLElement) => void;
  straightSkipCallback?: (element: HTMLElement) => void;
  diagonalSkipCallback?: (element: HTMLElement) => void;
}

namespace SpatialNavigation {
	type Selector = string;

	function init(): void;
	function uninit(): void;
	function clear(): void;
	function add(config: Configuration): void;
	function add(sectionId: string, config: Configuration): void;
	function remove(sectionId: string): void;
	function set(config: Configuration): void;
	function set(sectionId: string, config: Configuration): void;
	function disable(sectionId: string): void;
	function enable(sectionId: string): void;
	function pause(): void;
	function resume(): void;
	function focus(): void;
	function focus(sectionId: string): void;
	function focus(selector: Selector): void;
	function focus(sectionId: string, silent: boolean): void;
	function focus(selector: Selector, silent: boolean): void;
	function move(direction: NavigationDirection): void;
	function move(direction: NavigationDirection, selector: Selector): void;
	function makeFocusable(): void;
	function makeFocusable(sectionId: string): void;
	function setDefaultSection(sectionId?: string): void;
}

export type SnWillMoveEvent = CustomEvent<{ cause: 'keydown' | 'api'; sectionId: string; direction: NavigationDirection; }>;
export type SnWillUnfocusEvent = CustomEvent<{ nextElement: HTMLElement; nextSectionId: string; direction?: NavigationDirection; native: boolean; }>;
export type SnUnfocusedEvent = CustomEvent<{ nextElement: HTMLElement; nextSectionId: string; direction?: NavigationDirection; native: boolean; }>;
export type SnWillFocusEvent = CustomEvent<{ sectionId: string; previousElement: HTMLElement; direction?: NavigationDirection; native: boolean; }>;
export type SnFocusedEvent = CustomEvent<{ sectionId: string; previousElement: HTMLElement; direction?: NavigationDirection; native: boolean; }>;
export type SnNavigateFailedEvent = CustomEvent<{ direction: NavigationDirection; }>;
export type SnEnterDownEvent = CustomEvent<never>;
export type SnEnterUpEvent = CustomEvent<never>;

export default SpatialNavigation;

declare global {
	interface HTMLElementEventMap {
		'sn:willmove': SnWillMoveEvent;
		'sn:willunfocus': SnWillUnfocusEvent;
		'sn:unfocused': SnUnfocusedEvent;
		'sn:willfocus': SnWillFocusEvent;
		'sn:focused': SnFocusedEvent;
		'sn:navigate-failed': SnNavigateFailedEvent;
		'sn:enter-down': SnEnterDownEvent;
		'sn:enter-up': SnEnterUpEvent;
	}
}