/**
 * @file game-creator-types.ts
 * @copyright 2022-2024, Firaxis Games
 * @description Defines the common game creation interfaces.
 */

export enum NextCreationAction {
	Continue,
	StartGame
}

export interface ICreationPanelInfo {
	panel: string,
	nextAction: NextCreationAction,
	category?: string,
	panelOptions?: any
}

export interface IGameCreationPanel {
	setNavCategories(categories: string[]): void;
}