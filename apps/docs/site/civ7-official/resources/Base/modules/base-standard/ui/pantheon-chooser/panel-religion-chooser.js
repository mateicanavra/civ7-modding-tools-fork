/**
 * @file panel-religion-chooser.ts
 * @copyright 2021-2023, Firaxis Games
 * @description Select a religion
 */
import Panel from '/core/ui/panel-support.js';
import FxsActivatable from '/core/ui/components/fxs-activatable.js';
import { InputEngineEventName } from '/core/ui/input/input-support.js';
import FocusManager from '/core/ui/input/focus-manager.js';
const ROOT_INNER_HTML = `
<fxs-vslot>
	<div class="panel-religion-chooser__religion-header">
		<div class="panel-religion-chooser__religion-background-image"></div>
		<fxs-icon class="panel-religion-chooser__chosen-religion"></fxs-icon>
	</div>
	<div class="panel-religion-chooser__religion-title">Religion Title</div>
	<div class="panel-religion-chooser__religion-stats">
		<div class="panel-religion-chooser__religion-stats-background-image"></div>
		<div class="panel-religion-chooser__religion-stats-container">
			<div class="panel-religion-chooser__religion-stats-row">
				<div class="panel-religion-chooser__stat-container">
					<fxs-icon class="panel-religion-chooser__stat-icon city-icon"></fxs-icon>
					<div class="panel-religion-chooser__cities-value stat-value">#</div>
				</div>
				<div class="panel-religion-chooser__stat-container">
					<fxs-icon class="panel-religion-chooser__stat-icon town-icon"></fxs-icon>
					<div class="panel-religion-chooser__towns-value stat-value">#</div>
				</div>
			</div>
		</div>
	</div>
	<fxs-scrollable>
		<fxs-vslot class="panel-religion-chooser__beliefs-container">
			<div class="panel-religion-chooser__belief-container enhancer-container">
				<div class="panel-religion-chooser__belief-header-container">
					<div class="panel-religion-chooser__enhancer-header-text"></div>
					<div class="panel-religion-chooser__assigned-values">
						<div class="panel-religion-chooser__enhancer-header-assigned">0</div>
						<div class="panel-religion-chooser__enhancer-header-max">/ 1</div>
					</div>
				</div>
				<fxs-activatable class="panel-religion-chooser__enhancer-button belief-button">
					<div class="panel-religion-chooser__belief-background"></div>
					<div class="panel-religion-chooser__hcontainer">
						<div class+"panel-religion-chooser__belief-icon-container">
							<fxs-icon class="panel-religion-chooser__enhancer-icon belief-icon"></fxs-icon>
						</div>
						<div class="panel-religion-chooser__vcontainer">
							<div class="panel-religion-chooser__enhancer-name"></div>
							<div class="panel-religion-chooser__enhancer-description"></div>
						</div>
					</div>
				</fxs-activatable>
			</div>
			<div class="panel-religion-chooser__belief-container reliquary-container">
				<div class="panel-religion-chooser__belief-header-container">
					<div class="panel-religion-chooser__reliquary-header-text"></div>
					<div class="panel-religion-chooser__assigned-values">
						<div class="panel-religion-chooser__reliquary-header-assigned">0</div>
						<div class="panel-religion-chooser__reliquary-header-max">/ 1</div>
					</div>
				</div>
				<fxs-activatable class="panel-religion-chooser__reliquary-button belief-button">
					<div class="panel-religion-chooser__belief-background"></div>
					<div class="panel-religion-chooser__hcontainer">
						<div class="panel-religion-chooser__belief-icon-container">
							<fxs-icon class="panel-religion-chooser__reliquary-icon belief-icon"></fxs-icon>
						</div>
						<div class="panel-religion-chooser__vcontainer">
							<div class="panel-religion-chooser__reliquary-name"></div>
							<div class="panel-religion-chooser__reliquary-description"></div>
						</div>
					</div>
				</fxs-activatable>
			</div>
			<div>
				<div class="panel-religion-chooser__belief-container founder-container">
					<div class="panel-religion-chooser__belief-header-container">
						<div class="panel-religion-chooser__founder-header-text"></div>
						<div class="panel-religion-chooser__assigned-values">
							<div class="panel-religion-chooser__founder-header-assigned">0</div>
							<div class="panel-religion-chooser__founder-header-max">/ 3</div>
						</div>
					</div>
					<fxs-activatable class="panel-religion-chooser__founder-button-01 belief-button">
						<div class="panel-religion-chooser__belief-background"></div>
						<div class="panel-religion-chooser__hcontainer">
							<div class="panel-religion-chooser__belief-icon-container">
								<fxs-icon class="panel-religion-chooser__founder-icon-01 belief-icon"></fxs-icon>
							</div>
							<div class="panel-religion-chooser__vcontainer">
								<div class="panel-religion-chooser__founder-name-01"></div>
								<div class="panel-religion-chooser__founder-description-01"></div>
							</div>
						</div>
					</fxs-activatable>
					<fxs-activatable class="panel-religion-chooser__founder-button-02 belief-button">
						<div class="panel-religion-chooser__belief-background"></div>
						<div class="panel-religion-chooser__hcontainer">
							<div class="panel-religion-chooser__belief-icon-container">
								<fxs-icon class="panel-religion-chooser__founder-icon-02 belief-icon"></fxs-icon>
							</div>
							<div class="panel-religion-chooser__vcontainer">
								<div class="panel-religion-chooser__founder-name-02"></div>
								<div class="panel-religion-chooser__founder-description-02"></div>
							</div>
						</div>
					</fxs-activatable>
					<fxs-activatable class="panel-religion-chooser__founder-button-03 belief-button">
						<div class="panel-religion-chooser__belief-background"></div>
						<div class="panel-religion-chooser__hcontainer">
							<div class="panel-religion-chooser__belief-icon-container">
								<fxs-icon class="panel-religion-chooser__founder-icon-03 belief-icon"></fxs-icon>
							</div>
							<div class="panel-religion-chooser__vcontainer">
								<div class="panel-religion-chooser__founder-name-03"></div>
								<div class="panel-religion-chooser__founder-description-03"></div>
							</div>
						</div>
					</fxs-activatable>
				</div>
			</div>
		</fxs-vslot>
	</fxs-scrollable>
</fxs-vslot>
`;
class PanelReligionChooser extends Panel {
    constructor(root) {
        super(root);
        // header
        this.religionHeader = null;
        this.chosenReligion = null;
        this.religionButtons = [];
        this.religionName = null;
        this.currentBeliefsContainer = null;
        // options are the belief choices per belief class
        this.beliefOptionVSlot = null;
        this.beliefOptionButtons = [];
        this.beliefOptionIndices = [];
        this.enhancerTitle = null;
        this.enhancerAmount = null;
        this.enhancerButton = null;
        this.enhancerIcon = null;
        this.enhancerName = null;
        this.enhancerDescription = null;
        this.enhancerIndex = -1;
        this.reliquaryTitle = null;
        this.reliquaryAmount = null;
        this.reliquaryButton = null;
        this.reliquaryIcon = null;
        this.reliquaryName = null;
        this.reliquaryDescription = null;
        this.reliquaryIndex = -1;
        this.founderTitle = null;
        this.founderAmount = null;
        this.founderButtons = [];
        this.founderIcons = [];
        this.founderNames = [];
        this.founderDescriptions = [];
        this.founderIndices = [];
        // stats
        this.citiesIcon = null;
        this.citiesValue = null;
        this.townsIcon = null;
        this.townsValue = null;
        this.players = [];
        this.currentPlayer = null;
        this.currentActiveBeliefClass = "";
        this.engineInputListener = this.onEngineInput.bind(this);
        this.inputContext = InputContext.Dual;
    }
    onAttach() {
        super.onAttach();
        const localPlayerID = GameContext.localObserverID;
        this.Root.innerHTML = ROOT_INNER_HTML;
        window.addEventListener(InputEngineEventName, this.engineInputListener);
        const closeButton = document.createElement('fxs-close-button');
        {
            closeButton.addEventListener('action-activate', () => { this.close(); });
        }
        this.Root.appendChild(closeButton);
        this.religionHeader = this.Root.querySelector(".panel-religion-chooser__religion-header");
        this.chosenReligion = this.Root.querySelector(".panel-religion-chooser__chosen-religion");
        this.religionName = this.Root.querySelector(".panel-religion-chooser__religion-title");
        const religionButtonContainer = document.createElement("fxs-hslot");
        religionButtonContainer.classList.add("panel-religion-chooser__religion-buttons-container");
        // stats
        this.citiesIcon = this.Root.querySelector(".city-icon");
        this.citiesValue = this.Root.querySelector(".panel-religion-chooser__cities-value");
        this.townsIcon = this.Root.querySelector(".town-icon");
        this.townsValue = this.Root.querySelector(".panel-religion-chooser__towns-value");
        if (this.citiesIcon != null) {
            this.citiesIcon.style.setProperty("--religion-icon", `url("fs://game/unitflag_missingicon.png")`);
        }
        if (this.townsIcon != null) {
            this.townsIcon.style.setProperty("--religion-icon", `url("fs://game/unitflag_missingicon.png")`);
        }
        this.enhancerTitle = this.Root.querySelector(".panel-religion-chooser__enhancer-header-text");
        this.enhancerAmount = this.Root.querySelector(".panel-religion-chooser__enhancer-header-assigned");
        this.enhancerButton = this.Root.querySelector(".panel-religion-chooser__enhancer-button");
        this.enhancerName = this.Root.querySelector(".panel-religion-chooser__enhancer-name");
        this.enhancerDescription = this.Root.querySelector(".panel-religion-chooser__enhancer-description");
        this.enhancerIcon = this.Root.querySelector(".panel-religion-chooser__enhancer-icon");
        this.reliquaryTitle = this.Root.querySelector(".panel-religion-chooser__reliquary-header-text");
        this.reliquaryAmount = this.Root.querySelector(".panel-religion-chooser__reliquary-header-assigned");
        this.reliquaryButton = this.Root.querySelector(".panel-religion-chooser__reliquary-button");
        this.reliquaryName = this.Root.querySelector(".panel-religion-chooser__reliquary-name");
        this.reliquaryDescription = this.Root.querySelector(".panel-religion-chooser__reliquary-description");
        this.founderTitle = this.Root.querySelector(".panel-religion-chooser__founder-header-text");
        this.founderAmount = this.Root.querySelector(".panel-religion-chooser__founder-header-assigned");
        // create founder buttons
        for (let index = 1; index <= 3; index++) {
            let founderButton = this.Root.querySelector(`.panel-religion-chooser__founder-button-0${index}`);
            if (founderButton != null) {
                founderButton.setAttribute('tabindex', "-1");
                this.founderButtons.push(founderButton);
                founderButton?.addEventListener('action-activate', (event) => { this.onBeliefButtonActivated(event); });
                founderButton?.addEventListener('focus', (event) => { this.onButtonFocused(event); });
                founderButton?.addEventListener('blur', (event) => { this.onButtonFocused(event); });
            }
            let founderIcon = this.Root.querySelector(`.panel-religion-chooser__founder-icon-0${index}`);
            let founderName = this.Root.querySelector(`.panel-religion-chooser__founder-name-0${index}`);
            let founderDescription = this.Root.querySelector(`.panel-religion-chooser__founder-description-0${index}`);
            if (founderIcon) {
                this.founderIcons.push(founderIcon);
            }
            if (founderName) {
                this.founderNames.push(founderName);
            }
            if (founderDescription) {
                this.founderDescriptions.push(founderDescription);
            }
        }
        // bind the static buttons
        if (this.enhancerButton != null) {
            this.enhancerButton.addEventListener('action-activate', (event) => { this.onBeliefButtonActivated(event); });
            this.enhancerButton.addEventListener('focus', (event) => { this.onButtonFocused(event); });
            this.enhancerButton.addEventListener('blur', (event) => { this.onButtonFocused(event); });
            this.enhancerButton.setAttribute('tabindex', "-1");
        }
        if (this.reliquaryButton != null) {
            this.reliquaryButton?.addEventListener('action-activate', (event) => { this.onBeliefButtonActivated(event); });
            this.reliquaryButton?.addEventListener('focus', (event) => { this.onButtonFocused(event); });
            this.reliquaryButton?.addEventListener('blur', (event) => { this.onButtonFocused(event); });
            this.reliquaryButton.setAttribute('tabindex', "-1");
        }
        // make the belief options container
        if (this.currentBeliefsContainer == null) {
            this.currentBeliefsContainer = document.createElement("div");
            this.currentBeliefsContainer.classList.add("panel-religion-chooser__belief-options-container");
        }
        let beliefOptionScrollbox = document.createElement("fxs-scrollable");
        this.currentBeliefsContainer.appendChild(beliefOptionScrollbox);
        if (this.beliefOptionVSlot == null) {
            this.beliefOptionVSlot = document.createElement("fxs-vslot");
            beliefOptionScrollbox.appendChild(this.beliefOptionVSlot);
        }
        // set static panel data
        GameInfo.BeliefClasses.forEach(beliefClass => {
            if (beliefClass.BeliefClassType == "BELIEF_CLASS_ENHANCER") {
                if (this.enhancerTitle) {
                    this.enhancerTitle.textContent = Locale.compose(`${beliefClass.Name}`);
                }
            }
            else if (beliefClass.BeliefClassType == "BELIEF_CLASS_RELIQUARY") {
                if (this.reliquaryTitle) {
                    this.reliquaryTitle.textContent = Locale.compose(`${beliefClass.Name}`);
                }
            }
            else {
                if (this.founderTitle) {
                    this.founderTitle.textContent = Locale.compose(`${beliefClass.Name}`);
                }
            }
        });
        // set dynamic panel data
        // create list of religions in header for each player that has founded one
        Players.getEverAlive().forEach(player => {
            if (player.Religion?.hasCreatedReligion()) {
                const religionData = GameInfo.Religions.lookup(player.Religion.getReligionType());
                this.createReligionButton(religionButtonContainer, religionData);
                this.players.push(player.id);
            }
        });
        this.religionHeader?.appendChild(religionButtonContainer);
        // Initialize the panel based on the local player's religion
        this.updateReligionData(Players.get(localPlayerID));
        this.determineInitialFocus();
    }
    onDetach() {
        window.removeEventListener(InputEngineEventName, this.engineInputListener);
        super.onDetach();
    }
    // use the player as an argument because Player.Religion.get() returns a pantheon
    createReligionButton(buttonContainer, religionData) {
        if (religionData == null) {
            return;
        }
        //make a button
        const newbutton = document.createElement("religion-button");
        newbutton.setAttribute('tabindex', "-1");
        let buttonBackground = document.createElement("div");
        buttonBackground.classList.add("panel-religion-chooser__religion-button-background");
        newbutton.appendChild(buttonBackground);
        let buttonIcon = document.createElement("fxs-icon");
        buttonIcon.classList.add("panel-religion-chooser__religion-button-icon");
        let buttonIconPath = `fs://game/unitflag_missingicon.png`; //`fs://game/${religionData.IconString}`;	// TODO: update when religion icons are on the cloud
        buttonIcon?.style.setProperty("--religion-icon", `url("${buttonIconPath}")`);
        newbutton.appendChild(buttonIcon);
        this.religionButtons.push(newbutton);
        buttonContainer.appendChild(newbutton);
        newbutton.addEventListener('action-activate', (event) => { this.onReligionButtonActivated(event); });
        newbutton.addEventListener('focus', (event) => { this.onButtonFocused(event); });
        newbutton.addEventListener('blur', (event) => { this.onButtonFocused(event); });
    }
    updateReligionData(player) {
        if (player == null) {
            return;
        }
        const currentReligion = Players.Religion?.get(player.id);
        if (currentReligion == null) {
            return;
        }
        const religionDef = GameInfo.Religions.lookup(currentReligion.getReligionType());
        if (religionDef == null) {
            return;
        }
        this.closeBeliefOptions();
        const chooseReligionText = currentReligion.getReligionName();
        if (this.religionName) {
            this.religionName.setAttribute('data-l10n-id', chooseReligionText);
        }
        if (this.chosenReligion) {
            let iconPath = `fs://game/${religionDef.IconString}`;
            this.chosenReligion.setAttribute("data-icon-id", `${iconPath}`);
        }
        // stats
        {
            // find the number of cities
            let citiesInReligion = 0;
            let townsInReligion = 0;
            Players.getAlive().forEach(_player => {
                if (_player.Stats) {
                    citiesInReligion += _player.Stats?.getNumMyCitiesFollowingSpecificReligion(currentReligion.getReligionType());
                }
                _player.Cities?.getCities().forEach(_city => {
                    if (_city.isTown && _city.Religion?.majorityReligion == currentReligion?.getReligionType()) {
                        townsInReligion++;
                    }
                });
            });
            if (this.citiesValue) {
                this.citiesValue.textContent = citiesInReligion.toString();
            }
            if (this.townsValue) {
                this.townsValue.textContent = townsInReligion.toString();
            }
        }
        //lookup each belief definition of the current religion to get at it's data
        let currentFoundercount = 0;
        const beliefs = currentReligion.getBeliefs();
        if (beliefs) {
            beliefs.forEach(belief => {
                const beliefDef = GameInfo.Beliefs.lookup(belief);
                if (beliefDef != null) {
                    if (beliefDef.BeliefClassType == "BELIEF_CLASS_ENHANCER") {
                        this.enhancerIndex = beliefDef.$index;
                        if (this.enhancerAmount) {
                            this.enhancerAmount.textContent = "1";
                        }
                        if (this.enhancerName) {
                            this.enhancerName.textContent = Locale.compose(beliefDef.Name);
                        }
                        if (this.enhancerDescription) {
                            this.enhancerDescription.textContent = Locale.compose(beliefDef.Description);
                        }
                        if (this.enhancerIcon) {
                            let beliefIconPath = `fs://game/unitflag_missingicon.png`; // TODO: update when beliefs have icons
                            this.enhancerIcon.style.setProperty("--belief-icon", `url(${beliefIconPath})`);
                        }
                    }
                    else if (beliefDef.BeliefClassType == "BELIEF_CLASS_RELIQUARY") {
                        this.reliquaryIndex = beliefDef.$index;
                        if (this.reliquaryAmount) {
                            this.reliquaryAmount.textContent = "1";
                        }
                        if (this.reliquaryName) {
                            this.reliquaryName.textContent = Locale.compose(beliefDef.Name);
                        }
                        if (this.reliquaryDescription) {
                            this.reliquaryDescription.textContent = Locale.compose(beliefDef.Description);
                        }
                        if (this.reliquaryIcon) {
                            let beliefIconPath = `fs://game/unitflag_missingicon.png`; // TODO: update when beliefs have icons
                            this.reliquaryIcon.style.setProperty("--belief-icon", `url(${beliefIconPath})`);
                        }
                    }
                    else if (beliefDef.BeliefClassType == "BELIEF_CLASS_FOUNDER") {
                        this.founderIndices.push(beliefDef.$index);
                        if (this.founderNames[currentFoundercount]) {
                            this.founderNames[currentFoundercount].textContent = Locale.compose(beliefDef.Name);
                        }
                        if (this.founderDescriptions[currentFoundercount]) {
                            this.founderDescriptions[currentFoundercount].textContent = Locale.compose(beliefDef.Description);
                        }
                        if (this.founderIcons[currentFoundercount]) {
                            let beliefIconPath = `fs://game/unitflag_missingicon.png`;
                            this.founderIcons[currentFoundercount].style.setProperty("--belief-icon", `url(${beliefIconPath})`);
                        }
                        currentFoundercount++;
                    }
                }
            });
        }
        if (this.founderAmount) {
            this.founderAmount.textContent = currentFoundercount.toString();
        }
        for (let lockedFoundersIndex = currentFoundercount; lockedFoundersIndex < 3; lockedFoundersIndex++) {
            if (this.founderNames[lockedFoundersIndex]) {
                this.founderNames[lockedFoundersIndex].textContent = "Locked text title";
            }
            if (this.founderDescriptions[lockedFoundersIndex]) {
                this.founderDescriptions[lockedFoundersIndex].textContent = "Locked text description";
            }
        }
    }
    createBeliefOption(belief) {
        if (belief == null) {
            return;
        }
        //make a button
        let buttonContainer = document.createElement("div");
        let newbutton = document.createElement('belief-button');
        newbutton.setAttribute('tabindex', "-1");
        buttonContainer.classList.add("panel-religion-chooser__belief-button-background");
        // if this belief option is in the currently viewed religion mark it
        if (belief.$index == this.enhancerIndex || belief.$index == this.reliquaryIndex || this.founderIndices.indexOf(belief.$index) >= 0) {
            buttonContainer.style.setProperty("--background-color", "red");
        }
        // create and set the belief's icon
        let buttonIcon = document.createElement("fxs-icon");
        buttonIcon.classList.add("panel-religion-chooser__religion-button-icon");
        let buttonPath = `fs://game/unitflag_missingicon.png`; // TODO: update when beliefs have icons
        buttonIcon?.style.setProperty("--belief-icon", `url("${buttonPath}")`);
        let textContainer = document.createElement("div");
        textContainer.classList.add("panel-religion-chooser__vcontainer");
        // create and set the belief title and description
        let buttonText = document.createElement("div");
        buttonText.textContent = Locale.compose(belief.Name);
        let buttonDescription = document.createElement("div");
        buttonDescription.textContent = Locale.compose(belief.Description);
        newbutton.appendChild(buttonIcon);
        textContainer.appendChild(buttonText);
        textContainer.appendChild(buttonDescription);
        newbutton.appendChild(textContainer);
        buttonContainer.appendChild(newbutton);
        this.beliefOptionButtons.push(newbutton);
        this.beliefOptionIndices.push(belief.$index);
        this.beliefOptionVSlot?.appendChild(buttonContainer);
        newbutton.addEventListener('action-activate', (event) => { this.onBeliefOptionActivated(event); });
        newbutton.addEventListener('focus', (event) => { this.onButtonFocused(event); });
        newbutton.addEventListener('blur', (event) => { this.onButtonFocused(event); });
    }
    onBeliefOptionActivated(event) {
        if (event.target instanceof HTMLElement) {
            const activateBeliefDef = GameInfo.Beliefs[this.beliefOptionIndices[this.beliefOptionButtons.indexOf(event.target)]];
            this.closeBeliefOptions();
            let args = {
                BeliefType: Database.makeHash(activateBeliefDef.BeliefType)
            };
            const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.ADD_BELIEF, args, false);
            if (result.Success) {
                Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.ADD_BELIEF, args);
            }
            else {
                console.error(`Religion-chooser:  player operation ADD_BELIEF of ${Locale.compose(activateBeliefDef.Name)} failed! Reason: ${result.FailureReasons ? result.FailureReasons[0] : "None"}`);
            }
            this.updateReligionData(this.currentPlayer);
        }
    }
    onBeliefButtonActivated(event) {
        if (event.target instanceof HTMLElement) {
            let beliefClass = "";
            if (event.target == this.enhancerButton) {
                beliefClass = "BELIEF_CLASS_ENHANCER";
            }
            else if (event.target == this.reliquaryButton) {
                beliefClass = "BELIEF_CLASS_RELIQUARY";
            }
            else {
                beliefClass = "BELIEF_CLASS_FOUNDER";
            }
            if (this.currentActiveBeliefClass != null && this.currentActiveBeliefClass != beliefClass) {
                this.clearBeliefOptions();
                this.currentActiveBeliefClass = beliefClass;
                GameInfo.Beliefs.forEach(belief => {
                    if (belief.BeliefClassType == this.currentActiveBeliefClass) {
                        this.createBeliefOption(belief);
                    }
                });
                // show the options panel
                if (this.currentBeliefsContainer) {
                    this.Root.appendChild(this.currentBeliefsContainer);
                    this.currentBeliefsContainer.style.visibility = "visible";
                }
            }
        }
    }
    onReligionButtonActivated(event) {
        if (event.target instanceof HTMLElement) {
            let playerID = this.players[this.religionButtons.indexOf(event.target)];
            this.updateReligionData(Players.get(playerID));
        }
    }
    onButtonFocused(event) {
        if (event.target instanceof HTMLElement) {
            event.target.classList.toggle("focused", (event.type == "focus"));
        }
    }
    clearBeliefOptions() {
        this.beliefOptionButtons.forEach(button => {
            button.parentElement?.removeChild(button);
        });
        this.beliefOptionButtons = [];
        this.beliefOptionIndices = [];
    }
    closeBeliefOptions() {
        if (this.currentBeliefsContainer) {
            this.Root.appendChild(this.currentBeliefsContainer);
            this.currentBeliefsContainer.style.visibility = "hidden";
        }
        this.clearBeliefOptions();
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
            this.close();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    determineInitialFocus() {
        if (this.enhancerButton) {
            FocusManager.setFocus(this.enhancerButton);
        }
    }
}
Controls.define('panel-religion-chooser', {
    createInstance: PanelReligionChooser,
    description: 'Select a religion.',
    classNames: ['panel-religion-chooser'],
    styles: ['fs://game/base-standard/ui/pantheon-chooser/panel-religion-chooser.css']
});
Controls.define('religion-button', {
    createInstance: FxsActivatable,
    description: 'A religion in the world.',
    classNames: ['panel-religion-chooser__religion-button'],
    styles: ['fs://game/base-standard/ui/pantheon-chooser/panel-religion-chooser.css']
});
Controls.define('belief-button', {
    createInstance: FxsActivatable,
    description: 'A belief that could belong to the religion',
    classNames: ['panel-religion-chooser-belief-button'],
    styles: ['fs://game/base-standard/ui/pantheon-chooser/panel-religion-chooser.css']
});

//# sourceMappingURL=file:///base-standard/ui/pantheon-chooser/panel-religion-chooser.js.map
