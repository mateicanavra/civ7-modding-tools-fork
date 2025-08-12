class CinematicMomentTest extends Component {

	constructor(root: ComponentRoot) {
		super(root);
	}

	onAttach() {
		super.onAttach();

		// SET WONDER TYPE HERE
		let cinematicType: string = "WONDER_COMPLETE"; // "WONDER_COMPLETE", "NATURAL_WONDER_DISCOVERED", "NATURAL_DISASTER", or "NUCLEAR_STRIKE"
		let cinematicQuote: string = "";

		let backgroundWrapper = document.getElementById("cm-content-container") as HTMLElement;

		if (backgroundWrapper) {
			if (cinematicType == "WONDER_COMPLETE") {
				backgroundWrapper.style.backgroundColor = "red";
				let wonderName: string = "Amundsen-Scott Research Station";
				let locationName: string = "Constantinople, France";
				let wonderYearBuilt: string = "Built Circa 1753 BC";
				cinematicQuote = "The Taj Mahal rises above the banks of the river like a solitary tear suspended on the cheek of time. -Rabindranath Tagore";

				this.realizeCinematicQuote(cinematicQuote);

				// Build wonder movie lower third

				const wonderMovieLowerThirdWrapper: HTMLDivElement = document.createElement("div");
				wonderMovieLowerThirdWrapper.classList.add("test-cinematic-moment__wonder-movie__everything-wrapper");
				backgroundWrapper.appendChild(wonderMovieLowerThirdWrapper);

				// Button Area

				const wonderMovieLowerThirdButtonShadow: HTMLDivElement = document.createElement("div");
				wonderMovieLowerThirdButtonShadow.classList.add("test-cinematic-moment__wonder-movie__button-shadow");
				wonderMovieLowerThirdWrapper.appendChild(wonderMovieLowerThirdButtonShadow);

				const wonderMovieLowerThirdButtonWrapper: HTMLDivElement = document.createElement("div");
				wonderMovieLowerThirdButtonWrapper.classList.add("test-cinematic-moment__wonder-movie__button-wrapper");
				wonderMovieLowerThirdButtonWrapper.setAttribute("id", "wonder-movie__button-wrapper")
				wonderMovieLowerThirdButtonShadow.appendChild(wonderMovieLowerThirdButtonWrapper);

				this.addFunctionButtons("wonder-movie__button-wrapper");

				// Base Hex

				const wonderMovieLowerThirdHexWrapper: HTMLDivElement = document.createElement("div");
				wonderMovieLowerThirdHexWrapper.classList.add("test-cinematic-moment__wonder-movie__hex-wrapper");
				wonderMovieLowerThirdWrapper.appendChild(wonderMovieLowerThirdHexWrapper);

				const wonderMovieLowerThirdHexDropShadow: HTMLDivElement = document.createElement("div");
				wonderMovieLowerThirdHexDropShadow.classList.add("test-cinematic-moment__wonder-movie__hex-drop-shadow");
				wonderMovieLowerThirdHexWrapper.appendChild(wonderMovieLowerThirdHexDropShadow);

				const wonderMovieLowerThirdHexBase: HTMLDivElement = document.createElement("div");
				wonderMovieLowerThirdHexBase.classList.add("test-cinematic-moment__wonder-movie__hex-base");
				wonderMovieLowerThirdHexWrapper.appendChild(wonderMovieLowerThirdHexBase);

				const wonderMovieLowerThirdHexWoodTexture: HTMLDivElement = document.createElement("div");
				wonderMovieLowerThirdHexWoodTexture.classList.add("test-cinematic-moment__wonder-movie__hex-wood-texture");
				wonderMovieLowerThirdHexBase.appendChild(wonderMovieLowerThirdHexWoodTexture);

				const wonderMovieLowerThirdHexPlayerColors: HTMLDivElement = document.createElement("div");
				wonderMovieLowerThirdHexPlayerColors.classList.add("test-cinematic-moment__wonder-movie__hex-player-colors");
				wonderMovieLowerThirdHexBase.appendChild(wonderMovieLowerThirdHexPlayerColors);

				const wonderMovieLowerThirdHexHighlightAndShadow: HTMLDivElement = document.createElement("div");
				wonderMovieLowerThirdHexHighlightAndShadow.classList.add("test-cinematic-moment__wonder-movie__hex-highlight");
				wonderMovieLowerThirdHexWrapper.appendChild(wonderMovieLowerThirdHexHighlightAndShadow);

				// Leader Portrait

				const wonderMovieLowerThirdLeaderPortrait: HTMLDivElement = document.createElement("div");
				wonderMovieLowerThirdLeaderPortrait.classList.add("test-cinematic-moment__wonder-movie__leader-portrait");
				wonderMovieLowerThirdWrapper.appendChild(wonderMovieLowerThirdLeaderPortrait);

				// Wonder Title Box

				const wonderMovieLowerThirdWonderTitleWrapper: HTMLDivElement = document.createElement("div");
				wonderMovieLowerThirdWonderTitleWrapper.classList.add("test-cinematic-moment__wonder-movie__title-wrapper");
				wonderMovieLowerThirdWrapper.appendChild(wonderMovieLowerThirdWonderTitleWrapper);

				const wonderMovieTitleBoxDropShadow: HTMLDivElement = document.createElement("div");
				wonderMovieTitleBoxDropShadow.classList.add("test-cinematic-moment__wonder-movie__title-box-drop-shadow");
				wonderMovieLowerThirdWonderTitleWrapper.appendChild(wonderMovieTitleBoxDropShadow);

				const wonderMovieTitleBoxBase: HTMLDivElement = document.createElement("div");
				wonderMovieTitleBoxBase.classList.add("test-cinematic-moment__wonder-movie__title-box-base");
				wonderMovieLowerThirdWonderTitleWrapper.appendChild(wonderMovieTitleBoxBase);

				const wonderMovieTitleBoxFlavorImage: HTMLDivElement = document.createElement("div");
				wonderMovieTitleBoxFlavorImage.classList.add("test-cinematic-moment__wonder-movie__title-box-flavor-image");
				wonderMovieTitleBoxBase.appendChild(wonderMovieTitleBoxFlavorImage);

				const wonderMovieTitleBoxWoodTexture: HTMLDivElement = document.createElement("div");
				wonderMovieTitleBoxWoodTexture.classList.add("test-cinematic-moment__wonder-movie__title-box-wood-texture");
				wonderMovieTitleBoxBase.appendChild(wonderMovieTitleBoxWoodTexture);

				const wonderMovieTitleBoxHighlightAndShadow: HTMLDivElement = document.createElement("div");
				wonderMovieTitleBoxHighlightAndShadow.classList.add("test-cinematic-moment__wonder-movie__highlight-and-shadow");
				wonderMovieTitleBoxBase.appendChild(wonderMovieTitleBoxHighlightAndShadow);

				const wonderMovieTitleBoxFrameWrapper: HTMLDivElement = document.createElement("div");
				wonderMovieTitleBoxFrameWrapper.classList.add("test-cinematic-moment__wonder-movie__frame-wrapper");
				wonderMovieTitleBoxBase.appendChild(wonderMovieTitleBoxFrameWrapper);

				const wonderMovieTitleBoxFrame: HTMLDivElement = document.createElement("div");
				wonderMovieTitleBoxFrame.classList.add("test-cinematic-moment__wonder-movie__frame");
				wonderMovieTitleBoxFrameWrapper.appendChild(wonderMovieTitleBoxFrame);

				const wonderMovieTitleBoxText: HTMLDivElement = document.createElement("div");
				wonderMovieTitleBoxText.classList.add("test-cinematic-moment__wonder-movie__title-text");
				wonderMovieTitleBoxText.innerHTML = wonderName;
				wonderMovieTitleBoxFrame.appendChild(wonderMovieTitleBoxText);

				// Year Built

				const wonderMovieLowerThirdYearBuiltWrapper: HTMLDivElement = document.createElement("div");
				wonderMovieLowerThirdYearBuiltWrapper.classList.add("test-cinematic-moment__wonder-movie__year-built-wrapper");
				wonderMovieLowerThirdWrapper.appendChild(wonderMovieLowerThirdYearBuiltWrapper);

				const wonderMovieYearBuiltDropShadow: HTMLDivElement = document.createElement("div");
				wonderMovieYearBuiltDropShadow.classList.add("test-cinematic-moment__wonder-movie__year-built-drop-shadow");
				wonderMovieLowerThirdYearBuiltWrapper.appendChild(wonderMovieYearBuiltDropShadow);

				const wonderMovieYearBuiltLineBase: HTMLDivElement = document.createElement("div");
				wonderMovieYearBuiltLineBase.classList.add("test-cinematic-moment__wonder-movie__year-built-line-base");
				wonderMovieLowerThirdYearBuiltWrapper.appendChild(wonderMovieYearBuiltLineBase);

				const wonderMovieYearBuiltLineWoodTexture: HTMLDivElement = document.createElement("div");
				wonderMovieYearBuiltLineWoodTexture.classList.add("test-cinematic-moment__wonder-movie__year-built-line-wood-texture");
				wonderMovieLowerThirdYearBuiltWrapper.appendChild(wonderMovieYearBuiltLineWoodTexture);

				const wonderMovieYearBuiltLineHighlightAndShadow: HTMLDivElement = document.createElement("div");
				wonderMovieYearBuiltLineHighlightAndShadow.classList.add("test-cinematic-moment__wonder-movie__year-built-line-highlight-and-shadow");
				wonderMovieLowerThirdYearBuiltWrapper.appendChild(wonderMovieYearBuiltLineHighlightAndShadow);

				const wonderMovieYearBuiltLineText: HTMLDivElement = document.createElement("div");
				wonderMovieYearBuiltLineText.classList.add("test-cinematic-moment__wonder-movie__year-built-line-text");
				wonderMovieYearBuiltLineText.innerHTML = wonderYearBuilt;
				wonderMovieLowerThirdYearBuiltWrapper.appendChild(wonderMovieYearBuiltLineText);

				// Location of Wonder

				const wonderMovieLowerThirdLocationWrapper: HTMLDivElement = document.createElement("div");
				wonderMovieLowerThirdLocationWrapper.classList.add("test-cinematic-moment__wonder-movie__location-wrapper");
				wonderMovieLowerThirdWrapper.appendChild(wonderMovieLowerThirdLocationWrapper);

				const wonderMovieLocationDropShadow: HTMLDivElement = document.createElement("div");
				wonderMovieLocationDropShadow.classList.add("test-cinematic-moment__wonder-movie__location-drop-shadow");
				wonderMovieLowerThirdLocationWrapper.appendChild(wonderMovieLocationDropShadow);

				const wonderMovieLocationLineBase: HTMLDivElement = document.createElement("div");
				wonderMovieLocationLineBase.classList.add("test-cinematic-moment__wonder-movie__location-line-base");
				wonderMovieLowerThirdLocationWrapper.appendChild(wonderMovieLocationLineBase);

				const wonderMovieLocationLineWoodTexture: HTMLDivElement = document.createElement("div");
				wonderMovieLocationLineWoodTexture.classList.add("test-cinematic-moment__wonder-movie__location-wood-texture");
				wonderMovieLowerThirdLocationWrapper.appendChild(wonderMovieLocationLineWoodTexture);

				const wonderMovieLocationLineHighlightAndShadow: HTMLDivElement = document.createElement("div");
				wonderMovieLocationLineHighlightAndShadow.classList.add("test-cinematic-moment__wonder-movie__location-line-highlight-and-shadow");
				wonderMovieLowerThirdLocationWrapper.appendChild(wonderMovieLocationLineHighlightAndShadow);

				const wonderMovieLocationLineText: HTMLDivElement = document.createElement("div");
				wonderMovieLocationLineText.classList.add("test-cinematic-moment__wonder-movie__location-line-text");
				wonderMovieLocationLineText.innerHTML = locationName;
				wonderMovieLowerThirdLocationWrapper.appendChild(wonderMovieLocationLineText);

				// Civ Icon

				const wonderMovieLowerThirdCivIconWrapper: HTMLDivElement = document.createElement("div");
				wonderMovieLowerThirdCivIconWrapper.classList.add("test-cinematic-moment__wonder-movie__civ-icon-wrapper");
				wonderMovieLowerThirdWrapper.appendChild(wonderMovieLowerThirdCivIconWrapper);

				const wonderMovieCivIconDropShadow: HTMLDivElement = document.createElement("div");
				wonderMovieCivIconDropShadow.classList.add("test-cinematic-moment__wonder-movie__civ-icon-drop-shadow");
				wonderMovieLowerThirdCivIconWrapper.appendChild(wonderMovieCivIconDropShadow);

				const wonderMovieCivIconBase: HTMLDivElement = document.createElement("div");
				wonderMovieCivIconBase.classList.add("test-cinematic-moment__wonder-movie__civ-icon-base");
				wonderMovieLowerThirdCivIconWrapper.appendChild(wonderMovieCivIconBase);

				const wonderMovieCivIconWoodTexture: HTMLDivElement = document.createElement("div");
				wonderMovieCivIconWoodTexture.classList.add("test-cinematic-moment__wonder-movie__civ-icon-wood-texture");
				wonderMovieLowerThirdCivIconWrapper.appendChild(wonderMovieCivIconWoodTexture);

				const wonderMovieCivIconPlayerColors: HTMLDivElement = document.createElement("div");
				wonderMovieCivIconPlayerColors.classList.add("test-cinematic-moment__wonder-movie__civ-player-colors");
				wonderMovieLowerThirdCivIconWrapper.appendChild(wonderMovieCivIconPlayerColors);

				const wonderMovieCivIconHighlightAndShadow: HTMLDivElement = document.createElement("div");
				wonderMovieCivIconHighlightAndShadow.classList.add("test-cinematic-moment__wonder-movie__civ-icon-highlight");
				wonderMovieLowerThirdCivIconWrapper.appendChild(wonderMovieCivIconHighlightAndShadow);

				const wonderMovieCivIconFrame: HTMLDivElement = document.createElement("div");
				wonderMovieCivIconFrame.classList.add("test-cinematic-moment__wonder-movie__civ-icon-frame");
				wonderMovieLowerThirdCivIconWrapper.appendChild(wonderMovieCivIconFrame);

				const wonderMovieCivIcon: HTMLDivElement = document.createElement("div");
				wonderMovieCivIcon.classList.add("test-cinematic-moment__wonder-movie__civ-icon");
				wonderMovieLowerThirdCivIconWrapper.appendChild(wonderMovieCivIcon);

			}

			else if (cinematicType == "NATURAL_WONDER_DISCOVERED") {
				backgroundWrapper.style.backgroundColor = "orange";
				let naturalWonderType: string = "Redwood Forest";
				let naturalWonderAnnouncement: string = "Natural Wonder Discovered";
				cinematicQuote = "It speaks as men speak to one another and are not heard by the little ants crawling over their boots. This is the Big Tree, the Sequoia. -Mary Austin";

				this.realizeCinematicQuote(cinematicQuote);

				// Build natural wonder movie lower third

				const naturalWonderLowerThirdWrapper: HTMLDivElement = document.createElement("div");
				naturalWonderLowerThirdWrapper.classList.add("test-cinematic-moment__natural-wonder__everything-wrapper");
				backgroundWrapper.appendChild(naturalWonderLowerThirdWrapper);

				// Button Area

				const naturalWonderLowerThirdButtonShadow: HTMLDivElement = document.createElement("div");
				naturalWonderLowerThirdButtonShadow.classList.add("test-cinematic-moment__natural-wonder__button-shadow");
				naturalWonderLowerThirdWrapper.appendChild(naturalWonderLowerThirdButtonShadow);

				const naturalWonderLowerThirdButtonWrapper: HTMLDivElement = document.createElement("div");
				naturalWonderLowerThirdButtonWrapper.classList.add("test-cinematic-moment__natural-wonder__button-wrapper");
				naturalWonderLowerThirdButtonWrapper.setAttribute("id", "natural-wonder__button-wrapper")
				naturalWonderLowerThirdButtonShadow.appendChild(naturalWonderLowerThirdButtonWrapper);

				this.addFunctionButtons("natural-wonder__button-wrapper");

				// Base Title Plate

				const naturalWonderBaseTitlePlateWrapper: HTMLDivElement = document.createElement("div");
				naturalWonderBaseTitlePlateWrapper.classList.add("test-cinematic-moment__natural-wonder__title-plate-wrapper");
				naturalWonderLowerThirdWrapper.appendChild(naturalWonderBaseTitlePlateWrapper);

				const naturalWonderBaseTitlePlateDropShadow: HTMLDivElement = document.createElement("div");
				naturalWonderBaseTitlePlateDropShadow.classList.add("test-cinematic-moment__natural-wonder__title-plate-drop-shadow");
				naturalWonderBaseTitlePlateWrapper.appendChild(naturalWonderBaseTitlePlateDropShadow);

				const naturalWonderBaseTitlePlateBase: HTMLDivElement = document.createElement("div");
				naturalWonderBaseTitlePlateBase.classList.add("test-cinematic-moment__natural-wonder__title-plate-base");
				naturalWonderBaseTitlePlateWrapper.appendChild(naturalWonderBaseTitlePlateBase);

				const naturalWonderBaseTitlePlateFlavorImage: HTMLDivElement = document.createElement("div");
				naturalWonderBaseTitlePlateFlavorImage.classList.add("test-cinematic-moment__natural-wonder__title-plate-flavor-image");
				naturalWonderBaseTitlePlateBase.appendChild(naturalWonderBaseTitlePlateFlavorImage);

				const naturalWonderBaseTitlePlateWoodTexture: HTMLDivElement = document.createElement("div");
				naturalWonderBaseTitlePlateWoodTexture.classList.add("test-cinematic-moment__natural-wonder__title-plate-wood-texture");
				naturalWonderBaseTitlePlateBase.appendChild(naturalWonderBaseTitlePlateWoodTexture);

				const naturalWonderBaseTitlePlateHighlightAndShadow: HTMLDivElement = document.createElement("div");
				naturalWonderBaseTitlePlateHighlightAndShadow.classList.add("test-cinematic-moment__natural-wonder__title-plate-highlight");
				naturalWonderBaseTitlePlateBase.appendChild(naturalWonderBaseTitlePlateHighlightAndShadow);

				const naturalWonderBaseTitlePlateText: HTMLDivElement = document.createElement("div");
				naturalWonderBaseTitlePlateText.classList.add("test-cinematic-moment__natural-wonder__title-plate-text");
				naturalWonderBaseTitlePlateText.innerHTML = naturalWonderType;
				naturalWonderBaseTitlePlateBase.appendChild(naturalWonderBaseTitlePlateText);

				// Announcement Plate

				const naturalWonderBaseAnnouncementPlateWrapper: HTMLDivElement = document.createElement("div");
				naturalWonderBaseAnnouncementPlateWrapper.classList.add("test-cinematic-moment__natural-wonder__announcement-plate-wrapper");
				naturalWonderLowerThirdWrapper.appendChild(naturalWonderBaseAnnouncementPlateWrapper);

				const naturalWonderBaseAnnouncementPlateDropShadow: HTMLDivElement = document.createElement("div");
				naturalWonderBaseAnnouncementPlateDropShadow.classList.add("test-cinematic-moment__natural-wonder__announcement-plate-drop-shadow");
				naturalWonderBaseAnnouncementPlateWrapper.appendChild(naturalWonderBaseAnnouncementPlateDropShadow);

				const naturalWonderBaseAnnouncementPlateBase: HTMLDivElement = document.createElement("div");
				naturalWonderBaseAnnouncementPlateBase.classList.add("test-cinematic-moment__natural-wonder__announcement-plate-base");
				naturalWonderBaseAnnouncementPlateWrapper.appendChild(naturalWonderBaseAnnouncementPlateBase);

				const naturalWonderBaseAnnouncementPlateWoodTexture: HTMLDivElement = document.createElement("div");
				naturalWonderBaseAnnouncementPlateWoodTexture.classList.add("test-cinematic-moment__natural-wonder__announcement-plate-wood-texture");
				naturalWonderBaseAnnouncementPlateBase.appendChild(naturalWonderBaseAnnouncementPlateWoodTexture);

				const naturalWonderBaseAnnouncementPlateHighlightAndShadow: HTMLDivElement = document.createElement("div");
				naturalWonderBaseAnnouncementPlateHighlightAndShadow.classList.add("test-cinematic-moment__natural-wonder__announcement-plate-highlight");
				naturalWonderBaseAnnouncementPlateBase.appendChild(naturalWonderBaseAnnouncementPlateHighlightAndShadow);

				const naturalWonderBaseAnnouncementPlateText: HTMLDivElement = document.createElement("div");
				naturalWonderBaseAnnouncementPlateText.classList.add("test-cinematic-moment__natural-wonder__announcement-plate-text");
				naturalWonderBaseAnnouncementPlateText.innerHTML = naturalWonderAnnouncement;
				naturalWonderBaseAnnouncementPlateBase.appendChild(naturalWonderBaseAnnouncementPlateText);
			}

			else if (cinematicType == "NATURAL_DISASTER") {
				backgroundWrapper.style.backgroundColor = "yellow";
				let naturalDisasterType: string = "Dust Storm";
				let naturalDisasterAnnoucementText: string = "Natural Disaster Occuring";
				cinematicQuote = "We learn from every natural disaster. Whether it's a fire or a flood, we learn something from it so we can respond to the next one better. -Malcolm Turnbull";

				this.realizeCinematicQuote(cinematicQuote);

				// Build natural disaster movie lower third

				const naturalDisasterLowerThirdWrapper: HTMLDivElement = document.createElement("div");
				naturalDisasterLowerThirdWrapper.classList.add("test-cinematic-moment__natural-disaster__everything-wrapper");
				backgroundWrapper.appendChild(naturalDisasterLowerThirdWrapper);

				// Button Area

				const naturalDisasterLowerThirdButtonShadow: HTMLDivElement = document.createElement("div");
				naturalDisasterLowerThirdButtonShadow.classList.add("test-cinematic-moment__natural-disaster__button-shadow");
				naturalDisasterLowerThirdWrapper.appendChild(naturalDisasterLowerThirdButtonShadow);

				const naturalDisasterLowerThirdButtonWrapper: HTMLDivElement = document.createElement("div");
				naturalDisasterLowerThirdButtonWrapper.classList.add("test-cinematic-moment__natural-disaster__button-wrapper");
				naturalDisasterLowerThirdButtonWrapper.setAttribute("id", "natural-disaster__button-wrapper")
				naturalDisasterLowerThirdButtonShadow.appendChild(naturalDisasterLowerThirdButtonWrapper);

				this.addFunctionButtons("natural-disaster__button-wrapper");

				// Base Title Plate

				const naturalDisasterBaseTitlePlateWrapper: HTMLDivElement = document.createElement("div");
				naturalDisasterBaseTitlePlateWrapper.classList.add("test-cinematic-moment__natural-disaster__title-plate-wrapper");
				naturalDisasterLowerThirdWrapper.appendChild(naturalDisasterBaseTitlePlateWrapper);

				const naturalDisasterBaseTitlePlateDropShadow: HTMLDivElement = document.createElement("div");
				naturalDisasterBaseTitlePlateDropShadow.classList.add("test-cinematic-moment__natural-disaster__title-plate-drop-shadow");
				naturalDisasterBaseTitlePlateWrapper.appendChild(naturalDisasterBaseTitlePlateDropShadow);

				const naturalDisasterBaseTitlePlateBase: HTMLDivElement = document.createElement("div");
				naturalDisasterBaseTitlePlateBase.classList.add("test-cinematic-moment__natural-disaster__title-plate-base");
				naturalDisasterBaseTitlePlateWrapper.appendChild(naturalDisasterBaseTitlePlateBase);

				const naturalDisasterBaseTitlePlateFlavorImage: HTMLDivElement = document.createElement("div");
				naturalDisasterBaseTitlePlateFlavorImage.classList.add("test-cinematic-moment__natural-disaster__title-plate-flavor-image");
				naturalDisasterBaseTitlePlateBase.appendChild(naturalDisasterBaseTitlePlateFlavorImage);

				const naturalDisasterBaseTitlePlateWoodTexture: HTMLDivElement = document.createElement("div");
				naturalDisasterBaseTitlePlateWoodTexture.classList.add("test-cinematic-moment__natural-disaster__title-plate-wood-texture");
				naturalDisasterBaseTitlePlateBase.appendChild(naturalDisasterBaseTitlePlateWoodTexture);

				const naturalDisasterBaseTitlePlateHighlightAndShadow: HTMLDivElement = document.createElement("div");
				naturalDisasterBaseTitlePlateHighlightAndShadow.classList.add("test-cinematic-moment__natural-disaster__title-plate-highlight");
				naturalDisasterBaseTitlePlateBase.appendChild(naturalDisasterBaseTitlePlateHighlightAndShadow);

				const naturalDisasterBaseTitlePlateFrame: HTMLDivElement = document.createElement("div");
				naturalDisasterBaseTitlePlateFrame.classList.add("test-cinematic-moment__natural-disaster__title-plate-frame");
				naturalDisasterBaseTitlePlateBase.appendChild(naturalDisasterBaseTitlePlateFrame);

				const naturalDisasterBaseTitlePlateText: HTMLDivElement = document.createElement("div");
				naturalDisasterBaseTitlePlateText.classList.add("test-cinematic-moment__natural-disaster__title-plate-text");
				naturalDisasterBaseTitlePlateText.innerHTML = naturalDisasterType;
				naturalDisasterBaseTitlePlateFrame.appendChild(naturalDisasterBaseTitlePlateText);

				// Announcement Plate

				const naturalDisasterBaseAnnouncementWrapper: HTMLDivElement = document.createElement("div");
				naturalDisasterBaseAnnouncementWrapper.classList.add("test-cinematic-moment__natural-disaster__announcement-plate-wrapper");
				naturalDisasterLowerThirdWrapper.appendChild(naturalDisasterBaseAnnouncementWrapper);

				const naturalDisasterBaseAnnouncementDropShadow: HTMLDivElement = document.createElement("div");
				naturalDisasterBaseAnnouncementDropShadow.classList.add("test-cinematic-moment__natural-disaster__announcement-drop-shadow");
				naturalDisasterBaseAnnouncementWrapper.appendChild(naturalDisasterBaseAnnouncementDropShadow);

				const naturalDisasterBaseAnnouncementBase: HTMLDivElement = document.createElement("div");
				naturalDisasterBaseAnnouncementBase.classList.add("test-cinematic-moment__natural-disaster__announcement-base");
				naturalDisasterBaseAnnouncementWrapper.appendChild(naturalDisasterBaseAnnouncementBase);

				const naturalDisasterBaseAnnouncementWoodTexture: HTMLDivElement = document.createElement("div");
				naturalDisasterBaseAnnouncementWoodTexture.classList.add("test-cinematic-moment__natural-disaster__announcement-wood-texture");
				naturalDisasterBaseAnnouncementBase.appendChild(naturalDisasterBaseAnnouncementWoodTexture);

				const naturalDisasterBaseAnnouncementHighlightAndShadow: HTMLDivElement = document.createElement("div");
				naturalDisasterBaseAnnouncementHighlightAndShadow.classList.add("test-cinematic-moment__natural-disaster__announcement-highlight");
				naturalDisasterBaseAnnouncementBase.appendChild(naturalDisasterBaseAnnouncementHighlightAndShadow);

				const naturalDisasterBaseAnnouncementText: HTMLDivElement = document.createElement("div");
				naturalDisasterBaseAnnouncementText.classList.add("test-cinematic-moment__natural-disaster__announcement-text");
				naturalDisasterBaseAnnouncementText.innerHTML = naturalDisasterAnnoucementText;
				naturalDisasterBaseAnnouncementBase.appendChild(naturalDisasterBaseAnnouncementText);
			}

			else if (cinematicType == "NUCLEAR_STRIKE") {
				backgroundWrapper.style.backgroundColor = "green";
				let nukeAnnoucementText: string = "Nuclear Weapon Launched";
				cinematicQuote = "Now, I am become Death, the destroyer of worlds. -J. Robert Oppenheimer";

				this.realizeCinematicQuote(cinematicQuote);

				// Build nuke movie lower third

				const nukeLowerThirdWrapper: HTMLDivElement = document.createElement("div");
				nukeLowerThirdWrapper.classList.add("test-cinematic-moment__nuke__everything-wrapper");
				backgroundWrapper.appendChild(nukeLowerThirdWrapper);

				// Button Area

				const nukeLowerThirdButtonShadow: HTMLDivElement = document.createElement("div");
				nukeLowerThirdButtonShadow.classList.add("test-cinematic-moment__nuke__button-shadow");
				nukeLowerThirdWrapper.appendChild(nukeLowerThirdButtonShadow);

				const nukeLowerThirdButtonWrapper: HTMLDivElement = document.createElement("div");
				nukeLowerThirdButtonWrapper.classList.add("test-cinematic-moment__nuke__button-wrapper");
				nukeLowerThirdButtonWrapper.setAttribute("id", "nuke__button-wrapper")
				nukeLowerThirdButtonShadow.appendChild(nukeLowerThirdButtonWrapper);

				this.addFunctionButtons("nuke__button-wrapper");

				// Base Title Plate

				const nukeBaseTitlePlateWrapper: HTMLDivElement = document.createElement("div");
				nukeBaseTitlePlateWrapper.classList.add("test-cinematic-moment__nuke__title-plate-wrapper");
				nukeLowerThirdWrapper.appendChild(nukeBaseTitlePlateWrapper);

				const nukeBaseTitlePlateDropShadow: HTMLDivElement = document.createElement("div");
				nukeBaseTitlePlateDropShadow.classList.add("test-cinematic-moment__nuke__title-plate-drop-shadow");
				nukeBaseTitlePlateWrapper.appendChild(nukeBaseTitlePlateDropShadow);

				const nukeBaseTitlePlateBase: HTMLDivElement = document.createElement("div");
				nukeBaseTitlePlateBase.classList.add("test-cinematic-moment__nuke__title-plate-base");
				nukeBaseTitlePlateWrapper.appendChild(nukeBaseTitlePlateBase);

				const nukeBaseTitlePlateFlavorImage: HTMLDivElement = document.createElement("div");
				nukeBaseTitlePlateFlavorImage.classList.add("test-cinematic-moment__nuke__title-plate-flavor-image");
				nukeBaseTitlePlateBase.appendChild(nukeBaseTitlePlateFlavorImage);

				const nukeBaseTitlePlateWoodTexture: HTMLDivElement = document.createElement("div");
				nukeBaseTitlePlateWoodTexture.classList.add("test-cinematic-moment__nuke__title-plate-wood-texture");
				nukeBaseTitlePlateBase.appendChild(nukeBaseTitlePlateWoodTexture);

				const nukeBaseTitlePlateHighlightAndShadow: HTMLDivElement = document.createElement("div");
				nukeBaseTitlePlateHighlightAndShadow.classList.add("test-cinematic-moment__nuke__title-plate-highlight");
				nukeBaseTitlePlateBase.appendChild(nukeBaseTitlePlateHighlightAndShadow);

				const nukeBaseTitlePlateFrame: HTMLDivElement = document.createElement("div");
				nukeBaseTitlePlateFrame.classList.add("test-cinematic-moment__nuke__title-plate-frame");
				nukeBaseTitlePlateBase.appendChild(nukeBaseTitlePlateFrame);

				const nukeBaseTitlePlateText: HTMLDivElement = document.createElement("div");
				nukeBaseTitlePlateText.classList.add("test-cinematic-moment__nuke__title-plate-text");
				nukeBaseTitlePlateText.innerHTML = nukeAnnoucementText;
				nukeBaseTitlePlateFrame.appendChild(nukeBaseTitlePlateText);

				// Leader Hex

				const nukeLeaderHexWrapper: HTMLDivElement = document.createElement("div");
				nukeLeaderHexWrapper.classList.add("test-cinematic-moment__nuke__leader-hex-wrapper");
				nukeLowerThirdWrapper.appendChild(nukeLeaderHexWrapper);

				const nukeLeaderHexDropShadow: HTMLDivElement = document.createElement("div");
				nukeLeaderHexDropShadow.classList.add("test-cinematic-moment__nuke__leader-hex-drop-shadow");
				nukeLeaderHexWrapper.appendChild(nukeLeaderHexDropShadow);

				const nukeLeaderHexBase: HTMLDivElement = document.createElement("div");
				nukeLeaderHexBase.classList.add("test-cinematic-moment__nuke__leader-hex-base");
				nukeLeaderHexWrapper.appendChild(nukeLeaderHexBase);

				const nukeLeaderHexWoodTexture: HTMLDivElement = document.createElement("div");
				nukeLeaderHexWoodTexture.classList.add("test-cinematic-moment__nuke__leader-hex-wood-texture");
				nukeLeaderHexBase.appendChild(nukeLeaderHexWoodTexture);

				const nukeLeaderHexPlayerColors: HTMLDivElement = document.createElement("div");
				nukeLeaderHexPlayerColors.classList.add("test-cinematic-moment__nuke__leader-hex-player-colors");
				nukeLeaderHexBase.appendChild(nukeLeaderHexPlayerColors);

				const nukeLeaderHexHighlightAndShadow: HTMLDivElement = document.createElement("div");
				nukeLeaderHexHighlightAndShadow.classList.add("test-cinematic-moment__nuke__highlight-and-shadow");
				nukeLeaderHexBase.appendChild(nukeLeaderHexHighlightAndShadow);

				const nukeLeaderHexLeaderPortrait: HTMLDivElement = document.createElement("div");
				nukeLeaderHexLeaderPortrait.classList.add("test-cinematic-moment__nuke__leader-portrait");
				nukeLeaderHexBase.appendChild(nukeLeaderHexLeaderPortrait);

				// Civ Icon

				const nukeCivIconWrapper: HTMLDivElement = document.createElement("div");
				nukeCivIconWrapper.classList.add("test-cinematic-moment__nuke__civ-icon-wrapper");
				nukeLowerThirdWrapper.appendChild(nukeCivIconWrapper);

				const nukeCivIconDropShadow: HTMLDivElement = document.createElement("div");
				nukeCivIconDropShadow.classList.add("test-cinematic-moment__nuke__civ-icon-drop-shadow");
				nukeCivIconWrapper.appendChild(nukeCivIconDropShadow);

				const nukeCivIconBase: HTMLDivElement = document.createElement("div");
				nukeCivIconBase.classList.add("test-cinematic-moment__nuke__civ-icon-base");
				nukeCivIconWrapper.appendChild(nukeCivIconBase);

				const nukeCivIconWoodTexture: HTMLDivElement = document.createElement("div");
				nukeCivIconWoodTexture.classList.add("test-cinematic-moment__nuke__civ-icon-wood-texture");
				nukeCivIconBase.appendChild(nukeCivIconWoodTexture);

				const nukeCivIconPlayerColors: HTMLDivElement = document.createElement("div");
				nukeCivIconPlayerColors.classList.add("test-cinematic-moment__nuke__civ-icon-player-colors");
				nukeCivIconBase.appendChild(nukeCivIconPlayerColors);

				const nukeCivIconHighlightAndShadow: HTMLDivElement = document.createElement("div");
				nukeCivIconHighlightAndShadow.classList.add("test-cinematic-moment__nuke__civ-icon-highlight-and-shadow");
				nukeCivIconBase.appendChild(nukeCivIconHighlightAndShadow);

				const nukeCivIconFrame: HTMLDivElement = document.createElement("div");
				nukeCivIconFrame.classList.add("test-cinematic-moment__nuke__civ-icon-frame");
				nukeCivIconBase.appendChild(nukeCivIconFrame);

				const nukeCivIcon: HTMLDivElement = document.createElement("div");
				nukeCivIcon.classList.add("test-cinematic-moment__nuke__civ-icon");
				nukeCivIconBase.appendChild(nukeCivIcon);
			}

			else {
				console.log("Cinematic Moment Test: " + cinematicType + " is not a recognized cinematic type.");
			}
		}
		else {
			console.log("Cinematic Moment Test: Unable to find Matte Painting Wrapper.");
		}
	}

	private addFunctionButtons(targetDivID: string) {
		let buttonWrapper: HTMLElement = document.getElementById(targetDivID) as HTMLElement;

		if (buttonWrapper) {
			const cinematicMomentReplayButton: HTMLElement = document.createElement("fxs-button");
			cinematicMomentReplayButton.classList.add("test-cinematic-moment__replay-button");
			let cinematicMomentReplayButtonCaption: string = Locale.compose("LOC_WONDER_MOVIE_REPLAY");
			cinematicMomentReplayButton.setAttribute("caption", cinematicMomentReplayButtonCaption);
			buttonWrapper.appendChild(cinematicMomentReplayButton);

			const cinematicMomentCloseButton: HTMLElement = document.createElement("fxs-button");
			cinematicMomentCloseButton.classList.add("test-cinematic-moment__close-button");
			let cinematicMomentCloseButtonCaption: string = Locale.compose("LOC_WONDER_MOVIE_CLOSE");
			cinematicMomentCloseButton.setAttribute("caption", cinematicMomentCloseButtonCaption);
			buttonWrapper.appendChild(cinematicMomentCloseButton);
		}
		else {
			console.log("Cinematic Moment Test: Unabble to attach buttons to targetDivID: " + targetDivID);
		}
	}

	private realizeCinematicQuote(cinematicQuote: string) {

		let backgroundWrapper: HTMLElement = document.getElementById("cm-content-container") as HTMLElement;

		//Quote Section
		const quoteBackgroundGradient: HTMLDivElement = document.createElement("div");
		quoteBackgroundGradient.classList.add("test-cinematic-moment__quote__background-gradient");
		backgroundWrapper.appendChild(quoteBackgroundGradient);

		const quoteWindowWrapper: HTMLDivElement = document.createElement("div");
		quoteWindowWrapper.classList.add("test-cinematic-moment__quote__window-wrapper");
		quoteBackgroundGradient.appendChild(quoteWindowWrapper);

		const quoteWindowDropShadow: HTMLDivElement = document.createElement("div");
		quoteWindowDropShadow.classList.add("test-cinematic-moment__quote__drop-shadow");
		quoteWindowWrapper.appendChild(quoteWindowDropShadow);

		const quoteWindowBase: HTMLDivElement = document.createElement("div");
		quoteWindowBase.classList.add("test-cinematic-moment__quote__window-base");
		quoteWindowWrapper.appendChild(quoteWindowBase);

		const quoteWindowFlavorImage: HTMLDivElement = document.createElement("div");
		quoteWindowFlavorImage.classList.add("test-cinematic-moment__quote__window-flavor-image");
		quoteWindowBase.appendChild(quoteWindowFlavorImage);

		const quoteWindowWoodTexture: HTMLDivElement = document.createElement("div");
		quoteWindowWoodTexture.classList.add("test-cinematic-moment__quote__wood-texture");
		quoteWindowBase.appendChild(quoteWindowWoodTexture);

		const quoteWindowHighlightAndShadow: HTMLDivElement = document.createElement("div");
		quoteWindowHighlightAndShadow.classList.add("test-cinematic-moment__quote__highlight-and-shadow");
		quoteWindowBase.appendChild(quoteWindowHighlightAndShadow);

		const quoteWindowFrameWrapper: HTMLDivElement = document.createElement("div");
		quoteWindowFrameWrapper.classList.add("test-cinematic-moment__quote__frame-wrapper");
		quoteWindowBase.appendChild(quoteWindowFrameWrapper);

		const quoteWindowFrame: HTMLDivElement = document.createElement("div");
		quoteWindowFrame.classList.add("test-cinematic-moment__quote__frame");
		quoteWindowFrameWrapper.appendChild(quoteWindowFrame);

		const quoteWindowText: HTMLDivElement = document.createElement("div");
		quoteWindowText.classList.add("test-cinematic-moment__quote__window-text");
		quoteWindowText.innerHTML = cinematicQuote;
		quoteWindowFrame.appendChild(quoteWindowText);
	}
}

export { CinematicMomentTest as default };

Controls.define('cinematic-moments-test', {
	createInstance: CinematicMomentTest,
	description: '[TEST] Cinematic Moments Styling.',
	styles: ["fs://game/core/ui/sandbox/cinematic-moments-test/cinematic-moments-test.css"],
	attributes: []
});