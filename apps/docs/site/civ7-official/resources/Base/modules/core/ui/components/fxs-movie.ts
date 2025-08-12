/**
 * @file fxs-movie.ts
 * @copyright 2023, Firaxis Games
 * @description Full screen panel designed to display "movie" animations
 */
import FxsActivatable from '/core/ui/components/fxs-activatable.js'



type VTTCue = { id: string, start: number, stop: number, text: string }

/**
 * Parse WebVTT files (https://www.w3.org/TR/webvtt1/#incremental-webvtt-parser)
 * Simple parser, ignores NOTE, STYLE, and REGION blocks.
 * Cue start/stop are in ms, not seconds.
 * Cue Text already converted to stylized markup. * 
 */
function parseVTT(content: string): VTTCue[] {

	function convertToMS(h: number, m: number, s: number, f: number) {
		return h * 3600000 + m * 60000 + s * 1000 + f / 1000;
	}

	function parseTimeStamp(m1: string, m2: string, m3: string, m4: string): number {
		const n1 = Number(m1);
		const n2 = Number(m2);
		const n4 = Number(m4);

		if (m3) {
			return convertToMS(n1, n2, Number(m3.replace(":", "")), n4);
		} else {
			return (n1 > 59) ? convertToMS(n1, n2, 0, n4) : convertToMS(0, n1, n2, n4);
		}
	}

	// Optional UTF-8 BOM.
	let offset = 0;
	if (content[0] == '\ufeff') {
		offset = 1;
	}

	// Parse signature.
	if (!content.startsWith("WEBVTT", offset)) {
		throw new Error("Missing 'WEBVTT' signature.");
	}

	// Signature is good! perform replacements.

	// replace \0 with REPLACEMENT
	content = content.replaceAll('\0', '\ufffd');

	// replace CRLF with LF
	content = content.replaceAll('\r\n', '\n');

	// replace all CR with LF
	content = content.replaceAll('\r', '\n');

	// Everything is based around lines, so split it all up.
	const lines = content.split('\n');
	const lineCount = lines.length;

	const results = [];

	// Empty VTT?
	if (lines.length == 1) {
		return [];
	}
	else {

		const CUETIMINGS = /\s*(\d+):(\d{2})(:\d{2})?\.(\d{3})\s*-->\s*(\d+):(\d{2})(:\d{2})?\.(\d{3})\s*(.+)?/;

		let line = 1; // Skip header line.
		while (line < lineCount) {

			let text = lines[line];

			// Skip blank lines.			
			if (text == '') {
				line++;
				continue;
			}

			const ch = text.charAt(0);
			switch (ch) {
				case 'N':
					if (text.startsWith('NOTE')) {
						// Comment blocks are ignored.
						line++;
						while (line < lineCount && lines[line] != '') {
							line++;
						}
						continue;
					}
					break;

				case 'R':
					if (text.startsWith('REGION')) {
						// Region blocks are not yet supported. Skip over them for now.
						line++;
						while (line < lineCount && lines[line] != '') {
							line++;
						}
						continue;
					}
					break;

				case 'S':
					if (text.startsWith('STYLE')) {
						// Style blocks are not yet supported. Skip over them for now.
						line++;
						while (line < lineCount && lines[line] != '') {
							line++;
						}
						continue;
					}
					break;
			}

			let id = '';
			if (text.indexOf('-->') == -1) {
				id = text;
				line++;
				if (line >= lineCount) {
					break;
				}
			}

			const m = lines[line].match(CUETIMINGS);
			if (m == null) {
				throw new Error(`Cannot parse cue timings. ${lines[line]}`);
			}
			else {
				const start = parseTimeStamp(m[1], m[2], m[3], m[4]);
				const stop = parseTimeStamp(m[5], m[6], m[7], m[8]);
				if (isNaN(start) || isNaN(stop)) {
					throw new Error(`Could not parse timestamps for cue. ${lines[line]}.`);
				}
				else {
					const cueTextLines = [];
					line++;

					let cueText = lines[line];
					while (line < lineCount && cueText.length > 0) {
						cueTextLines.push(cueText);
						line++;
						cueText = lines[line];
					}

					let text = cueTextLines.join('[N]');

					// Convert all bold and italic spans to stylized text.
					text = text.replaceAll(/<(\/)?([bBiI])>/g, "[$1$2]");

					// Strip remaining spans.
					text = text.replaceAll(/(<.*>)/g, "");

					const cue = {
						id: id,
						start: start,
						stop: stop,
						text: text
					}
					results.push(cue);
				}
			}
		}
	}

	return results;
}

const STOP_MOVIE_AUDIO_EVENT = 'stop_webm';

interface FxsMovieEntry {
	Locale: string;
	MovieType: string;
	Resolution: number;
	Audio?: string;
	StopAudio?: string;
	Subtitles?: string;
	Url: string;
	UseCoverFitMode: boolean;
}

class FxsMovie extends FxsActivatable {

	private readyStateListener: FrameRequestCallback = this.onCheckReadyState.bind(this);
	private movieSkipListener = this.onSkipMovie.bind(this, false);
	private moviePlayingListener = this.onMoviePlaying.bind(this);
	private movieEndedListener = this.onMovieEnded.bind(this);
	private playbackStalledListener = this.onPlaybackStalled.bind(this);
	private playbackResumedListener = this.onPlaybackResumed.bind(this);
	private movieErrorListener = this.onMovieError.bind(this);

	private rafCheckReadyState = 0;

	// Toggle to enable some debug features
	private currentMovie: FxsMovieEntry | null = null;
	private currentMovieState: { subtitles: VTTCue[] | null, timeouts: number[] } | null = null;
	private currentMovieType: string | null = null;
	private displayLocale: string;
	private displayResolution: number;

	private videoElement: HTMLVideoElement | null = null;
	private subtitleElement: HTMLDivElement | null = null;
	private movieVariants: FxsMovieEntry[] | null = null;

	private showSubtitles: boolean = true;

	constructor(root: ComponentRoot) {
		super(root);

		this.updateBackdrop();

		if (UI.favorSpeedOverQuality()) {
			this.displayResolution = 720;
		}
		else {
			this.displayResolution = window.innerHeight;
		}

		// Determine whether or not to show subtitles based options.
		const attrShowSubtitles = this.Root.getAttribute('data-force-subtitles');
		if (attrShowSubtitles != null) {
			this.showSubtitles = (attrShowSubtitles[0] == 't' || attrShowSubtitles[0] == 'T' || attrShowSubtitles[0] == '1');
		}
		else {
			const subtitleOption = UI.getOption('audio', 'Sound', 'Subtitles');
			this.showSubtitles = subtitleOption == 1;
		}

		// TODO - Missing `Locale.getCurrentLocale()`
		this.displayLocale = "en_US";
	}

	onAttach() {
		super.onAttach();

		this.Root.addEventListener('action-activate', this.movieSkipListener);

		if (!this.Root.classList.contains('absolute')) {
			this.Root.classList.add('relative');
		}

		const movieId = this.Root.getAttribute('data-movie-id');
		if (movieId) {
			this.onSkipMovie(true);
			this.playMovie(movieId);
		}
	}

	onDetach() {
		if (this.rafCheckReadyState) {
			cancelAnimationFrame(this.rafCheckReadyState);
			this.rafCheckReadyState = 0;
		}

		this.clearMovie();

		this.Root.removeEventListener('action-activate', this.movieSkipListener);
		super.onDetach();
	}

	onAttributeChanged(name: string, _oldValue: string | null, newValue: string | null): void {
		if (name == 'data-movie-id') {
			if (newValue) {
				// Do nothing if assigned the same value.  This happens often with current `postOnAttach` logic.
				if (newValue != this.currentMovieType) {
					this.onSkipMovie(true);
					this.playMovie(newValue);
				}
			}
			else {
				this.onSkipMovie(true);
			}
		}
		else if (name == 'data-hide-backdrop') {
			this.updateBackdrop();
		}
	}

	private onSkipMovie(force = false) {
		let preventSkipping = false;
		const attrPreventSkipping = this.Root.getAttribute('data-prevent-skipping');
		if (attrPreventSkipping != null) {
			preventSkipping = (attrPreventSkipping[0] == 't' || attrPreventSkipping[0] == '1');
		}

		if ((force || !preventSkipping) && this.currentMovie) {
			this.onMovieEnded();
		}
	}

	private onCheckReadyState() {
		this.rafCheckReadyState = 0;

		if (this.videoElement) {
			// We want `HAVE_FUTURE_DATA` or `HAVE_ENOUGH_DATA`
			if (this.videoElement.readyState > 2) {
				this.onMovieReadyToPlay();
			}
			else {
				this.rafCheckReadyState = requestAnimationFrame(this.readyStateListener);
			}
		}
	}

	private onMovieReadyToPlay() {
		if (this.videoElement) {
			const width = window.innerWidth;
			const height = window.innerHeight;

			const videoWidth = this.videoElement.videoWidth;
			const videoHeight = this.videoElement.videoHeight;

			console.debug(`Video loaded, adjusting size to fit video. Window ${width}x${height} Video: ${videoWidth}x${videoHeight}`);

			const movieRatio = videoWidth / videoHeight;
			const movieRatioInverse = videoHeight / videoWidth;
			const displayRatio = width / height;

			let cover = false;

			if (this.currentMovie?.UseCoverFitMode) {
				cover = true;
			}

			const attrFitMode = this.Root.getAttribute('data-movie-fit-mode');
			if (attrFitMode) {
				if (attrFitMode == 'cover') {
					cover = true;
				}
				else {
					cover = false;
				}

			}

			// Compare ratios
			if (movieRatio < displayRatio || cover) {
				// Scale to height
				this.videoElement.style.height = '100%';
				const newWidth = height * movieRatio;
				const newWidthPct = newWidth / width;
				this.videoElement.style.width = `${newWidthPct * 100}%`;
			}
			else {
				// Scale to width
				this.videoElement.style.width = '100%';
				const newHeight = width * movieRatioInverse;
				const newHeightPct = newHeight / height;
				this.videoElement.style.height = `${newHeightPct * 100}%`;
			}

			// Wait 2 frames after attach to begin playback.  This ensures the element is properly laid out.
			delayByFrame(() => {
				const videoElement = this.videoElement;
				if (videoElement) {
					console.debug("Adjustments made, begin playback.");

					const movie = this.currentMovie;
					if (movie) {
						if (movie.Audio) {
							UI.sendAudioEvent(movie.Audio);
						}
					}

					videoElement.play();
				}
			}, 2);
		}
	}

	private onMoviePlaying() {
		const movie = this.currentMovie;
		if (movie) {
			console.debug(`Movie '${this.currentMovie?.MovieType}' - '${this.currentMovie?.Url}' playing!`);

			// This event is currently signaled when decoding has begun but there is still a brief window of time
			// before updating the texture with decoded frames.
			// Delay by 6 frames to ensure video is properly shown.
			delayByFrame(() => {

				const movieState = this.currentMovieState;
				if (movieState && movieState.subtitles) {
					for (const cue of movieState.subtitles) {

						// Push timeouts in case movie is skipped or ended prematurely.
						movieState.timeouts.push(setTimeout(() => {
							if (this.currentMovieState == movieState) {
								this.addSubtitleElement(cue.text, cue.stop - cue.start);
							}
						}, cue.start));
					}
				}

				const event = new CustomEvent('movie-playing');
				this.Root.dispatchEvent(event);
			}, 6);
		}
	}

	private onMovieEnded() {
		if (this.currentMovie) {
			this.clearMovie();

			const event = new CustomEvent('movie-ended');
			this.Root.dispatchEvent(event);
		}
	}

	private onPlaybackStalled() {
		console.warn(`Movie '${this.currentMovie?.Url}' stalled.`);
	}

	private onPlaybackResumed() {
		console.warn(`Movie '${this.currentMovie?.Url}' resuming after a stall.`);
	}

	private onMovieError() {
		console.error(`Movie '${this.currentMovie?.Url}' failed to play. Trying the next variant.`)

		this.playNextVariant();
	}

	private addVideoElement(url: string) {
		this.videoElement = document.createElement('video');
		this.videoElement.autoplay = false;
		this.videoElement.style.pointerEvents = 'none';
		// This event is not yet supported, see the kludge below that polls ready state every frame.
		//this.videoElement.addEventListener('canplay', this.movieCanPlayListener);
		this.videoElement.addEventListener('ended', this.movieEndedListener);
		this.videoElement.addEventListener('playing', this.moviePlayingListener);
		this.videoElement.addEventListener('cohplaybackstalled', this.playbackStalledListener);
		this.videoElement.addEventListener('cohplaybackresumed', this.playbackResumedListener);
		this.videoElement.addEventListener('error', this.movieErrorListener);
		this.videoElement.src = url;
		this.Root.appendChild(this.videoElement);
	}

	private removeVideoElement() {
		if (this.videoElement) {
			// Explicitly clear source to ensure memory freed rather than wait for GC finalization.
			this.videoElement.removeEventListener('ended', this.movieEndedListener);
			this.videoElement.removeEventListener('playing', this.moviePlayingListener);
			this.videoElement.removeEventListener('cohplaybackstalled', this.playbackStalledListener);
			this.videoElement.removeEventListener('cohplaybackresumed', this.playbackResumedListener);
			this.videoElement.removeEventListener('error', this.movieErrorListener);
			this.videoElement.pause();
			this.videoElement.src = '';
			this.videoElement = null;
		}
		this.subtitleElement = null;
		this.Root.innerHTML = '';
	}

	private addSubtitleElement(text: string, duration: number) {

		if (this.subtitleElement == null) {
			const subbyRoot = document.createElement('div');
			subbyRoot.classList.add('absolute', 'inset-6', 'flex', 'flex-col-reverse', 'justify-flex-start', 'items-center', 'fullscreen');
			this.subtitleElement = subbyRoot;
			this.Root.appendChild(subbyRoot);
		}

		const el = document.createElement('div');
		el.setAttribute('aria-hidden', 'true');
		el.classList.add('fxs-movie-subtitle', 'relative', 'text-2xl');
		el.style.cssText = 'text-stroke: 4px black; color:white;'
		el.innerHTML = Locale.stylize(text);
		this.subtitleElement.appendChild(el)

		const hideTimeout = setTimeout(() => {
			el.remove();
		}, duration);
		this.currentMovieState?.timeouts.push(hideTimeout);
	}

	private clearMovie() {

		if (this.currentMovie) {
			const stopAudioEvent = this.currentMovie.StopAudio ?? STOP_MOVIE_AUDIO_EVENT;
			UI.sendAudioEvent(stopAudioEvent);
		}

		if (this.currentMovieState) {
			for (let timeout of this.currentMovieState.timeouts) {
				clearTimeout(timeout);
			}
		}

		this.removeVideoElement();
		this.currentMovie = null;
		this.currentMovieType = null;
		this.currentMovieState = null;
		this.movieVariants = null;
	}

	private movieSort(a: FxsMovieEntry, b: FxsMovieEntry) {
		// Sort variants based on locale and resolution.
		// Locale: 0 if matches Platform Locale, 1 if en_US, 2 if any other language
		// Resolution: less than user's vertical resolution order desc, higher than user's vertical resolution, order asc
		if (a.Locale == b.Locale) {
			const resolution = this.displayResolution;
			if (a.Resolution == b.Resolution) {
				return 0;
			}
			else if (a.Resolution <= resolution) {
				if (b.Resolution <= resolution) {
					return (a.Resolution > b.Resolution) ? -1 : 1;
				}
				else {
					return -1;
				}
			}
			else if (a.Resolution > resolution) {
				if (b.Resolution > resolution) {
					return (a.Resolution > b.Resolution) ? 1 : -1;
				}
				else {
					return 1;
				}
			}
			else {
				return -1;
			}
		}
		else {
			const locale = this.displayLocale;

			if (a.Locale == locale) {
				return -1;
			}
			else if (b.Locale == locale) {
				return 1;
			}
			else if (a.Locale == "en_US") {
				return -1;
			}
			else if (b.Locale == "en_US") {
				return 1;
			}
			else {
				return 0;
			}
		}
	}

	private getMovieVariants(movieType: string, movieResolution?: number, movieLocale?: string): FxsMovieEntry[] | null {
		const movieVariants: FxsMovieEntry[] = [];
		const configMovies = Database.query('config', 'select * from Movies');
		if (configMovies) {
			for (const m of configMovies) {
				if (m.MovieType == movieType &&
					(movieResolution == null || m.Resolution == movieResolution) &&
					(movieLocale == null || m.Locale == movieLocale)) {
					movieVariants.push(m as unknown as FxsMovieEntry);
				}
			}
		}

		if (UI.isInGame()) {
			const inGameMovies = Database.query('gameplay', 'select * from Movies');
			if (inGameMovies) {
				for (const m of inGameMovies) {
					if (m.MovieType == movieType &&
						(movieResolution == null || m.Resolution == movieResolution) &&
						(movieLocale == null || m.Locale == movieLocale)) {
						movieVariants.push(m as unknown as FxsMovieEntry);
					}
				}
			}
		}

		movieVariants.sort(this.movieSort.bind(this));
		return movieVariants;
	}

	private playNextVariant() {
		// Pick the first available variant
		const movie = (this.movieVariants) ? this.movieVariants[0] : null;

		if (movie) {
			this.removeVideoElement();

			// remove current movie from available variant in case we need to fallback to the next variant
			this.movieVariants?.splice(0, 1);

			this.currentMovie = movie;
			this.currentMovieState = {
				subtitles: null,
				timeouts: []
			}
			const movieState = this.currentMovieState;

			this.addVideoElement(this.currentMovie.Url);

			if (this.showSubtitles && movie.Subtitles) {

				this.fetchSubtitles(movie.Subtitles).then((cues) => {
					// Assign to a state object that may or may not be the current movie state.
					movieState.subtitles = cues;

				}).catch((e) => void e).finally(() => {
					// This is a kludge to deal with the fact that Gameface does not support the 'canplay' event at the moment.
					this.rafCheckReadyState = requestAnimationFrame(this.readyStateListener);
				});
			}
			else {
				// This is a kludge to deal with the fact that Gameface does not support the 'canplay' event at the moment.
				this.rafCheckReadyState = requestAnimationFrame(this.readyStateListener);
			}
		}
		else {
			console.error(`No valid movie found for ${this.currentMovieType}`);
			this.onMovieEnded();
		}
	}

	private playMovie(movieType: string) {

		// Enumerate all of the variants.
		const attrSelectResolution = this.Root.getAttribute('data-movie-select-resolution');
		const attrSelectLocale = this.Root.getAttribute('data-movie-select-locale');

		let movieResolution: number | undefined;
		if (attrSelectResolution) {
			movieResolution = Number.parseInt(attrSelectResolution);
		}

		let movieLocale: string | undefined;
		if (attrSelectLocale) {
			movieLocale = attrSelectLocale;
		}

		this.movieVariants = this.getMovieVariants(movieType, movieResolution, movieLocale);

		if (!this.movieVariants || this.movieVariants.length == 0) {
			// No movie! Trigger the ended sequence.
			console.error(`No movie definitions found for ${movieType}`);
			this.onMovieEnded();
		}

		this.currentMovieType = movieType;

		this.playNextVariant();
	}

	private updateBackdrop() {
		const attrNoBackdrop = this.Root.getAttribute('data-hide-backdrop');
		const useBackdrop = (attrNoBackdrop == null || (attrNoBackdrop[0] != 't' && attrNoBackdrop[0] != '1'));
		if (useBackdrop) {
			this.Root.style.backgroundColor = 'black';
		}
		else {
			this.Root.style.backgroundColor = '';
		}
	}

	private async fetchSubtitles(url: string) {
		const content = await asyncLoad(url);
		return parseVTT(content);
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'fxs-movie': ComponentRoot<FxsMovie>;
	}
}

Controls.define('fxs-movie', {
	createInstance: FxsMovie,
	description: 'Full-screen movie player',
	classNames: ['flex', 'justify-center', 'items-center', 'pointer-events-auto'],
	attributes: [
		{
			name: 'data-movie-id',
			description: 'The ID of the movie to play.  This component will pick the URL based on display resolution and locale.',
			required: true
		},
		{
			name: 'data-movie-select-resolution',
			description: 'The component will use only this resolution to select movies from.',
			required: false
		},
		{
			name: 'data-movie-select-locale',
			description: 'The component will use only this locale to select movies from.',
			required: false
		},
		{
			name: 'data-movie-fit-mode',
			description: 'Supported values are either contain (default) or cover.  Behaves similar to object-fit.'
		},
		{
			name: 'data-force-subtitles',
			description: 'Force subtitles to be shown or hidden, regardless of user options.'
		},
		{
			name: 'data-hide-backdrop',
			description: 'Do not use a solid black backdrop for the movie.  NOTE: A backdrop may still exist in order to support skipping.'
		},
		{
			name: 'data-prevent-skipping',
			description: 'The movie cannot be skipped.  By default it is skippable'
		},
	]
});

export { FxsMovie as default }