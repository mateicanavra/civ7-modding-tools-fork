/**
 * @file world-anchor-text-manager.ts
 * @copyright 2021-2022, Firaxis Games
 * @description Manages the tracking and updating of the floating "world text" (aka: "float text") anchored messages.
 */
import { PlotCoord } from '/core/ui/utilities/utilities-plotcoord.js';
/// Id to use for children floating text objects not being tracked.
const INVALID_TRACKING_ID = -1;
class WorldAnchorTextManager extends Component {
    constructor() {
        super(...arguments);
        this.children = new Map();
        this.nextID = 0; // id to give next child created
    }
    static get instance() {
        return WorldAnchorTextManager._instance;
    }
    /**
     * Onetime callback on creation.
     */
    onInitialize() {
        if (WorldAnchorTextManager._instance == null) {
            WorldAnchorTextManager._instance = this;
        }
        else {
            console.error("WorldAnchorTextManager: Multiple world anchor text managers are attempting to be created, but it's a singleton.");
        }
    }
    onAttach() {
        super.onAttach();
        engine.on('WorldTextMessage', this.onWorldTextMessage, this);
    }
    onDetach() {
        engine.off('WorldTextMessage', this.onWorldTextMessage, this);
        super.onDetach();
    }
    /**
     * Called by an instance of AnchorText to register it with the manager
     * @param child Anchor text object
     */
    addChildForTracking(child) {
        if (child.getID() != INVALID_TRACKING_ID) {
            console.error("WorldAnchorTextManager: Unable to connect a world text child to the manager because it already has an id: ", child.getID());
            return;
        }
        const id = this.nextID = (this.nextID + 1) % 19; // Max # of text messages at once.		TOOD: Increase this beyond 19 and remove this message
        if (this.children.has(id)) {
            console.error("WorldAnchorTextManager: Attempt to add a world text child to the manager for tracking but id is already tracked, id: " + id.toString());
            return;
        }
        child.setID(id);
        this.children.set(id, child);
    }
    /**
     * Called by an instance of AnchorText to register it with the manager
     * @param child Anchor text object
     */
    removeChildFromTracking(child) {
        const id = child.getID();
        if (id == INVALID_TRACKING_ID) {
            console.warn("WorldAnchorTextManager: Unable to remove a world text from the manager because the text flag has an invalid componentID.");
            return;
        }
        if (!this.children.has(id)) {
            console.warn("WorldAnchorTextManager: Attempt to remove a world text from the manager for tracking but none exists with that id: " + id.toString());
            return;
        }
        this.children.delete(id);
        child.setID(INVALID_TRACKING_ID);
    }
    /**
     * Listener to a message from game core.
     * @param data The world text message
     */
    onWorldTextMessage(data) {
        // Who is the message intended for?  (NO_PLAYER = all players)
        if (data.targetID != PlayerIds.NO_PLAYER && data.targetID != GameContext.localObserverID) {
            return; // Message is for another player, ignore it.
        }
        const revealedState = GameplayMap.getRevealedState(GameContext.localPlayerID, data.location.x, data.location.y);
        if (revealedState != RevealedStates.VISIBLE) {
            return; // Message is on a plot the player can't see
        }
        let messagesOnPlot = 0; // # of (different) existing messages at the same plot X,Y as this one.
        // Loop backwards as this check is likely best needed when something is called
        // twice and so the child with the highest index is likely the dupe.		
        const dataPlotxy = PlotCoord.toString(data.location);
        const children = this.Root.childNodes;
        for (let i = children.length - 1; i >= 0; i--) {
            const node = children.item(i);
            const plotxy = node.getAttribute('data-anchor-text-xy');
            if (plotxy == dataPlotxy) {
                messagesOnPlot++;
                if (data.text == node.getAttribute('data-anchor-text-msg')) {
                    console.warn(`WorldAnchorTextManager: Ignoring duplicate anchor text message sent: ${plotxy} = '${data.text}'`);
                    return; // Early out on first match; we're done here.	
                }
            }
        }
        const worldAnchoredText = document.createElement("world-anchor-text");
        worldAnchoredText.setAttribute('data-anchor-text-xy', PlotCoord.toString(data.location));
        worldAnchoredText.setAttribute('data-anchor-text-msg', data.text);
        worldAnchoredText.setAttribute('data-anchor-text-delay', messagesOnPlot.toString());
        this.Root.appendChild(worldAnchoredText);
    }
}
WorldAnchorTextManager._instance = null;
export { WorldAnchorTextManager as default };
Controls.define('world-anchor-texts', {
    createInstance: WorldAnchorTextManager,
    description: 'World Anchor Text Manager'
});

//# sourceMappingURL=file:///base-standard/ui/world-anchor-text/world-anchor-text-manager.js.map
