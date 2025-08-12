"use strict";
/**
 * @file component-support.ts
 * @copyright 2020-2022, Firaxis Games
 * @description Definition for Component, base class for all 2D UI pieces
 */
const USE_OLD_FOCUS_LISTENERS = true;
class LiteEvent {
    constructor() {
        this.handlers = [];
    }
    on(handler) {
        this.handlers.push(handler);
    }
    off(handler) {
        this.handlers = this.handlers.filter(h => h !== handler);
    }
    trigger(data) {
        for (const handler of this.handlers) {
            handler(data);
        }
    }
    expose() {
        return this;
    }
}
/*
class LastValueEvent<T> extends LiteEvent<T> {
    private lastValue: T | undefined = undefined;

    constructor() {
        super();
    }

    override on(handler: { (data: T): void }): void {
        super.on(handler);

        if (this.lastValue != undefined) {
            handler(this.lastValue);
        }
    }

    override trigger(data: T): void {
        this.lastValue = data;
        super.trigger(data);
    }

    clear() {
        this.lastValue = undefined;
    }
}*/
class Subject {
    constructor(_value) {
        this._value = _value;
        this.handlers = [];
    }
    get value() {
        return this._value;
    }
    set value(data) {
        this._value = data;
        for (const handler of this.handlers) {
            handler(data);
        }
    }
    on(handler) {
        this.handlers.push(handler);
        handler(this._value);
    }
    off(handler) {
        this.handlers = this.handlers.filter(h => h !== handler);
    }
}
/**
 * Obtain the content of a resource in the background.
 * @param url The url of the resource to obtain.
 */
function asyncLoad(url) {
    const request = new XMLHttpRequest();
    const promise = new Promise(function (resolve, reject) {
        request.onload = (_response) => {
            if (request.status == 0 || request.status == 200) {
                resolve(request.responseText);
            }
            else {
                reject(request.statusText);
            }
        };
        request.onerror = () => reject(request.statusText);
        request.onabort = () => reject('aborted.');
    });
    request.open('GET', url);
    request.send();
    return promise;
}
/**
 *
 */
const MAX_WAIT_TIMEOUT_MS = 5000;
/**
 * Wait across frames until a value is no longer null.
 * @example this.waitUntilValue(() => { return componentRoot.component; }).then((component) => { console.log("component is not null!", component)});
 */
function waitUntilValue(f, maxFrameCount) {
    return new Promise((resolve, reject) => {
        const start = performance.now();
        let frameCount = 0;
        const updateListener = (timeStamp) => {
            if (timeStamp - start > MAX_WAIT_TIMEOUT_MS) {
                reject(`Timeout ${MAX_WAIT_TIMEOUT_MS}ms exceeded for waitUntilValue on ${f.name}.`);
                return;
            }
            if (frameCount == maxFrameCount) {
                reject(`Max frame count ${maxFrameCount} exceeded for waitUntilValue on ${f.name}.`);
                return;
            }
            frameCount++;
            const result = f();
            if (result != null) {
                resolve(result);
            }
            else {
                requestAnimationFrame(updateListener);
            }
        };
        updateListener(performance.now());
    });
}
/**
 * delays a callback by the specified number of frames.
 *
 * @param callback function to call after delay
 * @param count number of frames to delay by
 * @param callbackArguments arguments passed to callback function
 */
function delayByFrame(callback, count = 1, ...callbackArguments) {
    if (count === 0) {
        return callback(...callbackArguments);
    }
    count--;
    requestAnimationFrame(() => {
        delayByFrame(callback, count, ...callbackArguments);
    });
}
const LAYOUT_FRAME_DELAY = 2;
/**
 * executes a callback or creates a promise that resolves after layout has occurred (i.e, after two frames have passed).
 *
 * @returns a Promise or void
 */
function waitForLayout(callback) {
    if (callback) {
        return delayByFrame(callback, LAYOUT_FRAME_DELAY);
    }
    else {
        return new Promise((resolve) => {
            delayByFrame(resolve, LAYOUT_FRAME_DELAY);
        });
    }
}
function handlePromiseRejection(reason) {
    const t = typeof reason;
    if (t == "object") {
        console.error(reason.stack ?? reason);
    }
    else {
        console.error(reason);
    }
}
window.addEventListener('unhandledrejection', (ev) => {
    console.error(`Unhandled Promise Rejection: ${ev.reason}.  Re-run with inspector attached for callstack.`);
    ev.preventDefault();
});
/**
 * Base class for the HTML portion of components
 */
class ComponentRoot extends HTMLElement {
    constructor(typeName) {
        super();
        this._isInitialized = false;
        this._isMutator = false;
        this._decorators = [];
        this.engineListenerHandles = null;
        this.windowListeners = null;
        this.polyfillComponentCreatedEvent = {
            on: this.whenComponentCreated.bind(this)
        };
        this._typeName = typeName;
    }
    receiveFocus() {
        this._component?.onReceiveFocus();
    }
    loseFocus() {
        this._component?.onLoseFocus();
    }
    destroy() {
        this._component?.Destroy();
    }
    listenForEngineEvent(name, callback, context) {
        const handle = engine.on(name, callback, context);
        if (this.engineListenerHandles == null) {
            this.engineListenerHandles = [handle];
        }
        else {
            this.engineListenerHandles.push(handle);
        }
    }
    listenForWindowEvent(name, callback, useCapture) {
        window.addEventListener(name, callback, useCapture);
        if (this.windowListeners == null) {
            this.windowListeners = [{ name, callback, useCapture }];
        }
        else {
            this.windowListeners.push({ name, callback, useCapture });
        }
    }
    initialize() {
        if (this._isInitialized) {
            return; // Already initialized
        }
        /**
         * Mutators are a special kind of Coherent sauce that are used as templates based on some data-binding logic.
         * We do *not* want the inner component to be initialized let alone attached as the component will expect actual data and begin constructing
         * child elements.  These child elements will then get mistook for being part of the template and duplicate elements will be constructed.
         */
        const isInStructuralMutator = this.fxsInDatabindAnchor;
        if (isInStructuralMutator) {
            this._isMutator = true;
            this._isInitialized = true;
        }
        else {
            const controls = Controls;
            const definition = controls.getDefinition(this.typeName);
            if (definition) {
                const classNames = definition.classNames;
                if (classNames && classNames.length > 0) {
                    this.classList.add(...classNames);
                }
                if (definition.contentTemplates) {
                    for (const t of definition.contentTemplates) {
                        const fragment = t.content.cloneNode(true);
                        this.appendChild(fragment);
                    }
                }
                if (definition.tabIndex != undefined && !this.hasAttribute("tabindex")) {
                    this.setAttribute("tabindex", definition.tabIndex.toString());
                }
                const component = new definition.createInstance(this);
                this._component = component;
                const decorators = controls.getDecoratorProviders(this.typeName);
                for (let i = 0; i < decorators.length; ++i) {
                    const decorator = decorators[i];
                    this._decorators.push(decorator(component));
                }
                if (this.whenCreatedListeners) {
                    for (let f of this.whenCreatedListeners) {
                        f(component);
                    }
                    this.whenCreatedListeners = undefined;
                }
                component.onInitialize();
                this._isInitialized = true;
                this.doAttach();
            }
        }
    }
    cleanupEventisteners() {
        if (this.engineListenerHandles) {
            for (const handle of this.engineListenerHandles) {
                handle.clear();
            }
        }
        if (this.windowListeners) {
            for (const listener of this.windowListeners) {
                window.removeEventListener(listener.name, listener.callback, listener.useCapture);
            }
        }
    }
    doAttach() {
        const c = this._component;
        const decorators = this._decorators;
        if (c) {
            if (USE_OLD_FOCUS_LISTENERS) {
                c.initializeEventListeners();
            }
            for (const d of decorators) {
                d.beforeAttach();
            }
            c.onAttach();
            const definition = Controls.getDefinition(this.typeName);
            const skipPostOnAttach = definition?.skipPostOnAttach ?? false;
            if (!skipPostOnAttach) {
                c.postOnAttach();
            }
            for (const d of decorators) {
                d.afterAttach();
            }
        }
    }
    doDetach() {
        const c = this._component;
        const decorators = this.decorators;
        if (c) {
            this.cleanupEventisteners();
            if (USE_OLD_FOCUS_LISTENERS) {
                c.cleanupEventListeners();
            }
            for (const d of decorators) {
                d.beforeDetach();
            }
            c.onDetach();
            for (const d of decorators) {
                d.afterDetach();
            }
        }
    }
    connectedCallback() {
        if (this.isConnected) {
            if (this._isInitialized) {
                if (!this._isMutator) {
                    this.doAttach();
                }
            }
            else {
                this.initialize();
            }
        }
        else {
            console.warn(`Connected callback for ${this.typeName} called while component was not connected to DOM.`);
        }
    }
    disconnectedCallback() {
        if (!this._isMutator) {
            this.doDetach();
        }
    }
    adoptedCallback() {
        console.error(`<${this.typeName}> added to another DOM. (This should not happen!).`);
    }
    /**
     * Returns the type's name of the component.
     * Use this instead of tagName since some browsers may alter the tag name.
     */
    get typeName() {
        return this._typeName;
    }
    /**
     * The main controller of the component.
     *
     * @throws if the component is not yet initialized. Make sure the element is connected to the DOM first.
     */
    get component() {
        if (!this._component) {
            throw new Error(`Component '${this.typeName}' is not yet initialized. Is the element connected to the DOM?`);
        }
        return this._component;
    }
    /**
     * The main controller of the component.
     *
     * This value may be undefined if the component has not been connected to the DOM.
     */
    get maybeComponent() {
        return this._component;
    }
    /**
     * Additional decorators of the component.
     */
    get decorators() {
        return this._decorators;
    }
    /**
     * Determine if component has been through the initialization step.
     */
    get isInitialized() {
        return this._isInitialized;
    }
    /**
     * Call a function when the component has been created.
     */
    whenComponentCreated(func) {
        if (this._isInitialized && this._component) {
            func(this._component);
        }
        else {
            if (!this.whenCreatedListeners) {
                this.whenCreatedListeners = [];
            }
            this.whenCreatedListeners.push(func);
        }
    }
    /**
     * @deprecated Use `whenComponentCreated` instead.
     */
    get componentCreatedEvent() {
        return this.polyfillComponentCreatedEvent;
    }
    /**
     * HTML DOM callback
     * @param {string} name
     * @param {string} oldValue
     * @param {string} newValue
     * @see https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements
     */
    attributeChangedCallback(name, oldValue, newValue) {
        this._component?.onAttributeChanged(name, oldValue, newValue);
    }
}
const SetActivatedComponentEventName = 'set-activated-component';
class SetActivatedComponentEvent extends CustomEvent {
    constructor(component) {
        super(SetActivatedComponentEventName, { bubbles: false, cancelable: true, detail: { component } });
    }
}
const ActivatedComponentChangeEventName = 'activated-component-changed';
class ActivatedComponentChangeEvent extends CustomEvent {
    constructor(component) {
        super(ActivatedComponentChangeEventName, { bubbles: false, cancelable: true, detail: { component } });
    }
}
class Component {
    set audioGroup(value) {
        this._audioGroup = value;
    }
    get audioGroup() {
        if (this._audioGroup === undefined && Component.audio) {
            // group is either the value of the data-audio-group-ref attribute or the type name of the component
            const groupRefAttr = this.Root.getAttribute("data-audio-group-ref");
            const group = groupRefAttr ?? `audio-${this.Root.typeName}`;
            if (group in Component.audio) {
                this._audioGroup = group;
            }
            else {
                this._audioGroup = null;
            }
        }
        return this._audioGroup;
    }
    constructor(root) {
        this.receiveFocusEventListener = this.onReceiveFocus.bind(this);
        this.loseFocusEventListener = this.onLoseFocus.bind(this);
        this.detroyEventListener = this.Destroy.bind(this);
        this.Root = root;
    }
    // --------------------------------------------------------------------------
    //                              INITIALIZATION 
    // --------------------------------------------------------------------------
    /**
     * @brief Is called when a component is resolved and properly defined
     * @param _name The defined name of the component
     */
    static onDefined(_name) { }
    /** Called each time the component is re-attached to the DOM */
    onAttach() {
        const definition = Controls.getDefinition(this.Root.typeName);
        // Open events can happen from any component
        if (definition && definition.opens) {
            engine.on(`notify-availability`, this.notifyOpenAvailability, this);
            for (const component of definition.opens) {
                engine.on(`open-${component}`, this.processOpenCallback, this);
            }
            // Initialize the available components
            this.notifyOpenAvailability();
        }
    }
    /** Called just after the onAttach()
     * THIS METHOD SHOULD NEVER BE OVERRIDDEN.
     * (but there is currently no such thing than "final" keyword in Typescript)
     * onAttach() should instead.
     * At minimum, overrides should ALWAYS call super.postOnAttach()
     */
    postOnAttach() {
        // To handle the case where attributes are set before the component is being attached.
        // Typically by a screen in its own onAttach().
        // Must be done after the onAttach() to handle cases where it updates
        // elements that were created in the child class onAttach()
        const root = this.Root;
        const rootDefinition = Controls.getDefinition(root.typeName);
        if (rootDefinition && rootDefinition.attributes) {
            for (const attr of rootDefinition.attributes) {
                const attributeName = attr.name;
                const preAttachValue = root.getAttribute(attributeName);
                if (preAttachValue && preAttachValue != "") {
                    this.onAttributeChanged(attributeName, "", preAttachValue);
                }
            }
        }
    }
    /** Called only once, and immediately before the first time the component is inititalize. */
    onInitialize() { }
    playSound(id, idKeyAttr) {
        if (!Component.audio) {
            return;
        }
        const group = this.audioGroup;
        id = idKeyAttr ? this.Root.getAttribute(idKeyAttr) ?? id : id;
        if (id.length == 0 || id == "none") {
            return;
        }
        // need to fallback to audio-base twice to handle the case that the group exists, but the id doesn't exist in the group
        const soundTag = group ? Component.audio[group]?.[id] ?? Component.audio['audio-base'][id] : Component.audio['audio-base'][id];
        if (soundTag) {
            UI.sendAudioEvent(soundTag);
        }
        else {
            console.error(`No sound tag found for ${id} with group ${this.audioGroup}`);
        }
    }
    // -----------------------------------------------------------------------
    //                               CLEANUP 
    // -----------------------------------------------------------------------
    /** @description Component is disconnecting from the DOM, but may be re-attached later. (Do not assume destruction... yet.) */
    onDetach() {
        const definition = Controls.getDefinition(this.Root.typeName);
        if (definition && definition.opens) {
            engine.off(`notify-availability`, undefined, this);
            for (const component of definition.opens) {
                engine.off(`open-${component}`, undefined, this);
            }
            UI.Control.notifyAvailable(this.Root.typeName, []);
        }
    }
    /** @description this component should be considered unable to be used for future use */
    Destroy() {
        this.cleanupEventListeners();
        var parentNode = this.Root.parentNode;
        parentNode?.removeChild(this.Root);
    }
    // -----------------------------------------------------------------------
    //                                FOCUS
    //
    //  Allowing for focus is performed via CSS "disabled" rule.
    // -----------------------------------------------------------------------
    /** @description Called when gamepad focus is given. */
    onReceiveFocus() {
        this.Root.classList.add('trigger-nav-help');
    }
    /** @description Called when gamepad focus is lost. */
    onLoseFocus() {
        this.Root.classList.remove('trigger-nav-help');
    }
    initializeEventListeners() {
        this.Root.addEventListener('event-mgr-receive-focus', this.receiveFocusEventListener);
        this.Root.addEventListener('event-mgr-lose-focus', this.loseFocusEventListener);
        this.Root.addEventListener('event-mgr-pop', this.detroyEventListener);
    }
    cleanupEventListeners() {
        this.Root.removeEventListener('event-mgr-receive-focus', this.receiveFocusEventListener);
        this.Root.removeEventListener('event-mgr-lose-focus', this.loseFocusEventListener);
        this.Root.removeEventListener('event-mgr-pop', this.detroyEventListener);
    }
    /**
     * Called when another component is activated
     * Only if the component registered himself in the 'set-activated-component' event
     * */
    onDeactivated() { }
    // --------------------------------------------------------------------------
    //                      ATTRIBUTES  
    // --------------------------------------------------------------------------
    /**
     * Called when an attribute changes.
     * NOTE: Attributes must be declared in the component definition in order to be called.
     * @param name The name of the attribute that changed.
     * @param oldValue The value before the change.
     * @param newValue The value after the change.
     */
    onAttributeChanged(_name, _oldValue, _newValue) { }
    // --------------------------------------------------------------------------
    //                      DEBUGGING
    // --------------------------------------------------------------------------
    /**
     * Return debugging human-friendly string of info.
     */
    toString() {
        let msg = "Component:";
        msg += this.Root.tagName;
        return msg;
    }
    /**
     * @summary
     */
    notifyOpenAvailability() {
        const mapping = this.refreshCallbacksObject();
        const availableChildren = [];
        for (const key in mapping) {
            const callback = mapping[key];
            if (callback) {
                availableChildren.push(key);
            }
        }
        UI.Control.notifyAvailable(this.Root.typeName, availableChildren);
    }
    /**
     *  @summary Helper for generating an updated list of 'open' mappings from a component and executing
     * 	the right one. This function is only ever executed from an engine event, requiring debug support
    */
    processOpenCallback(name) {
        const mapping = this.refreshCallbacksObject();
        const callback = mapping[name];
        if (callback) {
            callback();
        }
    }
    /**
     * @summary Creates a defaulted runtime object of the `open` values given at Component definition
     */
    createCallbacksObject() {
        const opens = Controls.getDefinition(this.Root.typeName)?.opens ?? [];
        const callbacks = {};
        for (const open of opens) {
            callbacks[open] = undefined;
        }
        return Object.seal(callbacks); // prevent adding extra keys
    }
    /**
     * @summary A Component hook to allow associating a callback to the other components defined in the `Definition.opens` field.
     * @param callbacks A mapping of all the `opens` values to an undefined callback. Fills in the callback value if relevant
     *
     * NOTE: I would prefer to have the `Record` be a type dependent on the Component's definition,
     * 	but that requires refactoring the Component class to be a generic
     */
    generateOpenCallbacks(_callbacks) {
        // Intended to be overridden
    }
    /**
     * @summary Creates and populates a callback mapping with the latest state provided by the Component
     */
    refreshCallbacksObject() {
        const callbacks = this.createCallbacksObject();
        this.generateOpenCallbacks(callbacks);
        return callbacks;
    }
}
// #region Audio Events
asyncLoad('fs://game/core/ui/audio-base/audio-base.json').then((data) => {
    Component.audio = JSON.parse(data);
}).catch((e) => {
    console.error("Error loading audio-base.json", e);
});
class ComponentData {
    constructor() {
        this._decorators = [];
        this._decoratorsAdded = new LiteEvent();
        this._whenInitialized = new Promise((resolve, reject) => {
            this._initialized_resolve = resolve;
            this._initialized_reject = reject;
        });
    }
    get definition() {
        return this._definition;
    }
    set definition(v) {
        this._definition = v;
    }
    get whenInitialized() {
        return this._whenInitialized;
    }
    resolveInitialization() {
        const resolve = this._initialized_resolve;
        this._initialized_resolve = null;
        this._initialized_reject = null;
        resolve();
    }
    rejectInitialization(reason) {
        const reject = this._initialized_reject;
        this._initialized_resolve = null;
        this._initialized_reject = null;
        reject(reason);
    }
    getDecorators() {
        return this._decorators;
    }
    addDecorator(decorator) {
        this._decorators.push(decorator);
        this._decoratorsAdded.trigger(decorator);
    }
    get decoratorsAdded() {
        return this._decoratorsAdded.expose();
    }
}
const ComponentValueChangeEventName = 'component-value-changed';
/**
 * ComponentValueChangeEvent is a custom event that is fired when a component's value changes.
 *
 * You can create type aliases for specific values:
 *
 * ```ts
 * type CheckboxValueChangedEvent = ComponentValueChangeEvent<{ value: boolean }>;
 * ```
 *
 * And then use it like this:
 *
 * ```ts
 * const event = new CheckboxValueChangedEvent({ value: true });
 * this.sendValueChange(event);
 * ```
 *
 * And then listen for it like this:
 *
 * ```ts
 * this.Root.addEventListener(ComponentValueChangeEventName, (event: CheckboxValueChangedEvent) => {
 *    console.log(`Checkbox value changed to ${event.detail.value}`);
 * });
 * ```
 */
class ComponentValueChangeEvent extends CustomEvent {
    constructor(detail) {
        super(ComponentValueChangeEventName, { bubbles: true, cancelable: true, detail });
    }
}
/**
 * ChangeNotificationComponent is the base class for components that can signal a value change.
 */
class ChangeNotificationComponent extends Component {
    constructor() {
        super(...arguments);
        this.valueChangeListener = null;
    }
    /**
     * Set the external HTML element to be signaled when a value changes.
     * @param element that will listen for change
     */
    setValueChangeListener(element) {
        this.valueChangeListener = element;
    }
    /**
     * Signal a value change event.
     * @param event The filled-out ComponentValueChangeEvent to send.
     * @returns true if the event was not cancelled.
     */
    sendValueChange(event) {
        return (this.valueChangeListener ?? this.Root).dispatchEvent(event);
    }
}
class ImageCache {
    constructor() {
        this._cachedImages = new Map();
    }
    /**
     * Load an image.
     * @param url The url of the image to be loaded.
     * @param component The optional component referencing the image, used for debugging.
     * @returns A promise for when the image is loaded or null if the url is invalid.
     */
    loadImage(url, component) {
        let cache = this._cachedImages.get(url);
        if (!cache) {
            let image = new Image();
            const p = new Promise((resolve, _reject) => {
                image.style.display = 'none';
                image.style.position = 'absolute';
                image.addEventListener('load', () => {
                    const c = this._cachedImages.get(url);
                    if (c) {
                        c.loaded = true;
                    }
                    resolve();
                });
                image.addEventListener('error', () => {
                    console.error(`Failed to preload image for component <${component}> - ${url}.`);
                    resolve();
                });
            });
            cache = {
                loaded: false,
                URL: url,
                image: image,
                promise: p,
                components: []
            };
            this._cachedImages.set(url, cache);
            image.src = url;
            if (image.src != url) {
                console.error(`Invalid URL used to preload image for component <${component}> - ${url}`);
                this._cachedImages.delete(url);
                return false;
            }
        }
        if (component) {
            cache.components.push(component);
        }
        return (cache.loaded) ? true : cache.promise;
    }
    /**
     * Returns true if the image has successfully been loaded.
     */
    isImagePreloaded(url) {
        const cache = this._cachedImages.get(url);
        if (cache) {
            return cache.loaded;
        }
        else {
            return false;
        }
    }
    unloadAllImages() {
        this._cachedImages.clear();
    }
}
class ComponentManager {
    constructor() {
        this._sources = new Map();
        this._componentData = new Map();
        this._componentInitialized = new LiteEvent();
        this._imageCache = new ImageCache();
    }
    static getInstance() {
        if (!ComponentManager._instance) {
            ComponentManager._instance = new ComponentManager();
        }
        return ComponentManager._instance;
    }
    //#region Definitions
    /**
     * Provide a definition for a component.
     * Can only be called once per-component.
     * @param name The name of the component.
     */
    define(name, definition) {
        let s = this._componentData.get(name);
        if (!s) {
            s = new ComponentData();
            this._componentData.set(name, s);
        }
        s.definition = definition;
    }
    /**
     * Returns true if the component is fully defined.
     * @param name The name of the defined component.
     */
    isDefined(name) {
        const s = this._componentData.get(name);
        if (s) {
            return s.definition != null;
        }
        else {
            return false;
        }
    }
    /**
     * Returns the definition of a component.
     * @param name The name of the defined component.
     */
    getDefinition(name) {
        const s = this._componentData.get(name);
        if (s) {
            return s.definition;
        }
        else {
            console.warn(`No data for ${name}.`);
            return undefined;
        }
    }
    /**
     * Returns all component definitions.
     */
    getDefinitions() {
        const definitions = [];
        for (const cd of this._componentData) {
            const definition = cd[1].definition;
            if (definition) {
                definitions.push(definition);
            }
        }
        return definitions;
    }
    /**
     * Returns a promise that will be resolved when the component has been initialized.
     * @param name The name of the component to listen for.
     */
    whenInitialized(name) {
        let s = this._componentData.get(name);
        if (!s) {
            s = new ComponentData();
            this._componentData.set(name, s);
        }
        return s.whenInitialized;
    }
    /**
     * Triggered when a component has been defined.
     */
    get componentInitialized() {
        return this._componentInitialized.expose();
    }
    initializeComponents() {
        const shouldLog = Configuration.getUser().debugUILowLevelLogging > 0;
        const allComponentInitializedPromises = [];
        for (const [name, data] of this._componentData) {
            const definition = data.definition;
            if (definition) {
                // Ensure required components are defined prior to initialization.
                const requiredComponents = definition.requires;
                if (requiredComponents) {
                    for (let i = 0; i < requiredComponents.length; ++i) {
                        if (!this.isDefined(requiredComponents[i])) {
                            data.rejectInitialization(`${name} - Required component is not defined: ${requiredComponents[i]}`);
                            break;
                        }
                    }
                }
                const promises = [];
                // Ensure all styles are loaded before defining component.
                if (definition.styles) {
                    for (const url of definition.styles) {
                        const result = this.loadStyle(url);
                        if (typeof result != "boolean") {
                            promises.push(result);
                        }
                    }
                }
                // Ensure all required components are defined before defining this component.
                // Check if all requirements exist by now.  If not, then fail the initialization of the component.
                if (definition.requires) {
                    for (const component of definition.requires) {
                        if (!this.isDefined(component)) {
                            promises.push(this.whenInitialized(component));
                        }
                    }
                }
                // Preload any content.
                if (definition.innerHTML?.length || definition.content?.length) {
                    const contentTemplates = [];
                    definition.contentTemplates = contentTemplates;
                    if (definition.innerHTML) {
                        for (const html of definition.innerHTML) {
                            const template = document.createElement('template');
                            template.innerHTML = html;
                            contentTemplates.push(template);
                        }
                    }
                    else if (definition.content) {
                        for (const url of definition.content) {
                            const p = asyncLoad(url).then((html) => {
                                const template = document.createElement('template');
                                template.innerHTML = html;
                                contentTemplates.push(template);
                            }).catch((e) => {
                                console.error(`Failed to load content for component ${name} - ${url}`, e);
                            });
                            promises.push(p);
                        }
                    }
                }
                if (definition.images) {
                    for (const urlOrMethod of definition.images) {
                        if (typeof urlOrMethod === 'string') {
                            const result = this.preloadImage(urlOrMethod, name);
                            if (typeof result != 'boolean') {
                                promises.push(result);
                            }
                        }
                        else {
                            const results = urlOrMethod();
                            for (const url of results) {
                                const result = this.preloadImage(url, name);
                                if (typeof result != 'boolean') {
                                    promises.push(result);
                                }
                            }
                        }
                    }
                }
                const attrs = definition.attributes?.map(d => d.name) ?? [];
                // Do not define the component until the styles are loaded and attached.
                // This helps ensure that the component looks correct.
                const componentInitialized = Promise.all(promises).then(() => {
                    let c = class extends ComponentRoot {
                        constructor() {
                            super(name);
                        }
                        static get observedAttributes() {
                            return attrs;
                        }
                    };
                    if (shouldLog) {
                        console.log(`Defining ${name}`);
                    }
                    customElements.define(name, c);
                    data.resolveInitialization();
                    definition.createInstance.onDefined(name);
                    this._componentInitialized.trigger(name);
                }).catch(reason => {
                    const msg = `Failed to initialize component ${name}. ${reason}`;
                    console.error(msg);
                    data.rejectInitialization(msg);
                });
                allComponentInitializedPromises.push(componentInitialized);
            }
        }
        return Promise.allSettled(allComponentInitializedPromises);
    }
    //#endregion
    //#region Sources
    /**
     * Appends a script to the body of the document with defer="true" and src set to the provided `source`.
     * @param source The source url to load.
     */
    loadSource(url, module = true) {
        if (!document.body) {
            console.error("Component support attempted to loadSource() before body was created. source: ", url);
            return false;
        }
        let r = this._sources.get(url);
        if (!r) {
            this._sources.set(url, true);
            let upResolve, upReject;
            let p = new Promise((resolve, reject) => {
                upResolve = resolve;
                upReject = reject;
            }).catch(handlePromiseRejection);
            let s = document.createElement('script');
            s.src = url;
            if (module) {
                s.type = "module";
            }
            s.onload = () => {
                upResolve();
            };
            s.onerror = () => { console.error(`SOURCE ERROR - ${url}`); upReject(); };
            document.head.appendChild(s);
            return p;
        }
        else {
            return true;
        }
    }
    loadStyle(url) {
        if (!document.head) {
            console.error("Component support attempted to loadStyle() before head was created. source: ", url);
            return false;
        }
        // Only load the style if it hasn't already been added to the DOM.
        const el = document.querySelector(`link[href="${url}"]`);
        if (!el) {
            let upResolve, upReject;
            let p = new Promise((resolve, reject) => {
                upResolve = resolve;
                upReject = reject;
            }).catch(handlePromiseRejection);
            const style = document.createElement('link');
            style.setAttribute('rel', 'stylesheet');
            style.setAttribute('type', 'text/css');
            style.setAttribute('href', url);
            style.onload = () => {
                if (Configuration.getUser().debugUILowLevelLogging > 0) {
                    console.log(`STYLE LOADED - ${url}`);
                }
                upResolve();
            };
            style.onerror = () => { console.error(`STYLE ERROR - ${url}`); upReject(); };
            document.head.appendChild(style);
            return p;
        }
        else {
            return true;
        }
    }
    /**
     * Returns true if the source has been loaded.
     * NOTE: The source string must be an equal match.
     * @param source The source url.
     */
    isSourceLoaded(source) {
        return this._sources.get(source) ?? false;
    }
    //#endregion
    /**
     * Preload an image.
     * @param url The url of the image to be preloaded.
     * @param component The component referencing the image, used for debugging.
     * @returns A promise for when the image is loaded or null if the url is invalid.
     */
    preloadImage(url, component) {
        return this._imageCache.loadImage(url, component);
    }
    /**
     * Returns true if the image has successfully been loaded.
     */
    isImagePreloaded(url) {
        return this._imageCache.isImagePreloaded(url);
    }
    //#region Decorators
    /**
     * Registers a decorator with a declared component.
     * NOTE: This will not construct a decorator existing component instances.
     * @param name The name of the component.
     * @param decorator A method to generate the decorator instance.
     */
    decorate(name, provider) {
        let s = this._componentData.get(name);
        if (!s) {
            s = new ComponentData();
            this._componentData.set(name, s);
        }
        s.addDecorator(provider);
    }
    /**
     * Returns a list of all decorator providers for a given component.
     * @param name The name of the component.
     */
    getDecoratorProviders(name) {
        let s = this._componentData.get(name);
        if (s) {
            return s.getDecorators();
        }
        else {
            return [];
        }
    }
}
// #region Attribute Handlers
class LocalizationDataBoundAttributeHandler {
    constructor() {
        this.state = '';
    }
    /**
     * This will be executed only once per element when the attribute attached to it is bound with a model.
     * Set up any initial state, event handlers, etc. here.
     * @param element
     * @param value
     */
    init(element, value) {
        this.state = value;
        element.setAttribute('data-l10n-id', value);
    }
    /**
     * This will be executed only once per element when the element is detached from the DOM.
     * Clean up state, event handlers, etc. here.
     * @param element
     */
    deinit(_element) { }
    /**
     * This will be executed everytime that the model which the attribute is attached to is synchronized.
     * @param element
     * @param value
     */
    update(element, value) {
        if (this.state != value) {
            this.state = value;
            element.setAttribute('data-l10n-id', value);
        }
    }
}
class ComponentDataBoundAttributeHandler {
    /**
     * This will be executed only once per element when the attribute attached to it is bound with a model.
     * Set up any initial state, event handlers, etc. here.
     * @param element
     * @param value
     */
    init(element, value) {
        for (const key in value) {
            const v = value[key];
            if (v != undefined) {
                element.setAttribute(key, v.toString());
            }
            else {
                element.removeAttribute(key);
            }
        }
    }
    /**
     * This will be executed only once per element when the element is detached from the DOM.
     * Clean up state, event handlers, etc. here.
     * @param element
     */
    deinit(_element) { }
    /**
     * This will be executed everytime that the model which the attribute is attached to is synchronized.
     * @param element
     * @param value
     */
    update(element, value) {
        for (const key in value) {
            const v = value[key];
            if (v != undefined) {
                element.setAttribute(key, v.toString());
            }
            else {
                element.removeAttribute(key);
            }
        }
    }
}
engine.whenReady.then(() => {
    console.log('Registering custom data-bind-attributes handler.');
    engine.registerBindingAttribute('l10n', LocalizationDataBoundAttributeHandler);
    engine.registerBindingAttribute("attributes", ComponentDataBoundAttributeHandler);
    let reloadQueuedHandle = 0;
    // This is less than ideal, but thorough.
    engine.on('UserGeneratedTextUpdated', () => {
        if (reloadQueuedHandle == 0) {
            // TODO - Enqueue in async work queue instead of animation frame.
            reloadQueuedHandle = window.requestAnimationFrame(() => {
                reloadQueuedHandle = 0;
                engine.reloadLocalization();
            });
        }
    });
}).catch(handlePromiseRejection);
// #endregion
// #region <fxs-include>
/**
 * A helper component to fetch snippets of html.
 */
const onFxsIncludeContentLoad_Success = new CustomEvent("content-load-success");
const onFxsIncludeContentLoad_Fail = new CustomEvent("content-load-fail");
class FxsInclude extends HTMLElement {
    connectedCallback() {
        if (this.isConnected) {
            this.classList.add('fxs-include');
            const contenturl = this.getAttribute('content');
            if (!contenturl) {
                // BAIL OUT! 
                console.log('fxs-include: NO CONTENT REQUESTED');
                return;
            }
            //console.log('fxs-include requesting content:', contenturl);
            let asyncRequest = asyncLoad(contenturl);
            asyncRequest.then(contentToInclude => {
                //console.log('fxs-include loaded content:', contentToInclude); //read out all items as comma separate list of strings
                this.insertAdjacentHTML('beforebegin', contentToInclude);
                this.parentNode?.removeChild(this);
                this.dispatchEvent(onFxsIncludeContentLoad_Success); //TODO: better way to do this? Bool on a single event, to excapsulate failure? 
            }).catch(error => {
                console.error(`fxs-include: Error loading ${contenturl}`);
                console.log("  Reason for error: ", error.message);
                this.dispatchEvent(onFxsIncludeContentLoad_Fail); //TODO: better way to do this? Bool on a single event, to excapsulate failure? 
            });
        }
    }
}
customElements.define('fxs-include', FxsInclude);
// #endregion
const Controls = ComponentManager.getInstance();
// #region Event Listeners;
if (!USE_OLD_FOCUS_LISTENERS) {
    document.addEventListener("DOMContentLoaded", function () {
        const body = document.body;
        body.addEventListener('event-mgr-receive-focus', (event) => {
            if (event.target instanceof HTMLElement) {
                let target = event.target;
                while (target) {
                    if (target instanceof ComponentRoot) {
                        target.receiveFocus();
                        return;
                    }
                    target = target.parentElement;
                }
            }
        });
        body.addEventListener('event-mgr-lose-focus', (event) => {
            if (event.target instanceof HTMLElement) {
                let target = event.target;
                while (target) {
                    if (target instanceof ComponentRoot) {
                        target.loseFocus();
                        return;
                    }
                    target = target.parentElement;
                }
            }
        });
        body.addEventListener('event-mgr-pop', (event) => {
            if (event.target instanceof HTMLElement) {
                let target = event.target;
                while (target) {
                    if (target instanceof ComponentRoot) {
                        target.destroy();
                        return;
                    }
                    target = target.parentElement;
                }
            }
        });
    });
}
// #endregion Event Listeners
// #region Loading Management
class Loading {
    // Replaces "export function runWhenInitialized..."
    static runWhenInitialized(f) {
        if (Loading.isInitialized) {
            f();
        }
        else {
            Loading.whenInitialized.finally(f);
        }
    }
    // Replaces "export function runWhenLoaded..."
    static runWhenLoaded(f) {
        if (Loading.isLoaded) {
            f();
        }
        else {
            Loading.whenLoaded.finally(f);
        }
    }
    // Replaces "export function runWhenFinished..."
    static runWhenFinished(f) {
        if (Loading.isFinished) {
            f();
        }
        else {
            Loading.whenFinished.finally(f).catch(handlePromiseRejection);
        }
    }
    // Replaces function onInitialScriptAdded in the namespace
    static onInitialScriptAdded() {
        console.log(`Initial Script added after UI load. Attaching next frame.`);
        if (Loading.processInitialScriptsRAF === 0) {
            Loading.processInitialScriptsRAF = requestAnimationFrame(() => {
                Loading.processInitialScriptsRAF = 0;
                const scripts = Modding.getInitialScripts(InitialScriptType.Default);
                const controls = Controls;
                for (const s of scripts) {
                    controls.loadSource(s.url, s.isModule);
                }
            });
        }
    }
}
Loading.processInitialScriptsRAF = 0;
Loading.isInitialized = false;
// Replaces "export const whenInitialized..."
Loading.whenInitialized = new Promise((resolve, _reject) => {
    engine.whenReady.then(() => {
        console.log('Loading - Script engine ready. Beginning Loading process.');
        const promises = [];
        const isInShell = UI.isInShell();
        const loadingState = UI.getGameLoadingState();
        let gameCoreInitialized = false;
        switch (loadingState) {
            case UIGameLoadingState.WaitingForGameCore:
            case UIGameLoadingState.WaitingForVisualization:
            case UIGameLoadingState.WaitingForUIReady:
            case UIGameLoadingState.WaitingToStart:
            case UIGameLoadingState.GameStarted:
                gameCoreInitialized = true;
        }
        if (isInShell || gameCoreInitialized) {
            console.log('Loading - Either not in-game or gamecore either initialized.');
        }
        else {
            const eventName = 'UIGameLoadingStateChanged';
            let resolveGameCoreInitialized;
            promises.push(new Promise((r) => { resolveGameCoreInitialized = r; }));
            const callback = () => {
                let gameCoreInitialized = false;
                switch (UI.getGameLoadingState()) {
                    case UIGameLoadingState.WaitingForGameCore:
                    case UIGameLoadingState.WaitingForVisualization:
                    case UIGameLoadingState.WaitingForUIReady:
                    case UIGameLoadingState.WaitingToStart:
                    case UIGameLoadingState.GameStarted:
                        gameCoreInitialized = true;
                }
                if (gameCoreInitialized) {
                    console.log('GameCore initialized, begin displaying loading screen.');
                    engine.off(eventName, callback);
                    resolveGameCoreInitialized();
                }
            };
            engine.on(eventName, callback);
        }
        Promise.all(promises)
            .catch((reason) => {
            console.error(`There was an error during initialization. ${reason}.`);
        })
            .finally(() => {
            console.log("Loading - Loading complete, finalizing UI.");
            Loading.isInitialized = true;
            resolve();
        })
            .catch(handlePromiseRejection);
    });
});
// Replaces "export let isLoaded..."
Loading.isLoaded = false;
// Replaces "export const whenLoaded..."
Loading.whenLoaded = new Promise((resolve, _reject) => {
    Loading.runWhenInitialized(() => {
        console.log('Loading - Script engine ready. Beginning Loading process.');
        const promises = [];
        const isInShell = UI.isInShell();
        const loadingState = UI.getGameLoadingState();
        let gameReady = false;
        switch (loadingState) {
            case UIGameLoadingState.WaitingForUIReady:
            case UIGameLoadingState.WaitingToStart:
            case UIGameLoadingState.GameStarted:
                gameReady = true;
        }
        if (isInShell || gameReady) {
            console.log('Loading - Either not in-game or game has already started.');
            engine.on('InitialScriptAdded', Loading.onInitialScriptAdded);
            const controls = Controls;
            const scripts = Modding.getInitialScripts(InitialScriptType.Default);
            for (const s of scripts) {
                const r = controls.loadSource(s.url, s.isModule);
                if (typeof r !== "boolean") {
                    promises.push(r);
                }
            }
        }
        else {
            const eventName = 'UIGameLoadingStateChanged';
            let resolveGameReady;
            promises.push(new Promise((r) => { resolveGameReady = r; }));
            const callback = () => {
                let gameReady = false;
                switch (UI.getGameLoadingState()) {
                    case UIGameLoadingState.WaitingForUIReady:
                    case UIGameLoadingState.WaitingToStart:
                    case UIGameLoadingState.GameStarted:
                        gameReady = true;
                }
                if (gameReady) {
                    console.log(`Loading - Game and Visualization are ready, begin loading scripts.`);
                    engine.off(eventName, callback);
                    engine.on('InitialScriptAdded', Loading.onInitialScriptAdded);
                    const tempPromises = [];
                    const controls = Controls;
                    const scripts = Modding.getInitialScripts(InitialScriptType.Default);
                    for (const s of scripts) {
                        const r = controls.loadSource(s.url, s.isModule);
                        if (typeof r !== "boolean") {
                            tempPromises.push(r);
                        }
                    }
                    Promise.all(tempPromises).finally(() => {
                        console.log(`Loading - All scripts loaded. Setting GameReady.`);
                        resolveGameReady();
                    });
                }
            };
            engine.on(eventName, callback);
        }
        Promise.all(promises)
            .catch((reason) => {
            console.error(`There was an error loading scripts. ${reason}.`);
        })
            .finally(() => {
            console.log("Loading - Initializing components...");
            Controls.initializeComponents().finally(() => {
                console.log("Loading - Finished initializing components.");
                console.log("Loading - Waiting 2 frames for layout processing to finish.");
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        UI.notifyUIReadyForEvents();
                        console.log("Loading - Loading complete, finalizing UI.");
                        Loading.isLoaded = true;
                        resolve();
                    });
                });
            });
        })
            .catch(handlePromiseRejection);
    });
});
// Replaces "export let isFinished..."
Loading.isFinished = false;
// Replaces "export const whenFinished..."
Loading.whenFinished = new Promise((resolve) => {
    Loading.runWhenLoaded(() => {
        console.log('Loading - Finishing setting up the UI.');
        if (!UI.isInGame() || UI.getGameLoadingState() === UIGameLoadingState.GameStarted) {
            Loading.isFinished = true;
            resolve();
        }
        else {
            const eventName = 'UIGameLoadingStateChanged';
            const callback = () => {
                let gameStarted = false;
                if (UI.getGameLoadingState() === UIGameLoadingState.GameStarted) {
                    gameStarted = true;
                }
                if (gameStarted) {
                    console.log(`Loading - 'Game has started!`);
                    engine.off(eventName, callback);
                    Loading.isFinished = true;
                    resolve();
                }
            };
            engine.on(eventName, callback);
        }
    });
});
// Automatically flag the UI as ready in certain conditions.
Loading.runWhenLoaded(() => {
    // If the game is not multi-player based, create a button once loaded.
    const gameConfig = Configuration.getGame();
    const shouldAutoReady = gameConfig.skipStartButton || Automation.isActive;
    // Automatically ready up if one of the conditions is true
    // * Not in-game
    // * Game has already started (Happens if the UI was reloaded)
    // * Automation is running
    // * The game's configuration explicitly requested no start button.
    if (!UI.isInGame() || UI.getGameLoadingState() == UIGameLoadingState.GameStarted || shouldAutoReady) {
        UI.notifyUIReady();
    }
});
// #endregion
// set up CSS global variables
//same function as setRootLoadingSafeMargins in ui\loading\root-loading.ts . Would be nice to factor them out.
function setComponentSupportSafeMargins() {
    const rootStyle = document.documentElement.style;
    // Setup Safe Zones 
    const safeAreaMargins = UI.getSafeAreaMargins();
    rootStyle.setProperty("--safezone-top", `${safeAreaMargins.top}px`);
    rootStyle.setProperty("--safezone-bottom", `${safeAreaMargins.bottom}px`);
    rootStyle.setProperty("--safezone-left", `${safeAreaMargins.left}px`);
    rootStyle.setProperty("--safezone-right", `${safeAreaMargins.right}px`);
}
// #region Safe-Zones
// Initialize css properties for scaling and safe zones.
engine.whenReady.then(() => {
    engine.on('AppInForeground', setComponentSupportSafeMargins);
    engine.on('update-safe-area', setComponentSupportSafeMargins);
    // Update css properties for scaling.
    setComponentSupportSafeMargins();
});
// #endregion

//# sourceMappingURL=file:///core/ui/component-support.js.map
