class CinematicMomentTest extends Component {
    constructor(root) {
        super(root);
    }
    onAttach() {
        super.onAttach();
        // SET WONDER TYPE HERE
        let cinematicType = "WONDER_COMPLETE"; // "WONDER_COMPLETE", "NATURAL_WONDER_DISCOVERED", "NATURAL_DISASTER", or "NUCLEAR_STRIKE"
        let cinematicQuote = "";
        let backgroundWrapper = document.getElementById("cm-content-container");
        if (backgroundWrapper) {
            if (cinematicType == "WONDER_COMPLETE") {
                backgroundWrapper.style.backgroundColor = "red";
                let wonderName = "Amundsen-Scott Research Station";
                let locationName = "Constantinople, France";
                let wonderYearBuilt = "Built Circa 1753 BC";
                cinematicQuote = "The Taj Mahal rises above the banks of the river like a solitary tear suspended on the cheek of time. -Rabindranath Tagore";
                this.realizeCinematicQuote(cinematicQuote);
                // Build wonder movie lower third
                const wonderMovieLowerThirdWrapper = document.createElement("div");
                wonderMovieLowerThirdWrapper.classList.add("test-cinematic-moment__wonder-movie__everything-wrapper");
                backgroundWrapper.appendChild(wonderMovieLowerThirdWrapper);
                // Button Area
                const wonderMovieLowerThirdButtonShadow = document.createElement("div");
                wonderMovieLowerThirdButtonShadow.classList.add("test-cinematic-moment__wonder-movie__button-shadow");
                wonderMovieLowerThirdWrapper.appendChild(wonderMovieLowerThirdButtonShadow);
                const wonderMovieLowerThirdButtonWrapper = document.createElement("div");
                wonderMovieLowerThirdButtonWrapper.classList.add("test-cinematic-moment__wonder-movie__button-wrapper");
                wonderMovieLowerThirdButtonWrapper.setAttribute("id", "wonder-movie__button-wrapper");
                wonderMovieLowerThirdButtonShadow.appendChild(wonderMovieLowerThirdButtonWrapper);
                this.addFunctionButtons("wonder-movie__button-wrapper");
                // Base Hex
                const wonderMovieLowerThirdHexWrapper = document.createElement("div");
                wonderMovieLowerThirdHexWrapper.classList.add("test-cinematic-moment__wonder-movie__hex-wrapper");
                wonderMovieLowerThirdWrapper.appendChild(wonderMovieLowerThirdHexWrapper);
                const wonderMovieLowerThirdHexDropShadow = document.createElement("div");
                wonderMovieLowerThirdHexDropShadow.classList.add("test-cinematic-moment__wonder-movie__hex-drop-shadow");
                wonderMovieLowerThirdHexWrapper.appendChild(wonderMovieLowerThirdHexDropShadow);
                const wonderMovieLowerThirdHexBase = document.createElement("div");
                wonderMovieLowerThirdHexBase.classList.add("test-cinematic-moment__wonder-movie__hex-base");
                wonderMovieLowerThirdHexWrapper.appendChild(wonderMovieLowerThirdHexBase);
                const wonderMovieLowerThirdHexWoodTexture = document.createElement("div");
                wonderMovieLowerThirdHexWoodTexture.classList.add("test-cinematic-moment__wonder-movie__hex-wood-texture");
                wonderMovieLowerThirdHexBase.appendChild(wonderMovieLowerThirdHexWoodTexture);
                const wonderMovieLowerThirdHexPlayerColors = document.createElement("div");
                wonderMovieLowerThirdHexPlayerColors.classList.add("test-cinematic-moment__wonder-movie__hex-player-colors");
                wonderMovieLowerThirdHexBase.appendChild(wonderMovieLowerThirdHexPlayerColors);
                const wonderMovieLowerThirdHexHighlightAndShadow = document.createElement("div");
                wonderMovieLowerThirdHexHighlightAndShadow.classList.add("test-cinematic-moment__wonder-movie__hex-highlight");
                wonderMovieLowerThirdHexWrapper.appendChild(wonderMovieLowerThirdHexHighlightAndShadow);
                // Leader Portrait
                const wonderMovieLowerThirdLeaderPortrait = document.createElement("div");
                wonderMovieLowerThirdLeaderPortrait.classList.add("test-cinematic-moment__wonder-movie__leader-portrait");
                wonderMovieLowerThirdWrapper.appendChild(wonderMovieLowerThirdLeaderPortrait);
                // Wonder Title Box
                const wonderMovieLowerThirdWonderTitleWrapper = document.createElement("div");
                wonderMovieLowerThirdWonderTitleWrapper.classList.add("test-cinematic-moment__wonder-movie__title-wrapper");
                wonderMovieLowerThirdWrapper.appendChild(wonderMovieLowerThirdWonderTitleWrapper);
                const wonderMovieTitleBoxDropShadow = document.createElement("div");
                wonderMovieTitleBoxDropShadow.classList.add("test-cinematic-moment__wonder-movie__title-box-drop-shadow");
                wonderMovieLowerThirdWonderTitleWrapper.appendChild(wonderMovieTitleBoxDropShadow);
                const wonderMovieTitleBoxBase = document.createElement("div");
                wonderMovieTitleBoxBase.classList.add("test-cinematic-moment__wonder-movie__title-box-base");
                wonderMovieLowerThirdWonderTitleWrapper.appendChild(wonderMovieTitleBoxBase);
                const wonderMovieTitleBoxFlavorImage = document.createElement("div");
                wonderMovieTitleBoxFlavorImage.classList.add("test-cinematic-moment__wonder-movie__title-box-flavor-image");
                wonderMovieTitleBoxBase.appendChild(wonderMovieTitleBoxFlavorImage);
                const wonderMovieTitleBoxWoodTexture = document.createElement("div");
                wonderMovieTitleBoxWoodTexture.classList.add("test-cinematic-moment__wonder-movie__title-box-wood-texture");
                wonderMovieTitleBoxBase.appendChild(wonderMovieTitleBoxWoodTexture);
                const wonderMovieTitleBoxHighlightAndShadow = document.createElement("div");
                wonderMovieTitleBoxHighlightAndShadow.classList.add("test-cinematic-moment__wonder-movie__highlight-and-shadow");
                wonderMovieTitleBoxBase.appendChild(wonderMovieTitleBoxHighlightAndShadow);
                const wonderMovieTitleBoxFrameWrapper = document.createElement("div");
                wonderMovieTitleBoxFrameWrapper.classList.add("test-cinematic-moment__wonder-movie__frame-wrapper");
                wonderMovieTitleBoxBase.appendChild(wonderMovieTitleBoxFrameWrapper);
                const wonderMovieTitleBoxFrame = document.createElement("div");
                wonderMovieTitleBoxFrame.classList.add("test-cinematic-moment__wonder-movie__frame");
                wonderMovieTitleBoxFrameWrapper.appendChild(wonderMovieTitleBoxFrame);
                const wonderMovieTitleBoxText = document.createElement("div");
                wonderMovieTitleBoxText.classList.add("test-cinematic-moment__wonder-movie__title-text");
                wonderMovieTitleBoxText.innerHTML = wonderName;
                wonderMovieTitleBoxFrame.appendChild(wonderMovieTitleBoxText);
                // Year Built
                const wonderMovieLowerThirdYearBuiltWrapper = document.createElement("div");
                wonderMovieLowerThirdYearBuiltWrapper.classList.add("test-cinematic-moment__wonder-movie__year-built-wrapper");
                wonderMovieLowerThirdWrapper.appendChild(wonderMovieLowerThirdYearBuiltWrapper);
                const wonderMovieYearBuiltDropShadow = document.createElement("div");
                wonderMovieYearBuiltDropShadow.classList.add("test-cinematic-moment__wonder-movie__year-built-drop-shadow");
                wonderMovieLowerThirdYearBuiltWrapper.appendChild(wonderMovieYearBuiltDropShadow);
                const wonderMovieYearBuiltLineBase = document.createElement("div");
                wonderMovieYearBuiltLineBase.classList.add("test-cinematic-moment__wonder-movie__year-built-line-base");
                wonderMovieLowerThirdYearBuiltWrapper.appendChild(wonderMovieYearBuiltLineBase);
                const wonderMovieYearBuiltLineWoodTexture = document.createElement("div");
                wonderMovieYearBuiltLineWoodTexture.classList.add("test-cinematic-moment__wonder-movie__year-built-line-wood-texture");
                wonderMovieLowerThirdYearBuiltWrapper.appendChild(wonderMovieYearBuiltLineWoodTexture);
                const wonderMovieYearBuiltLineHighlightAndShadow = document.createElement("div");
                wonderMovieYearBuiltLineHighlightAndShadow.classList.add("test-cinematic-moment__wonder-movie__year-built-line-highlight-and-shadow");
                wonderMovieLowerThirdYearBuiltWrapper.appendChild(wonderMovieYearBuiltLineHighlightAndShadow);
                const wonderMovieYearBuiltLineText = document.createElement("div");
                wonderMovieYearBuiltLineText.classList.add("test-cinematic-moment__wonder-movie__year-built-line-text");
                wonderMovieYearBuiltLineText.innerHTML = wonderYearBuilt;
                wonderMovieLowerThirdYearBuiltWrapper.appendChild(wonderMovieYearBuiltLineText);
                // Location of Wonder
                const wonderMovieLowerThirdLocationWrapper = document.createElement("div");
                wonderMovieLowerThirdLocationWrapper.classList.add("test-cinematic-moment__wonder-movie__location-wrapper");
                wonderMovieLowerThirdWrapper.appendChild(wonderMovieLowerThirdLocationWrapper);
                const wonderMovieLocationDropShadow = document.createElement("div");
                wonderMovieLocationDropShadow.classList.add("test-cinematic-moment__wonder-movie__location-drop-shadow");
                wonderMovieLowerThirdLocationWrapper.appendChild(wonderMovieLocationDropShadow);
                const wonderMovieLocationLineBase = document.createElement("div");
                wonderMovieLocationLineBase.classList.add("test-cinematic-moment__wonder-movie__location-line-base");
                wonderMovieLowerThirdLocationWrapper.appendChild(wonderMovieLocationLineBase);
                const wonderMovieLocationLineWoodTexture = document.createElement("div");
                wonderMovieLocationLineWoodTexture.classList.add("test-cinematic-moment__wonder-movie__location-wood-texture");
                wonderMovieLowerThirdLocationWrapper.appendChild(wonderMovieLocationLineWoodTexture);
                const wonderMovieLocationLineHighlightAndShadow = document.createElement("div");
                wonderMovieLocationLineHighlightAndShadow.classList.add("test-cinematic-moment__wonder-movie__location-line-highlight-and-shadow");
                wonderMovieLowerThirdLocationWrapper.appendChild(wonderMovieLocationLineHighlightAndShadow);
                const wonderMovieLocationLineText = document.createElement("div");
                wonderMovieLocationLineText.classList.add("test-cinematic-moment__wonder-movie__location-line-text");
                wonderMovieLocationLineText.innerHTML = locationName;
                wonderMovieLowerThirdLocationWrapper.appendChild(wonderMovieLocationLineText);
                // Civ Icon
                const wonderMovieLowerThirdCivIconWrapper = document.createElement("div");
                wonderMovieLowerThirdCivIconWrapper.classList.add("test-cinematic-moment__wonder-movie__civ-icon-wrapper");
                wonderMovieLowerThirdWrapper.appendChild(wonderMovieLowerThirdCivIconWrapper);
                const wonderMovieCivIconDropShadow = document.createElement("div");
                wonderMovieCivIconDropShadow.classList.add("test-cinematic-moment__wonder-movie__civ-icon-drop-shadow");
                wonderMovieLowerThirdCivIconWrapper.appendChild(wonderMovieCivIconDropShadow);
                const wonderMovieCivIconBase = document.createElement("div");
                wonderMovieCivIconBase.classList.add("test-cinematic-moment__wonder-movie__civ-icon-base");
                wonderMovieLowerThirdCivIconWrapper.appendChild(wonderMovieCivIconBase);
                const wonderMovieCivIconWoodTexture = document.createElement("div");
                wonderMovieCivIconWoodTexture.classList.add("test-cinematic-moment__wonder-movie__civ-icon-wood-texture");
                wonderMovieLowerThirdCivIconWrapper.appendChild(wonderMovieCivIconWoodTexture);
                const wonderMovieCivIconPlayerColors = document.createElement("div");
                wonderMovieCivIconPlayerColors.classList.add("test-cinematic-moment__wonder-movie__civ-player-colors");
                wonderMovieLowerThirdCivIconWrapper.appendChild(wonderMovieCivIconPlayerColors);
                const wonderMovieCivIconHighlightAndShadow = document.createElement("div");
                wonderMovieCivIconHighlightAndShadow.classList.add("test-cinematic-moment__wonder-movie__civ-icon-highlight");
                wonderMovieLowerThirdCivIconWrapper.appendChild(wonderMovieCivIconHighlightAndShadow);
                const wonderMovieCivIconFrame = document.createElement("div");
                wonderMovieCivIconFrame.classList.add("test-cinematic-moment__wonder-movie__civ-icon-frame");
                wonderMovieLowerThirdCivIconWrapper.appendChild(wonderMovieCivIconFrame);
                const wonderMovieCivIcon = document.createElement("div");
                wonderMovieCivIcon.classList.add("test-cinematic-moment__wonder-movie__civ-icon");
                wonderMovieLowerThirdCivIconWrapper.appendChild(wonderMovieCivIcon);
            }
            else if (cinematicType == "NATURAL_WONDER_DISCOVERED") {
                backgroundWrapper.style.backgroundColor = "orange";
                let naturalWonderType = "Redwood Forest";
                let naturalWonderAnnouncement = "Natural Wonder Discovered";
                cinematicQuote = "It speaks as men speak to one another and are not heard by the little ants crawling over their boots. This is the Big Tree, the Sequoia. -Mary Austin";
                this.realizeCinematicQuote(cinematicQuote);
                // Build natural wonder movie lower third
                const naturalWonderLowerThirdWrapper = document.createElement("div");
                naturalWonderLowerThirdWrapper.classList.add("test-cinematic-moment__natural-wonder__everything-wrapper");
                backgroundWrapper.appendChild(naturalWonderLowerThirdWrapper);
                // Button Area
                const naturalWonderLowerThirdButtonShadow = document.createElement("div");
                naturalWonderLowerThirdButtonShadow.classList.add("test-cinematic-moment__natural-wonder__button-shadow");
                naturalWonderLowerThirdWrapper.appendChild(naturalWonderLowerThirdButtonShadow);
                const naturalWonderLowerThirdButtonWrapper = document.createElement("div");
                naturalWonderLowerThirdButtonWrapper.classList.add("test-cinematic-moment__natural-wonder__button-wrapper");
                naturalWonderLowerThirdButtonWrapper.setAttribute("id", "natural-wonder__button-wrapper");
                naturalWonderLowerThirdButtonShadow.appendChild(naturalWonderLowerThirdButtonWrapper);
                this.addFunctionButtons("natural-wonder__button-wrapper");
                // Base Title Plate
                const naturalWonderBaseTitlePlateWrapper = document.createElement("div");
                naturalWonderBaseTitlePlateWrapper.classList.add("test-cinematic-moment__natural-wonder__title-plate-wrapper");
                naturalWonderLowerThirdWrapper.appendChild(naturalWonderBaseTitlePlateWrapper);
                const naturalWonderBaseTitlePlateDropShadow = document.createElement("div");
                naturalWonderBaseTitlePlateDropShadow.classList.add("test-cinematic-moment__natural-wonder__title-plate-drop-shadow");
                naturalWonderBaseTitlePlateWrapper.appendChild(naturalWonderBaseTitlePlateDropShadow);
                const naturalWonderBaseTitlePlateBase = document.createElement("div");
                naturalWonderBaseTitlePlateBase.classList.add("test-cinematic-moment__natural-wonder__title-plate-base");
                naturalWonderBaseTitlePlateWrapper.appendChild(naturalWonderBaseTitlePlateBase);
                const naturalWonderBaseTitlePlateFlavorImage = document.createElement("div");
                naturalWonderBaseTitlePlateFlavorImage.classList.add("test-cinematic-moment__natural-wonder__title-plate-flavor-image");
                naturalWonderBaseTitlePlateBase.appendChild(naturalWonderBaseTitlePlateFlavorImage);
                const naturalWonderBaseTitlePlateWoodTexture = document.createElement("div");
                naturalWonderBaseTitlePlateWoodTexture.classList.add("test-cinematic-moment__natural-wonder__title-plate-wood-texture");
                naturalWonderBaseTitlePlateBase.appendChild(naturalWonderBaseTitlePlateWoodTexture);
                const naturalWonderBaseTitlePlateHighlightAndShadow = document.createElement("div");
                naturalWonderBaseTitlePlateHighlightAndShadow.classList.add("test-cinematic-moment__natural-wonder__title-plate-highlight");
                naturalWonderBaseTitlePlateBase.appendChild(naturalWonderBaseTitlePlateHighlightAndShadow);
                const naturalWonderBaseTitlePlateText = document.createElement("div");
                naturalWonderBaseTitlePlateText.classList.add("test-cinematic-moment__natural-wonder__title-plate-text");
                naturalWonderBaseTitlePlateText.innerHTML = naturalWonderType;
                naturalWonderBaseTitlePlateBase.appendChild(naturalWonderBaseTitlePlateText);
                // Announcement Plate
                const naturalWonderBaseAnnouncementPlateWrapper = document.createElement("div");
                naturalWonderBaseAnnouncementPlateWrapper.classList.add("test-cinematic-moment__natural-wonder__announcement-plate-wrapper");
                naturalWonderLowerThirdWrapper.appendChild(naturalWonderBaseAnnouncementPlateWrapper);
                const naturalWonderBaseAnnouncementPlateDropShadow = document.createElement("div");
                naturalWonderBaseAnnouncementPlateDropShadow.classList.add("test-cinematic-moment__natural-wonder__announcement-plate-drop-shadow");
                naturalWonderBaseAnnouncementPlateWrapper.appendChild(naturalWonderBaseAnnouncementPlateDropShadow);
                const naturalWonderBaseAnnouncementPlateBase = document.createElement("div");
                naturalWonderBaseAnnouncementPlateBase.classList.add("test-cinematic-moment__natural-wonder__announcement-plate-base");
                naturalWonderBaseAnnouncementPlateWrapper.appendChild(naturalWonderBaseAnnouncementPlateBase);
                const naturalWonderBaseAnnouncementPlateWoodTexture = document.createElement("div");
                naturalWonderBaseAnnouncementPlateWoodTexture.classList.add("test-cinematic-moment__natural-wonder__announcement-plate-wood-texture");
                naturalWonderBaseAnnouncementPlateBase.appendChild(naturalWonderBaseAnnouncementPlateWoodTexture);
                const naturalWonderBaseAnnouncementPlateHighlightAndShadow = document.createElement("div");
                naturalWonderBaseAnnouncementPlateHighlightAndShadow.classList.add("test-cinematic-moment__natural-wonder__announcement-plate-highlight");
                naturalWonderBaseAnnouncementPlateBase.appendChild(naturalWonderBaseAnnouncementPlateHighlightAndShadow);
                const naturalWonderBaseAnnouncementPlateText = document.createElement("div");
                naturalWonderBaseAnnouncementPlateText.classList.add("test-cinematic-moment__natural-wonder__announcement-plate-text");
                naturalWonderBaseAnnouncementPlateText.innerHTML = naturalWonderAnnouncement;
                naturalWonderBaseAnnouncementPlateBase.appendChild(naturalWonderBaseAnnouncementPlateText);
            }
            else if (cinematicType == "NATURAL_DISASTER") {
                backgroundWrapper.style.backgroundColor = "yellow";
                let naturalDisasterType = "Dust Storm";
                let naturalDisasterAnnoucementText = "Natural Disaster Occuring";
                cinematicQuote = "We learn from every natural disaster. Whether it's a fire or a flood, we learn something from it so we can respond to the next one better. -Malcolm Turnbull";
                this.realizeCinematicQuote(cinematicQuote);
                // Build natural disaster movie lower third
                const naturalDisasterLowerThirdWrapper = document.createElement("div");
                naturalDisasterLowerThirdWrapper.classList.add("test-cinematic-moment__natural-disaster__everything-wrapper");
                backgroundWrapper.appendChild(naturalDisasterLowerThirdWrapper);
                // Button Area
                const naturalDisasterLowerThirdButtonShadow = document.createElement("div");
                naturalDisasterLowerThirdButtonShadow.classList.add("test-cinematic-moment__natural-disaster__button-shadow");
                naturalDisasterLowerThirdWrapper.appendChild(naturalDisasterLowerThirdButtonShadow);
                const naturalDisasterLowerThirdButtonWrapper = document.createElement("div");
                naturalDisasterLowerThirdButtonWrapper.classList.add("test-cinematic-moment__natural-disaster__button-wrapper");
                naturalDisasterLowerThirdButtonWrapper.setAttribute("id", "natural-disaster__button-wrapper");
                naturalDisasterLowerThirdButtonShadow.appendChild(naturalDisasterLowerThirdButtonWrapper);
                this.addFunctionButtons("natural-disaster__button-wrapper");
                // Base Title Plate
                const naturalDisasterBaseTitlePlateWrapper = document.createElement("div");
                naturalDisasterBaseTitlePlateWrapper.classList.add("test-cinematic-moment__natural-disaster__title-plate-wrapper");
                naturalDisasterLowerThirdWrapper.appendChild(naturalDisasterBaseTitlePlateWrapper);
                const naturalDisasterBaseTitlePlateDropShadow = document.createElement("div");
                naturalDisasterBaseTitlePlateDropShadow.classList.add("test-cinematic-moment__natural-disaster__title-plate-drop-shadow");
                naturalDisasterBaseTitlePlateWrapper.appendChild(naturalDisasterBaseTitlePlateDropShadow);
                const naturalDisasterBaseTitlePlateBase = document.createElement("div");
                naturalDisasterBaseTitlePlateBase.classList.add("test-cinematic-moment__natural-disaster__title-plate-base");
                naturalDisasterBaseTitlePlateWrapper.appendChild(naturalDisasterBaseTitlePlateBase);
                const naturalDisasterBaseTitlePlateFlavorImage = document.createElement("div");
                naturalDisasterBaseTitlePlateFlavorImage.classList.add("test-cinematic-moment__natural-disaster__title-plate-flavor-image");
                naturalDisasterBaseTitlePlateBase.appendChild(naturalDisasterBaseTitlePlateFlavorImage);
                const naturalDisasterBaseTitlePlateWoodTexture = document.createElement("div");
                naturalDisasterBaseTitlePlateWoodTexture.classList.add("test-cinematic-moment__natural-disaster__title-plate-wood-texture");
                naturalDisasterBaseTitlePlateBase.appendChild(naturalDisasterBaseTitlePlateWoodTexture);
                const naturalDisasterBaseTitlePlateHighlightAndShadow = document.createElement("div");
                naturalDisasterBaseTitlePlateHighlightAndShadow.classList.add("test-cinematic-moment__natural-disaster__title-plate-highlight");
                naturalDisasterBaseTitlePlateBase.appendChild(naturalDisasterBaseTitlePlateHighlightAndShadow);
                const naturalDisasterBaseTitlePlateFrame = document.createElement("div");
                naturalDisasterBaseTitlePlateFrame.classList.add("test-cinematic-moment__natural-disaster__title-plate-frame");
                naturalDisasterBaseTitlePlateBase.appendChild(naturalDisasterBaseTitlePlateFrame);
                const naturalDisasterBaseTitlePlateText = document.createElement("div");
                naturalDisasterBaseTitlePlateText.classList.add("test-cinematic-moment__natural-disaster__title-plate-text");
                naturalDisasterBaseTitlePlateText.innerHTML = naturalDisasterType;
                naturalDisasterBaseTitlePlateFrame.appendChild(naturalDisasterBaseTitlePlateText);
                // Announcement Plate
                const naturalDisasterBaseAnnouncementWrapper = document.createElement("div");
                naturalDisasterBaseAnnouncementWrapper.classList.add("test-cinematic-moment__natural-disaster__announcement-plate-wrapper");
                naturalDisasterLowerThirdWrapper.appendChild(naturalDisasterBaseAnnouncementWrapper);
                const naturalDisasterBaseAnnouncementDropShadow = document.createElement("div");
                naturalDisasterBaseAnnouncementDropShadow.classList.add("test-cinematic-moment__natural-disaster__announcement-drop-shadow");
                naturalDisasterBaseAnnouncementWrapper.appendChild(naturalDisasterBaseAnnouncementDropShadow);
                const naturalDisasterBaseAnnouncementBase = document.createElement("div");
                naturalDisasterBaseAnnouncementBase.classList.add("test-cinematic-moment__natural-disaster__announcement-base");
                naturalDisasterBaseAnnouncementWrapper.appendChild(naturalDisasterBaseAnnouncementBase);
                const naturalDisasterBaseAnnouncementWoodTexture = document.createElement("div");
                naturalDisasterBaseAnnouncementWoodTexture.classList.add("test-cinematic-moment__natural-disaster__announcement-wood-texture");
                naturalDisasterBaseAnnouncementBase.appendChild(naturalDisasterBaseAnnouncementWoodTexture);
                const naturalDisasterBaseAnnouncementHighlightAndShadow = document.createElement("div");
                naturalDisasterBaseAnnouncementHighlightAndShadow.classList.add("test-cinematic-moment__natural-disaster__announcement-highlight");
                naturalDisasterBaseAnnouncementBase.appendChild(naturalDisasterBaseAnnouncementHighlightAndShadow);
                const naturalDisasterBaseAnnouncementText = document.createElement("div");
                naturalDisasterBaseAnnouncementText.classList.add("test-cinematic-moment__natural-disaster__announcement-text");
                naturalDisasterBaseAnnouncementText.innerHTML = naturalDisasterAnnoucementText;
                naturalDisasterBaseAnnouncementBase.appendChild(naturalDisasterBaseAnnouncementText);
            }
            else if (cinematicType == "NUCLEAR_STRIKE") {
                backgroundWrapper.style.backgroundColor = "green";
                let nukeAnnoucementText = "Nuclear Weapon Launched";
                cinematicQuote = "Now, I am become Death, the destroyer of worlds. -J. Robert Oppenheimer";
                this.realizeCinematicQuote(cinematicQuote);
                // Build nuke movie lower third
                const nukeLowerThirdWrapper = document.createElement("div");
                nukeLowerThirdWrapper.classList.add("test-cinematic-moment__nuke__everything-wrapper");
                backgroundWrapper.appendChild(nukeLowerThirdWrapper);
                // Button Area
                const nukeLowerThirdButtonShadow = document.createElement("div");
                nukeLowerThirdButtonShadow.classList.add("test-cinematic-moment__nuke__button-shadow");
                nukeLowerThirdWrapper.appendChild(nukeLowerThirdButtonShadow);
                const nukeLowerThirdButtonWrapper = document.createElement("div");
                nukeLowerThirdButtonWrapper.classList.add("test-cinematic-moment__nuke__button-wrapper");
                nukeLowerThirdButtonWrapper.setAttribute("id", "nuke__button-wrapper");
                nukeLowerThirdButtonShadow.appendChild(nukeLowerThirdButtonWrapper);
                this.addFunctionButtons("nuke__button-wrapper");
                // Base Title Plate
                const nukeBaseTitlePlateWrapper = document.createElement("div");
                nukeBaseTitlePlateWrapper.classList.add("test-cinematic-moment__nuke__title-plate-wrapper");
                nukeLowerThirdWrapper.appendChild(nukeBaseTitlePlateWrapper);
                const nukeBaseTitlePlateDropShadow = document.createElement("div");
                nukeBaseTitlePlateDropShadow.classList.add("test-cinematic-moment__nuke__title-plate-drop-shadow");
                nukeBaseTitlePlateWrapper.appendChild(nukeBaseTitlePlateDropShadow);
                const nukeBaseTitlePlateBase = document.createElement("div");
                nukeBaseTitlePlateBase.classList.add("test-cinematic-moment__nuke__title-plate-base");
                nukeBaseTitlePlateWrapper.appendChild(nukeBaseTitlePlateBase);
                const nukeBaseTitlePlateFlavorImage = document.createElement("div");
                nukeBaseTitlePlateFlavorImage.classList.add("test-cinematic-moment__nuke__title-plate-flavor-image");
                nukeBaseTitlePlateBase.appendChild(nukeBaseTitlePlateFlavorImage);
                const nukeBaseTitlePlateWoodTexture = document.createElement("div");
                nukeBaseTitlePlateWoodTexture.classList.add("test-cinematic-moment__nuke__title-plate-wood-texture");
                nukeBaseTitlePlateBase.appendChild(nukeBaseTitlePlateWoodTexture);
                const nukeBaseTitlePlateHighlightAndShadow = document.createElement("div");
                nukeBaseTitlePlateHighlightAndShadow.classList.add("test-cinematic-moment__nuke__title-plate-highlight");
                nukeBaseTitlePlateBase.appendChild(nukeBaseTitlePlateHighlightAndShadow);
                const nukeBaseTitlePlateFrame = document.createElement("div");
                nukeBaseTitlePlateFrame.classList.add("test-cinematic-moment__nuke__title-plate-frame");
                nukeBaseTitlePlateBase.appendChild(nukeBaseTitlePlateFrame);
                const nukeBaseTitlePlateText = document.createElement("div");
                nukeBaseTitlePlateText.classList.add("test-cinematic-moment__nuke__title-plate-text");
                nukeBaseTitlePlateText.innerHTML = nukeAnnoucementText;
                nukeBaseTitlePlateFrame.appendChild(nukeBaseTitlePlateText);
                // Leader Hex
                const nukeLeaderHexWrapper = document.createElement("div");
                nukeLeaderHexWrapper.classList.add("test-cinematic-moment__nuke__leader-hex-wrapper");
                nukeLowerThirdWrapper.appendChild(nukeLeaderHexWrapper);
                const nukeLeaderHexDropShadow = document.createElement("div");
                nukeLeaderHexDropShadow.classList.add("test-cinematic-moment__nuke__leader-hex-drop-shadow");
                nukeLeaderHexWrapper.appendChild(nukeLeaderHexDropShadow);
                const nukeLeaderHexBase = document.createElement("div");
                nukeLeaderHexBase.classList.add("test-cinematic-moment__nuke__leader-hex-base");
                nukeLeaderHexWrapper.appendChild(nukeLeaderHexBase);
                const nukeLeaderHexWoodTexture = document.createElement("div");
                nukeLeaderHexWoodTexture.classList.add("test-cinematic-moment__nuke__leader-hex-wood-texture");
                nukeLeaderHexBase.appendChild(nukeLeaderHexWoodTexture);
                const nukeLeaderHexPlayerColors = document.createElement("div");
                nukeLeaderHexPlayerColors.classList.add("test-cinematic-moment__nuke__leader-hex-player-colors");
                nukeLeaderHexBase.appendChild(nukeLeaderHexPlayerColors);
                const nukeLeaderHexHighlightAndShadow = document.createElement("div");
                nukeLeaderHexHighlightAndShadow.classList.add("test-cinematic-moment__nuke__highlight-and-shadow");
                nukeLeaderHexBase.appendChild(nukeLeaderHexHighlightAndShadow);
                const nukeLeaderHexLeaderPortrait = document.createElement("div");
                nukeLeaderHexLeaderPortrait.classList.add("test-cinematic-moment__nuke__leader-portrait");
                nukeLeaderHexBase.appendChild(nukeLeaderHexLeaderPortrait);
                // Civ Icon
                const nukeCivIconWrapper = document.createElement("div");
                nukeCivIconWrapper.classList.add("test-cinematic-moment__nuke__civ-icon-wrapper");
                nukeLowerThirdWrapper.appendChild(nukeCivIconWrapper);
                const nukeCivIconDropShadow = document.createElement("div");
                nukeCivIconDropShadow.classList.add("test-cinematic-moment__nuke__civ-icon-drop-shadow");
                nukeCivIconWrapper.appendChild(nukeCivIconDropShadow);
                const nukeCivIconBase = document.createElement("div");
                nukeCivIconBase.classList.add("test-cinematic-moment__nuke__civ-icon-base");
                nukeCivIconWrapper.appendChild(nukeCivIconBase);
                const nukeCivIconWoodTexture = document.createElement("div");
                nukeCivIconWoodTexture.classList.add("test-cinematic-moment__nuke__civ-icon-wood-texture");
                nukeCivIconBase.appendChild(nukeCivIconWoodTexture);
                const nukeCivIconPlayerColors = document.createElement("div");
                nukeCivIconPlayerColors.classList.add("test-cinematic-moment__nuke__civ-icon-player-colors");
                nukeCivIconBase.appendChild(nukeCivIconPlayerColors);
                const nukeCivIconHighlightAndShadow = document.createElement("div");
                nukeCivIconHighlightAndShadow.classList.add("test-cinematic-moment__nuke__civ-icon-highlight-and-shadow");
                nukeCivIconBase.appendChild(nukeCivIconHighlightAndShadow);
                const nukeCivIconFrame = document.createElement("div");
                nukeCivIconFrame.classList.add("test-cinematic-moment__nuke__civ-icon-frame");
                nukeCivIconBase.appendChild(nukeCivIconFrame);
                const nukeCivIcon = document.createElement("div");
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
    addFunctionButtons(targetDivID) {
        let buttonWrapper = document.getElementById(targetDivID);
        if (buttonWrapper) {
            const cinematicMomentReplayButton = document.createElement("fxs-button");
            cinematicMomentReplayButton.classList.add("test-cinematic-moment__replay-button");
            let cinematicMomentReplayButtonCaption = Locale.compose("LOC_WONDER_MOVIE_REPLAY");
            cinematicMomentReplayButton.setAttribute("caption", cinematicMomentReplayButtonCaption);
            buttonWrapper.appendChild(cinematicMomentReplayButton);
            const cinematicMomentCloseButton = document.createElement("fxs-button");
            cinematicMomentCloseButton.classList.add("test-cinematic-moment__close-button");
            let cinematicMomentCloseButtonCaption = Locale.compose("LOC_WONDER_MOVIE_CLOSE");
            cinematicMomentCloseButton.setAttribute("caption", cinematicMomentCloseButtonCaption);
            buttonWrapper.appendChild(cinematicMomentCloseButton);
        }
        else {
            console.log("Cinematic Moment Test: Unabble to attach buttons to targetDivID: " + targetDivID);
        }
    }
    realizeCinematicQuote(cinematicQuote) {
        let backgroundWrapper = document.getElementById("cm-content-container");
        //Quote Section
        const quoteBackgroundGradient = document.createElement("div");
        quoteBackgroundGradient.classList.add("test-cinematic-moment__quote__background-gradient");
        backgroundWrapper.appendChild(quoteBackgroundGradient);
        const quoteWindowWrapper = document.createElement("div");
        quoteWindowWrapper.classList.add("test-cinematic-moment__quote__window-wrapper");
        quoteBackgroundGradient.appendChild(quoteWindowWrapper);
        const quoteWindowDropShadow = document.createElement("div");
        quoteWindowDropShadow.classList.add("test-cinematic-moment__quote__drop-shadow");
        quoteWindowWrapper.appendChild(quoteWindowDropShadow);
        const quoteWindowBase = document.createElement("div");
        quoteWindowBase.classList.add("test-cinematic-moment__quote__window-base");
        quoteWindowWrapper.appendChild(quoteWindowBase);
        const quoteWindowFlavorImage = document.createElement("div");
        quoteWindowFlavorImage.classList.add("test-cinematic-moment__quote__window-flavor-image");
        quoteWindowBase.appendChild(quoteWindowFlavorImage);
        const quoteWindowWoodTexture = document.createElement("div");
        quoteWindowWoodTexture.classList.add("test-cinematic-moment__quote__wood-texture");
        quoteWindowBase.appendChild(quoteWindowWoodTexture);
        const quoteWindowHighlightAndShadow = document.createElement("div");
        quoteWindowHighlightAndShadow.classList.add("test-cinematic-moment__quote__highlight-and-shadow");
        quoteWindowBase.appendChild(quoteWindowHighlightAndShadow);
        const quoteWindowFrameWrapper = document.createElement("div");
        quoteWindowFrameWrapper.classList.add("test-cinematic-moment__quote__frame-wrapper");
        quoteWindowBase.appendChild(quoteWindowFrameWrapper);
        const quoteWindowFrame = document.createElement("div");
        quoteWindowFrame.classList.add("test-cinematic-moment__quote__frame");
        quoteWindowFrameWrapper.appendChild(quoteWindowFrame);
        const quoteWindowText = document.createElement("div");
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

//# sourceMappingURL=file:///core/ui/sandbox/cinematic-moments-test/cinematic-moments-test.js.map
