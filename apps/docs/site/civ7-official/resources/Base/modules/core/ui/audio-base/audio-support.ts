/**
 * @file audio-support.ts
 * @copyright 2021-2022, Firaxis Games
 * @description Helpful audio files.
 */

export namespace Audio {

	/**
	 * @description Look up the CivTech audio event name used for this sound
	 * @param id the identifier used for the sound to play
	 * @param group the name of the <div> id to look for the sound attribute; uses the default if none is specified
	 * @returns An AppEvent audio "tag" used as a key in the format "UI:<tag>" to look up the WWISE AudioEvent.
	 * 
	 * @summary The id here is a common name which is mapped to the "tag".  This "tag" is what
	 * is actually sent to the App side which has a mapping of the tag with "UI:" prepended.
	 * (e.g., "UI:city-interact-panel-showing")
	 * This tag with "UI:" is the "AppEvent" which is then used to look up a cooresponding WWISE "AudioEvent".
	 * (e.g., "UI_PNL_PROD_OPEN_PLAY")
	 * 
	 * These two levels of indirection allow UI engineers to create common mappings in the typescript 
	 * and allow an audio engineer the ability to map what those sounds are in the AssetEditor by opening
	 * up a mapping file such as: AUDIO_AppEvents.ast
	 */
	export function getSoundTag(id: string, group?: string): string {
		if (!Component.audio) {
			return '';
		}
		
		// need to fallback to audio-base twice to handle the case that the group exists, but the id doesn't exist in the group
		const soundTag = group ? Component.audio[group]?.[id] ?? Component.audio['audio-base'][id] : Component.audio['audio-base'][id];
		return soundTag ?? '';
	}

	/**
	 * Plays the most specific sound for the given audio id and group.
	 * @param id the UI audio id to play
	 * @param group the group
	 */
	export function playSound(id: string, group?: string): void {
		const tag = getSoundTag(id, group);
		if (tag) {
			UI.sendAudioEvent(tag);
		}
	}
}