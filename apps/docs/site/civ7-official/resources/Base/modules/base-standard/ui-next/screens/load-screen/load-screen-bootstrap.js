import { Icon as Icon$1 } from '../../../../core/ui/utilities/utilities-image.js';
import FocusManager from '../../../../core/ui/input/focus-manager.js';
import { Layout } from '../../../../core/ui/utilities/utilities-layout.js';
import ActionHandler from '../../../../core/ui/input/action-handler.js';
import { InputEngineEvent } from '../../../../core/ui/input/input-support.js';

import '../../../../core/ui/framework.js';
import '../../../../core/ui/input/action-handler.js';
import '../../../../core/ui/context-manager/context-manager.js';
import '../../../../core/ui/views/view-manager.js';
import '../../../../core/ui/panel-support.js';
import '../../../../core/ui/input/input-support.js';
import '../../../../core/ui/utilities/utilities-update-gate.js';
import '../../../../core/ui/utilities/utilities-component-id.js';

let taskIdCounter = 1,
  isCallbackScheduled = false,
  isPerformingWork = false,
  taskQueue = [],
  currentTask = null,
  shouldYieldToHost = null,
  yieldInterval = 5,
  deadline = 0,
  maxYieldInterval = 300,
  scheduleCallback = null,
  scheduledCallback = null;
const maxSigned31BitInt = 1073741823;
function setupScheduler() {
  const channel = new MessageChannel(),
    port = channel.port2;
  scheduleCallback = () => port.postMessage(null);
  channel.port1.onmessage = () => {
    if (scheduledCallback !== null) {
      const currentTime = performance.now();
      deadline = currentTime + yieldInterval;
      const hasTimeRemaining = true;
      try {
        const hasMoreWork = scheduledCallback(hasTimeRemaining, currentTime);
        if (!hasMoreWork) {
          scheduledCallback = null;
        } else port.postMessage(null);
      } catch (error) {
        port.postMessage(null);
        throw error;
      }
    }
  };
  if (navigator && navigator.scheduling && navigator.scheduling.isInputPending) {
    const scheduling = navigator.scheduling;
    shouldYieldToHost = () => {
      const currentTime = performance.now();
      if (currentTime >= deadline) {
        if (scheduling.isInputPending()) {
          return true;
        }
        return currentTime >= maxYieldInterval;
      } else {
        return false;
      }
    };
  } else {
    shouldYieldToHost = () => performance.now() >= deadline;
  }
}
function enqueue(taskQueue, task) {
  function findIndex() {
    let m = 0;
    let n = taskQueue.length - 1;
    while (m <= n) {
      const k = (n + m) >> 1;
      const cmp = task.expirationTime - taskQueue[k].expirationTime;
      if (cmp > 0) m = k + 1;
      else if (cmp < 0) n = k - 1;
      else return k;
    }
    return m;
  }
  taskQueue.splice(findIndex(), 0, task);
}
function requestCallback(fn, options) {
  if (!scheduleCallback) setupScheduler();
  let startTime = performance.now(),
    timeout = maxSigned31BitInt;
  if (options && options.timeout) timeout = options.timeout;
  const newTask = {
    id: taskIdCounter++,
    fn,
    startTime,
    expirationTime: startTime + timeout
  };
  enqueue(taskQueue, newTask);
  if (!isCallbackScheduled && !isPerformingWork) {
    isCallbackScheduled = true;
    scheduledCallback = flushWork;
    scheduleCallback();
  }
  return newTask;
}
function cancelCallback(task) {
  task.fn = null;
}
function flushWork(hasTimeRemaining, initialTime) {
  isCallbackScheduled = false;
  isPerformingWork = true;
  try {
    return workLoop(hasTimeRemaining, initialTime);
  } finally {
    currentTask = null;
    isPerformingWork = false;
  }
}
function workLoop(hasTimeRemaining, initialTime) {
  let currentTime = initialTime;
  currentTask = taskQueue[0] || null;
  while (currentTask !== null) {
    if (currentTask.expirationTime > currentTime && (!hasTimeRemaining || shouldYieldToHost())) {
      break;
    }
    const callback = currentTask.fn;
    if (callback !== null) {
      currentTask.fn = null;
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
      callback(didUserCallbackTimeout);
      currentTime = performance.now();
      if (currentTask === taskQueue[0]) {
        taskQueue.shift();
      }
    } else taskQueue.shift();
    currentTask = taskQueue[0] || null;
  }
  return currentTask !== null;
}

const sharedConfig = {
  context: undefined,
  registry: undefined,
  effects: undefined,
  done: false,
  getContextId() {
    return getContextId(this.context.count);
  },
  getNextContextId() {
    return getContextId(this.context.count++);
  }
};
function getContextId(count) {
  const num = String(count),
    len = num.length - 1;
  return sharedConfig.context.id + (len ? String.fromCharCode(96 + len) : "") + num;
}
function setHydrateContext(context) {
  sharedConfig.context = context;
}
function nextHydrateContext() {
  return {
    ...sharedConfig.context,
    id: sharedConfig.getNextContextId(),
    count: 0
  };
}

const IS_DEV = false;
const equalFn = (a, b) => a === b;
const $PROXY = Symbol("solid-proxy");
const SUPPORTS_PROXY = typeof Proxy === "function";
const $TRACK = Symbol("solid-track");
const $DEVCOMP = Symbol("solid-dev-component");
const signalOptions = {
  equals: equalFn
};
let ERROR = null;
let runEffects = runQueue;
const STALE = 1;
const PENDING = 2;
const UNOWNED = {
  owned: null,
  cleanups: null,
  context: null,
  owner: null
};
const NO_INIT = {};
var Owner = null;
let Transition = null;
let Scheduler = null;
let ExternalSourceConfig = null;
let Listener = null;
let Updates = null;
let Effects = null;
let ExecCount = 0;
function createRoot(fn, detachedOwner) {
  const listener = Listener,
    owner = Owner,
    unowned = fn.length === 0,
    current = detachedOwner === undefined ? owner : detachedOwner,
    root = unowned
      ? UNOWNED
      : {
        owned: null,
        cleanups: null,
        context: current ? current.context : null,
        owner: current
      },
    updateFn = unowned ? fn : () => fn(() => untrack(() => cleanNode(root)));
  Owner = root;
  Listener = null;
  try {
    return runUpdates(updateFn, true);
  } finally {
    Listener = listener;
    Owner = owner;
  }
}
function createSignal(value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const s = {
    value,
    observers: null,
    observerSlots: null,
    comparator: options.equals || undefined
  };
  const setter = value => {
    if (typeof value === "function") {
      if (Transition && Transition.running && Transition.sources.has(s)) value = value(s.tValue);
      else value = value(s.value);
    }
    return writeSignal(s, value);
  };
  return [readSignal.bind(s), setter];
}
function createComputed(fn, value, options) {
  const c = createComputation(fn, value, true, STALE);
  if (Scheduler && Transition && Transition.running) Updates.push(c);
  else updateComputation(c);
}
function createRenderEffect(fn, value, options) {
  const c = createComputation(fn, value, false, STALE);
  if (Scheduler && Transition && Transition.running) Updates.push(c);
  else updateComputation(c);
}
function createEffect(fn, value, options) {
  runEffects = runUserEffects;
  const c = createComputation(fn, value, false, STALE),
    s = SuspenseContext && useContext(SuspenseContext);
  if (s) c.suspense = s;
  if (!options || !options.render) c.user = true;
  Effects ? Effects.push(c) : updateComputation(c);
}
function createReaction(onInvalidate, options) {
  let fn;
  const c = createComputation(
    () => {
      fn ? fn() : untrack(onInvalidate);
      fn = undefined;
    },
    undefined,
    false,
    0
  ),
    s = SuspenseContext && useContext(SuspenseContext);
  if (s) c.suspense = s;
  c.user = true;
  return tracking => {
    fn = tracking;
    updateComputation(c);
  };
}
function createMemo(fn, value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const c = createComputation(fn, value, true, 0);
  c.observers = null;
  c.observerSlots = null;
  c.comparator = options.equals || undefined;
  if (Scheduler && Transition && Transition.running) {
    c.tState = STALE;
    Updates.push(c);
  } else updateComputation(c);
  return readSignal.bind(c);
}
function isPromise(v) {
  return v && typeof v === "object" && "then" in v;
}
function createResource(pSource, pFetcher, pOptions) {
  let source;
  let fetcher;
  let options;
  if (typeof pFetcher === "function") {
    source = pSource;
    fetcher = pFetcher;
    options = pOptions || {};
  } else {
    source = true;
    fetcher = pSource;
    options = pFetcher || {};
  }
  let pr = null,
    initP = NO_INIT,
    id = null,
    loadedUnderTransition = false,
    scheduled = false,
    resolved = "initialValue" in options,
    dynamic = typeof source === "function" && createMemo(source);
  const contexts = new Set(),
    [value, setValue] = (options.storage || createSignal)(options.initialValue),
    [error, setError] = createSignal(undefined),
    [track, trigger] = createSignal(undefined, {
      equals: false
    }),
    [state, setState] = createSignal(resolved ? "ready" : "unresolved");
  if (sharedConfig.context) {
    id = sharedConfig.getNextContextId();
    if (options.ssrLoadFrom === "initial") initP = options.initialValue;
    else if (sharedConfig.load && sharedConfig.has(id)) initP = sharedConfig.load(id);
  }
  function loadEnd(p, v, error, key) {
    if (pr === p) {
      pr = null;
      key !== undefined && (resolved = true);
      if ((p === initP || v === initP) && options.onHydrated)
        queueMicrotask(() =>
          options.onHydrated(key, {
            value: v
          })
        );
      initP = NO_INIT;
      if (Transition && p && loadedUnderTransition) {
        Transition.promises.delete(p);
        loadedUnderTransition = false;
        runUpdates(() => {
          Transition.running = true;
          completeLoad(v, error);
        }, false);
      } else completeLoad(v, error);
    }
    return v;
  }
  function completeLoad(v, err) {
    runUpdates(() => {
      if (err === undefined) setValue(() => v);
      setState(err !== undefined ? "errored" : resolved ? "ready" : "unresolved");
      setError(err);
      for (const c of contexts.keys()) c.decrement();
      contexts.clear();
    }, false);
  }
  function read() {
    const c = SuspenseContext && useContext(SuspenseContext),
      v = value(),
      err = error();
    if (err !== undefined && !pr) throw err;
    if (Listener && !Listener.user && c) {
      createComputed(() => {
        track();
        if (pr) {
          if (c.resolved && Transition && loadedUnderTransition) Transition.promises.add(pr);
          else if (!contexts.has(c)) {
            c.increment();
            contexts.add(c);
          }
        }
      });
    }
    return v;
  }
  function load(refetching = true) {
    if (refetching !== false && scheduled) return;
    scheduled = false;
    const lookup = dynamic ? dynamic() : source;
    loadedUnderTransition = Transition && Transition.running;
    if (lookup == null || lookup === false) {
      loadEnd(pr, untrack(value));
      return;
    }
    if (Transition && pr) Transition.promises.delete(pr);
    const p =
      initP !== NO_INIT
        ? initP
        : untrack(() =>
          fetcher(lookup, {
            value: value(),
            refetching
          })
        );
    if (!isPromise(p)) {
      loadEnd(pr, p, undefined, lookup);
      return p;
    }
    pr = p;
    if ("value" in p) {
      if (p.status === "success") loadEnd(pr, p.value, undefined, lookup);
      else loadEnd(pr, undefined, castError(p.value), lookup);
      return p;
    }
    scheduled = true;
    queueMicrotask(() => (scheduled = false));
    runUpdates(() => {
      setState(resolved ? "refreshing" : "pending");
      trigger();
    }, false);
    return p.then(
      v => loadEnd(p, v, undefined, lookup),
      e => loadEnd(p, undefined, castError(e), lookup)
    );
  }
  Object.defineProperties(read, {
    state: {
      get: () => state()
    },
    error: {
      get: () => error()
    },
    loading: {
      get() {
        const s = state();
        return s === "pending" || s === "refreshing";
      }
    },
    latest: {
      get() {
        if (!resolved) return read();
        const err = error();
        if (err && !pr) throw err;
        return value();
      }
    }
  });
  if (dynamic) createComputed(() => load(false));
  else load(false);
  return [
    read,
    {
      refetch: load,
      mutate: setValue
    }
  ];
}
function createDeferred(source, options) {
  let t,
    timeout = options ? options.timeoutMs : undefined;
  const node = createComputation(
    () => {
      if (!t || !t.fn)
        t = requestCallback(
          () => setDeferred(() => node.value),
          timeout !== undefined
            ? {
              timeout
            }
            : undefined
        );
      return source();
    },
    undefined,
    true
  );
  const [deferred, setDeferred] = createSignal(
    Transition && Transition.running && Transition.sources.has(node) ? node.tValue : node.value,
    options
  );
  updateComputation(node);
  setDeferred(() =>
    Transition && Transition.running && Transition.sources.has(node) ? node.tValue : node.value
  );
  return deferred;
}
function createSelector(source, fn = equalFn, options) {
  const subs = new Map();
  const node = createComputation(
    p => {
      const v = source();
      for (const [key, val] of subs.entries())
        if (fn(key, v) !== fn(key, p)) {
          for (const c of val.values()) {
            c.state = STALE;
            if (c.pure) Updates.push(c);
            else Effects.push(c);
          }
        }
      return v;
    },
    undefined,
    true,
    STALE
  );
  updateComputation(node);
  return key => {
    const listener = Listener;
    if (listener) {
      let l;
      if ((l = subs.get(key))) l.add(listener);
      else subs.set(key, (l = new Set([listener])));
      onCleanup(() => {
        l.delete(listener);
        !l.size && subs.delete(key);
      });
    }
    return fn(
      key,
      Transition && Transition.running && Transition.sources.has(node) ? node.tValue : node.value
    );
  };
}
function batch(fn) {
  return runUpdates(fn, false);
}
function untrack(fn) {
  if (!ExternalSourceConfig && Listener === null) return fn();
  const listener = Listener;
  Listener = null;
  try {
    if (ExternalSourceConfig) return ExternalSourceConfig.untrack(fn);
    return fn();
  } finally {
    Listener = listener;
  }
}
function on(deps, fn, options) {
  const isArray = Array.isArray(deps);
  let prevInput;
  let defer = options && options.defer;
  return prevValue => {
    let input;
    if (isArray) {
      input = Array(deps.length);
      for (let i = 0; i < deps.length; i++) input[i] = deps[i]();
    } else input = deps();
    if (defer) {
      defer = false;
      return prevValue;
    }
    const result = untrack(() => fn(input, prevInput, prevValue));
    prevInput = input;
    return result;
  };
}
function onMount(fn) {
  createEffect(() => untrack(fn));
}
function onCleanup(fn) {
  if (Owner === null);
  else if (Owner.cleanups === null) Owner.cleanups = [fn];
  else Owner.cleanups.push(fn);
  return fn;
}
function catchError(fn, handler) {
  ERROR || (ERROR = Symbol("error"));
  Owner = createComputation(undefined, undefined, true);
  Owner.context = {
    ...Owner.context,
    [ERROR]: [handler]
  };
  if (Transition && Transition.running) Transition.sources.add(Owner);
  try {
    return fn();
  } catch (err) {
    handleError(err);
  } finally {
    Owner = Owner.owner;
  }
}
function getListener() {
  return Listener;
}
function getOwner() {
  return Owner;
}
function runWithOwner(o, fn) {
  const prev = Owner;
  const prevListener = Listener;
  Owner = o;
  Listener = null;
  try {
    return runUpdates(fn, true);
  } catch (err) {
    handleError(err);
  } finally {
    Owner = prev;
    Listener = prevListener;
  }
}
function enableScheduling(scheduler = requestCallback) {
  Scheduler = scheduler;
}
function startTransition(fn) {
  if (Transition && Transition.running) {
    fn();
    return Transition.done;
  }
  const l = Listener;
  const o = Owner;
  return Promise.resolve().then(() => {
    Listener = l;
    Owner = o;
    let t;
    if (Scheduler || SuspenseContext) {
      t =
        Transition ||
        (Transition = {
          sources: new Set(),
          effects: [],
          promises: new Set(),
          disposed: new Set(),
          queue: new Set(),
          running: true
        });
      t.done || (t.done = new Promise(res => (t.resolve = res)));
      t.running = true;
    }
    runUpdates(fn, false);
    Listener = Owner = null;
    return t ? t.done : undefined;
  });
}
const [transPending, setTransPending] = /*@__PURE__*/ createSignal(false);
function useTransition() {
  return [transPending, startTransition];
}
function resumeEffects(e) {
  Effects.push.apply(Effects, e);
  e.length = 0;
}
function createContext(defaultValue, options) {
  const id = Symbol("context");
  return {
    id,
    Provider: createProvider(id),
    defaultValue
  };
}
function useContext(context) {
  let value;
  return Owner && Owner.context && (value = Owner.context[context.id]) !== undefined
    ? value
    : context.defaultValue;
}
function children(fn) {
  const children = createMemo(fn);
  const memo = createMemo(() => resolveChildren(children()));
  memo.toArray = () => {
    const c = memo();
    return Array.isArray(c) ? c : c != null ? [c] : [];
  };
  return memo;
}
let SuspenseContext;
function getSuspenseContext() {
  return SuspenseContext || (SuspenseContext = createContext());
}
function enableExternalSource(factory, untrack = fn => fn()) {
  if (ExternalSourceConfig) {
    const { factory: oldFactory, untrack: oldUntrack } = ExternalSourceConfig;
    ExternalSourceConfig = {
      factory: (fn, trigger) => {
        const oldSource = oldFactory(fn, trigger);
        const source = factory(x => oldSource.track(x), trigger);
        return {
          track: x => source.track(x),
          dispose() {
            source.dispose();
            oldSource.dispose();
          }
        };
      },
      untrack: fn => oldUntrack(() => untrack(fn))
    };
  } else {
    ExternalSourceConfig = {
      factory,
      untrack
    };
  }
}
function readSignal() {
  const runningTransition = Transition && Transition.running;
  if (this.sources && (runningTransition ? this.tState : this.state)) {
    if ((runningTransition ? this.tState : this.state) === STALE) updateComputation(this);
    else {
      const updates = Updates;
      Updates = null;
      runUpdates(() => lookUpstream(this), false);
      Updates = updates;
    }
  }
  if (Listener) {
    const sSlot = this.observers ? this.observers.length : 0;
    if (!Listener.sources) {
      Listener.sources = [this];
      Listener.sourceSlots = [sSlot];
    } else {
      Listener.sources.push(this);
      Listener.sourceSlots.push(sSlot);
    }
    if (!this.observers) {
      this.observers = [Listener];
      this.observerSlots = [Listener.sources.length - 1];
    } else {
      this.observers.push(Listener);
      this.observerSlots.push(Listener.sources.length - 1);
    }
  }
  if (runningTransition && Transition.sources.has(this)) return this.tValue;
  return this.value;
}
function writeSignal(node, value, isComp) {
  let current =
    Transition && Transition.running && Transition.sources.has(node) ? node.tValue : node.value;
  if (!node.comparator || !node.comparator(current, value)) {
    if (Transition) {
      const TransitionRunning = Transition.running;
      if (TransitionRunning || (!isComp && Transition.sources.has(node))) {
        Transition.sources.add(node);
        node.tValue = value;
      }
      if (!TransitionRunning) node.value = value;
    } else node.value = value;
    if (node.observers && node.observers.length) {
      runUpdates(() => {
        for (let i = 0; i < node.observers.length; i += 1) {
          const o = node.observers[i];
          const TransitionRunning = Transition && Transition.running;
          if (TransitionRunning && Transition.disposed.has(o)) continue;
          if (TransitionRunning ? !o.tState : !o.state) {
            if (o.pure) Updates.push(o);
            else Effects.push(o);
            if (o.observers) markDownstream(o);
          }
          if (!TransitionRunning) o.state = STALE;
          else o.tState = STALE;
        }
        if (Updates.length > 10e5) {
          Updates = [];
          if (IS_DEV);
          throw new Error();
        }
      }, false);
    }
  }
  return value;
}
function updateComputation(node) {
  if (!node.fn) return;
  cleanNode(node);
  const time = ExecCount;
  runComputation(
    node,
    Transition && Transition.running && Transition.sources.has(node) ? node.tValue : node.value,
    time
  );
  if (Transition && !Transition.running && Transition.sources.has(node)) {
    queueMicrotask(() => {
      runUpdates(() => {
        Transition && (Transition.running = true);
        Listener = Owner = node;
        runComputation(node, node.tValue, time);
        Listener = Owner = null;
      }, false);
    });
  }
}
function runComputation(node, value, time) {
  let nextValue;
  const owner = Owner,
    listener = Listener;
  Listener = Owner = node;
  try {
    nextValue = node.fn(value);
  } catch (err) {
    if (node.pure) {
      if (Transition && Transition.running) {
        node.tState = STALE;
        node.tOwned && node.tOwned.forEach(cleanNode);
        node.tOwned = undefined;
      } else {
        node.state = STALE;
        node.owned && node.owned.forEach(cleanNode);
        node.owned = null;
      }
    }
    node.updatedAt = time + 1;
    return handleError(err);
  } finally {
    Listener = listener;
    Owner = owner;
  }
  if (!node.updatedAt || node.updatedAt <= time) {
    if (node.updatedAt != null && "observers" in node) {
      writeSignal(node, nextValue, true);
    } else if (Transition && Transition.running && node.pure) {
      Transition.sources.add(node);
      node.tValue = nextValue;
    } else node.value = nextValue;
    node.updatedAt = time;
  }
}
function createComputation(fn, init, pure, state = STALE, options) {
  const c = {
    fn,
    state: state,
    updatedAt: null,
    owned: null,
    sources: null,
    sourceSlots: null,
    cleanups: null,
    value: init,
    owner: Owner,
    context: Owner ? Owner.context : null,
    pure
  };
  if (Transition && Transition.running) {
    c.state = 0;
    c.tState = state;
  }
  if (Owner === null);
  else if (Owner !== UNOWNED) {
    if (Transition && Transition.running && Owner.pure) {
      if (!Owner.tOwned) Owner.tOwned = [c];
      else Owner.tOwned.push(c);
    } else {
      if (!Owner.owned) Owner.owned = [c];
      else Owner.owned.push(c);
    }
  }
  if (ExternalSourceConfig && c.fn) {
    const [track, trigger] = createSignal(undefined, {
      equals: false
    });
    const ordinary = ExternalSourceConfig.factory(c.fn, trigger);
    onCleanup(() => ordinary.dispose());
    const triggerInTransition = () => startTransition(trigger).then(() => inTransition.dispose());
    const inTransition = ExternalSourceConfig.factory(c.fn, triggerInTransition);
    c.fn = x => {
      track();
      return Transition && Transition.running ? inTransition.track(x) : ordinary.track(x);
    };
  }
  return c;
}
function runTop(node) {
  const runningTransition = Transition && Transition.running;
  if ((runningTransition ? node.tState : node.state) === 0) return;
  if ((runningTransition ? node.tState : node.state) === PENDING) return lookUpstream(node);
  if (node.suspense && untrack(node.suspense.inFallback)) return node.suspense.effects.push(node);
  const ancestors = [node];
  while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
    if (runningTransition && Transition.disposed.has(node)) return;
    if (runningTransition ? node.tState : node.state) ancestors.push(node);
  }
  for (let i = ancestors.length - 1; i >= 0; i--) {
    node = ancestors[i];
    if (runningTransition) {
      let top = node,
        prev = ancestors[i + 1];
      while ((top = top.owner) && top !== prev) {
        if (Transition.disposed.has(top)) return;
      }
    }
    if ((runningTransition ? node.tState : node.state) === STALE) {
      updateComputation(node);
    } else if ((runningTransition ? node.tState : node.state) === PENDING) {
      const updates = Updates;
      Updates = null;
      runUpdates(() => lookUpstream(node, ancestors[0]), false);
      Updates = updates;
    }
  }
}
function runUpdates(fn, init) {
  if (Updates) return fn();
  let wait = false;
  if (!init) Updates = [];
  if (Effects) wait = true;
  else Effects = [];
  ExecCount++;
  try {
    const res = fn();
    completeUpdates(wait);
    return res;
  } catch (err) {
    if (!wait) Effects = null;
    Updates = null;
    handleError(err);
  }
}
function completeUpdates(wait) {
  if (Updates) {
    if (Scheduler && Transition && Transition.running) scheduleQueue(Updates);
    else runQueue(Updates);
    Updates = null;
  }
  if (wait) return;
  let res;
  if (Transition) {
    if (!Transition.promises.size && !Transition.queue.size) {
      const sources = Transition.sources;
      const disposed = Transition.disposed;
      Effects.push.apply(Effects, Transition.effects);
      res = Transition.resolve;
      for (const e of Effects) {
        "tState" in e && (e.state = e.tState);
        delete e.tState;
      }
      Transition = null;
      runUpdates(() => {
        for (const d of disposed) cleanNode(d);
        for (const v of sources) {
          v.value = v.tValue;
          if (v.owned) {
            for (let i = 0, len = v.owned.length; i < len; i++) cleanNode(v.owned[i]);
          }
          if (v.tOwned) v.owned = v.tOwned;
          delete v.tValue;
          delete v.tOwned;
          v.tState = 0;
        }
        setTransPending(false);
      }, false);
    } else if (Transition.running) {
      Transition.running = false;
      Transition.effects.push.apply(Transition.effects, Effects);
      Effects = null;
      setTransPending(true);
      return;
    }
  }
  const e = Effects;
  Effects = null;
  if (e.length) runUpdates(() => runEffects(e), false);
  if (res) res();
}
function runQueue(queue) {
  for (let i = 0; i < queue.length; i++) runTop(queue[i]);
}
function scheduleQueue(queue) {
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const tasks = Transition.queue;
    if (!tasks.has(item)) {
      tasks.add(item);
      Scheduler(() => {
        tasks.delete(item);
        runUpdates(() => {
          Transition.running = true;
          runTop(item);
        }, false);
        Transition && (Transition.running = false);
      });
    }
  }
}
function runUserEffects(queue) {
  let i,
    userLength = 0;
  for (i = 0; i < queue.length; i++) {
    const e = queue[i];
    if (!e.user) runTop(e);
    else queue[userLength++] = e;
  }
  if (sharedConfig.context) {
    if (sharedConfig.count) {
      sharedConfig.effects || (sharedConfig.effects = []);
      sharedConfig.effects.push(...queue.slice(0, userLength));
      return;
    }
    setHydrateContext();
  }
  if (sharedConfig.effects && (sharedConfig.done || !sharedConfig.count)) {
    queue = [...sharedConfig.effects, ...queue];
    userLength += sharedConfig.effects.length;
    delete sharedConfig.effects;
  }
  for (i = 0; i < userLength; i++) runTop(queue[i]);
}
function lookUpstream(node, ignore) {
  const runningTransition = Transition && Transition.running;
  if (runningTransition) node.tState = 0;
  else node.state = 0;
  for (let i = 0; i < node.sources.length; i += 1) {
    const source = node.sources[i];
    if (source.sources) {
      const state = runningTransition ? source.tState : source.state;
      if (state === STALE) {
        if (source !== ignore && (!source.updatedAt || source.updatedAt < ExecCount))
          runTop(source);
      } else if (state === PENDING) lookUpstream(source, ignore);
    }
  }
}
function markDownstream(node) {
  const runningTransition = Transition && Transition.running;
  for (let i = 0; i < node.observers.length; i += 1) {
    const o = node.observers[i];
    if (runningTransition ? !o.tState : !o.state) {
      if (runningTransition) o.tState = PENDING;
      else o.state = PENDING;
      if (o.pure) Updates.push(o);
      else Effects.push(o);
      o.observers && markDownstream(o);
    }
  }
}
function cleanNode(node) {
  let i;
  if (node.sources) {
    while (node.sources.length) {
      const source = node.sources.pop(),
        index = node.sourceSlots.pop(),
        obs = source.observers;
      if (obs && obs.length) {
        const n = obs.pop(),
          s = source.observerSlots.pop();
        if (index < obs.length) {
          n.sourceSlots[s] = index;
          obs[index] = n;
          source.observerSlots[index] = s;
        }
      }
    }
  }
  if (node.tOwned) {
    for (i = node.tOwned.length - 1; i >= 0; i--) cleanNode(node.tOwned[i]);
    delete node.tOwned;
  }
  if (Transition && Transition.running && node.pure) {
    reset(node, true);
  } else if (node.owned) {
    for (i = node.owned.length - 1; i >= 0; i--) cleanNode(node.owned[i]);
    node.owned = null;
  }
  if (node.cleanups) {
    for (i = node.cleanups.length - 1; i >= 0; i--) node.cleanups[i]();
    node.cleanups = null;
  }
  if (Transition && Transition.running) node.tState = 0;
  else node.state = 0;
}
function reset(node, top) {
  if (!top) {
    node.tState = 0;
    Transition.disposed.add(node);
  }
  if (node.owned) {
    for (let i = 0; i < node.owned.length; i++) reset(node.owned[i]);
  }
}
function castError(err) {
  if (err instanceof Error) return err;
  return new Error(typeof err === "string" ? err : "Unknown error", {
    cause: err
  });
}
function runErrors(err, fns, owner) {
  try {
    for (const f of fns) f(err);
  } catch (e) {
    handleError(e, (owner && owner.owner) || null);
  }
}
function handleError(err, owner = Owner) {
  const fns = ERROR && owner && owner.context && owner.context[ERROR];
  const error = castError(err);
  if (!fns) throw error;
  if (Effects)
    Effects.push({
      fn() {
        runErrors(error, fns, owner);
      },
      state: STALE
    });
  else runErrors(error, fns, owner);
}
function resolveChildren(children) {
  if (typeof children === "function" && !children.length) return resolveChildren(children());
  if (Array.isArray(children)) {
    const results = [];
    for (let i = 0; i < children.length; i++) {
      const result = resolveChildren(children[i]);
      Array.isArray(result) ? results.push.apply(results, result) : results.push(result);
    }
    return results;
  }
  return children;
}
function createProvider(id, options) {
  return function provider(props) {
    let res;
    createRenderEffect(
      () =>
      (res = untrack(() => {
        Owner.context = {
          ...Owner.context,
          [id]: props.value
        };
        return children(() => props.children);
      })),
      undefined
    );
    return res;
  };
}
function onError(fn) {
  ERROR || (ERROR = Symbol("error"));
  if (Owner === null);
  else if (Owner.context === null || !Owner.context[ERROR]) {
    Owner.context = {
      ...Owner.context,
      [ERROR]: [fn]
    };
    mutateContext(Owner, ERROR, [fn]);
  } else Owner.context[ERROR].push(fn);
}
function mutateContext(o, key, value) {
  if (o.owned) {
    for (let i = 0; i < o.owned.length; i++) {
      if (o.owned[i].context === o.context) mutateContext(o.owned[i], key, value);
      if (!o.owned[i].context) {
        o.owned[i].context = o.context;
        mutateContext(o.owned[i], key, value);
      } else if (!o.owned[i].context[key]) {
        o.owned[i].context[key] = value;
        mutateContext(o.owned[i], key, value);
      }
    }
  }
}

function observable(input) {
  return {
    subscribe(observer) {
      if (!(observer instanceof Object) || observer == null) {
        throw new TypeError("Expected the observer to be an object.");
      }
      const handler =
        typeof observer === "function" ? observer : observer.next && observer.next.bind(observer);
      if (!handler) {
        return {
          unsubscribe() {}
        };
      }
      const dispose = createRoot(disposer => {
        createEffect(() => {
          const v = input();
          untrack(() => handler(v));
        });
        return disposer;
      });
      if (getOwner()) onCleanup(dispose);
      return {
        unsubscribe() {
          dispose();
        }
      };
    },
    [Symbol.observable || "@@observable"]() {
      return this;
    }
  };
}
function from(producer, initalValue = undefined) {
  const [s, set] = createSignal(initalValue, {
    equals: false
  });
  if ("subscribe" in producer) {
    const unsub = producer.subscribe(v => set(() => v));
    onCleanup(() => ("unsubscribe" in unsub ? unsub.unsubscribe() : unsub()));
  } else {
    const clean = producer(set);
    onCleanup(clean);
  }
  return s;
}

const FALLBACK = Symbol("fallback");
function dispose(d) {
  for (let i = 0; i < d.length; i++) d[i]();
}
function mapArray(list, mapFn, options = {}) {
  let items = [],
    mapped = [],
    disposers = [],
    len = 0,
    indexes = mapFn.length > 1 ? [] : null;
  onCleanup(() => dispose(disposers));
  return () => {
    let newItems = list() || [],
      newLen = newItems.length,
      i,
      j;
    newItems[$TRACK];
    return untrack(() => {
      let newIndices, newIndicesNext, temp, tempdisposers, tempIndexes, start, end, newEnd, item;
      if (newLen === 0) {
        if (len !== 0) {
          dispose(disposers);
          disposers = [];
          items = [];
          mapped = [];
          len = 0;
          indexes && (indexes = []);
        }
        if (options.fallback) {
          items = [FALLBACK];
          mapped[0] = createRoot(disposer => {
            disposers[0] = disposer;
            return options.fallback();
          });
          len = 1;
        }
      } else if (len === 0) {
        mapped = new Array(newLen);
        for (j = 0; j < newLen; j++) {
          items[j] = newItems[j];
          mapped[j] = createRoot(mapper);
        }
        len = newLen;
      } else {
        temp = new Array(newLen);
        tempdisposers = new Array(newLen);
        indexes && (tempIndexes = new Array(newLen));
        for (
          start = 0, end = Math.min(len, newLen);
          start < end && items[start] === newItems[start];
          start++
        );
        for (
          end = len - 1, newEnd = newLen - 1;
          end >= start && newEnd >= start && items[end] === newItems[newEnd];
          end--, newEnd--
        ) {
          temp[newEnd] = mapped[end];
          tempdisposers[newEnd] = disposers[end];
          indexes && (tempIndexes[newEnd] = indexes[end]);
        }
        newIndices = new Map();
        newIndicesNext = new Array(newEnd + 1);
        for (j = newEnd; j >= start; j--) {
          item = newItems[j];
          i = newIndices.get(item);
          newIndicesNext[j] = i === undefined ? -1 : i;
          newIndices.set(item, j);
        }
        for (i = start; i <= end; i++) {
          item = items[i];
          j = newIndices.get(item);
          if (j !== undefined && j !== -1) {
            temp[j] = mapped[i];
            tempdisposers[j] = disposers[i];
            indexes && (tempIndexes[j] = indexes[i]);
            j = newIndicesNext[j];
            newIndices.set(item, j);
          } else disposers[i]();
        }
        for (j = start; j < newLen; j++) {
          if (j in temp) {
            mapped[j] = temp[j];
            disposers[j] = tempdisposers[j];
            if (indexes) {
              indexes[j] = tempIndexes[j];
              indexes[j](j);
            }
          } else mapped[j] = createRoot(mapper);
        }
        mapped = mapped.slice(0, (len = newLen));
        items = newItems.slice(0);
      }
      return mapped;
    });
    function mapper(disposer) {
      disposers[j] = disposer;
      if (indexes) {
        const [s, set] = createSignal(j);
        indexes[j] = set;
        return mapFn(newItems[j], s);
      }
      return mapFn(newItems[j]);
    }
  };
}
function indexArray(list, mapFn, options = {}) {
  let items = [],
    mapped = [],
    disposers = [],
    signals = [],
    len = 0,
    i;
  onCleanup(() => dispose(disposers));
  return () => {
    const newItems = list() || [],
      newLen = newItems.length;
    newItems[$TRACK];
    return untrack(() => {
      if (newLen === 0) {
        if (len !== 0) {
          dispose(disposers);
          disposers = [];
          items = [];
          mapped = [];
          len = 0;
          signals = [];
        }
        if (options.fallback) {
          items = [FALLBACK];
          mapped[0] = createRoot(disposer => {
            disposers[0] = disposer;
            return options.fallback();
          });
          len = 1;
        }
        return mapped;
      }
      if (items[0] === FALLBACK) {
        disposers[0]();
        disposers = [];
        items = [];
        mapped = [];
        len = 0;
      }
      for (i = 0; i < newLen; i++) {
        if (i < items.length && items[i] !== newItems[i]) {
          signals[i](() => newItems[i]);
        } else if (i >= items.length) {
          mapped[i] = createRoot(mapper);
        }
      }
      for (; i < items.length; i++) {
        disposers[i]();
      }
      len = signals.length = disposers.length = newLen;
      items = newItems.slice(0);
      return (mapped = mapped.slice(0, len));
    });
    function mapper(disposer) {
      disposers[i] = disposer;
      const [s, set] = createSignal(newItems[i]);
      signals[i] = set;
      return mapFn(s, i);
    }
  };
}

let hydrationEnabled = false;
function enableHydration() {
  hydrationEnabled = true;
}
function createComponent(Comp, props) {
  if (hydrationEnabled) {
    if (sharedConfig.context) {
      const c = sharedConfig.context;
      setHydrateContext(nextHydrateContext());
      const r = untrack(() => Comp(props || {}));
      setHydrateContext(c);
      return r;
    }
  }
  return untrack(() => Comp(props || {}));
}
function trueFn() {
  return true;
}
const propTraps = {
  get(_, property, receiver) {
    if (property === $PROXY) return receiver;
    return _.get(property);
  },
  has(_, property) {
    if (property === $PROXY) return true;
    return _.has(property);
  },
  set: trueFn,
  deleteProperty: trueFn,
  getOwnPropertyDescriptor(_, property) {
    return {
      configurable: true,
      enumerable: true,
      get() {
        return _.get(property);
      },
      set: trueFn,
      deleteProperty: trueFn
    };
  },
  ownKeys(_) {
    return _.keys();
  }
};
function resolveSource(s) {
  return !(s = typeof s === "function" ? s() : s) ? {} : s;
}
function resolveSources() {
  for (let i = 0, length = this.length; i < length; ++i) {
    const v = this[i]();
    if (v !== undefined) return v;
  }
}
function mergeProps(...sources) {
  let proxy = false;
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    proxy = proxy || (!!s && $PROXY in s);
    sources[i] = typeof s === "function" ? ((proxy = true), createMemo(s)) : s;
  }
  if (SUPPORTS_PROXY && proxy) {
    return new Proxy(
      {
        get(property) {
          for (let i = sources.length - 1; i >= 0; i--) {
            const v = resolveSource(sources[i])[property];
            if (v !== undefined) return v;
          }
        },
        has(property) {
          for (let i = sources.length - 1; i >= 0; i--) {
            if (property in resolveSource(sources[i])) return true;
          }
          return false;
        },
        keys() {
          const keys = [];
          for (let i = 0; i < sources.length; i++)
            keys.push(...Object.keys(resolveSource(sources[i])));
          return [...new Set(keys)];
        }
      },
      propTraps
    );
  }
  const sourcesMap = {};
  const defined = Object.create(null);
  for (let i = sources.length - 1; i >= 0; i--) {
    const source = sources[i];
    if (!source) continue;
    const sourceKeys = Object.getOwnPropertyNames(source);
    for (let i = sourceKeys.length - 1; i >= 0; i--) {
      const key = sourceKeys[i];
      if (key === "__proto__" || key === "constructor") continue;
      const desc = Object.getOwnPropertyDescriptor(source, key);
      if (!defined[key]) {
        defined[key] = desc.get
          ? {
            enumerable: true,
            configurable: true,
            get: resolveSources.bind((sourcesMap[key] = [desc.get.bind(source)]))
          }
          : desc.value !== undefined
            ? desc
            : undefined;
      } else {
        const sources = sourcesMap[key];
        if (sources) {
          if (desc.get) sources.push(desc.get.bind(source));
          else if (desc.value !== undefined) sources.push(() => desc.value);
        }
      }
    }
  }
  const target = {};
  const definedKeys = Object.keys(defined);
  for (let i = definedKeys.length - 1; i >= 0; i--) {
    const key = definedKeys[i],
      desc = defined[key];
    if (desc && desc.get) Object.defineProperty(target, key, desc);
    else target[key] = desc ? desc.value : undefined;
  }
  return target;
}
function splitProps(props, ...keys) {
  if (SUPPORTS_PROXY && $PROXY in props) {
    const blocked = new Set(keys.length > 1 ? keys.flat() : keys[0]);
    const res = keys.map(k => {
      return new Proxy(
        {
          get(property) {
            return k.includes(property) ? props[property] : undefined;
          },
          has(property) {
            return k.includes(property) && property in props;
          },
          keys() {
            return k.filter(property => property in props);
          }
        },
        propTraps
      );
    });
    res.push(
      new Proxy(
        {
          get(property) {
            return blocked.has(property) ? undefined : props[property];
          },
          has(property) {
            return blocked.has(property) ? false : property in props;
          },
          keys() {
            return Object.keys(props).filter(k => !blocked.has(k));
          }
        },
        propTraps
      )
    );
    return res;
  }
  const otherObject = {};
  const objects = keys.map(() => ({}));
  for (const propName of Object.getOwnPropertyNames(props)) {
    const desc = Object.getOwnPropertyDescriptor(props, propName);
    const isDefaultDesc =
      !desc.get && !desc.set && desc.enumerable && desc.writable && desc.configurable;
    let blocked = false;
    let objectIndex = 0;
    for (const k of keys) {
      if (k.includes(propName)) {
        blocked = true;
        isDefaultDesc
          ? (objects[objectIndex][propName] = desc.value)
          : Object.defineProperty(objects[objectIndex], propName, desc);
      }
      ++objectIndex;
    }
    if (!blocked) {
      isDefaultDesc
        ? (otherObject[propName] = desc.value)
        : Object.defineProperty(otherObject, propName, desc);
    }
  }
  return [...objects, otherObject];
}
function lazy(fn) {
  let comp;
  let p;
  const wrap = props => {
    const ctx = sharedConfig.context;
    if (ctx) {
      const [s, set] = createSignal();
      sharedConfig.count || (sharedConfig.count = 0);
      sharedConfig.count++;
      (p || (p = fn())).then(mod => {
        !sharedConfig.done && setHydrateContext(ctx);
        sharedConfig.count--;
        set(() => mod.default);
        setHydrateContext();
      });
      comp = s;
    } else if (!comp) {
      const [s] = createResource(() => (p || (p = fn())).then(mod => mod.default));
      comp = s;
    }
    let Comp;
    return createMemo(() =>
      (Comp = comp())
        ? untrack(() => {
          if (IS_DEV);
          if (!ctx || sharedConfig.done) return Comp(props);
          const c = sharedConfig.context;
          setHydrateContext(ctx);
          const r = Comp(props);
          setHydrateContext(c);
          return r;
        })
        : ""
    );
  };
  wrap.preload = () => p || ((p = fn()).then(mod => (comp = () => mod.default)), p);
  return wrap;
}
let counter = 0;
function createUniqueId() {
  const ctx = sharedConfig.context;
  return ctx ? sharedConfig.getNextContextId() : `cl-${counter++}`;
}

const narrowedError = name => `Stale read from <${name}>.`;
function For(props) {
  const fallback = "fallback" in props && {
    fallback: () => props.fallback
  };
  return createMemo(mapArray(() => props.each, props.children, fallback || undefined));
}
function Index(props) {
  const fallback = "fallback" in props && {
    fallback: () => props.fallback
  };
  return createMemo(indexArray(() => props.each, props.children, fallback || undefined));
}
function Show(props) {
  const keyed = props.keyed;
  const conditionValue = createMemo(() => props.when, undefined, undefined);
  const condition = keyed
    ? conditionValue
    : createMemo(conditionValue, undefined, {
      equals: (a, b) => !a === !b
    });
  return createMemo(
    () => {
      const c = condition();
      if (c) {
        const child = props.children;
        const fn = typeof child === "function" && child.length > 0;
        return fn
          ? untrack(() =>
            child(
              keyed
                ? c
                : () => {
                  if (!untrack(condition)) throw narrowedError("Show");
                  return conditionValue();
                }
            )
          )
          : child;
      }
      return props.fallback;
    },
    undefined,
    undefined
  );
}
function Switch(props) {
  const chs = children(() => props.children);
  const switchFunc = createMemo(() => {
    const ch = chs();
    const mps = Array.isArray(ch) ? ch : [ch];
    let func = () => undefined;
    for (let i = 0; i < mps.length; i++) {
      const index = i;
      const mp = mps[i];
      const prevFunc = func;
      const conditionValue = createMemo(
        () => (prevFunc() ? undefined : mp.when),
        undefined,
        undefined
      );
      const condition = mp.keyed
        ? conditionValue
        : createMemo(conditionValue, undefined, {
          equals: (a, b) => !a === !b
        });
      func = () => prevFunc() || (condition() ? [index, conditionValue, mp] : undefined);
    }
    return func;
  });
  return createMemo(
    () => {
      const sel = switchFunc()();
      if (!sel) return props.fallback;
      const [index, conditionValue, mp] = sel;
      const child = mp.children;
      const fn = typeof child === "function" && child.length > 0;
      return fn
        ? untrack(() =>
          child(
            mp.keyed
              ? conditionValue()
              : () => {
                if (untrack(switchFunc)()?.[0] !== index) throw narrowedError("Match");
                return conditionValue();
              }
          )
        )
        : child;
    },
    undefined,
    undefined
  );
}
function Match(props) {
  return props;
}
let Errors;
function resetErrorBoundaries() {
  Errors && [...Errors].forEach(fn => fn());
}
function ErrorBoundary(props) {
  let err;
  if (sharedConfig.context && sharedConfig.load)
    err = sharedConfig.load(sharedConfig.getContextId());
  const [errored, setErrored] = createSignal(err, undefined);
  Errors || (Errors = new Set());
  Errors.add(setErrored);
  onCleanup(() => Errors.delete(setErrored));
  return createMemo(
    () => {
      let e;
      if ((e = errored())) {
        const f = props.fallback;
        return typeof f === "function" && f.length ? untrack(() => f(e, () => setErrored())) : f;
      }
      return catchError(() => props.children, setErrored);
    },
    undefined,
    undefined
  );
}

const suspenseListEquals = (a, b) =>
  a.showContent === b.showContent && a.showFallback === b.showFallback;
const SuspenseListContext = /* #__PURE__ */ createContext();
function SuspenseList(props) {
  let [wrapper, setWrapper] = createSignal(() => ({
    inFallback: false
  })),
    show;
  const listContext = useContext(SuspenseListContext);
  const [registry, setRegistry] = createSignal([]);
  if (listContext) {
    show = listContext.register(createMemo(() => wrapper()().inFallback));
  }
  const resolved = createMemo(
    prev => {
      const reveal = props.revealOrder,
        tail = props.tail,
        { showContent = true, showFallback = true } = show ? show() : {},
        reg = registry(),
        reverse = reveal === "backwards";
      if (reveal === "together") {
        const all = reg.every(inFallback => !inFallback());
        const res = reg.map(() => ({
          showContent: all && showContent,
          showFallback
        }));
        res.inFallback = !all;
        return res;
      }
      let stop = false;
      let inFallback = prev.inFallback;
      const res = [];
      for (let i = 0, len = reg.length; i < len; i++) {
        const n = reverse ? len - i - 1 : i,
          s = reg[n]();
        if (!stop && !s) {
          res[n] = {
            showContent,
            showFallback
          };
        } else {
          const next = !stop;
          if (next) inFallback = true;
          res[n] = {
            showContent: next,
            showFallback: !tail || (next && tail === "collapsed") ? showFallback : false
          };
          stop = true;
        }
      }
      if (!stop) inFallback = false;
      res.inFallback = inFallback;
      return res;
    },
    {
      inFallback: false
    }
  );
  setWrapper(() => resolved);
  return createComponent(SuspenseListContext.Provider, {
    value: {
      register: inFallback => {
        let index;
        setRegistry(registry => {
          index = registry.length;
          return [...registry, inFallback];
        });
        return createMemo(() => resolved()[index], undefined, {
          equals: suspenseListEquals
        });
      }
    },
    get children() {
      return props.children;
    }
  });
}
function Suspense(props) {
  let counter = 0,
    show,
    ctx,
    p,
    flicker,
    error;
  const [inFallback, setFallback] = createSignal(false),
    SuspenseContext = getSuspenseContext(),
    store = {
      increment: () => {
        if (++counter === 1) setFallback(true);
      },
      decrement: () => {
        if (--counter === 0) setFallback(false);
      },
      inFallback,
      effects: [],
      resolved: false
    },
    owner = getOwner();
  if (sharedConfig.context && sharedConfig.load) {
    const key = sharedConfig.getContextId();
    let ref = sharedConfig.load(key);
    if (ref) {
      if (typeof ref !== "object" || ref.status !== "success") p = ref;
      else sharedConfig.gather(key);
    }
    if (p && p !== "$$f") {
      const [s, set] = createSignal(undefined, {
        equals: false
      });
      flicker = s;
      p.then(
        () => {
          if (sharedConfig.done) return set();
          sharedConfig.gather(key);
          setHydrateContext(ctx);
          set();
          setHydrateContext();
        },
        err => {
          error = err;
          set();
        }
      );
    }
  }
  const listContext = useContext(SuspenseListContext);
  if (listContext) show = listContext.register(store.inFallback);
  let dispose;
  onCleanup(() => dispose && dispose());
  return createComponent(SuspenseContext.Provider, {
    value: store,
    get children() {
      return createMemo(() => {
        if (error) throw error;
        ctx = sharedConfig.context;
        if (flicker) {
          flicker();
          return (flicker = undefined);
        }
        if (ctx && p === "$$f") setHydrateContext();
        const rendered = createMemo(() => props.children);
        return createMemo(prev => {
          const inFallback = store.inFallback(),
            { showContent = true, showFallback = true } = show ? show() : {};
          if ((!inFallback || (p && p !== "$$f")) && showContent) {
            store.resolved = true;
            dispose && dispose();
            dispose = ctx = p = undefined;
            resumeEffects(store.effects);
            return rendered();
          }
          if (!showFallback) return;
          if (dispose) return prev;
          return createRoot(disposer => {
            dispose = disposer;
            if (ctx) {
              setHydrateContext({
                id: ctx.id + "F",
                count: 0
              });
              ctx = undefined;
            }
            return props.fallback;
          }, owner);
        });
      });
    }
  });
}

const DEV$1 = undefined;

const booleans = [
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "disabled",
  "formnovalidate",
  "hidden",
  "indeterminate",
  "inert",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "seamless",
  "selected"
];
const Properties = /*#__PURE__*/ new Set([
  "className",
  "value",
  "readOnly",
  "formNoValidate",
  "isMap",
  "noModule",
  "playsInline",
  ...booleans
]);
const ChildProperties = /*#__PURE__*/ new Set([
  "innerHTML",
  "textContent",
  "innerText",
  "children"
]);
const Aliases = /*#__PURE__*/ Object.assign(Object.create(null), {
  className: "class",
  htmlFor: "for"
});
const PropAliases = /*#__PURE__*/ Object.assign(Object.create(null), {
  class: "className",
  formnovalidate: {
    $: "formNoValidate",
    BUTTON: 1,
    INPUT: 1
  },
  ismap: {
    $: "isMap",
    IMG: 1
  },
  nomodule: {
    $: "noModule",
    SCRIPT: 1
  },
  playsinline: {
    $: "playsInline",
    VIDEO: 1
  },
  readonly: {
    $: "readOnly",
    INPUT: 1,
    TEXTAREA: 1
  }
});
function getPropAlias(prop, tagName) {
  const a = PropAliases[prop];
  return typeof a === "object" ? (a[tagName] ? a["$"] : undefined) : a;
}
const DelegatedEvents = /*#__PURE__*/ new Set([
  "beforeinput",
  "click",
  "dblclick",
  "contextmenu",
  "focusin",
  "focusout",
  "input",
  "keydown",
  "keyup",
  "mousedown",
  "mousemove",
  "mouseout",
  "mouseover",
  "mouseup",
  "pointerdown",
  "pointermove",
  "pointerout",
  "pointerover",
  "pointerup",
  "touchend",
  "touchmove",
  "touchstart"
]);
const SVGElements = /*#__PURE__*/ new Set([
  "altGlyph",
  "altGlyphDef",
  "altGlyphItem",
  "animate",
  "animateColor",
  "animateMotion",
  "animateTransform",
  "circle",
  "clipPath",
  "color-profile",
  "cursor",
  "defs",
  "desc",
  "ellipse",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "filter",
  "font",
  "font-face",
  "font-face-format",
  "font-face-name",
  "font-face-src",
  "font-face-uri",
  "foreignObject",
  "g",
  "glyph",
  "glyphRef",
  "hkern",
  "image",
  "line",
  "linearGradient",
  "marker",
  "mask",
  "metadata",
  "missing-glyph",
  "mpath",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "set",
  "stop",
  "svg",
  "switch",
  "symbol",
  "text",
  "textPath",
  "tref",
  "tspan",
  "use",
  "view",
  "vkern"
]);
const SVGNamespace = {
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace"
};
const DOMElements = /*#__PURE__*/ new Set([
  "html",
  "base",
  "head",
  "link",
  "meta",
  "style",
  "title",
  "body",
  "address",
  "article",
  "aside",
  "footer",
  "header",
  "main",
  "nav",
  "section",
  "body",
  "blockquote",
  "dd",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "hr",
  "li",
  "ol",
  "p",
  "pre",
  "ul",
  "a",
  "abbr",
  "b",
  "bdi",
  "bdo",
  "br",
  "cite",
  "code",
  "data",
  "dfn",
  "em",
  "i",
  "kbd",
  "mark",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "time",
  "u",
  "var",
  "wbr",
  "area",
  "audio",
  "img",
  "map",
  "track",
  "video",
  "embed",
  "iframe",
  "object",
  "param",
  "picture",
  "portal",
  "source",
  "svg",
  "math",
  "canvas",
  "noscript",
  "script",
  "del",
  "ins",
  "caption",
  "col",
  "colgroup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "button",
  "datalist",
  "fieldset",
  "form",
  "input",
  "label",
  "legend",
  "meter",
  "optgroup",
  "option",
  "output",
  "progress",
  "select",
  "textarea",
  "details",
  "dialog",
  "menu",
  "summary",
  "details",
  "slot",
  "template",
  "acronym",
  "applet",
  "basefont",
  "bgsound",
  "big",
  "blink",
  "center",
  "content",
  "dir",
  "font",
  "frame",
  "frameset",
  "hgroup",
  "image",
  "keygen",
  "marquee",
  "menuitem",
  "nobr",
  "noembed",
  "noframes",
  "plaintext",
  "rb",
  "rtc",
  "shadow",
  "spacer",
  "strike",
  "tt",
  "xmp",
  "a",
  "abbr",
  "acronym",
  "address",
  "applet",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "basefont",
  "bdi",
  "bdo",
  "bgsound",
  "big",
  "blink",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "center",
  "cite",
  "code",
  "col",
  "colgroup",
  "content",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "font",
  "footer",
  "form",
  "frame",
  "frameset",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "iframe",
  "image",
  "img",
  "input",
  "ins",
  "kbd",
  "keygen",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "marquee",
  "menu",
  "menuitem",
  "meta",
  "meter",
  "nav",
  "nobr",
  "noembed",
  "noframes",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "param",
  "picture",
  "plaintext",
  "portal",
  "pre",
  "progress",
  "q",
  "rb",
  "rp",
  "rt",
  "rtc",
  "ruby",
  "s",
  "samp",
  "script",
  "section",
  "select",
  "shadow",
  "slot",
  "small",
  "source",
  "spacer",
  "span",
  "strike",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "tt",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
  "xmp",
  "input",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6"
]);

function reconcileArrays(parentNode, a, b) {
  let bLength = b.length,
    aEnd = a.length,
    bEnd = bLength,
    aStart = 0,
    bStart = 0,
    after = a[aEnd - 1].nextSibling,
    map = null;
  while (aStart < aEnd || bStart < bEnd) {
    if (a[aStart] === b[bStart]) {
      aStart++;
      bStart++;
      continue;
    }
    while (a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    }
    if (aEnd === aStart) {
      const node = bEnd < bLength ? (bStart ? b[bStart - 1].nextSibling : b[bEnd - bStart]) : after;
      while (bStart < bEnd) parentNode.insertBefore(b[bStart++], node);
    } else if (bEnd === bStart) {
      while (aStart < aEnd) {
        if (!map || !map.has(a[aStart])) a[aStart].remove();
        aStart++;
      }
    } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
      const node = a[--aEnd].nextSibling;
      parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
      parentNode.insertBefore(b[--bEnd], node);
      a[aEnd] = b[bEnd];
    } else {
      if (!map) {
        map = new Map();
        let i = bStart;
        while (i < bEnd) map.set(b[i], i++);
      }
      const index = map.get(a[aStart]);
      if (index != null) {
        if (bStart < index && index < bEnd) {
          let i = aStart,
            sequence = 1,
            t;
          while (++i < aEnd && i < bEnd) {
            if ((t = map.get(a[i])) == null || t !== index + sequence) break;
            sequence++;
          }
          if (sequence > index - bStart) {
            const node = a[aStart];
            while (bStart < index) parentNode.insertBefore(b[bStart++], node);
          } else parentNode.replaceChild(b[bStart++], a[aStart++]);
        } else aStart++;
      } else a[aStart++].remove();
    }
  }
}

const $$EVENTS = "_$DX_DELEGATE";
function render(code, element, init, options = {}) {
  let disposer;
  createRoot(dispose => {
    disposer = dispose;
    element === document
      ? code()
      : insert(element, code(), element.firstChild ? null : undefined, init);
  }, options.owner);
  return () => {
    disposer();
    element.textContent = "";
  };
}
function template(html, isImportNode, isSVG, isMathML) {
  let node;
  const create = () => {
    const t = isMathML
      ? document.createElementNS("http://www.w3.org/1998/Math/MathML", "template")
      : document.createElement("template");
    t.innerHTML = html;
    return isSVG ? t.content.firstChild.firstChild : isMathML ? t.firstChild : t.content.firstChild;
  };
  const fn = isImportNode
    ? () => untrack(() => document.importNode(node || (node = create()), true))
    : () => (node || (node = create())).cloneNode(true);
  fn.cloneNode = fn;
  return fn;
}
function delegateEvents(eventNames, document = window.document) {
  const e = document[$$EVENTS] || (document[$$EVENTS] = new Set());
  for (let i = 0, l = eventNames.length; i < l; i++) {
    const name = eventNames[i];
    if (!e.has(name)) {
      e.add(name);
      document.addEventListener(name, eventHandler);
    }
  }
}
function clearDelegatedEvents(document = window.document) {
  if (document[$$EVENTS]) {
    for (let name of document[$$EVENTS].keys()) document.removeEventListener(name, eventHandler);
    delete document[$$EVENTS];
  }
}
function setProperty$1(node, name, value) {
  if (isHydrating(node)) return;
  node[name] = value;
}
function setAttribute(node, name, value) {
  if (isHydrating(node)) return;
  if (value == null) node.removeAttribute(name);
  else node.setAttribute(name, value);
}
function setAttributeNS(node, namespace, name, value) {
  if (isHydrating(node)) return;
  if (value == null) node.removeAttributeNS(namespace, name);
  else node.setAttributeNS(namespace, name, value);
}
function setBoolAttribute(node, name, value) {
  if (isHydrating(node)) return;
  value ? node.setAttribute(name, "") : node.removeAttribute(name);
}
function className(node, value) {
  if (isHydrating(node)) return;
  if (value == null) node.removeAttribute("class");
  else node.className = value;
}
function addEventListener(node, name, handler, delegate) {
  if (delegate) {
    if (Array.isArray(handler)) {
      node[`$$${name}`] = handler[0];
      node[`$$${name}Data`] = handler[1];
    } else node[`$$${name}`] = handler;
  } else if (Array.isArray(handler)) {
    const handlerFn = handler[0];
    node.addEventListener(name, (handler[0] = e => handlerFn.call(node, handler[1], e)));
  } else node.addEventListener(name, handler, typeof handler !== "function" && handler);
}
function classList(node, value, prev = {}) {
  const classKeys = Object.keys(value || {}),
    prevKeys = Object.keys(prev);
  let i, len;
  for (i = 0, len = prevKeys.length; i < len; i++) {
    const key = prevKeys[i];
    if (!key || key === "undefined" || value[key]) continue;
    toggleClassKey(node, key, false);
    delete prev[key];
  }
  for (i = 0, len = classKeys.length; i < len; i++) {
    const key = classKeys[i],
      classValue = !!value[key];
    if (!key || key === "undefined" || prev[key] === classValue || !classValue) continue;
    toggleClassKey(node, key, true);
    prev[key] = classValue;
  }
  return prev;
}
function style$1(node, value, prev) {
  if (!value) return prev ? setAttribute(node, "style") : value;
  const nodeStyle = node.style;
  if (typeof value === "string") return (nodeStyle.cssText = value);
  typeof prev === "string" && (nodeStyle.cssText = prev = undefined);
  prev || (prev = {});
  value || (value = {});
  let v, s;
  for (s in prev) {
    value[s] == null && nodeStyle.removeProperty(s);
    delete prev[s];
  }
  for (s in value) {
    v = value[s];
    if (v !== prev[s]) {
      nodeStyle.setProperty(s, v);
      prev[s] = v;
    }
  }
  return prev;
}
function spread(node, props = {}, isSVG, skipChildren) {
  const prevProps = {};
  if (!skipChildren) {
    createRenderEffect(
      () => (prevProps.children = insertExpression(node, props.children, prevProps.children))
    );
  }
  createRenderEffect(() => typeof props.ref === "function" && use(props.ref, node));
  createRenderEffect(() => assign(node, props, isSVG, true, prevProps, true));
  return prevProps;
}
function dynamicProperty(props, key) {
  const src = props[key];
  Object.defineProperty(props, key, {
    get() {
      return src();
    },
    enumerable: true
  });
  return props;
}
function use(fn, element, arg) {
  return untrack(() => fn(element, arg));
}
function insert(parent, accessor, marker, initial) {
  if (marker !== undefined && !initial) initial = [];
  if (typeof accessor !== "function") return insertExpression(parent, accessor, initial, marker);
  createRenderEffect(current => insertExpression(parent, accessor(), current, marker), initial);
}
function assign(node, props, isSVG, skipChildren, prevProps = {}, skipRef = false) {
  props || (props = {});
  for (const prop in prevProps) {
    if (!(prop in props)) {
      if (prop === "children") continue;
      prevProps[prop] = assignProp(node, prop, null, prevProps[prop], isSVG, skipRef, props);
    }
  }
  for (const prop in props) {
    if (prop === "children") {
      if (!skipChildren) insertExpression(node, props.children);
      continue;
    }
    const value = props[prop];
    prevProps[prop] = assignProp(node, prop, value, prevProps[prop], isSVG, skipRef, props);
  }
}
function hydrate$1(code, element, options = {}) {
  if (globalThis._$HY.done) return render(code, element, [...element.childNodes], options);
  sharedConfig.completed = globalThis._$HY.completed;
  sharedConfig.events = globalThis._$HY.events;
  sharedConfig.load = id => globalThis._$HY.r[id];
  sharedConfig.has = id => id in globalThis._$HY.r;
  sharedConfig.gather = root => gatherHydratable(element, root);
  sharedConfig.registry = new Map();
  sharedConfig.context = {
    id: options.renderId || "",
    count: 0
  };
  try {
    gatherHydratable(element, options.renderId);
    return render(code, element, [...element.childNodes], options);
  } finally {
    sharedConfig.context = null;
  }
}
function getNextElement(template) {
  let node,
    key,
    hydrating = isHydrating();
  if (!hydrating || !(node = sharedConfig.registry.get((key = getHydrationKey())))) {
    return template();
  }
  if (sharedConfig.completed) sharedConfig.completed.add(node);
  sharedConfig.registry.delete(key);
  return node;
}
function getNextMatch(el, nodeName) {
  while (el && el.localName !== nodeName) el = el.nextSibling;
  return el;
}
function getNextMarker(start) {
  let end = start,
    count = 0,
    current = [];
  if (isHydrating(start)) {
    while (end) {
      if (end.nodeType === 8) {
        const v = end.nodeValue;
        if (v === "$") count++;
        else if (v === "/") {
          if (count === 0) return [end, current];
          count--;
        }
      }
      current.push(end);
      end = end.nextSibling;
    }
  }
  return [end, current];
}
function runHydrationEvents() {
  if (sharedConfig.events && !sharedConfig.events.queued) {
    queueMicrotask(() => {
      const { completed, events } = sharedConfig;
      if (!events) return;
      events.queued = false;
      while (events.length) {
        const [el, e] = events[0];
        if (!completed.has(el)) return;
        events.shift();
        eventHandler(e);
      }
      if (sharedConfig.done) {
        sharedConfig.events = _$HY.events = null;
        sharedConfig.completed = _$HY.completed = null;
      }
    });
    sharedConfig.events.queued = true;
  }
}
function isHydrating(node) {
  return !!sharedConfig.context && !sharedConfig.done && (!node || node.isConnected);
}
function toPropertyName(name) {
  return name.toLowerCase().replace(/-([a-z])/g, (_, w) => w.toUpperCase());
}
function toggleClassKey(node, key, value) {
  const classNames = key.trim().split(/\s+/);
  for (let i = 0, nameLen = classNames.length; i < nameLen; i++)
    node.classList.toggle(classNames[i], value);
}
function assignProp(node, prop, value, prev, isSVG, skipRef, props) {
  let isCE, isProp, isChildProp, propAlias, forceProp;
  if (prop === "style") return style$1(node, value, prev);
  if (prop === "classList") return classList(node, value, prev);
  if (value === prev) return prev;
  if (prop === "ref") {
    if (!skipRef) value(node);
  } else if (prop.slice(0, 3) === "on:") {
    const e = prop.slice(3);
    prev && node.removeEventListener(e, prev, typeof prev !== "function" && prev);
    value && node.addEventListener(e, value, typeof value !== "function" && value);
  } else if (prop.slice(0, 10) === "oncapture:") {
    const e = prop.slice(10);
    prev && node.removeEventListener(e, prev, true);
    value && node.addEventListener(e, value, true);
  } else if (prop.slice(0, 2) === "on") {
    const name = prop.slice(2).toLowerCase();
    const delegate = DelegatedEvents.has(name);
    if (!delegate && prev) {
      const h = Array.isArray(prev) ? prev[0] : prev;
      node.removeEventListener(name, h);
    }
    if (delegate || value) {
      addEventListener(node, name, value, delegate);
      delegate && delegateEvents([name]);
    }
  } else if (prop.slice(0, 5) === "attr:") {
    setAttribute(node, prop.slice(5), value);
  } else if (prop.slice(0, 5) === "bool:") {
    setBoolAttribute(node, prop.slice(5), value);
  } else if (
    (forceProp = prop.slice(0, 5) === "prop:") ||
    (isChildProp = ChildProperties.has(prop)) ||
    (!isSVG &&
      ((propAlias = getPropAlias(prop, node.tagName)) || (isProp = Properties.has(prop)))) ||
    (isCE = node.nodeName.includes("-") || "is" in props)
  ) {
    if (forceProp) {
      prop = prop.slice(5);
      isProp = true;
    } else if (isHydrating(node)) return value;
    if (prop === "class" || prop === "className") className(node, value);
    else if (isCE && !isProp && !isChildProp) node[toPropertyName(prop)] = value;
    else node[propAlias || prop] = value;
  } else {
    const ns = isSVG && prop.indexOf(":") > -1 && SVGNamespace[prop.split(":")[0]];
    if (ns) setAttributeNS(node, ns, prop, value);
    else setAttribute(node, Aliases[prop] || prop, value);
  }
  return value;
}
function eventHandler(e) {
  if (sharedConfig.registry && sharedConfig.events) {
    if (sharedConfig.events.find(([el, ev]) => ev === e)) return;
  }
  let node = e.target;
  const key = `$$${e.type}`;
  const oriTarget = e.target;
  const oriCurrentTarget = e.currentTarget;
  const retarget = value =>
    Object.defineProperty(e, "target", {
      configurable: true,
      value
    });
  const handleNode = () => {
    const handler = node[key];
    if (handler && !node.disabled) {
      const data = node[`${key}Data`];
      data !== undefined ? handler.call(node, data, e) : handler.call(node, e);
      if (e.cancelBubble) return;
    }
    node.host &&
      typeof node.host !== "string" &&
      !node.host._$host &&
      node.contains(e.target) &&
      retarget(node.host);
    return true;
  };
  const walkUpTree = () => {
    while (handleNode() && (node = node._$host || node.parentNode || node.host));
  };
  Object.defineProperty(e, "currentTarget", {
    configurable: true,
    get() {
      return node || document;
    }
  });
  if (sharedConfig.registry && !sharedConfig.done) sharedConfig.done = _$HY.done = true;
  if (e.composedPath) {
    const path = e.composedPath();
    retarget(path[0]);
    for (let i = 0; i < path.length - 2; i++) {
      node = path[i];
      if (!handleNode()) break;
      if (node._$host) {
        node = node._$host;
        walkUpTree();
        break;
      }
      if (node.parentNode === oriCurrentTarget) {
        break;
      }
    }
  } else walkUpTree();
  retarget(oriTarget);
}
function insertExpression(parent, value, current, marker, unwrapArray) {
  const hydrating = isHydrating(parent);
  if (hydrating) {
    !current && (current = [...parent.childNodes]);
    let cleaned = [];
    for (let i = 0; i < current.length; i++) {
      const node = current[i];
      if (node.nodeType === 8 && node.data.slice(0, 2) === "!$") node.remove();
      else cleaned.push(node);
    }
    current = cleaned;
  }
  while (typeof current === "function") current = current();
  if (value === current) return current;
  const t = typeof value,
    multi = marker !== undefined;
  parent = (multi && current[0] && current[0].parentNode) || parent;
  if (t === "string" || t === "number") {
    if (hydrating) return current;
    if (t === "number") {
      value = value.toString();
      if (value === current) return current;
    }
    if (multi) {
      let node = current[0];
      if (node && node.nodeType === 3) {
        node.data !== value && (node.data = value);
      } else node = document.createTextNode(value);
      current = cleanChildren(parent, current, marker, node);
    } else {
      if (current !== "" && typeof current === "string") {
        current = parent.firstChild.data = value;
      } else current = parent.textContent = value;
    }
  } else if (value == null || t === "boolean") {
    if (hydrating) return current;
    current = cleanChildren(parent, current, marker);
  } else if (t === "function") {
    createRenderEffect(() => {
      let v = value();
      while (typeof v === "function") v = v();
      current = insertExpression(parent, v, current, marker);
    });
    return () => current;
  } else if (Array.isArray(value)) {
    const array = [];
    const currentArray = current && Array.isArray(current);
    if (normalizeIncomingArray(array, value, current, unwrapArray)) {
      createRenderEffect(() => (current = insertExpression(parent, array, current, marker, true)));
      return () => current;
    }
    if (hydrating) {
      if (!array.length) return current;
      if (marker === undefined) return (current = [...parent.childNodes]);
      let node = array[0];
      if (node.parentNode !== parent) return current;
      const nodes = [node];
      while ((node = node.nextSibling) !== marker) nodes.push(node);
      return (current = nodes);
    }
    if (array.length === 0) {
      current = cleanChildren(parent, current, marker);
      if (multi) return current;
    } else if (currentArray) {
      if (current.length === 0) {
        appendNodes(parent, array, marker);
      } else reconcileArrays(parent, current, array);
    } else {
      current && cleanChildren(parent);
      appendNodes(parent, array);
    }
    current = array;
  } else if (value.nodeType) {
    if (hydrating && value.parentNode) return (current = multi ? [value] : value);
    if (Array.isArray(current)) {
      if (multi) return (current = cleanChildren(parent, current, marker, value));
      cleanChildren(parent, current, null, value);
    } else if (current == null || current === "" || !parent.firstChild) {
      parent.appendChild(value);
    } else parent.replaceChild(value, parent.firstChild);
    current = value;
  } else;
  return current;
}
function normalizeIncomingArray(normalized, array, current, unwrap) {
  let dynamic = false;
  for (let i = 0, len = array.length; i < len; i++) {
    let item = array[i],
      prev = current && current[normalized.length],
      t;
    if (item == null || item === true || item === false);
    else if ((t = typeof item) === "object" && item.nodeType) {
      normalized.push(item);
    } else if (Array.isArray(item)) {
      dynamic = normalizeIncomingArray(normalized, item, prev) || dynamic;
    } else if (t === "function") {
      if (unwrap) {
        while (typeof item === "function") item = item();
        dynamic =
          normalizeIncomingArray(
            normalized,
            Array.isArray(item) ? item : [item],
            Array.isArray(prev) ? prev : [prev]
          ) || dynamic;
      } else {
        normalized.push(item);
        dynamic = true;
      }
    } else {
      const value = String(item);
      if (prev && prev.nodeType === 3 && prev.data === value) normalized.push(prev);
      else normalized.push(document.createTextNode(value));
    }
  }
  return dynamic;
}
function appendNodes(parent, array, marker = null) {
  for (let i = 0, len = array.length; i < len; i++) parent.insertBefore(array[i], marker);
}
function cleanChildren(parent, current, marker, replacement) {
  if (marker === undefined) return (parent.textContent = "");
  const node = replacement || document.createTextNode("");
  if (current.length) {
    let inserted = false;
    for (let i = current.length - 1; i >= 0; i--) {
      const el = current[i];
      if (node !== el) {
        const isParent = el.parentNode === parent;
        if (!inserted && !i)
          isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);
        else isParent && el.remove();
      } else inserted = true;
    }
  } else parent.insertBefore(node, marker);
  return [node];
}
function gatherHydratable(element, root) {
  const templates = element.querySelectorAll(`*[data-hk]`);
  for (let i = 0; i < templates.length; i++) {
    const node = templates[i];
    const key = node.getAttribute("data-hk");
    if ((!root || key.startsWith(root)) && !sharedConfig.registry.has(key))
      sharedConfig.registry.set(key, node);
  }
}
function getHydrationKey() {
  return sharedConfig.getNextContextId();
}
function NoHydration(props) {
  return sharedConfig.context ? undefined : props.children;
}
function Hydration(props) {
  return props.children;
}
const voidFn = () => undefined;
const RequestContext = Symbol();
function innerHTML(parent, content) {
  !sharedConfig.context && (parent.innerHTML = content);
}

function throwInBrowser(func) {
  const err = new Error(`${func.name} is not supported in the browser, returning undefined`);
  console.error(err);
}
function renderToString(fn, options) {
  throwInBrowser(renderToString);
}
function renderToStringAsync(fn, options) {
  throwInBrowser(renderToStringAsync);
}
function renderToStream(fn, options) {
  throwInBrowser(renderToStream);
}
function ssr(template, ...nodes) {}
function ssrElement(name, props, children, needsId) {}
function ssrClassList(value) {}
function ssrStyle(value) {}
function ssrAttribute(key, value) {}
function ssrHydrationKey() {}
function resolveSSRNode(node) {}
function escape(html) {}
function ssrSpread(props, isSVG, skipChildren) {}

const isServer = false;
const isDev = false;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
function createElement(tagName, isSVG = false) {
  return isSVG ? document.createElementNS(SVG_NAMESPACE, tagName) : document.createElement(tagName);
}
const hydrate = (...args) => {
  enableHydration();
  return hydrate$1(...args);
};
function Portal(props) {
  const { useShadow } = props,
    marker = document.createTextNode(""),
    mount = () => props.mount || document.body,
    owner = getOwner();
  let content;
  let hydrating = !!sharedConfig.context;
  createEffect(
    () => {
      if (hydrating) getOwner().user = hydrating = false;
      content || (content = runWithOwner(owner, () => createMemo(() => props.children)));
      const el = mount();
      if (el instanceof HTMLHeadElement) {
        const [clean, setClean] = createSignal(false);
        const cleanup = () => setClean(true);
        createRoot(dispose => insert(el, () => (!clean() ? content() : dispose()), null));
        onCleanup(cleanup);
      } else {
        const container = createElement(props.isSVG ? "g" : "div", props.isSVG),
          renderRoot =
            useShadow && container.attachShadow
              ? container.attachShadow({
                mode: "open"
              })
              : container;
        Object.defineProperty(container, "_$host", {
          get() {
            return marker.parentNode;
          },
          configurable: true
        });
        insert(renderRoot, content);
        el.appendChild(container);
        props.ref && props.ref(container);
        onCleanup(() => el.removeChild(container));
      }
    },
    undefined,
    {
      render: !hydrating
    }
  );
  return marker;
}
function createDynamic(component, props) {
  const cached = createMemo(component);
  return createMemo(() => {
    const component = cached();
    switch (typeof component) {
      case "function":
        return untrack(() => component(props));
      case "string":
        const isSvg = SVGElements.has(component);
        const el = sharedConfig.context ? getNextElement() : createElement(component, isSvg);
        spread(el, props, isSvg);
        return el;
    }
  });
}
function Dynamic(props) {
  const [, others] = splitProps(props, ["component"]);
  return createDynamic(() => props.component, others);
}

const [activeInputDevice, setActiveInputDevice] = createSignal(ActionHandler.deviceType);
const [activeInputDeviceLayout, setActiveInputDeviceLayout] = createSignal(
  ActionHandler.deviceLayout
);
engine.whenReady.then(() => {
  engine.on("input-source-changed", (deviceType, deviceLayout) => {
    setActiveInputDevice(deviceType);
    setActiveInputDeviceLayout(deviceLayout);
  });
});
const ActiveInputDevice = activeInputDevice;
const ActiveInputDeviceLayout = activeInputDeviceLayout;
const IsControllerActive = createMemo(() => activeInputDevice() == InputDeviceType.Controller);
const IsTouchActive = createMemo(() => activeInputDevice() == InputDeviceType.Touch);
class EngineInputProxyProvider {
  handlers = [];
  unregisterHandler(handler) {
    const foundHandler = this.handlers.indexOf(handler);
    if (foundHandler >= 0) {
      this.handlers.splice(foundHandler, 1);
    }
  }
  registerHandler(handler) {
    this.handlers.push(handler);
  }
  triggerEngineInput(event) {
    for (const handler of this.handlers) {
      handler(event);
    }
  }
}
const EngineInputProxyContext = createContext();

const $RAW = Symbol("store-raw"),
  $NODE = Symbol("store-node"),
  $HAS = Symbol("store-has"),
  $SELF = Symbol("store-self");
function wrap$1(value) {
  let p = value[$PROXY];
  if (!p) {
    Object.defineProperty(value, $PROXY, {
      value: (p = new Proxy(value, proxyTraps$1))
    });
    if (!Array.isArray(value)) {
      const keys = Object.keys(value),
        desc = Object.getOwnPropertyDescriptors(value);
      for (let i = 0, l = keys.length; i < l; i++) {
        const prop = keys[i];
        if (desc[prop].get) {
          Object.defineProperty(value, prop, {
            enumerable: desc[prop].enumerable,
            get: desc[prop].get.bind(p)
          });
        }
      }
    }
  }
  return p;
}
function isWrappable(obj) {
  let proto;
  return (
    obj != null &&
    typeof obj === "object" &&
    (obj[$PROXY] ||
      !(proto = Object.getPrototypeOf(obj)) ||
      proto === Object.prototype ||
      Array.isArray(obj))
  );
}
function unwrap(item, set = new Set()) {
  let result, unwrapped, v, prop;
  if ((result = item != null && item[$RAW])) return result;
  if (!isWrappable(item) || set.has(item)) return item;
  if (Array.isArray(item)) {
    if (Object.isFrozen(item)) item = item.slice(0);
    else set.add(item);
    for (let i = 0, l = item.length; i < l; i++) {
      v = item[i];
      if ((unwrapped = unwrap(v, set)) !== v) item[i] = unwrapped;
    }
  } else {
    if (Object.isFrozen(item)) item = Object.assign({}, item);
    else set.add(item);
    const keys = Object.keys(item),
      desc = Object.getOwnPropertyDescriptors(item);
    for (let i = 0, l = keys.length; i < l; i++) {
      prop = keys[i];
      if (desc[prop].get) continue;
      v = item[prop];
      if ((unwrapped = unwrap(v, set)) !== v) item[prop] = unwrapped;
    }
  }
  return item;
}
function getNodes(target, symbol) {
  let nodes = target[symbol];
  if (!nodes)
    Object.defineProperty(target, symbol, {
      value: (nodes = Object.create(null))
    });
  return nodes;
}
function getNode(nodes, property, value) {
  if (nodes[property]) return nodes[property];
  const [s, set] = createSignal(value, {
    equals: false,
    internal: true
  });
  s.$ = set;
  return (nodes[property] = s);
}
function proxyDescriptor$1(target, property) {
  const desc = Reflect.getOwnPropertyDescriptor(target, property);
  if (!desc || desc.get || !desc.configurable || property === $PROXY || property === $NODE)
    return desc;
  delete desc.value;
  delete desc.writable;
  desc.get = () => target[$PROXY][property];
  return desc;
}
function trackSelf(target) {
  getListener() && getNode(getNodes(target, $NODE), $SELF)();
}
function ownKeys(target) {
  trackSelf(target);
  return Reflect.ownKeys(target);
}
const proxyTraps$1 = {
  get(target, property, receiver) {
    if (property === $RAW) return target;
    if (property === $PROXY) return receiver;
    if (property === $TRACK) {
      trackSelf(target);
      return receiver;
    }
    const nodes = getNodes(target, $NODE);
    const tracked = nodes[property];
    let value = tracked ? tracked() : target[property];
    if (property === $NODE || property === $HAS || property === "__proto__") return value;
    if (!tracked) {
      const desc = Object.getOwnPropertyDescriptor(target, property);
      if (
        getListener() &&
        (typeof value !== "function" || target.hasOwnProperty(property)) &&
        !(desc && desc.get)
      )
        value = getNode(nodes, property, value)();
    }
    return isWrappable(value) ? wrap$1(value) : value;
  },
  has(target, property) {
    if (
      property === $RAW ||
      property === $PROXY ||
      property === $TRACK ||
      property === $NODE ||
      property === $HAS ||
      property === "__proto__"
    )
      return true;
    getListener() && getNode(getNodes(target, $HAS), property)();
    return property in target;
  },
  set() {
    return true;
  },
  deleteProperty() {
    return true;
  },
  ownKeys: ownKeys,
  getOwnPropertyDescriptor: proxyDescriptor$1
};
function setProperty(state, property, value, deleting = false) {
  if (!deleting && state[property] === value) return;
  const prev = state[property],
    len = state.length;
  if (value === undefined) {
    delete state[property];
    if (state[$HAS] && state[$HAS][property] && prev !== undefined) state[$HAS][property].$();
  } else {
    state[property] = value;
    if (state[$HAS] && state[$HAS][property] && prev === undefined) state[$HAS][property].$();
  }
  let nodes = getNodes(state, $NODE),
    node;
  if ((node = getNode(nodes, property, prev))) node.$(() => value);
  if (Array.isArray(state) && state.length !== len) {
    for (let i = state.length; i < len; i++) (node = nodes[i]) && node.$();
    (node = getNode(nodes, "length", len)) && node.$(state.length);
  }
  (node = nodes[$SELF]) && node.$();
}
function mergeStoreNode(state, value) {
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    setProperty(state, key, value[key]);
  }
}
function updateArray(current, next) {
  if (typeof next === "function") next = next(current);
  next = unwrap(next);
  if (Array.isArray(next)) {
    if (current === next) return;
    let i = 0,
      len = next.length;
    for (; i < len; i++) {
      const value = next[i];
      if (current[i] !== value) setProperty(current, i, value);
    }
    setProperty(current, "length", len);
  } else mergeStoreNode(current, next);
}
function updatePath(current, path, traversed = []) {
  let part,
    prev = current;
  if (path.length > 1) {
    part = path.shift();
    const partType = typeof part,
      isArray = Array.isArray(current);
    if (Array.isArray(part)) {
      for (let i = 0; i < part.length; i++) {
        updatePath(current, [part[i]].concat(path), traversed);
      }
      return;
    } else if (isArray && partType === "function") {
      for (let i = 0; i < current.length; i++) {
        if (part(current[i], i)) updatePath(current, [i].concat(path), traversed);
      }
      return;
    } else if (isArray && partType === "object") {
      const { from = 0, to = current.length - 1, by = 1 } = part;
      for (let i = from; i <= to; i += by) {
        updatePath(current, [i].concat(path), traversed);
      }
      return;
    } else if (path.length > 1) {
      updatePath(current[part], path, [part].concat(traversed));
      return;
    }
    prev = current[part];
    traversed = [part].concat(traversed);
  }
  let value = path[0];
  if (typeof value === "function") {
    value = value(prev, traversed);
    if (value === prev) return;
  }
  if (part === undefined && value == undefined) return;
  value = unwrap(value);
  if (part === undefined || (isWrappable(prev) && isWrappable(value) && !Array.isArray(value))) {
    mergeStoreNode(prev, value);
  } else setProperty(current, part, value);
}
function createStore(...[store, options]) {
  const unwrappedStore = unwrap(store || {});
  const isArray = Array.isArray(unwrappedStore);
  const wrappedStore = wrap$1(unwrappedStore);
  function setStore(...args) {
    batch(() => {
      isArray && args.length === 1
        ? updateArray(unwrappedStore, args[0])
        : updatePath(unwrappedStore, args);
    });
  }
  return [wrappedStore, setStore];
}

function proxyDescriptor(target, property) {
  const desc = Reflect.getOwnPropertyDescriptor(target, property);
  if (
    !desc ||
    desc.get ||
    desc.set ||
    !desc.configurable ||
    property === $PROXY ||
    property === $NODE
  )
    return desc;
  delete desc.value;
  delete desc.writable;
  desc.get = () => target[$PROXY][property];
  desc.set = v => (target[$PROXY][property] = v);
  return desc;
}
const proxyTraps = {
  get(target, property, receiver) {
    if (property === $RAW) return target;
    if (property === $PROXY) return receiver;
    if (property === $TRACK) {
      trackSelf(target);
      return receiver;
    }
    const nodes = getNodes(target, $NODE);
    const tracked = nodes[property];
    let value = tracked ? tracked() : target[property];
    if (property === $NODE || property === $HAS || property === "__proto__") return value;
    if (!tracked) {
      const desc = Object.getOwnPropertyDescriptor(target, property);
      const isFunction = typeof value === "function";
      if (getListener() && (!isFunction || target.hasOwnProperty(property)) && !(desc && desc.get))
        value = getNode(nodes, property, value)();
      else if (value != null && isFunction && value === Array.prototype[property]) {
        return (...args) => batch(() => Array.prototype[property].apply(receiver, args));
      }
    }
    return isWrappable(value) ? wrap(value) : value;
  },
  has(target, property) {
    if (
      property === $RAW ||
      property === $PROXY ||
      property === $TRACK ||
      property === $NODE ||
      property === $HAS ||
      property === "__proto__"
    )
      return true;
    getListener() && getNode(getNodes(target, $HAS), property)();
    return property in target;
  },
  set(target, property, value) {
    batch(() => setProperty(target, property, unwrap(value)));
    return true;
  },
  deleteProperty(target, property) {
    batch(() => setProperty(target, property, undefined, true));
    return true;
  },
  ownKeys: ownKeys,
  getOwnPropertyDescriptor: proxyDescriptor
};
function wrap(value) {
  let p = value[$PROXY];
  if (!p) {
    Object.defineProperty(value, $PROXY, {
      value: (p = new Proxy(value, proxyTraps))
    });
    const keys = Object.keys(value),
      desc = Object.getOwnPropertyDescriptors(value);
    const proto = Object.getPrototypeOf(value);
    const isClass =
      proto !== null &&
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      proto !== Object.prototype;
    if (isClass) {
      const descriptors = Object.getOwnPropertyDescriptors(proto);
      keys.push(...Object.keys(descriptors));
      Object.assign(desc, descriptors);
    }
    for (let i = 0, l = keys.length; i < l; i++) {
      const prop = keys[i];
      if (isClass && prop === "constructor") continue;
      if (desc[prop].get) {
        const get = desc[prop].get.bind(p);
        Object.defineProperty(value, prop, {
          get,
          configurable: true
        });
      }
      if (desc[prop].set) {
        const og = desc[prop].set,
          set = v => batch(() => og.call(p, v));
        Object.defineProperty(value, prop, {
          set,
          configurable: true
        });
      }
    }
  }
  return p;
}
function createMutable(state, options) {
  const unwrappedStore = unwrap(state || {});
  const wrappedStore = wrap(unwrappedStore);
  return wrappedStore;
}
function modifyMutable(state, modifier) {
  batch(() => modifier(unwrap(state)));
}

const $ROOT = Symbol("store-root");
function applyState(target, parent, property, merge, key) {
  const previous = parent[property];
  if (target === previous) return;
  const isArray = Array.isArray(target);
  if (
    property !== $ROOT &&
    (!isWrappable(target) ||
      !isWrappable(previous) ||
      isArray !== Array.isArray(previous) ||
      (key && target[key] !== previous[key]))
  ) {
    setProperty(parent, property, target);
    return;
  }
  if (isArray) {
    if (
      target.length &&
      previous.length &&
      (!merge || (key && target[0] && target[0][key] != null))
    ) {
      let i, j, start, end, newEnd, item, newIndicesNext, keyVal;
      for (
        start = 0, end = Math.min(previous.length, target.length);
        start < end &&
        (previous[start] === target[start] ||
          (key && previous[start] && target[start] && previous[start][key] === target[start][key]));
        start++
      ) {
        applyState(target[start], previous, start, merge, key);
      }
      const temp = new Array(target.length),
        newIndices = new Map();
      for (
        end = previous.length - 1, newEnd = target.length - 1;
        end >= start &&
        newEnd >= start &&
        (previous[end] === target[newEnd] ||
          (key && previous[end] && target[newEnd] && previous[end][key] === target[newEnd][key]));
        end--, newEnd--
      ) {
        temp[newEnd] = previous[end];
      }
      if (start > newEnd || start > end) {
        for (j = start; j <= newEnd; j++) setProperty(previous, j, target[j]);
        for (; j < target.length; j++) {
          setProperty(previous, j, temp[j]);
          applyState(target[j], previous, j, merge, key);
        }
        if (previous.length > target.length) setProperty(previous, "length", target.length);
        return;
      }
      newIndicesNext = new Array(newEnd + 1);
      for (j = newEnd; j >= start; j--) {
        item = target[j];
        keyVal = key && item ? item[key] : item;
        i = newIndices.get(keyVal);
        newIndicesNext[j] = i === undefined ? -1 : i;
        newIndices.set(keyVal, j);
      }
      for (i = start; i <= end; i++) {
        item = previous[i];
        keyVal = key && item ? item[key] : item;
        j = newIndices.get(keyVal);
        if (j !== undefined && j !== -1) {
          temp[j] = previous[i];
          j = newIndicesNext[j];
          newIndices.set(keyVal, j);
        }
      }
      for (j = start; j < target.length; j++) {
        if (j in temp) {
          setProperty(previous, j, temp[j]);
          applyState(target[j], previous, j, merge, key);
        } else setProperty(previous, j, target[j]);
      }
    } else {
      for (let i = 0, len = target.length; i < len; i++) {
        applyState(target[i], previous, i, merge, key);
      }
    }
    if (previous.length > target.length) setProperty(previous, "length", target.length);
    return;
  }
  const targetKeys = Object.keys(target);
  for (let i = 0, len = targetKeys.length; i < len; i++) {
    applyState(target[targetKeys[i]], previous, targetKeys[i], merge, key);
  }
  const previousKeys = Object.keys(previous);
  for (let i = 0, len = previousKeys.length; i < len; i++) {
    if (target[previousKeys[i]] === undefined) setProperty(previous, previousKeys[i], undefined);
  }
}
function reconcile(value, options = {}) {
  const { merge, key = "id" } = options,
    v = unwrap(value);
  return state => {
    if (!isWrappable(state) || !isWrappable(v)) return v;
    const res = applyState(
      v,
      {
        [$ROOT]: state
      },
      $ROOT,
      merge,
      key
    );
    return res === undefined ? state : res;
  };
}
const producers = new WeakMap();
const setterTraps = {
  get(target, property) {
    if (property === $RAW) return target;
    const value = target[property];
    let proxy;
    return isWrappable(value)
      ? producers.get(value) ||
      (producers.set(value, (proxy = new Proxy(value, setterTraps))), proxy)
      : value;
  },
  set(target, property, value) {
    setProperty(target, property, unwrap(value));
    return true;
  },
  deleteProperty(target, property) {
    setProperty(target, property, undefined, true);
    return true;
  }
};
function produce(fn) {
  return state => {
    if (isWrappable(state)) {
      let proxy;
      if (!(proxy = producers.get(state))) {
        producers.set(state, (proxy = new Proxy(state, setterTraps)));
      }
      fn(proxy);
    }
    return state;
  };
}

const DEV = undefined;

class ImageCache {
  cachedImages = /* @__PURE__ */ new Map();
  /**
   * Loads a series of images
   * @param urls A list of urls to load
   * @returns A promise containing an array of loaded image caches
   */
  loadImages(...urls) {
    return Promise.all(urls.map((u) => this.loadImage(u)));
  }
  /**
   * Load an image.
   * @param url The url of the image to be loaded.
   * @returns A promise which resolves the image cache or rejects it .
   */
  loadImage(url) {
    const foundCache = this.cachedImages.get(url);
    if (foundCache) {
      return foundCache;
    }
    const image = new Image();
    image.src = url;
    image.style.display = "none";
    image.style.position = "absolute";
    const cache = new Promise((resolve, reject) => {
      if (image.src != url) {
        console.error(`Invalid URL used to preload image - ${url}`);
        reject(new Error(`Invalid URL used to preload image - ${url}`));
      } else {
        image.addEventListener("load", () => resolve({ url, image }));
        image.addEventListener("error", (e) => {
          console.error(`Error loading image - ${url}. `, e);
          reject(e);
        });
      }
    });
    this.cachedImages.set(url, cache);
    return cache;
  }
  /**
   * Unloads all images registered with the cache
   */
  unloadAllImages() {
    this.cachedImages.clear();
  }
}

class StyleCache {
  cachedStylesheetLinks = /* @__PURE__ */ new Map();
  /**
   * Loads a series of stylesheets
   * @param urls A list of urls to load
   * @returns A promise containing an array of loaded stylesheet caches
   */
  loadStyles(...urls) {
    return Promise.all(urls.map((u) => this.loadStyle(u)));
  }
  /**
   * Load a css stylesheet.
   * @param url The url of the stylesheet to be loaded.
   * @returns A promise which resolves the stylesheet cache or rejects it .
   */
  loadStyle(url) {
    const foundCache = this.cachedStylesheetLinks.get(url);
    if (foundCache) {
      return foundCache;
    }
    const cache = new Promise((resolve, reject) => {
      if (!document.head) {
        const error = new Error(
          `style-cache - Attempted to loadStyle() before head was created. source: ${url}`
        );
        console.error(error);
        reject(error);
      }
      if (document.querySelector(`link[href="${url}"]`)) {
        const error = new Error(
          `style-cache - Attempted to loadStyle() before head was created. source: ${url}`
        );
        console.error(error);
        reject(error);
      }
      try {
        const stylesheetLink = document.createElement("link");
        stylesheetLink.setAttribute("rel", "stylesheet");
        stylesheetLink.setAttribute("type", "text/css");
        stylesheetLink.setAttribute("href", url);
        stylesheetLink.onload = () => {
          resolve({ url, stylesheetLink });
        };
        stylesheetLink.onerror = (error) => {
          console.error(`style-cache: Error loading style - ${url}. `, error);
          reject(error);
        };
        document.head.appendChild(stylesheetLink);
      } catch (error) {
        console.error(`style-cache: Error loading style - ${url}. `, error);
        reject(error);
      }
    });
    this.cachedStylesheetLinks.set(url, cache);
    return cache;
  }
}

class ComponentUtilitiesImpl {
  imageCache = new ImageCache();
  styleCache = new StyleCache();
  /**
   * Loads stylesheets associated with a component
   * @param urls A list of stylesheet urls to load
   */
  loadStyles(...urls) {
    return this.styleCache.loadStyles(...urls);
  }
  /**
   * Preloads a list of images used by a component
   * @param urls A list of image URLs to load
   */
  preloadImages(...urls) {
    return this.imageCache.loadImages(...urls);
  }
}
const ComponentUtilities = new ComponentUtilitiesImpl();

const [componentRegistered, setComponentRegistered] = createSignal();
class ComponentRegistryImpl {
  componentFactories = /* @__PURE__ */ new Map();
  register(optionsOrName, createInstance, overridePriority) {
    let name = optionsOrName;
    let factory = createInstance;
    let cachedImages;
    let cachedStyles;
    if (typeof optionsOrName != "string") {
      name = optionsOrName.name;
      factory = optionsOrName.createInstance;
      overridePriority = optionsOrName.overridePriority;
      if (optionsOrName?.images) {
        cachedImages = ComponentUtilities.preloadImages(...optionsOrName.images);
      }
      if (optionsOrName?.styles) {
        cachedStyles = ComponentUtilities.loadStyles(...optionsOrName.styles);
      }
    }
    let wrappedComponentFactory = this.componentFactories.get(name);
    overridePriority ??= 0;
    if (wrappedComponentFactory) {
      if (wrappedComponentFactory.overridePriority < overridePriority) {
        wrappedComponentFactory.overridePriority = overridePriority;
        wrappedComponentFactory.factory = factory;
      }
    } else {
      wrappedComponentFactory = this.wrapComponentFactory(
        name,
        factory,
        overridePriority,
        cachedImages,
        cachedStyles
      );
    }
    setComponentRegistered(() => wrappedComponentFactory);
    return wrappedComponentFactory;
  }
  /**
   * Gets a registered component from the component registry.
   * Will return a wrapper that points the component factory with the highest override priority.
   * @param name The name of the component to get
   * @returns The registered component or undefined if no registration was not found
   */
  get(name) {
    return this.componentFactories.get(name);
  }
  /**
   * Returns a promise that resolved when all styles and images are preloaded for a give list of components
   * @param components The list of components to preload styles and images for
   * @returns A promise that resolves when all associated styles and images are loaded
   */
  preloadComponents(...components) {
    return Promise.all([
      ...components.map((c) => c.cachedImages ?? []),
      ...components.map((c) => c.cachedStyles ?? [])
    ]);
  }
  wrapComponentFactory(name, factory, overridePriority, cachedImages, cachedStyles) {
    const wrappedFactory = (props) => {
      return wrappedFactory.factory(props);
    };
    wrappedFactory.factoryName = name;
    wrappedFactory.factory = factory;
    wrappedFactory.overridePriority = overridePriority;
    wrappedFactory.cachedImages = cachedImages;
    wrappedFactory.cachedStyles = cachedStyles;
    return wrappedFactory;
  }
}
const ComponentRegistry = new ComponentRegistryImpl();

var _tmpl$$d = /* @__PURE__ */ template(`<div></div>`), _tmpl$2$4 = /* @__PURE__ */ template(`<div><div></div><div></div></div>`);
const FiligreeH1 = (props) => {
  return (() => {
    var _el$ = _tmpl$$d();
    spread(_el$, mergeProps(props, {
      get ["class"]() {
        return `filigree-divider-h1 ${[props.class ?? ""]}`;
      },
      "data-name": "Filigree.H1"
    }), false, false);
    return _el$;
  })();
};
const FiligreeH2 = (props) => {
  return (() => {
    var _el$2 = _tmpl$$d();
    spread(_el$2, mergeProps(props, {
      get ["class"]() {
        return `filigree-divider-h2 ${[props.class ?? ""]}`;
      },
      "data-name": "Filigree.H2"
    }), false, false);
    return _el$2;
  })();
};
const FiligreeH3 = (props) => {
  return (() => {
    var _el$3 = _tmpl$$d();
    spread(_el$3, mergeProps(props, {
      get ["class"]() {
        return `filigree-divider-h3 ${[props.class ?? ""]}`;
      },
      "data-name": "Filigree.H3"
    }), false, false);
    return _el$3;
  })();
};
const FiligreeH4 = (props) => {
  return (() => {
    var _el$4 = _tmpl$2$4(), _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling;
    spread(_el$4, mergeProps(props, {
      get ["class"]() {
        return `flex flex-row justify-center items-center ${[props.class ?? ""]}`;
      },
      "data-name": "Filigree.H4"
    }), false, true);
    insert(_el$4, () => props.children, _el$6);
    createRenderEffect((_p$) => {
      var _v$ = `filigree-h4-left ${props.filigreeClass}`, _v$2 = `filigree-h4-right ${props.filigreeClass}`;
      _v$ !== _p$.e && className(_el$5, _p$.e = _v$);
      _v$2 !== _p$.t && className(_el$6, _p$.t = _v$2);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    return _el$4;
  })();
};
const FiligreeSmall = (props) => {
  return (() => {
    var _el$7 = _tmpl$$d();
    spread(_el$7, mergeProps(props, {
      get ["class"]() {
        return `filigree-shell-small mt-2\\.5 ${[props.class ?? ""]}`;
      },
      "data-name": "Filigree.Small"
    }), false, false);
    return _el$7;
  })();
};
const Filigree = {
  /**
   * A filigree designed to be used beneath H1 text
   *
   * Default implementation: {@link FiligreeH1}
   */
  H1: ComponentRegistry.register({
    name: "Filigree.H1",
    createInstance: FiligreeH1,
    images: ["blp:header_filigree.png"]
  }),
  /**
   * A filigree designed to be used beneath H2 text
   *
   * Default implementation: {@link FiligreeH2}
   */
  H2: ComponentRegistry.register({
    name: "Filigree.H2",
    createInstance: FiligreeH2,
    images: ["blp:hud_divider-h2.png"]
  }),
  /**
   * A filigree designed to be used beneath H3 text
   *
   * Default implementation: {@link FiligreeH3}
   */
  H3: ComponentRegistry.register({
    name: "Filigree.H3",
    createInstance: FiligreeH3,
    images: ["blp:hud_sidepanel_divider.png"]
  }),
  /**
   * A filigree designed to be used around H4 text
   *
   * Default implementation: {@link FiligreeH4}
   */
  H4: ComponentRegistry.register({
    name: "Filigree.H4",
    createInstance: FiligreeH4,
    images: ["blp:hud_fleur.png"]
  }),
  /**
   * A filigree designed to be used as a small horizotnal divider
   *
   * Default implementation: {@link FiligreeSmall}
   */
  Small: ComponentRegistry.register({
    name: "Filigree.Small",
    createInstance: FiligreeSmall,
    images: ["blp:shell_small-filigree.png"]
  })
};

var _tmpl$$c = /* @__PURE__ */ template(`<div></div>`);
const FlipbookComponent = (props) => {
  let elapsed = 0;
  let lastFrameTime = 0;
  let frameHandler;
  const atlases = createMemo(() => props.atlas.map((atlas) => {
    const [isActive, setIsActive] = createSignal(false);
    const [xPos, setXPos] = createSignal(0);
    const [yPos, setYPos] = createSignal(0);
    const rows = atlas.size / atlas.spriteHeight;
    const cols = atlas.size / atlas.spriteWidth;
    const frames = atlas.nFrames ?? rows * cols;
    const duration = frames / props.fps * 1e3;
    const src = atlas.src;
    return {
      isActive,
      setIsActive,
      xPos,
      setXPos,
      yPos,
      setYPos,
      rows,
      cols,
      frames,
      duration,
      src
    };
  }));
  const totalFrames = createMemo(() => atlases().reduce((sum, a) => sum + a.frames, 0));
  const totalDuration = createMemo(() => atlases().reduce((sum, a) => sum + a.duration, 0));
  function showFrame(totalFrame) {
    let offset = 0;
    for (const atlas of atlases()) {
      const atlasFrame = totalFrame - offset;
      if (atlasFrame >= 0 && atlasFrame < atlas.frames) {
        const row = Math.floor(atlasFrame / atlas.cols);
        const col = Math.floor(atlasFrame % atlas.cols);
        atlas.setXPos(100 * (col / (atlas.cols - 1)));
        atlas.setYPos(100 * (row / (atlas.rows - 1)));
        atlas.setIsActive(true);
      } else {
        atlas.setIsActive(false);
      }
      offset += atlas.frames;
    }
  }
  function updateFrame(timestamp) {
    if (lastFrameTime != 0) {
      elapsed += timestamp - lastFrameTime;
      elapsed %= totalDuration();
    }
    lastFrameTime = timestamp;
    showFrame(Math.floor(totalFrames() * elapsed / totalDuration()));
    frameHandler = requestAnimationFrame(updateFrame);
  }
  onMount(() => {
    lastFrameTime = 0;
    requestAnimationFrame(updateFrame);
  });
  onCleanup(() => {
    if (frameHandler) {
      cancelAnimationFrame(frameHandler);
      frameHandler = void 0;
    }
  });
  return (() => {
    var _el$ = _tmpl$$c();
    insert(_el$, createComponent(For, {
      get each() {
        return atlases();
      },
      children: (atlas) => (() => {
        var _el$2 = _tmpl$$c();
        spread(_el$2, mergeProps(props, {
          get classList() {
            return {
              hidden: !atlas.isActive()
            };
          },
          get style() {
            return {
              background: `url("${atlas.src}")`,
              "background-size": `${atlas.cols * 100}% ${atlas.rows * 100}%`,
              "background-position-x": `${atlas.xPos()}%`,
              "background-position-y": `${atlas.yPos()}%`
            };
          }
        }), false, false);
        return _el$2;
      })()
    }));
    return _el$;
  })();
};
const Flipbook = ComponentRegistry.register("Flipbook", FlipbookComponent);
const HourglassComponent = (props) => {
  return createComponent(Flipbook, mergeProps(props, {
    fps: 30,
    atlas: [{
      src: "blp:hourglasses01",
      spriteHeight: 128,
      spriteWidth: 128,
      size: 512
    }, {
      src: "blp:hourglasses02",
      spriteHeight: 128,
      spriteWidth: 128,
      size: 512
    }, {
      src: "blp:hourglasses03",
      spriteHeight: 128,
      spriteWidth: 128,
      size: 1024,
      nFrames: 13
    }]
  }));
};
Flipbook.Hourglass = ComponentRegistry.register({
  name: "Flipbook.Hourglass",
  createInstance: HourglassComponent,
  images: ["blp:hourglasses01", "blp:hourglasses02", "blp:hourglasses03"]
});

var TriggerType = /* @__PURE__ */ ((TriggerType2) => {
  TriggerType2[TriggerType2["Activate"] = 0] = "Activate";
  TriggerType2[TriggerType2["Focus"] = 1] = "Focus";
  TriggerType2[TriggerType2["Blur"] = 2] = "Blur";
  return TriggerType2;
})(TriggerType || {});
class TriggerActivationContextProvider {
  constructor(host, parent, name) {
    this.host = host;
    this.parent = parent;
    this.name = name;
  }
  trigger(type, element) {
    this.host?.onTrigger(this.name(), type, element);
    this.parent?.trigger(type, element);
  }
}
const TriggerActivationContext = createContext();
function createTrigger(context) {
  const triggerComponent = (props) => {
    const hostContext = useContext(context);
    const parentContext = useContext(TriggerActivationContext);
    const reactiveName = createMemo(() => props.name);
    const triggerContextProvider = new TriggerActivationContextProvider(hostContext, parentContext, reactiveName);
    return createComponent(TriggerActivationContext.Provider, {
      value: triggerContextProvider,
      get children() {
        return props.children;
      }
    });
  };
  return triggerComponent;
}

function asyncLoad(url) {
  const request = new XMLHttpRequest();
  const promise = new Promise(function (resolve, reject) {
    request.onload = () => {
      if (request.status == 0 || request.status == 200) {
        resolve(request.responseText);
      } else {
        reject(`${url} - ${request.statusText}`);
      }
    };
    request.onerror = () => reject(`${url} - ${request.statusText}`);
    request.onabort = () => reject(`${url} - Aborted`);
  });
  request.open("GET", url);
  request.send();
  return promise;
}
function createJsonResource(filename) {
  return createResource(async () => {
    const response = await asyncLoad(filename);
    return JSON.parse(response);
  });
}

const audioBase = "fs://game/core/ui/audio-base/audio-base.json";

const [audioData] = createJsonResource(audioBase);
createEffect(() => {
  if (audioData.error) {
    console.error("Error loading audio-base.json", audioData.error);
  }
});
function playSound(id, group) {
  if (audioData.loading || audioData.error) {
    return false;
  }
  const data = audioData();
  if (id.length == 0 || id == "none" || !data) {
    return false;
  }
  const soundTag = group ? data[group]?.[id] ?? data["audio-base"][id] : data["audio-base"][id];
  if (soundTag) {
    UI.sendAudioEvent(soundTag);
    return true;
  } else {
    console.error(`No sound tag found for ${id} with group ${group}`);
  }
  return false;
}
class AudioGroupProvider {
  constructor(groupName, parent) {
    this.groupName = groupName;
    this.parent = parent;
  }
  /**
   * Plays a sound for the given audio group context.
   * If the sound is overridden on the element, play it directly.
   * Otherwise, look it up in the audio data and play that.
   * If the sound is still unable to be played, try again in the parent context.
   * @param id The sound id to play
   * @param element the element playing the sound
   */
  playSound(id, element) {
    const resolvedId = element?.getAttribute(`${id}-ref`) ?? id;
    const resolvedGroup = element?.getAttribute("data-audio-group-ref") ?? this.groupName;
    if (!playSound(resolvedId, resolvedGroup)) {
      this.parent?.playSound(resolvedId, element);
    }
  }
}
const AudioGroupContext = createContext(() => new AudioGroupProvider("audio-base"));

function isFocusableAFocusContext(focusable) {
  return focusable instanceof FocusContextProvider;
}
function getFocusableElement(focusable) {
  return isFocusableAFocusContext(focusable) ? focusable.element : focusable;
}
function getTabIndex(element) {
  return Number(getFocusableElement(element)?.getAttribute("tabindex") ?? 0);
}
const FocusSortOrders = {
  /**
   * The default way to sort focusbles, which sorts by tabIndex.
   * If tabIndex is set to -1, it will be reassigned based on the insertion order into the navigation tree.
   * This should be used for any place where order is relatively static or can easilty calculated
   * @param children The children to sort
   */
  byIndex: (children) => {
    children.sort((a, b) => getTabIndex(a) - getTabIndex(b));
  },
  /**
   * Sorts children by DOM order - this is useful for controls which dynamically add/remove/move child components
   * This is a more expensive operation than index sorting, so it should only be used in dynamic contexts.
   * @param children The children to sort
   */
  byDomOrder: (children) => {
    children.sort((a, b) => {
      const ae = getFocusableElement(a);
      const be = getFocusableElement(b);
      if (!ae || !be) {
        console.warn("FocusSortOrders.byDomOrder failed - no element was associated with a focus context.");
        return 0;
      }
      if (ae === be) {
        return 0;
      }
      const position = ae.compareDocumentPosition(be);
      if (position & (Node.DOCUMENT_POSITION_FOLLOWING | Node.DOCUMENT_POSITION_CONTAINED_BY)) {
        return -1;
      } else if (position & (Node.DOCUMENT_POSITION_PRECEDING | Node.DOCUMENT_POSITION_CONTAINS)) {
        return 1;
      }
      return 0;
    });
  }
};
const DefaultNavigationRules = {
  /**
   * Navigates based on up/down input
   */
  vertical: /* @__PURE__ */ new Map([
    [InputNavigationAction.UP, (context) => context.focusPrevious()],
    [InputNavigationAction.DOWN, (context) => context.focusNext()],
    [InputNavigationAction.NONE, (context) => context.focusCurrent()]
  ]),
  /**
   * Navigates based on left/right input
   */
  horizontal: /* @__PURE__ */ new Map([
    [InputNavigationAction.LEFT, (context) => context.focusPrevious()],
    [InputNavigationAction.RIGHT, (context) => context.focusNext()],
    [InputNavigationAction.NONE, (context) => context.focusCurrent()]
  ])
};
class FocusContextProvider {
  /**
   *
   * @param _element Constructs a focus context provider
   * @param navigationHandler
   * @param sortOrder
   */
  constructor(_element, navigationHandler, _contextName, sortOrder = FocusSortOrders.byIndex) {
    this._element = _element;
    this.navigationHandler = navigationHandler;
    this._contextName = _contextName;
    this.sortOrder = sortOrder;
    const [hasChildren, setHasChildren] = createSignal(false);
    this._hasChildren = hasChildren;
    this._setHasChildren = setHasChildren;
  }
  _children = [];
  _isDirty = false;
  _currentFocusIndex = -1;
  _hasChildren;
  _setHasChildren;
  /**
   * True if this context has children and false otherwise
   */
  get hasChildren() {
    return this._hasChildren;
  }
  /**
   * The sorted, registered children of this component.
   */
  get children() {
    if (this._isDirty) {
      this.sortOrder(this._children);
      this._isDirty = false;
    }
    return this._children;
  }
  /**
   * Gets the current index in children that this context is targeting
   * Use tryApplyFocus or trySetFocus to set the current focus index
   */
  get currentFocusIndex() {
    return this._currentFocusIndex;
  }
  /**
   * The current focused element that this context is targeting
   */
  get currentFocus() {
    return this.children[this.currentFocusIndex];
  }
  /**
   * Gets the host element
   */
  get element() {
    return this._element();
  }
  get contextName() {
    return this._contextName;
  }
  /**
   * Registers a focusable as a child of this context
   * Elements which are later disabled, hidden or othewise become not available should be unregistered.
   * @param focusable
   * @returns
   */
  register(focusable) {
    if (!focusable) {
      return;
    }
    const foundindex = this._children.indexOf(focusable);
    if (foundindex >= 0) {
      const element = getFocusableElement(focusable);
      console.warn(
        `Component tried to register as focusable multiple times - ${element?.dataset.name}|${element?.className}`
      );
      return;
    }
    this._children.push(focusable);
    this._isDirty = true;
    this._setHasChildren(this._children.length > 0);
  }
  /**
   * Unregisteres a focusable as a child of this context
   * @param focusable
   * @returns
   */
  unregister(focusable) {
    if (!focusable) {
      return;
    }
    const foundindex = this._children.indexOf(focusable);
    if (foundindex < 0) {
      return;
    }
    const activeFocusRemoved = this._currentFocusIndex == foundindex;
    this._children.splice(foundindex, 1);
    if (this._currentFocusIndex >= foundindex || this._currentFocusIndex >= this._children.length) {
      this._currentFocusIndex -= 1;
    }
    this._setHasChildren(this._children.length > 0);
    if (activeFocusRemoved && getFocusableElement(focusable) == document.activeElement) {
      this.focusCurrent();
    }
  }
  /**
   * Propagates navigation events to the registered handler
   * How this is handled is dependent on the component's rules
   * @param action
   * @returns
   */
  navigate(action) {
    return this.navigationHandler(this, action);
  }
  trySetFocus(index) {
    if (index >= this._children.length || index < 0) {
      return false;
    }
    this._currentFocusIndex = index;
    return true;
  }
  /**
   * Tries to set focus to a specific index, the applies DOM focus to the element
   * @param index
   * @returns true if the focus application was successful
   */
  tryApplyFocus(index) {
    if (IsControllerActive() && this.trySetFocus(index)) {
      const focusable = this._children[index];
      getFocusableElement(focusable)?.focus();
      return true;
    }
    return false;
  }
  /**
   * Reapplies focus to the currently focused child
   * @returns
   */
  focusCurrent() {
    return this.tryApplyFocus(this._currentFocusIndex);
  }
  /**
   * Attempts to applies focus to the next element
   * @returns true if the focus update was sucessful and false otherwise
   */
  focusNext() {
    for (let curIndex = this._currentFocusIndex + 1; curIndex < this._children.length; curIndex++) {
      if (this.tryApplyFocus(curIndex)) {
        return true;
      }
    }
    return false;
  }
  /**
   * Attempts to applies focus to the previous element
   * @returns true if the focus update was sucessful and false otherwise
   */
  focusPrevious() {
    for (let curIndex = this._currentFocusIndex - 1; curIndex >= 0; curIndex--) {
      if (this.tryApplyFocus(curIndex)) {
        return true;
      }
    }
    return false;
  }
}
const defaultFocus = new FocusContextProvider(
  () => document.body,
  () => false,
  "default (no focus context)",
  () => false
);
const FocusContext = createContext(defaultFocus);
function isFocusable(element, isFocusable2) {
  const focusContext = useContext(FocusContext);
  element.setAttribute("data-focus-context-name", focusContext.contextName);
  createEffect(() => {
    if (element.isConnected && isFocusable2()) {
      focusContext.register(element);
    } else {
      focusContext.unregister(element);
    }
  });
  onCleanup(() => focusContext.unregister(element));
}
function isContextFocusable(element, args) {
  const parentContext = useContext(FocusContext);
  createEffect(() => {
    const [context, isFocusable2] = args();
    if (element.isConnected && isFocusable2) {
      parentContext.register(context);
    } else {
      parentContext.unregister(context);
    }
  });
  onCleanup(() => {
    const [context] = args();
    parentContext.unregister(context);
  });
}

const ActionButtonMap = /* @__PURE__ */ new Map([
  ["inline-confirm", "accept"],
  ["inline-accept", "accept"],
  ["confirm", "accept"],
  ["cancel", "cancel"],
  ["inline-cancel", "cancel"],
  ["back", "cancel"],
  ["exit", "cancel"],
  ["inline-next-action", "next-action"],
  ["inline-shell-action-1", "shell-action-1"],
  ["inline-shell-action-2", "shell-action-2"],
  ["inline-shell-action-3", "shell-action-3"],
  ["inline-toggle-tooltip", "toggle-tooltip"],
  ["inline-shell-action-5", "shell-action-5"],
  ["inline-swap-plot-selection", "swap-plot-selection"],
  ["inline-notification", "notification"],
  ["pause", "sys-menu"],
  ["sys-menu", "sys-menu"],
  ["inline-sys-menu", "sys-menu"],
  ["inline-nav-shell-previous", "nav-shell-previous"],
  ["inline-nav-shell-next", "nav-shell-next"],
  ["cycle-next", "nav-next"],
  ["inline-cycle-next", "nav-next"],
  ["cycle-prev", "nav-previous"],
  ["cycle-previous", "nav-previous"],
  ["inline-cycle-prev", "nav-previous"],
  ["inline-cycle-previous", "nav-previous"],
  ["unit-city-list", "nav-right"],
  ["inline-unit-city-list", "nav-right"],
  ["diplomacy-panel", "nav-left"],
  ["inline-diplomacy-panel", "nav-left"],
  ["inline-nav-down", "nav-down"],
  ["zoom", "camera-zoom-out"],
  ["inline-next-city", "camera-zoom-in"],
  ["inline-prev-city", "camera-zoom-out"],
  ["inline-zoom", "camera-zoom-out"],
  ["inline-nav-move", "nav-move"],
  ["inline-camera-pan", "camera-pan"],
  ["inline-scroll-pan", "scroll-pan"],
  ["inline-focus-plot-cursor", "focus-plot-cursor"],
  ["inline-toggle-diplo", "toggle-diplo"],
  ["inline-toggle-chat", "toggle-chat"],
  ["inline-open-lens-panel", "open-lens-panel"],
  ["inline-toggle-quest", "toggle-quest"],
  ["inline-toggle-radial-menu", "toggle-radial-menu"],
  ["inline-navigate-yields", "navigate-yields"],
  ["inline-nav-right", "nav-right"]
]);
class HotkeyContextProvider {
  constructor(hostElement) {
    this.hostElement = hostElement;
  }
  inputListener = this.onInput.bind(this);
  hotkeyHandlers = /* @__PURE__ */ new Map();
  mount() {
    this.hostElement()?.addEventListener("engine-input", this.inputListener);
    this.hostElement()?.addEventListener("navigate-input", this.inputListener);
  }
  cleanup() {
    this.hostElement()?.removeEventListener("engine-input", this.inputListener);
    this.hostElement()?.removeEventListener("navigate-input", this.inputListener);
  }
  registerHotkey(eventName, handler) {
    this.hotkeyHandlers.set(eventName, handler);
  }
  unregisterHotkey(eventName) {
    this.hotkeyHandlers.delete(eventName);
  }
  registerNavtray(_eventName, _description) {
  }
  unregisterNavtray(_eventName) {
  }
  onInput(event) {
    if (event.detail.status != InputActionStatuses.FINISH) {
      return;
    }
    const hotkeyHandler = this.hotkeyHandlers.get(event.detail.name);
    if (hotkeyHandler) {
      hotkeyHandler();
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
const HotkeyContext = createContext(new HotkeyContextProvider(() => document.body));
const HotkeyIconContext = createContext();
function registerHotkey(element, args) {
  const hotkeyContext = useContext(HotkeyContext);
  let registedHotkeyAction;
  createEffect(() => {
    const [actionName, isEnabled, hotkeyAction] = args();
    if (!element.isConnected) {
      return;
    }
    if (isEnabled) {
      if (actionName && hotkeyAction) {
        hotkeyContext.registerHotkey(actionName, hotkeyAction);
        registedHotkeyAction = actionName;
      }
    } else if (registedHotkeyAction) {
      hotkeyContext.unregisterHotkey(registedHotkeyAction);
      registedHotkeyAction = void 0;
    }
  });
  onCleanup(() => {
    if (registedHotkeyAction) {
      hotkeyContext.unregisterHotkey(registedHotkeyAction);
      registedHotkeyAction = void 0;
    }
  });
}
function registerNavTray(element, args) {
  const hotkeyContext = useContext(HotkeyContext);
  let registedDescription;
  createEffect(() => {
    const [actionName, isEnabled, description] = args();
    if (!element.isConnected) {
      return;
    }
    if (isEnabled) {
      if (actionName && description) {
        hotkeyContext.registerNavtray(actionName, description);
        registedDescription = actionName;
      }
    } else if (registedDescription) {
      hotkeyContext.unregisterNavtray(registedDescription);
      registedDescription = void 0;
    }
  });
  onCleanup(() => {
    if (registedDescription) {
      hotkeyContext.unregisterNavtray(registedDescription);
      registedDescription = void 0;
    }
  });
}

function createArraySignal(defaultValue = []) {
  const [value, setValue] = createSignal(defaultValue, { equals: () => false });
  const mutator = (mutator2) => {
    mutator2(value());
    setValue(value());
  };
  return [value, mutator];
}
function createPropsRefSignal(propsRef) {
  const [value, setValue] = createSignal();
  createEffect(() => propsRef?.(value()));
  return [value, setValue];
}
function createLayoutComplete() {
  const [layoutComplete, setLayoutComplete] = createSignal(false);
  onMount(() => requestAnimationFrame(() => requestAnimationFrame(() => setLayoutComplete(true))));
  return layoutComplete;
}

var _tmpl$$b = /* @__PURE__ */ template(`<div></div>`);
const PROTECTED_IMPORTS = [isFocusable, registerHotkey, registerNavTray];
const FEEDBACK_LOW = 20;
const FEEDBACK_HIGH = 20;
const FEEDBACK_DURATION = 100;
const ActivatableComponent = (props) => {
  const audioContext = useContext(AudioGroupContext);
  const triggerContext = useContext(TriggerActivationContext);
  const hotkeyIconProvider = createMemo(() => props.hotkeyAction ?? "accept");
  const [root, setRoot] = createPropsRefSignal(() => props.ref);
  const [isPressed, setIsPressed] = createSignal(false);
  const onMouseEnter = () => {
    audioContext().playSound("data-audio-focus", root());
    triggerContext?.trigger(TriggerType.Focus, root());
  };
  const onMouseLeave = () => {
    triggerContext?.trigger(TriggerType.Blur, root());
  };
  const onFocus = () => {
    Input.triggerForceFeedback(FEEDBACK_LOW, FEEDBACK_HIGH, FEEDBACK_DURATION);
    if (props.onFocus) {
      props.onFocus();
    }
    triggerContext?.trigger(TriggerType.Focus, root());
  };
  const onBlur = () => {
    if (props.onBlur) {
      props.onBlur();
    }
    triggerContext?.trigger(TriggerType.Blur, root());
  };
  const onEngineInput = (inputEvent) => {
    const isStart = inputEvent.detail.status == InputActionStatuses.START;
    const isFinish = inputEvent.detail.status == InputActionStatuses.FINISH;
    if (!isStart && !isFinish) {
      return;
    }
    if (inputEvent.detail.name == "touch-touch") {
      setIsPressed(true);
      inputEvent.stopPropagation();
      inputEvent.preventDefault();
      return;
    }
    if (inputEvent.detail.name == "mousebutton-left" || inputEvent.detail.name == "accept" || inputEvent.detail.name == "touch-tap" || inputEvent.detail.name == "keyboard-enter") {
      if (props.disabled) {
        if (isStart) {
          audioContext().playSound("data-audio-error-press", root());
        }
      } else {
        if (isStart) {
          audioContext().playSound("data-audio-press", root());
        } else {
          audioContext().playSound("data-audio-activate", root());
          props.onActivate?.();
          triggerContext?.trigger(TriggerType.Activate, root());
          inputEvent.preventDefault();
          inputEvent.stopPropagation();
        }
      }
    }
  };
  return (() => {
    var _el$ = _tmpl$$b();
    use(registerNavTray, _el$, () => [props.hotkeyAction, props.disabled != true, props.navTrayText]);
    use(registerHotkey, _el$, () => [props.hotkeyAction, props.disabled != true, props.onActivate]);
    use(isFocusable, _el$, () => !props.disabled && !props.disableFocus);
    use(setRoot, _el$);
    spread(_el$, mergeProps(props, {
      get role() {
        return props.role ?? "button";
      },
      get ["class"]() {
        return `pointer-events-auto ${props.class ?? ""}`;
      },
      get classList() {
        return {
          ...props.classList,
          disabled: props.disabled,
          "cursor-not-allowed": props.disabled,
          "cursor-pointer": !props.disabled,
          pressed: isPressed()
        };
      },
      get tabIndex() {
        return props.tabIndex ?? -1;
      },
      get ["data-audio-group-ref"]() {
        return props.audio?.group;
      },
      get ["data-audio-press-ref"]() {
        return props.audio?.onPress;
      },
      get ["data-audio-activate-ref"]() {
        return props.audio?.onActivate;
      },
      get ["data-audio-error-press-ref"]() {
        return props.audio?.onError;
      },
      get ["data-audio-focus-ref"]() {
        return props.audio?.onFocus;
      },
      get ["data-name"]() {
        return props.name ?? "Activatable";
      },
      "data-activatable": "true",
      "on:focus": onFocus,
      "on:blur": onBlur,
      "onMouseEnter": onMouseEnter,
      "onMouseLeave": onMouseLeave,
      "on:engine-input": onEngineInput
    }), false, true);
    insert(_el$, createComponent(HotkeyIconContext.Provider, {
      value: hotkeyIconProvider,
      get children() {
        return props.children;
      }
    }));
    return _el$;
  })();
};
const Activatable = ComponentRegistry.register("Activatable", ActivatableComponent);

var _tmpl$$a = /* @__PURE__ */ template(`<div class="absolute inset-0 opacity-0 bg-herobutton-gradient"></div>`), _tmpl$2$3 = /* @__PURE__ */ template(`<div class="absolute inset-x-0 top-0 bottom-0 flex flex-row"><div class="flex-1 bg-herobutton-sideframe"></div><div class="flex-1 bg-herobutton-sideframe -rotate-y-180"></div><div class="absolute inset-0 flex justify-center"><div class="w-11 bg-herobutton-centerpiece"></div></div></div>`), _tmpl$3$1 = /* @__PURE__ */ template(`<div class="relative flex flex-row py-3 px-5 justify-center items-center"></div>`), _tmpl$4$1 = /* @__PURE__ */ template(`<div class="absolute inset-0 opacity-0 hero-button-2-gradient"></div>`), _tmpl$5$1 = /* @__PURE__ */ template(`<div class="absolute inset-0 flex flex-row"><div class="flex-1 hero-button-2-sideframe"></div><div class="flex-1 hero-button-2-sideframe -rotate-y-180"></div><div class="absolute inset-0 flex justify-center"><div class=hero-button-2-centerpiece></div></div></div>`), _tmpl$6$1 = /* @__PURE__ */ template(`<div class="relative flex flex-row py-3 px-7 justify-center items-center"></div>`);
const HeroButtonComponent = (props) => {
  props.audio ??= {};
  props.audio.onActivate ??= "data-audio-hero-activate";
  props.audio.onPress ??= "data-audio-hero-press";
  props.audio.onFocus ??= "data-audio-hero-focus";
  return createComponent(Activatable, mergeProps(props, {
    get ["class"]() {
      return `fxs-hero-button relative flex h-13 items-center justify-center min-w-80 font-title uppercase text-base text-accent-1 tracking-150 mt-6 ${props.class}`;
    },
    name: "HeroButton",
    get children() {
      return [_tmpl$$a(), _tmpl$2$3(), (() => {
        var _el$3 = _tmpl$3$1();
        insert(_el$3, () => props.children);
        return _el$3;
      })()];
    }
  }));
};
const HeroButton = ComponentRegistry.register({
  name: "HeroButton",
  createInstance: HeroButtonComponent,
  images: ["blp:hud_herobutton_centerpiece", "blp:hud_herobutton_centerpiece-dis", "blp:hud_herobutton_sideframe", "blp:hud_herobutton_sideframe-dis"]
});
const HeroButton2Component = (props) => {
  props.audio ??= {};
  props.audio.onActivate ??= "data-audio-hero-activate";
  props.audio.onPress ??= "data-audio-hero-press";
  props.audio.onFocus ??= "data-audio-hero-focus";
  return createComponent(Activatable, mergeProps(props, {
    get ["class"]() {
      return `hero-button-2 relative flex h-13 items-center justify-center min-w-80 font-title uppercase text-base text-accent-1 tracking-150 mt-4 ${props.class}`;
    },
    get classList() {
      return {
        ...props.classList,
        disabled: props.disabled
      };
    },
    name: "HeroButton2",
    get children() {
      return [_tmpl$4$1(), (() => {
        var _el$5 = _tmpl$5$1(), _el$6 = _el$5.firstChild, _el$7 = _el$6.nextSibling, _el$8 = _el$7.nextSibling, _el$9 = _el$8.firstChild;
        createRenderEffect((_p$) => {
          var _v$ = !!props.disabled, _v$2 = !!props.disabled, _v$3 = !!props.disabled;
          _v$ !== _p$.e && _el$6.classList.toggle("disabled", _p$.e = _v$);
          _v$2 !== _p$.t && _el$7.classList.toggle("disabled", _p$.t = _v$2);
          _v$3 !== _p$.a && _el$9.classList.toggle("disabled", _p$.a = _v$3);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        });
        return _el$5;
      })(), (() => {
        var _el$10 = _tmpl$6$1();
        insert(_el$10, () => props.children);
        return _el$10;
      })()];
    }
  }));
};
const HeroButton2 = ComponentRegistry.register({
  name: "HeroButton2",
  createInstance: HeroButton2Component,
  images: ["blp:hud_herobutton_centerpiece2", "blp:hud_herobutton_centerpiece2-dis", "blp:hud_herobutton2_sideframe", "blp:hud_herobutton2_sideframe-dis"]
});

const ViewExperience = createMemo(() => UI.getViewExperience());

var _tmpl$$9 = /* @__PURE__ */ template(`<div></div>`), _tmpl$2$2 = /* @__PURE__ */ template(`<div class="absolute inset-0 opacity-0 group-hover\\:opacity-100 group-focus\\:opacity-100 transition-opacity"></div>`);
const RadioButtonComponent = (props) => {
  props.audio ??= {};
  props.audio.group = "radio-button";
  const isLarge = createMemo(() => props.isLarge || ViewExperience() == UIViewExperience.Mobile);
  return createComponent(Activatable, mergeProps(props, {
    get ["class"]() {
      return `img-radio-button group cursor-pointer pointer-events-auto relative flex justify-center items-center ${props.class}`;
    },
    get classList() {
      return {
        "size-8": !isLarge(),
        "size-10": isLarge()
      };
    },
    name: "RadioButton",
    get children() {
      return [(() => {
        var _el$ = _tmpl$$9();
        createRenderEffect((_p$) => {
          var _v$ = !isLarge(), _v$2 = !!isLarge(), _v$3 = !props.isChecked;
          _v$ !== _p$.e && _el$.classList.toggle("img-radio-button-ball", _p$.e = _v$);
          _v$2 !== _p$.t && _el$.classList.toggle("img-radio-button-ball-lg", _p$.t = _v$2);
          _v$3 !== _p$.a && _el$.classList.toggle("opacity-0", _p$.a = _v$3);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        });
        return _el$;
      })(), (() => {
        var _el$2 = _tmpl$2$2();
        createRenderEffect((_p$) => {
          var _v$4 = !props.isChecked, _v$5 = !!props.isChecked;
          _v$4 !== _p$.e && _el$2.classList.toggle("img-radio-button-focus", _p$.e = _v$4);
          _v$5 !== _p$.t && _el$2.classList.toggle("img-radio-button-on-focus", _p$.t = _v$5);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        return _el$2;
      })()];
    }
  }));
};
const RadioButton = ComponentRegistry.register({
  name: "Pip",
  createInstance: RadioButtonComponent,
  images: ["blp:base_radio-bg.png", "blp:base_radio-ball.png", "blp:base_radio-ball.png", "blp:base_radio-bg-focus.png", "blp:base_radio-bg-on-focus.png"]
});

var _tmpl$$8 = /* @__PURE__ */ template(`<div class="absolute inset-0 img-arrow-disabled transition-opacity"></div>`);
const ArrowButtonComponent = (props) => {
  props.audio ??= {};
  props.audio.group ??= "audio-pager";
  const isHidden = createMemo(() => props.hideForController && IsControllerActive());
  return createComponent(Activatable, mergeProps(props, {
    get ["class"]() {
      return `img-arrow-hover ${props.class ?? ""}`;
    },
    get classList() {
      return {
        "-scale-x-100": props.right,
        hidden: isHidden()
      };
    },
    name: "ArrowButton",
    get children() {
      var _el$ = _tmpl$$8();
      createRenderEffect((_p$) => {
        var _v$ = !props.disabled, _v$2 = !!props.disabled, _v$3 = !!props.right;
        _v$ !== _p$.e && _el$.classList.toggle("opacity-0", _p$.e = _v$);
        _v$2 !== _p$.t && _el$.classList.toggle("opacity-1", _p$.t = _v$2);
        _v$3 !== _p$.a && _el$.classList.toggle("-scale-x-100", _p$.a = _v$3);
        return _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      });
      return _el$;
    }
  }));
};
const ArrowButton = ComponentRegistry.register({
  name: "ArrowButton",
  createInstance: ArrowButtonComponent,
  images: ["blp:base_component-arrow.png", "blp:base_component-arrow_dis.png"]
});

var _tmpl$$7 = /* @__PURE__ */ template(`<div></div>`);
const IconComponent = (props) => {
  const iconUrl = createMemo(() => {
    if (!props.name) {
      return void 0;
    }
    return (props.isUrl ? props.name : UI.getIconCSS(props.name, props.context)) || props.name;
  });
  return (() => {
    var _el$ = _tmpl$$7();
    spread(_el$, mergeProps(props, {
      get ["class"]() {
        return `bg-center bg-contain bg-no-repeat ${props.class}`;
      },
      get style() {
        return {
          "background-image": iconUrl()
        };
      },
      "data-name": "Icon"
    }), false, true);
    insert(_el$, () => props.children);
    return _el$;
  })();
};
const Icon = ComponentRegistry.register("Icon", IconComponent);

const NavHelpComponent = (props) => {
  const iconContext = useContext(HotkeyIconContext);
  const iconCssUrl = createMemo(() => {
    const actionName = props.actionName ?? iconContext?.();
    if (!actionName) {
      return void 0;
    }
    const gamepadActionName = IsControllerActive() ? ActionButtonMap.get(actionName.toLowerCase()) ?? actionName : actionName;
    const iconUrl = Icon$1.getIconFromActionName(gamepadActionName) ?? void 0;
    return iconUrl ? `url(${iconUrl})` : void 0;
  });
  return createComponent(Icon, {
    get ["class"]() {
      return `size-8 ${props.class ?? ""} ${!IsControllerActive() || props.disabled ? "hidden" : ""}`;
    },
    get name() {
      return iconCssUrl();
    },
    isUrl: true,
    "data-name": "NavHelp"
  });
};
const NavHelp = ComponentRegistry.register("NavHelp", NavHelpComponent);

var _tmpl$$6 = /* @__PURE__ */ template(`<div></div>`), _tmpl$2$1 = /* @__PURE__ */ template(`<div><div class="absolute inset-0 img-tab-bar"></div><div class="absolute -left-1 img-tab-end-cap pointer-events-none left-border"></div><div class="absolute -right-1 rotate-y-180 img-tab-end-cap pointer-events-none right-border"></div><div class="absolute bottom-0 left-0 img-tab-selection-indicator bg-no-repeat bg-center min-h-6 bg-contain transition-left duration-150"></div></div>`);
class TabContextProvider {
  _active;
  _setActive;
  _tabs;
  _mutateTabs;
  _isActive;
  defaultTab;
  get active() {
    return this._active;
  }
  get tabs() {
    return this._tabs;
  }
  get isActive() {
    return this._isActive;
  }
  constructor() {
    const [active, setActive] = createSignal();
    this._active = active;
    this._setActive = setActive;
    const [tabs, mutateTabs] = createArraySignal();
    this._tabs = tabs;
    this._mutateTabs = mutateTabs;
    this._isActive = createSelector(() => this._active()?.name);
  }
  onTrigger(name, type) {
    if (type == TriggerType.Activate) {
      this.activate(name);
    }
  }
  register(tab) {
    const foundTabIndex = this._tabs().findIndex((t) => t.name == tab.name);
    if (foundTabIndex >= 0) {
      this._mutateTabs((tabs) => tabs[foundTabIndex] = tab);
    } else {
      this._mutateTabs((tabs) => tabs.push(tab));
    }
    if (!this._active() && (!this.defaultTab || tab.name == this.defaultTab)) {
      this._setActive(tab);
    }
  }
  unregister(tabName) {
    const foundTabIndex = this._tabs().findIndex((t) => t.name == tabName);
    if (foundTabIndex >= 0) {
      this._mutateTabs((tabs) => tabs.splice(foundTabIndex, 1));
    }
  }
  activate(tabName) {
    const tab = this._tabs().find((t) => t.name == tabName);
    if (tab) {
      this._setActive(tab);
    }
  }
  activateNext() {
    const active = this._active();
    if (active) {
      let activeIndex = this._tabs().indexOf(active) + 1;
      if (activeIndex >= this._tabs().length) {
        activeIndex = 0;
      }
      this._setActive(this._tabs()[activeIndex]);
    }
  }
  activatePrevious() {
    const active = this._active();
    if (active) {
      let activeIndex = this._tabs().indexOf(active) - 1;
      if (activeIndex < 0) {
        activeIndex = this._tabs().length - 1;
      }
      this._setActive(this._tabs()[activeIndex]);
    }
  }
  setDefaultTab(tabName) {
    this.activate(tabName);
    this.defaultTab = tabName;
  }
}
const TabContext = createContext();
const TabComponent = (props) => {
  const contextProvider = new TabContextProvider();
  createEffect(() => {
    props.onTabChanged?.(contextProvider.active());
  });
  createEffect(() => {
    if (props.defaultTab) {
      contextProvider.setDefaultTab(props.defaultTab);
    }
  });
  return (() => {
    var _el$ = _tmpl$$6();
    var _ref$ = props.ref;
    typeof _ref$ === "function" ? use(_ref$, _el$) : props.ref = _el$;
    spread(_el$, mergeProps(props, {
      get ["class"]() {
        return props.class ?? "flex flex-row";
      },
      "data-name": "Tab"
    }), false, true);
    insert(_el$, createComponent(TabContext.Provider, {
      value: contextProvider,
      get children() {
        return props.children;
      }
    }));
    return _el$;
  })();
};
const TabOutputComponent = (props) => {
  const tabContext = useContext(TabContext);
  return createComponent(Dynamic, {
    ref(r$) {
      var _ref$2 = props.ref;
      typeof _ref$2 === "function" ? _ref$2(r$) : props.ref = r$;
    },
    get component() {
      return tabContext?.active()?.body;
    }
  });
};
const TabTitleComponent = () => {
  const tabContext = useContext(TabContext);
  return createComponent(Dynamic, {
    get component() {
      return tabContext?.active()?.title;
    }
  });
};
const TabItemComponent = (props) => {
  const tabContext = useContext(TabContext);
  onMount(() => tabContext?.register(props));
  onCleanup(() => tabContext?.unregister(props.name));
  return null;
};
const TabListItem = (props) => {
  return createComponent(Activatable, {
    ref(r$) {
      var _ref$3 = props.ref;
      typeof _ref$3 === "function" ? _ref$3(r$) : props.ref = r$;
    },
    "class": "relative flex items-center justify-center font-fit-shrink text-center flex-1 cursor-pointer",
    get classList() {
      return {
        "text-secondary": props.selected && !props.disabled,
        "text-accent-1": !props.selected && !props.disabled,
        "text-accent-5": props.disabled
      };
    },
    disableFocus: true,
    name: "TabListItem",
    get children() {
      return props.children;
    }
  });
};
const TabListComponent = (props) => {
  const tabContext = useContext(TabContext);
  const focusContext = useContext(FocusContext);
  const [root, setRoot] = createPropsRefSignal(() => props.ref);
  const layoutComplete = createLayoutComplete();
  let selectionIndicator;
  const showNavHelp = createMemo(() => props.showNavHelp ?? true);
  const nextHotkey = createMemo(() => props.nextHotkey ?? "nav-next");
  const prevHotkey = createMemo(() => props.previousHotkey ?? "nav-previous");
  createEffect(() => {
    const resolvedRoot = root();
    if (!resolvedRoot || !selectionIndicator || !layoutComplete()) {
      return;
    }
    const selectedTab = tabContext?.active()?.ref;
    if (!selectedTab) {
      return;
    }
    const rootRect = resolvedRoot.getBoundingClientRect();
    const tabRect = selectedTab.getBoundingClientRect();
    selectionIndicator.style.left = `${tabRect.left - rootRect.left}px`;
    selectionIndicator.style.width = `${tabRect.width}px`;
  });
  const navigateNextTab = () => {
    tabContext?.activateNext();
    focusContext.focusCurrent();
  };
  const navigatePreviousTab = () => {
    tabContext?.activatePrevious();
    focusContext.focusCurrent();
  };
  return (() => {
    var _el$2 = _tmpl$2$1(), _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, _el$5 = _el$4.nextSibling, _el$6 = _el$5.nextSibling;
    use(setRoot, _el$2);
    spread(_el$2, mergeProps(props, {
      get ["class"]() {
        return `flex flex-row items-stretch justify-stretch relative uppercase font-title text-base text-accent-2 tracking-150 min-h-16 px-4 ${props.class ?? ""}`;
      },
      "data-name": "TabList"
    }), false, true);
    insert(_el$2, createComponent(Show, {
      get when() {
        return showNavHelp();
      },
      get children() {
        return createComponent(Activatable, {
          "class": "absolute top-4 left-0",
          disableFocus: true,
          get disabled() {
            return props.disabled;
          },
          get hotkeyAction() {
            return prevHotkey();
          },
          onActivate: navigatePreviousTab,
          get children() {
            return createComponent(NavHelp, {});
          }
        });
      }
    }), _el$6);
    insert(_el$2, createComponent(For, {
      get each() {
        return tabContext?.tabs();
      },
      children: (tab) => createComponent(Tab.Trigger, {
        get name() {
          return tab.name;
        },
        get children() {
          return createComponent(TabListItem, {
            ref(r$) {
              var _ref$5 = tab.ref;
              typeof _ref$5 === "function" ? _ref$5(r$) : tab.ref = r$;
            },
            get disabled() {
              return (props.disabled || tab.disabled) ?? false;
            },
            get selected() {
              return tabContext?.isActive(tab.name) || false;
            },
            get children() {
              return tab.title();
            }
          });
        }
      })
    }), _el$6);
    insert(_el$2, createComponent(Show, {
      get when() {
        return showNavHelp();
      },
      get children() {
        return createComponent(Activatable, {
          "class": "absolute top-4 right-0",
          disableFocus: true,
          get disabled() {
            return props.disabled;
          },
          get hotkeyAction() {
            return nextHotkey();
          },
          onActivate: navigateNextTab,
          get children() {
            return createComponent(NavHelp, {});
          }
        });
      }
    }), _el$6);
    var _ref$4 = selectionIndicator;
    typeof _ref$4 === "function" ? use(_ref$4, _el$6) : selectionIndicator = _el$6;
    return _el$2;
  })();
};
const TabListPipsComponent = (props) => {
  const tabContext = useContext(TabContext);
  const focusContext = useContext(FocusContext);
  const showNavHelp = createMemo(() => props.showNavHelp ?? true);
  const nextHotkey = createMemo(() => props.nextHotkey ?? "nav-next");
  const prevHotkey = createMemo(() => props.previousHotkey ?? "nav-previous");
  const navigateNextTab = () => {
    tabContext?.activateNext();
    focusContext.focusCurrent();
  };
  const navigatePreviousTab = () => {
    tabContext?.activatePrevious();
    focusContext.focusCurrent();
  };
  return (() => {
    var _el$7 = _tmpl$$6();
    spread(_el$7, mergeProps(props, {
      get ["class"]() {
        return `flex flex-row items-center justify-center ${props.class ?? ""}`;
      },
      "data-name": "TabListPips"
    }), false, true);
    insert(_el$7, createComponent(ArrowButton, {
      "class": "mr-1 -my-1",
      hideForController: true,
      disableFocus: true,
      get disabled() {
        return props.disabled;
      },
      onActivate: navigatePreviousTab
    }), null);
    insert(_el$7, createComponent(Show, {
      get when() {
        return showNavHelp();
      },
      get children() {
        return createComponent(Activatable, {
          "class": "mr-1",
          disableFocus: true,
          get disabled() {
            return props.disabled;
          },
          get hotkeyAction() {
            return prevHotkey();
          },
          onActivate: navigatePreviousTab,
          get children() {
            return createComponent(NavHelp, {
              "class": "size-10"
            });
          }
        });
      }
    }), null);
    insert(_el$7, createComponent(For, {
      get each() {
        return tabContext?.tabs();
      },
      children: (tab) => createComponent(Tab.Trigger, {
        get name() {
          return tab.name;
        },
        get children() {
          return createComponent(RadioButton, {
            disableFocus: true,
            get isChecked() {
              return tabContext?.isActive(tab.name) || false;
            }
          });
        }
      })
    }), null);
    insert(_el$7, createComponent(Show, {
      get when() {
        return showNavHelp();
      },
      get children() {
        return createComponent(Activatable, {
          "class": "ml-1",
          disableFocus: true,
          get disabled() {
            return props.disabled;
          },
          get hotkeyAction() {
            return nextHotkey();
          },
          onActivate: navigateNextTab,
          get children() {
            return createComponent(NavHelp, {
              "class": "size-10"
            });
          }
        });
      }
    }), null);
    insert(_el$7, createComponent(ArrowButton, {
      "class": "ml-1 -my-1",
      hideForController: true,
      right: true,
      disableFocus: true,
      get disabled() {
        return props.disabled;
      },
      onActivate: navigateNextTab
    }), null);
    return _el$7;
  })();
};
const Tab = ComponentRegistry.register("Tab", TabComponent);
Tab.Item = ComponentRegistry.register("Tab.Item", TabItemComponent);
Tab.Output = ComponentRegistry.register("Tab.Output", TabOutputComponent);
Tab.Title = ComponentRegistry.register("Tab.Title", TabTitleComponent);
Tab.Trigger = ComponentRegistry.register("Tab.Trigger", createTrigger(TabContext));
Tab.TabList = ComponentRegistry.register({
  name: "Tab.TabList",
  createInstance: TabListComponent,
  images: ["blp:base_tabbar-selector.png"]
});
Tab.TabListPips = ComponentRegistry.register("Tab.TabListPips", TabListPipsComponent);

function getCivLoadingInfo() {
  const gameConfig = Configuration.getGame();
  const playerConfig = Configuration.getPlayer(GameContext.localPlayerID);
  if (!gameConfig || !playerConfig) {
    return null;
  }
  const ageTypeName = gameConfig.startAgeName;
  const leaderTypeName = playerConfig.leaderTypeName;
  const civTypeName = playerConfig.civilizationTypeName;
  if (ageTypeName && civTypeName && leaderTypeName) {
    const loadingInfos = GameInfo.LoadingInfo_Civilizations.filter((info) => {
      const ageTypeOverride = info.AgeTypeOverride;
      const leaderTypeOverride = info.LeaderTypeOverride;
      return info.CivilizationType == civTypeName && (ageTypeOverride == null || ageTypeOverride == ageTypeName) && (leaderTypeOverride == null || leaderTypeOverride == leaderTypeName);
    });
    loadingInfos.sort((a, b) => {
      const a_score = (a.LeaderTypeOverride ? 10 : 0) + (a.AgeTypeOverride ? 1 : 0);
      const b_score = (b.LeaderTypeOverride ? 10 : 0) + (b.AgeTypeOverride ? 1 : 0);
      return a_score - b_score;
    });
    if (loadingInfos.length > 0) {
      return loadingInfos[0];
    }
  }
  return null;
}
function getLeaderLoadingInfo() {
  const gameConfig = Configuration.getGame();
  const playerConfig = Configuration.getPlayer(GameContext.localPlayerID);
  if (!gameConfig || !playerConfig) {
    return null;
  }
  const ageTypeName = gameConfig.startAgeName;
  const leaderTypeName = playerConfig.leaderTypeName;
  const civTypeName = playerConfig.civilizationTypeName;
  if (ageTypeName && civTypeName && leaderTypeName) {
    const loadingInfos = GameInfo.LoadingInfo_Leaders.filter((info) => {
      const ageTypeOverride = info.AgeTypeOverride;
      const civTypeOverride = info.CivilizationTypeOverride;
      return info.LeaderType == leaderTypeName && (ageTypeOverride == null || ageTypeOverride == ageTypeName) && (civTypeOverride == null || civTypeOverride == civTypeName);
    });
    loadingInfos.sort((a, b) => {
      const a_score = (a.CivilizationTypeOverride ? 10 : 0) + (a.AgeTypeOverride ? 1 : 0);
      const b_score = (b.CivilizationTypeOverride ? 10 : 0) + (b.AgeTypeOverride ? 1 : 0);
      return a_score - b_score;
    });
    if (loadingInfos.length > 0) {
      return loadingInfos[0];
    }
  }
  return null;
}
function createLeaderModel(playerConfig, loadingLeaderInfo) {
  const leaderName = loadingLeaderInfo?.LeaderNameTextOverride ?? playerConfig.leaderName ?? "ERROR: Missing Leader Name";
  const leaderDescription = loadingLeaderInfo?.LeaderText ?? "";
  const leaderType = playerConfig.leaderTypeName;
  const leaderBonusItems = Database.query("config", "select * from LeaderItems order by SortIndex")?.filter(
    (item) => item.LeaderType == leaderType
  );
  const leaderTrait = leaderBonusItems?.find((item) => item.Kind == "KIND_TRAIT");
  const tags = Database.query(
    "config",
    "select * from LeaderTags inner join Tags on LeaderTags.TagType = Tags.TagType inner join TagCategories on Tags.TagCategoryType = TagCategories.TagCategoryType"
  )?.filter((tag) => !tag.HideInDetails && tag.LeaderType == leaderType).map((tag) => tag.Name) ?? [];
  return {
    name: leaderName,
    description: leaderDescription,
    attributes: tags,
    abilityType: "LOC_LOADING_LEADER_ABILITY",
    abilityName: leaderTrait?.Name ?? "",
    abilityDescription: leaderTrait?.Description ?? ""
  };
}
function createCivModel(playerConfig, loadingCivInfo) {
  const civName = loadingCivInfo?.CivilizationNameTextOverride ?? playerConfig.civilizationFullName ?? playerConfig.civilizationName ?? "ERROR: Missing Civilizaiton Name";
  const civType = playerConfig.civilizationTypeName;
  const tags = Database.query(
    "config",
    "select * from CivilizationTags inner join Tags on CivilizationTags.TagType = Tags.TagType inner join TagCategories on Tags.TagCategoryType = TagCategories.TagCategoryType"
  )?.filter((tag) => !tag.HideInDetails && tag.CivilizationType == civType).map((tag) => tag.Name) ?? [];
  const civItems = Database.query("config", "select * from CivilizationItems order by SortIndex")?.filter(
    (item) => item.CivilizationType == civType
  ) ?? [];
  const ability = civItems.find((item) => item.Kind == "KIND_TRAIT");
  return {
    name: civName,
    description: loadingCivInfo?.CivilizationText ?? "",
    attributes: tags,
    abilityType: "LOC_LOADING_CIVILIZATION_ABILITY",
    abilityName: ability?.Name ?? "",
    abilityDescription: ability?.Description ?? ""
  };
}
function convertConstructibleDefToModel(constructible) {
  return {
    name: constructible.Name,
    description: constructible.Description ? constructible.Description : "",
    icon: UI.getIconCSS(constructible.ConstructibleType, "BUILDING") ?? "",
    isUniqueQuarter: false
  };
}
function createConstructiblesModel(civTrait) {
  const constructiblesModel = [];
  const uniqueQuarters = GameInfo.UniqueQuarters.filter((q) => q.TraitType == civTrait?.TraitType);
  for (const uniqueQuarter of uniqueQuarters) {
    constructiblesModel.push({
      name: uniqueQuarter.Name,
      description: uniqueQuarter.Description,
      icon: 'url("blp:city_uniquequarter")',
      isUniqueQuarter: true
    });
  }
  const buildings = GameInfo.Buildings.filter((b) => b.TraitType == civTrait?.TraitType).map(
    (building) => GameInfo.Constructibles.lookup(building.ConstructibleType)
  );
  for (const building of buildings) {
    if (building) {
      constructiblesModel.push(convertConstructibleDefToModel(building));
    }
  }
  const improvements = GameInfo.Improvements.filter((i) => i.TraitType == civTrait?.TraitType).map(
    (improvement) => GameInfo.Constructibles.lookup(improvement.ConstructibleType)
  );
  for (const improvement of improvements) {
    if (improvement) {
      constructiblesModel.push(convertConstructibleDefToModel(improvement));
    }
  }
  return constructiblesModel;
}
function createUnitsModel(civTrait) {
  const units = [];
  for (const unit of GameInfo.Units.filter((u) => u.TraitType == civTrait?.TraitType)) {
    const query = "SELECT Description from CivilizationItems where Type=?";
    const baseDescription = Database.query("config", query, unit.UnitType)?.[0]?.Description;
    if (baseDescription) {
      units.push({
        name: unit.Name,
        description: baseDescription,
        icon: UI.getIconCSS(unit.UnitType, "UNIT_FLAG")
      });
    }
  }
  return units;
}
function createTraditionsModel(civTrait) {
  const traditions = [];
  const foundTraditions = GameInfo.Traditions.filter((t) => t.TraitType == civTrait?.TraitType);
  for (const tradition of foundTraditions) {
    if (!tradition.IsCrisis) {
      let civicName = "";
      const unlockNode = GameInfo.ProgressionTreeNodeUnlocks.find(
        (node) => node.TargetType == tradition.TraditionType
      );
      if (unlockNode) {
        const node = GameInfo.ProgressionTreeNodes.find(
          (node2) => node2.ProgressionTreeNodeType == unlockNode.ProgressionTreeNodeType
        );
        civicName = node?.Name ?? "";
      }
      traditions.push({ name: tradition.Name, description: tradition.Description ?? "", civic: civicName });
    }
  }
  return traditions;
}
function createMementosModel() {
  const mementoData = [];
  const equippedMementos = [
    {
      mementoType: Configuration.getPlayer(GameContext.localPlayerID).getValue("MajorMemento"),
      slotType: "PlayerMementoMajorSlot"
    },
    {
      mementoType: Configuration.getPlayer(GameContext.localPlayerID).getValue("MinorMemento1"),
      slotType: "PlayerMementoMinorSlot1"
    }
  ];
  const mementoSlots = Online.Metaprogression.getMementoSlotData();
  for (const slot of mementoSlots) {
    const equippedType = equippedMementos.find((e) => e.slotType == slot.mementoTypeId)?.mementoType;
    if (equippedType) {
      const memento = GameInfo.Mementos.filter((m) => m.MementoType == equippedType)[0];
      const icon = Database.query(
        "config",
        `SELECT CustomData AS Icon FROM Rewards WHERE GameItemID='${equippedType}'`
      )?.[0]?.Icon;
      if (slot.displayType != DisplayType.DISPLAY_HIDDEN) {
        mementoData.push({
          isLocked: slot.displayType == DisplayType.DISPLAY_LOCKED,
          isEmpty: equippedType == "NONE",
          unlockReason: slot.unlockTitle,
          name: memento?.Name ?? "",
          description: memento?.FunctionalDescription ?? "",
          flavorText: memento?.Description ?? "",
          icon: icon ? `url("blp:${icon}")` : void 0
        });
      }
    }
  }
  return mementoData;
}
function createLoadScreenInfo() {
  const leaderInfo = getLeaderLoadingInfo();
  const civInfo = getCivLoadingInfo();
  const playerConfig = Configuration.getPlayer(GameContext.localPlayerID);
  if (!playerConfig) {
    return;
  }
  if (!playerConfig.leaderTypeName || !playerConfig.civilizationTypeName) {
    console.error("Missing necessary data for loading screen.");
    return;
  }
  const civTrait = GameInfo.LegacyCivilizationTraits.lookup(playerConfig.civilizationTypeName);
  const leaderImagePath = leaderInfo?.LeaderImage;
  const leaderImage = leaderImagePath ? `url(${leaderImagePath})` : "";
  const civImagePath = window.innerWidth >= 1080 ? civInfo?.BackgroundImageHigh : civInfo?.BackgroundImageLow;
  const civImage = civImagePath ? `url(${civImagePath})` : "";
  const tipText = civInfo?.Tip ?? "";
  return {
    data: {
      backgroundImage: civImage,
      leaderImage,
      tipText,
      leaderInfo: createLeaderModel(playerConfig, leaderInfo),
      civInfo: createCivModel(playerConfig, civInfo),
      unitInfo: createUnitsModel(civTrait),
      constructibleInfo: createConstructiblesModel(civTrait),
      traditionInfo: createTraditionsModel(civTrait),
      mementoInfo: createMementosModel()
    },
    audio: {
      leaderAudioTag: leaderInfo?.Audio,
      civAudioTag: civInfo?.Audio
    }
  };
}
function reloadStyles() {
  window.removeEventListener("global-scaling-ready", reloadStyles);
  const stylesheets = document.head.querySelectorAll("link[rel=stylesheet]");
  for (const stylesheet of stylesheets) {
    stylesheet.href.replace(/\?.*|$/, "?" + Date.now());
  }
}
function createLoadScreenModel() {
  const gameConfig = Configuration.getGame();
  const startOnCivTab = gameConfig.isSavedGame || gameConfig.previousAgeCount > 0;
  let loadScreenInfo;
  let playingAudio;
  let playedAudioFinished = false;
  let queuedAudio;
  let queuedTimeoutHandle;
  function playQueuedAudio(timeout) {
    queuedTimeoutHandle = window.setTimeout(() => {
      if (queuedAudio) {
        UI.sendAudioEvent(queuedAudio);
      }
    }, timeout);
  }
  function cancelQueuedAudio() {
    queuedAudio = void 0;
    if (queuedTimeoutHandle) {
      window.clearTimeout(queuedTimeoutHandle);
    }
  }
  function handleGameStart() {
    cancelQueuedAudio();
    UI.notifyUIReady();
    if (Configuration.getXR()) {
      XR.Atlas.invokeEvent(EViewID.MultiquadFrame, "begin-game", "");
    }
  }
  function handleTabChanged(tab) {
    if (startOnCivTab || !tab || tab.name == "leader-info") {
      return;
    }
    if (loadScreenInfo) {
      const newlyQueued = !queuedAudio;
      queuedAudio = loadScreenInfo.audio.civAudioTag;
      if (playedAudioFinished && queuedAudio && newlyQueued) {
        playQueuedAudio(1e3);
      }
    }
  }
  function handleAudioFinished(tag) {
    if (tag == playingAudio) {
      playedAudioFinished = true;
      if (queuedAudio) {
        playQueuedAudio(2e3);
      }
    }
  }
  let isBenchmark = false;
  try {
    isBenchmark = Benchmark?.Game?.isRunning();
  } catch (_) {
  }
  const model = createMutable({
    data: void 0,
    progress: 0,
    canBeginGame: false,
    onBeginGame: handleGameStart,
    onTabChanged: handleTabChanged,
    startOnCivTab,
    hideBeginButton: Configuration.getGame().isNetworkMultiplayer || isBenchmark
  });
  const [statesToLoad, mutateStatesToLoad] = createArraySignal([
    // Already loaded on start (add to total state weight):
    // { state: UIGameLoadingProgressState.ContentIsConfigured, weight: 5 },
    { state: UIGameLoadingProgressState.GameCoreInitializationIsStarted, weight: 2 },
    { state: UIGameLoadingProgressState.GameIsInitialized, weight: 2 },
    { state: UIGameLoadingProgressState.GameCoreInitializationIsDone, weight: 4 },
    { state: UIGameLoadingProgressState.GameIsFinishedLoading, weight: 2 },
    { state: UIGameLoadingProgressState.UIIsInitialized, weight: 5 },
    { state: UIGameLoadingProgressState.UIIsReady, weight: 3 }
  ]);
  const currentLoadStateWeight = createMemo(() => statesToLoad().reduce((a, b) => a + b.weight, 0));
  const totalLoadStateWeight = currentLoadStateWeight() + 5;
  function setLoadStateComplete(state) {
    mutateStatesToLoad((states) => {
      const indexToRemove = states.findIndex((s) => s.state == state);
      if (indexToRemove >= 0) {
        states.splice(indexToRemove, 1);
      }
    });
  }
  if (UI.getGameLoadingState() == UIGameLoadingState.GameStarted) {
    return model;
  }
  function updateLoadingProgress(data) {
    setLoadStateComplete(data.UIGameLoadingProgressState);
  }
  createEffect(() => {
    const progress = (totalLoadStateWeight - currentLoadStateWeight()) / totalLoadStateWeight * 100 + 1;
    model.progress = progress;
  });
  engine.whenReady.then(() => {
    engine.on("UIGameLoadingProgressChanged", updateLoadingProgress);
  });
  ComponentRegistry.preloadComponents(Flipbook.Hourglass).then(() => {
    const preloadImages = [
      "blp:base_frame-filigree.png",
      "blp:city_hex_color.png",
      "blp:hud_unit-panel_empty-slot",
      "blp:prof_btn_bk",
      "blp:meter_well",
      "blp:meter_fill",
      // These were images used by the loading screen that were missed earlier.
      "fs://game/hud_section-line_gold.png",
      "fs://game/hud_sidepanel_divider.png",
      "blp:meter_well.png",
      "blp:meter_fill.png",
      "fs://game/base_component-arrow.png",
      "fs://game/base_radio-bg.png",
      "fs://game/base_radio-bg-on-focus.png",
      "fs://game/base_radio-ball.png",
      "blp:unlock_tradition",
      "blp:hud_unit-panel_empty-slot",
      "blp:city_uniquequarter",
      "fs://game/xb1_icon_right_bumper",
      "fs://game/xb1_icon_left_bumper",
      "fs://game/xb1_icon_right_stick",
      "fs://game/switch_icon_right_bumper",
      "fs://game/switch_icon_left_bumper",
      "fs://game/switch_icon_right_stick",
      "fs://game/ps4_icon_right_bumper",
      "fs://game/ps4_icon_left_bumper",
      "fs://game/ps4_icon_right_stick"
    ];
    for (const attr of GameInfo.Attributes) {
      const iconURL = UI.getIconURL(attr.AttributeType, "OUTLINE");
      if (iconURL) {
        preloadImages.push(iconURL);
      }
    }
    const additionalIcons = [
      "ATTRIBUTE",
      "CITYSTATE",
      "COMMANDER_RADIUS",
      "COMMENDATION",
      "DIPLOMATIC_ACTION",
      "ENDEAVOR",
      "ESPIONAGE",
      "GREATWORK",
      "HOMELAND",
      "TRADE_ROUTE",
      "TREASURE_FLEET",
      "UNIT_SIGHT",
      "WAR",
      "YIELD_CITIES",
      //"YIELD_ENVOYS",
      "YIELD_POPULATION",
      "YIELD_HAPPINESS",
      "YIELD_TRADES",
      "RADIAL_TECH",
      "UNIT_ARMY_COMMANDER"
    ];
    for (const y of GameInfo.Yields) {
      additionalIcons.push(y.YieldType);
    }
    for (const icon of additionalIcons) {
      const iconURL = UI.getIconURL(icon);
      if (iconURL) {
        preloadImages.push(iconURL);
      }
    }
    const celebIcon = UI.getIconURL("NOTIFICATION_CHOOSE_GOLDEN_AGE", "FONTICON");
    if (celebIcon) {
      preloadImages.push(celebIcon);
    }
    const cssURLRegEx = /url\((.+)\)/;
    const parseCSSUrl = (css) => {
      css = css.replaceAll("'", "");
      css = css.replaceAll('"', "");
      const m = cssURLRegEx.exec(css);
      if (m && m[1]) {
        return m[1];
      }
      return null;
    };
    const playerConfig = Configuration.getPlayer(GameContext.localPlayerID);
    if (playerConfig && playerConfig.leaderTypeName && playerConfig.civilizationTypeName) {
      if (playerConfig.leaderTypeName != "RANDOM" && playerConfig.civilizationTypeName != "RANDOM") {
        const earlyInfo = createLoadScreenInfo();
        if (earlyInfo) {
          const backgroundImage = parseCSSUrl(earlyInfo.data.backgroundImage);
          if (backgroundImage) {
            preloadImages.push(backgroundImage);
          }
          const leaderImage = parseCSSUrl(earlyInfo.data.leaderImage);
          if (leaderImage) {
            preloadImages.push(leaderImage);
          }
          for (const c of earlyInfo.data.constructibleInfo) {
            const image = parseCSSUrl(c.icon);
            if (image) {
              preloadImages.push(image);
            }
          }
          for (const c of earlyInfo.data.unitInfo) {
            const image = parseCSSUrl(c.icon);
            if (image) {
              preloadImages.push(image);
            }
          }
        }
      }
    }
    Promise.all([
      ComponentRegistry.preloadComponents(
        Tab.TabListPips,
        HeroButton2,
        RadioButton,
        Filigree.H2,
        Filigree.H3,
        Filigree.H4
      ),
      ComponentUtilities.preloadImages(...preloadImages)
    ]).finally(() => {
      UI.notifyLoadingCurtainReady();
      Loading.runWhenInitialized(() => {
        window.addEventListener("global-scaling-ready", reloadStyles);
        UI.lockCursor(false);
        loadScreenInfo = createLoadScreenInfo();
        if (loadScreenInfo) {
          engine.on("AudioEventReturned", (tag) => handleAudioFinished(tag));
          const voTag = model.startOnCivTab ? loadScreenInfo.audio.civAudioTag ?? loadScreenInfo.audio.leaderAudioTag : loadScreenInfo.audio.leaderAudioTag ?? loadScreenInfo.audio.civAudioTag;
          if (voTag) {
            playingAudio = voTag;
            UI.sendAudioEventWithFinishedCallback(voTag);
          }
          model.data = loadScreenInfo?.data;
        }
      });
    });
    Loading.runWhenLoaded(() => {
      mutateStatesToLoad((states) => states.length = 0);
      model.canBeginGame = true;
      if (UI.getGameLoadingState() == UIGameLoadingState.WaitingForUIReady) {
        UI.sendAudioEvent("main-menu-load-ready");
      }
      engine.off("UIGameLoadingProgressChanged", updateLoadingProgress);
    });
  });
  return model;
}

var _tmpl$$5 = /* @__PURE__ */ template(`<div></div>`);
const TEXT_SIZES = ["text-2xs", "text-xs", "text-sm", "text-base", "text-lg", "text-xl", "text-2xl", "text-custom"];
const HeaderComponent = (props) => {
  const baseClasses = "uppercase tracking-100 text-gradient-secondary pointer-events-auto font-title";
  const textSize = createMemo(() => TEXT_SIZES.some((size) => props.class?.includes(size)) ? "" : "text-lg");
  return (() => {
    var _el$ = _tmpl$$5();
    spread(_el$, mergeProps(props, {
      get ["class"]() {
        return `${baseClasses} ${textSize()} ${props.class ?? ""}`;
      },
      "data-name": "Header"
    }), false, true);
    insert(_el$, () => props.children);
    return _el$;
  })();
};
const Header = ComponentRegistry.register("Header", HeaderComponent);

var _tmpl$$4 = /* @__PURE__ */ template(`<div></div>`);
const Compose = (props) => {
  return createMemo(() => Locale.compose(props.text ?? "", ...props.args ?? []));
};
const Stylize = (props) => {
  const stylizedText = createMemo(() => Locale.stylize(props.text ?? "", ...props.args ?? []));
  return (() => {
    var _el$ = _tmpl$$4();
    spread(_el$, mergeProps(props, {
      get innerHTML() {
        return stylizedText();
      }
    }), false, false);
    return _el$;
  })();
};
const L10n = {
  /**
   * Compose text using the Locale.Compose.
   * Generate text given a localization-syntax string and additional optional arguments
   * ```tsx
   * <L10n.Compose text="LOC_EXAMPLE_STRING" args={["LOC_ARG_1", 2]} />
   * ```
   * Default implementation: {@link Compose}
   * @param {LocaleProps} props See {@link LocaleProps} for a full list of properties
   *
   * Commonly Used Properties:
   * @param {string} props.text The localization string to compose.
   * @param {LocalizedTextArgument[]} props.args A list of arguments to feed into the string. Default: undefined
   */
  Compose: ComponentRegistry.register("Compose", Compose),
  /**
   * Compose text using the Locale.Stylize.
   * Convert a string or localized text containing stylized markup into HTML formatted text.
   * ```tsx
   * <L10n.Stylize text="LOC_EXAMPLE_STRING" args={["LOC_ARG_1", 2]} />
   * ```
   * Default implementation: {@link Stylize}
   * @param {StylizeProps} props See {@link StylizeProps} for a full list of properties
   *
   * Commonly Used Properties:
   * @param {string} props.text The localization string to stylize.
   * @param {LocalizedTextArgument[]} props.args A list of arguments to feed into the string. Default: undefined
   */
  Stylize: ComponentRegistry.register("Stylize", Stylize)
};

var _tmpl$$3 = /* @__PURE__ */ template(`<div></div>`);
class TooltipContextProvider {
  _active;
  _setActive;
  _target;
  _setTarget;
  _isActive;
  get isActive() {
    return this._isActive;
  }
  get target() {
    return this._target;
  }
  get active() {
    return this._active;
  }
  constructor() {
    const [target, setTarget] = createSignal();
    this._target = target;
    this._setTarget = setTarget;
    const [active, setActive] = createSignal();
    this._active = active;
    this._setActive = setActive;
    this._isActive = createSelector(this._active);
  }
  onTrigger(name, type, target) {
    if (type == TriggerType.Focus) {
      this._setActive(name);
      this._setTarget(target);
    } else if (type == TriggerType.Blur) {
      if (this._active() == name) {
        this._setTarget(void 0);
        this._setActive(void 0);
      }
    }
  }
}
const TooltipContext = createContext();
var TooltipVerticalPosition = /* @__PURE__ */ ((TooltipVerticalPosition2) => {
  TooltipVerticalPosition2[TooltipVerticalPosition2["AUTO"] = 0] = "AUTO";
  TooltipVerticalPosition2[TooltipVerticalPosition2["TOP"] = 1] = "TOP";
  TooltipVerticalPosition2[TooltipVerticalPosition2["CENTER"] = 2] = "CENTER";
  TooltipVerticalPosition2[TooltipVerticalPosition2["BOTTOM"] = 3] = "BOTTOM";
  return TooltipVerticalPosition2;
})(TooltipVerticalPosition || {});
var TooltipHorizontalPosition = /* @__PURE__ */ ((TooltipHorizontalPosition2) => {
  TooltipHorizontalPosition2[TooltipHorizontalPosition2["AUTO"] = 0] = "AUTO";
  TooltipHorizontalPosition2[TooltipHorizontalPosition2["LEFT_COVER"] = 1] = "LEFT_COVER";
  TooltipHorizontalPosition2[TooltipHorizontalPosition2["LEFT"] = 2] = "LEFT";
  TooltipHorizontalPosition2[TooltipHorizontalPosition2["CENTER"] = 3] = "CENTER";
  TooltipHorizontalPosition2[TooltipHorizontalPosition2["RIGHT_COVER"] = 4] = "RIGHT_COVER";
  TooltipHorizontalPosition2[TooltipHorizontalPosition2["RIGHT"] = 5] = "RIGHT";
  return TooltipHorizontalPosition2;
})(TooltipHorizontalPosition || {});
function inPx(value) {
  return value === void 0 ? void 0 : `${value}px`;
}
const TooltipComponent = (props) => {
  const tooltipContext = useContext(TooltipContext);
  const tooltipRoot = document.getElementById("tooltip-root") ?? void 0;
  const [root, setRoot] = createPropsRefSignal(() => props.ref);
  const [top, setTop] = createSignal();
  const [left, setLeft] = createSignal();
  const [isCalculatingPosition, setisCalculatingPosition] = createSignal(true);
  const isLayoutComplete = createLayoutComplete();
  createEffect(() => {
    const target = tooltipContext?.target();
    const tooltip = root();
    if (!target || !tooltip || !isLayoutComplete() || !tooltipContext?.isActive(props.name)) {
      return;
    }
    const offset = props.offset ?? 0;
    setisCalculatingPosition(true);
    waitForLayout(() => {
      if (!tooltipContext?.isActive(props.name)) {
        return;
      }
      const targetRect = target.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const screenHeight = window.innerHeight;
      const screenWidth = window.innerWidth;
      const targetCenterX = targetRect.x + targetRect.width / 2;
      const targetCenterY = targetRect.y + targetRect.height / 2;
      const tooltipLocalCenterX = tooltipRect.width / 2;
      const tooltipLocalCenterY = tooltipRect.height / 2;
      let calcVPos = props.vPosition ?? 0 /* AUTO */;
      let calcHPos = props.hPosition ?? 0 /* AUTO */;
      let calcTop = 0;
      let calcLeft = 0;
      if (calcVPos == 0 /* AUTO */) {
        calcVPos = targetCenterY <= screenHeight / 2 ? 3 /* BOTTOM */ : 1 /* TOP */;
      }
      if (calcHPos == 0 /* AUTO */) {
        const thirdWidth = screenWidth / 3;
        if (targetCenterX < thirdWidth) {
          calcHPos = calcVPos == 2 /* CENTER */ ? 5 /* RIGHT */ : 4 /* RIGHT_COVER */;
        } else if (targetCenterX < thirdWidth + thirdWidth) {
          if (calcVPos == 2 /* CENTER */) {
            calcHPos = targetCenterY > screenWidth / 2 ? 5 /* RIGHT */ : 2 /* LEFT */;
          } else {
            calcHPos = 3 /* CENTER */;
          }
        } else {
          calcHPos = calcVPos == 2 /* CENTER */ ? 2 /* LEFT */ : 1 /* LEFT_COVER */;
        }
      }
      switch (calcVPos) {
        case 2 /* CENTER */:
          calcTop = targetCenterY - tooltipLocalCenterY;
          break;
        case 1 /* TOP */:
          calcTop = targetRect.top - tooltipRect.height - offset;
          break;
        case 3 /* BOTTOM */:
          calcTop = targetRect.bottom + offset;
          break;
      }
      switch (calcHPos) {
        case 3 /* CENTER */:
          calcLeft = targetCenterX - tooltipLocalCenterX;
          break;
        case 2 /* LEFT */:
          calcLeft = targetRect.left - tooltipRect.width - offset;
          break;
        case 5 /* RIGHT */:
          calcLeft = targetRect.right + offset;
          break;
        case 1 /* LEFT_COVER */:
          calcLeft = targetRect.right - tooltipRect.width - offset;
          break;
        case 4 /* RIGHT_COVER */:
          calcLeft = targetRect.left + offset;
          break;
      }
      calcTop = Math.min(Math.max(0, calcTop), screenHeight - tooltipRect.height);
      calcLeft = Math.min(Math.max(0, calcLeft), screenWidth - tooltipRect.width);
      setTop(calcTop);
      setLeft(calcLeft);
      setisCalculatingPosition(false);
    });
  });
  return createComponent(Portal, {
    mount: tooltipRoot,
    get children() {
      return createComponent(Show, {
        get when() {
          return tooltipContext?.isActive(props.name);
        },
        get children() {
          var _el$ = _tmpl$$3();
          use(setRoot, _el$);
          spread(_el$, mergeProps(props, {
            get ["class"]() {
              return `absolute ${props.class}`;
            },
            get classList() {
              return {
                "opacity-0": isCalculatingPosition()
              };
            },
            get style() {
              return {
                top: inPx(top()),
                left: inPx(left())
              };
            }
          }), false, true);
          insert(_el$, () => props.children);
          return _el$;
        }
      });
    }
  });
};
let curTooltip = 0;
const TooltipFrameComponent = (props) => {
  return (() => {
    var _el$2 = _tmpl$$3();
    spread(_el$2, mergeProps(props, {
      get ["class"]() {
        return `img-tooltip-border img-tooltip-bg p-2 ${props.class}`;
      }
    }), false, true);
    insert(_el$2, () => props.children);
    return _el$2;
  })();
};
const TooltipTextComponent = (props) => {
  const name = createMemo(() => props.name ?? `text-tooltip-${curTooltip++}`);
  return [createComponent(Tooltip.Trigger, {
    get name() {
      return name();
    },
    get children() {
      return props.children;
    }
  }), createComponent(Tooltip, mergeProps(props, {
    get name() {
      return name();
    },
    get offset() {
      return props.offset ?? 4;
    },
    get children() {
      return createComponent(Tooltip.Frame, {
        get children() {
          return createComponent(L10n.Stylize, {
            get text() {
              return props.text;
            },
            get args() {
              return props.args;
            }
          });
        }
      });
    }
  }))];
};
const Tooltip = ComponentRegistry.register("Tooltip", TooltipComponent);
Tooltip.Trigger = ComponentRegistry.register("Tooltip.Trigger", createTrigger(TooltipContext));
Tooltip.Frame = ComponentRegistry.register("Tooltip.Frame", TooltipFrameComponent);
const TextTooltip = ComponentRegistry.register("Tooltip.Text", TooltipTextComponent);

var _tmpl$$2 = /* @__PURE__ */ template(`<div></div>`);
const PanelComponent = (props) => {
  const [root, setRoot] = createPropsRefSignal(() => props.ref);
  const hotkeyProvider = new HotkeyContextProvider(root);
  const engineInputProxyProvider = new EngineInputProxyProvider();
  const tooltipProvider = new TooltipContextProvider();
  const resolvedNavRules = createMemo(() => props.navRules ?? DefaultNavigationRules.vertical);
  onMount(() => hotkeyProvider.mount());
  onCleanup(() => hotkeyProvider.cleanup());
  const navigationHandler = (context, action) => {
    const curFocus = context.currentFocus;
    if (isFocusableAFocusContext(curFocus)) {
      if (curFocus.navigate(action)) {
        return true;
      }
    }
    if (resolvedNavRules().get(action)?.(context)) {
      return true;
    }
    context.focusCurrent();
    return true;
  };
  const focusProvider = new FocusContextProvider(root, navigationHandler, props.name);
  createEffect(() => {
    if (!focusProvider.currentFocus && focusProvider.hasChildren()) {
      focusProvider.focusNext();
    }
  });
  const onFocus = () => {
    navigationHandler(focusProvider, InputNavigationAction.NONE);
  };
  const onNavigate = (navigationEvent) => {
    if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
      return;
    }
    if (focusProvider.navigate(navigationEvent.detail.navigation)) {
      navigationEvent.preventDefault();
      navigationEvent.stopPropagation();
    }
  };
  const onEngineInput = (event) => {
    const activeElement = document.activeElement;
    const isControllerEvent = !(event.detail.isMouse || event.detail.isTouch);
    let proxyEvent = event;
    if (isControllerEvent && activeElement?.getAttribute("data-focus-context-name") == props.name) {
      proxyEvent = InputEngineEvent.CreateNewEvent(event, false);
      activeElement.dispatchEvent(proxyEvent);
    }
    if (!event.defaultPrevented) {
      engineInputProxyProvider.triggerEngineInput(event);
    }
  };
  return (() => {
    var _el$ = _tmpl$$2();
    use(setRoot, _el$);
    spread(_el$, mergeProps(props, {
      get ["class"]() {
        return `pointer-events-auto ${props.class}`;
      },
      get ["data-name"]() {
        return props.name;
      },
      "tabIndex": -1,
      "on:navigate-input": onNavigate,
      "on:engine-input": onEngineInput,
      "onFocus": onFocus
    }), false, true);
    insert(_el$, createComponent(FocusContext.Provider, {
      value: focusProvider,
      get children() {
        return createComponent(EngineInputProxyContext.Provider, {
          value: engineInputProxyProvider,
          get children() {
            return createComponent(TooltipContext.Provider, {
              value: tooltipProvider,
              get children() {
                return createComponent(HotkeyContext.Provider, {
                  value: hotkeyProvider,
                  get children() {
                    return props.children;
                  }
                });
              }
            });
          }
        });
      }
    }));
    return _el$;
  })();
};
const Panel = ComponentRegistry.register("Panel", PanelComponent);

var _tmpl$$1 = /* @__PURE__ */ template(`<div><div class="flex flex-col flex-auto overflow-auto"><div></div></div><div class="scroll-area_track w-6 mr-3 relative"><div class="scroll-area_thumb scroll-area_thumb-bg relative top-0 h-10 w-6"><div class="scroll-area_thumb-highlight absolute inset-0"></div><div class="scroll-area_thumb-active absolute inset-0"></div></div></div></div>`);
function getPercentageOffset(position, target) {
  const trackArea = target.getBoundingClientRect();
  return (position - trackArea.y) / trackArea.height * 100;
}
function clampToRange(percentage) {
  return Math.max(0, Math.min(100, percentage));
}
const ScrollAreaComponent = (props) => {
  let scrollWrapper;
  let content;
  let track;
  let resizeObserver;
  let lastPanTimestamp = 0;
  let isPanning = false;
  let panY = 0;
  let isStillPanningCheck = 0;
  let gamepadPanAnimationId = -1;
  const minThumbHeight = createMemo(() => props.minThumbHeight ?? 20);
  const scrollEndWithEpsilon = 99.99999;
  const trackedChildren = children(() => props.children);
  const [isDragging, setIsDragging] = createSignal(false);
  const [thumbHeight, setThumbHeight] = createSignal(minThumbHeight());
  const [thumbDelta, setThumbDelta] = createSignal(0);
  const [scrollPosition, setScrollPosition] = createSignal(props.initialScroll ?? 0);
  const isTrackVisible = createMemo(() => thumbHeight() <= scrollEndWithEpsilon);
  const panRate = createMemo(() => props.panRate ?? 0.75);
  const allowGamepadPan = createMemo(() => props.allowGamepadPan ?? true);
  const proxy = useContext(EngineInputProxyContext);
  createEffect(() => {
    const position = scrollPosition();
    const isBottom = position >= scrollEndWithEpsilon;
    scrollWrapper.scrollTop = position / 100 * Math.max(1, scrollWrapper.scrollHeight - scrollWrapper.clientHeight);
    props.setIsAtBottom?.(isBottom);
  });
  createEffect(() => props.setIsTrackVisible?.(isTrackVisible()));
  const thumbScrollPosition = createMemo(() => {
    return scrollPosition() / thumbHeight() * (100 - thumbHeight());
  });
  const scaleByThumbSize = (percentage, thumbOffsetPercent) => {
    return (100 * percentage - thumbHeight() * thumbOffsetPercent) / (100 - thumbHeight());
  };
  const scrollToPercent = (position) => {
    setScrollPosition(clampToRange(position));
  };
  const scrollToTrackPosition = (positionInPixels, thumbOffsetPercent = 50) => {
    const positionPercent = getPercentageOffset(positionInPixels, track);
    scrollToPercent(scaleByThumbSize(positionPercent, thumbOffsetPercent));
  };
  const scrollByPercent = (percentage) => {
    scrollToPercent(scrollPosition() + percentage);
  };
  const scrollByPixels = (pixels) => {
    scrollByPercent(pixels / scrollWrapper.scrollHeight * 100);
  };
  const scrollToElement = (element) => {
    if (!element) {
      return;
    }
    const areaRect = scrollWrapper.getBoundingClientRect();
    const targetRect = element.getBoundingClientRect();
    let distToMove = 0;
    if (targetRect.top < areaRect.top) {
      distToMove = targetRect.top - areaRect.top;
    } else if (targetRect.bottom > areaRect.bottom) {
      distToMove = targetRect.bottom - areaRect.bottom;
    }
    if (distToMove != 0) {
      scrollByPixels(distToMove);
    }
  };
  const updateScrollThumbPosition = () => {
    const positionPercentage = scrollWrapper.scrollTop / Math.max(1, scrollWrapper.scrollHeight - scrollWrapper.clientHeight) * 100;
    scrollToPercent(positionPercentage);
  };
  const dragStart = () => {
    if (!isDragging()) {
      setIsDragging(true);
    }
  };
  const dragEnd = () => {
    if (isDragging()) {
      setIsDragging(false);
    }
  };
  const handleTrackClick = (event) => {
    scrollToTrackPosition(event.clientY);
    event.stopPropagation();
  };
  const handleThumbMouseMove = (event) => {
    scrollToTrackPosition(event.clientY, thumbDelta());
    event.stopPropagation();
  };
  const handleThumbMouseUp = (event) => {
    dragEnd();
    window.removeEventListener("mousemove", handleThumbMouseMove);
    window.removeEventListener("mouseup", handleThumbMouseUp, true);
    event.stopPropagation();
  };
  const handleThumbMouseDown = (event) => {
    dragStart();
    setThumbDelta(getPercentageOffset(event.clientY, event.target));
    window.addEventListener("mousemove", handleThumbMouseMove);
    window.addEventListener("mouseup", handleThumbMouseUp, true);
    event.stopPropagation();
  };
  const handleFocus = (event) => {
    scrollToElement(event.target);
  };
  const handleThumbResize = () => {
    waitForLayout(() => {
      const calcThumbHeight = Math.max(1, scrollWrapper.clientHeight) / Math.max(1, scrollWrapper.scrollHeight) * 100;
      setThumbHeight(Math.max(calcThumbHeight, minThumbHeight()));
      updateScrollThumbPosition();
    });
  };
  createEffect(on(() => trackedChildren, () => handleThumbResize()));
  const handleTouchOrMousePan = (inputEvent) => {
    const y = inputEvent.detail.y;
    let handled = false;
    if (inputEvent.detail.status == InputActionStatuses.START) {
      panY = y;
      handled = true;
    }
    if (inputEvent.detail.status == InputActionStatuses.DRAG) {
      if (isDragging()) {
        scrollToTrackPosition(y, thumbDelta());
      } else {
        scrollByPixels(panY - y);
        panY = y;
      }
      handled = true;
    }
    if (handled) {
      inputEvent.preventDefault();
      inputEvent.stopPropagation();
    }
  };
  const handleGamepadPanUpdate = (timestamp) => {
    if (isStillPanningCheck >= 10) {
      isPanning = props.useProxy || scrollWrapper.contains(document.activeElement);
      isStillPanningCheck = 0;
    }
    if (isPanning) {
      isStillPanningCheck += 1;
      gamepadPanAnimationId = requestAnimationFrame(handleGamepadPanUpdate);
      const diff = timestamp - lastPanTimestamp;
      lastPanTimestamp = timestamp;
      scrollByPixels(panY * diff * panRate());
    } else {
      isStillPanningCheck = 0;
      panY = 0;
      gamepadPanAnimationId = -1;
    }
  };
  const handleGamepadPan = (inputEvent) => {
    switch (inputEvent.detail.status) {
      case InputActionStatuses.START:
        lastPanTimestamp = performance.now();
        isPanning = true;
        panY = -inputEvent.detail.y;
        if (gamepadPanAnimationId == -1) {
          gamepadPanAnimationId = requestAnimationFrame(handleGamepadPanUpdate);
        }
        break;
      case InputActionStatuses.UPDATE:
        panY = -inputEvent.detail.y;
        break;
      case InputActionStatuses.FINISH:
        isPanning = false;
        panY = 0;
        isStillPanningCheck = 0;
        break;
    }
  };
  const handleEngineInput = (inputEvent) => {
    if (inputEvent.detail.name == "scroll-pan" && allowGamepadPan()) {
      handleGamepadPan(inputEvent);
    }
    if (inputEvent.detail.name == "touch-pan" || props.allowMousePan && inputEvent.detail.name == "mousebutton-left") {
      handleTouchOrMousePan(inputEvent);
    }
    if (inputEvent.detail.status != InputActionStatuses.FINISH) {
      return;
    }
    if (inputEvent.detail.name == "mousewheel-down" || inputEvent.detail.name == "mousewheel-up") {
      updateScrollThumbPosition();
    }
  };
  createEffect(() => {
    if (props.useProxy) {
      proxy?.registerHandler(handleEngineInput);
    } else {
      proxy?.unregisterHandler(handleEngineInput);
    }
  });
  onMount(() => {
    resizeObserver = new ResizeObserver(handleThumbResize);
    resizeObserver.observe(content);
    scrollWrapper.addEventListener("focus", handleFocus, true);
    handleThumbResize();
  });
  onCleanup(() => {
    resizeObserver?.unobserve(content);
    scrollWrapper.removeEventListener("focus", handleFocus, true);
  });
  return (() => {
    var _el$ = _tmpl$$1(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$2.nextSibling, _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$6.nextSibling;
    var _ref$ = props.ref;
    typeof _ref$ === "function" ? use(_ref$, _el$) : props.ref = _el$;
    spread(_el$, mergeProps(props, {
      get ["class"]() {
        return `flex flex-row overflow-hidden ${props.class ?? ""}`;
      },
      "on:engine-input": handleEngineInput,
      "data-name": "ScrollArea"
    }), false, true);
    use((ref) => scrollWrapper = ref, _el$2);
    use((ref) => content = ref, _el$3);
    insert(_el$3, trackedChildren);
    addEventListener(_el$4, "mousedown", handleTrackClick);
    use((ref) => track = ref, _el$4);
    addEventListener(_el$5, "mousedown", handleThumbMouseDown);
    _el$5.style.setProperty("top", "0px");
    insert(_el$5, createComponent(Show, {
      get when() {
        return allowGamepadPan();
      },
      get children() {
        return createComponent(NavHelp, {
          actionName: "inline-scroll-pan",
          "class": "absolute top-1\\/2 left-0 -translate-y-1\\/2"
        });
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$ = !!(!isTrackVisible() && !props.reserveSpace), _v$2 = !!(!isTrackVisible() && props.reserveSpace), _v$3 = `translateY(${thumbScrollPosition()}%)`, _v$4 = `${thumbHeight()}%`;
      _v$ !== _p$.e && _el$4.classList.toggle("hidden", _p$.e = _v$);
      _v$2 !== _p$.t && _el$4.classList.toggle("opacity-0", _p$.t = _v$2);
      _v$3 !== _p$.a && ((_p$.a = _v$3) != null ? _el$5.style.setProperty("transform", _v$3) : _el$5.style.removeProperty("transform"));
      _v$4 !== _p$.o && ((_p$.o = _v$4) != null ? _el$5.style.setProperty("height", _v$4) : _el$5.style.removeProperty("height"));
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0
    });
    return _el$;
  })();
};
const ScrollArea = ComponentRegistry.register({
  name: "ScrollArea",
  createInstance: ScrollAreaComponent,
  images: ["blp:base_scrollbar-track.png", "blp:base_scrollbar-handle.png", "blp:base_scrollbar-handle-focus.png", "blp:base_scrollbar-handle-focus.png"]
});

const style = "fs://game/base-standard/ui-next/screens/load-screen/load-screen.css";

var _tmpl$ = /* @__PURE__ */ template(`<div></div>`), _tmpl$2 = /* @__PURE__ */ template(`<span>&nbsp;|&nbsp;</span>`), _tmpl$3 = /* @__PURE__ */ template(`<div class="text-accent-4 load-screen-markup"><div class="flex flex-row text-primary-1 -mt-3 items-center"></div><div></div><div class="flex flex-row text-primary-1 flex-wrap"><span class=uppercase></span><span class="uppercase text-accent-2"></span></div></div>`), _tmpl$4 = /* @__PURE__ */ template(`<div><div class="load-screen-tips-and-hints-inner-rect m-0\\.5 px-3\\.5 pt-2 pb-3\\.5"><span class="text-tertiary-1 leading-normal uppercase"></span><span class="text-tertiary-2 leading-none"></span></div></div>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="flex flex-row mb-9 text-accent-4 load-screen-markup"><div class=load-screen-icon-slot><div class="load-screen-unit-icon-bg m-3\\.5 relative"></div></div><div class="flex flex-col ml-6 flex-auto"></div></div>`), _tmpl$6 = /* @__PURE__ */ template(`<div class=load-screen-icon-slot></div>`), _tmpl$7 = /* @__PURE__ */ template(`<div class="flex flex-row mt-1 text-accent-4 load-screen-markup"><div class="flex flex-col ml-6 flex-auto"><div class="flex flex-col"></div></div></div>`), _tmpl$8 = /* @__PURE__ */ template(`<div class="flex flex-col ml-3 load-screen-markup text-accent-4"><div class="flex flex-col mb-3 "><div class="flex flex-row mb-1"><span>&nbsp;</span><span class=text-accent-2></span></div><div class="flex flex-row"><div class="flex flex-col ml-6 flex-auto"></div></div></div></div>`), _tmpl$9 = /* @__PURE__ */ template(`<div class="text-large font-medium text-tertiary-1"></div>`), _tmpl$10 = /* @__PURE__ */ template(`<div class="flex flex-row mb-9 text-accent-4 load-screen-markup"><div class=load-screen-icon-slot></div><div class="flex flex-col ml-6 flex-auto justify-center"></div></div>`), _tmpl$11 = /* @__PURE__ */ template(`<div class=load-screen-pagination></div>`), _tmpl$12 = /* @__PURE__ */ template(`<div class="load-screen-progress-bar-bg absolute left-0 right-0 top-1\\.5"><div class="load-screen-progress-bar-fill transition-transform duration-1000"></div></div>`), _tmpl$13 = /* @__PURE__ */ template(`<div class="absolute inset-0 bg-no-repeat bg-cover bg-center"></div>`), _tmpl$14 = /* @__PURE__ */ template(`<div data-name=bg-tint class="absolute inset-0 load-screen-bg-tint"></div>`), _tmpl$15 = /* @__PURE__ */ template(`<div class="load-screen-above-stage relative h-22"><div class="load-screen-above-stage-gradient absolute bottom-0 w-full"></div><div class="filigree-inner-frame-top-gold absolute -bottom-3 -left-5 -right-5"></div></div>`), _tmpl$16 = /* @__PURE__ */ template(`<div data-name=bg-filigrees class="absolute inset-0 flex flex-col"><div class="load-screen-bg-filigrees-top relative mx-8 mt-8 flex flex-row flex-auto"><div class="load-screen-bg-filigree flex-auto"></div><div class="load-screen-bg-filigree flex-auto -scale-x-100"></div></div><div class="load-screen-bg-filigrees-bottom relative mx-8 mb-8 flex flex-row flex-auto"><div class="load-screen-bg-filigree flex-auto -scale-y-100"></div><div class="load-screen-bg-filigree flex-auto -scale-100"></div></div></div>`), _tmpl$17 = /* @__PURE__ */ template(`<div class=pt-3></div>`), _tmpl$18 = /* @__PURE__ */ template(`<div class="load-screen-stage flex-auto relative bg-no-repeat bg-cover bg-center flex flex-row"><div class="load-screen-stage-tint absolute inset-0"></div><div class="load-screen-stage-fill flex-auto relative"></div><div class="load-screen-centered-content relative h-full"><div class="load-screen-stage-gradient absolute"></div><div class="load-screen-leader-image-area overflow-hidden absolute"><div class="load-screen-leader-image-top-gradient absolute"></div><div class="load-screen-leader-image bg-cover bg-no-repeat relative"></div><div class="load-screen-leader-image-bottom-gradient absolute"></div></div></div><div class=flex-auto></div></div>`), _tmpl$19 = /* @__PURE__ */ template(`<div class="load-screen-below-stage relative h-28"><div class="load-screen-below-stage-gradient absolu\`te top-0 w-full"></div><div class="filigree-inner-frame-top-gold absolute top-0 -left-5 -right-5"></div></div>`);
const HorizontalDivider = (props) => {
  return (() => {
    var _el$ = _tmpl$();
    spread(_el$, mergeProps(props, {
      get ["class"]() {
        return `load-screen-divider ${props.class}`;
      }
    }), false, false);
    return _el$;
  })();
};
const VerticalDivider = (props) => {
  return (() => {
    var _el$2 = _tmpl$2();
    spread(_el$2, props, false, true);
    return _el$2;
  })();
};
const CondensedHeader = (props) => {
  const header20PxClass = createMemo(() => Layout.pixelsText(20));
  return (() => {
    var _el$3 = _tmpl$();
    spread(_el$3, mergeProps(props, {
      get ["class"]() {
        return `uppercase text-gradient-secondary pointer-events-auto font-title font-medium ${header20PxClass()} ${props.class}`;
      },
      "data-name": "Condensed Header"
    }), false, true);
    insert(_el$3, () => props.children);
    return _el$3;
  })();
};
const LoadScreenInfoSection = (props) => {
  function getAttributeIcon(locStr) {
    return locStr.replace("LOC_TAG_TRAIT_", "ATTRIBUTE_").replace("_NAME", "");
  }
  return (() => {
    var _el$4 = _tmpl$3(), _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$6.nextSibling, _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling;
    insert(_el$5, createComponent(For, {
      get each() {
        return props.attributes;
      },
      children: (attribute, index) => [createComponent(Icon, {
        "class": "size-8 mr-2",
        get name() {
          return getAttributeIcon(attribute);
        },
        context: "OUTLINE"
      }), createComponent(L10n.Stylize, {
        "class": "uppercase",
        text: attribute
      }), createComponent(Show, {
        get when() {
          return index() < props.attributes.length - 1;
        },
        get children() {
          return createComponent(VerticalDivider, {
            "class": "mx-2"
          });
        }
      })]
    }));
    insert(_el$4, createComponent(HorizontalDivider, {
      "class": "mb-4 mt-3"
    }), _el$6);
    insert(_el$6, createComponent(L10n.Stylize, {
      get text() {
        return props.description;
      }
    }));
    insert(_el$4, createComponent(HorizontalDivider, {
      "class": "my-4"
    }), _el$7);
    insert(_el$8, createComponent(L10n.Compose, {
      get text() {
        return props.abilityType;
      }
    }));
    insert(_el$7, createComponent(VerticalDivider, {
      "class": "mx-2"
    }), _el$9);
    insert(_el$9, createComponent(L10n.Compose, {
      get text() {
        return props.abilityName;
      }
    }));
    insert(_el$4, createComponent(L10n.Stylize, {
      "class": "load-screen-ability-desc",
      get text() {
        return props.abilityDescription;
      }
    }), null);
    return _el$4;
  })();
};
const LoadScreenTipsAndHints = (props) => {
  return (() => {
    var _el$10 = _tmpl$4(), _el$11 = _el$10.firstChild, _el$12 = _el$11.firstChild, _el$13 = _el$12.nextSibling;
    insert(_el$12, createComponent(L10n.Compose, {
      text: "LOC_LOADING_TIPS_AND_HINTS"
    }));
    insert(_el$13, createComponent(L10n.Stylize, {
      get text() {
        return props.text;
      }
    }));
    createRenderEffect(() => className(_el$10, `load-screen-tips-and-hints-outer-rect ${props.class}`));
    return _el$10;
  })();
};
const LoadScreenUnits = (props) => {
  return createComponent(For, {
    each: props,
    children: (unit, index) => (() => {
      var _el$14 = _tmpl$5(), _el$15 = _el$14.firstChild, _el$16 = _el$15.firstChild, _el$17 = _el$15.nextSibling;
      insert(_el$16, createComponent(Icon, {
        "class": "absolute inset-0",
        get name() {
          return unit.icon;
        },
        isUrl: true
      }));
      insert(_el$17, createComponent(CondensedHeader, {
        get children() {
          return createComponent(L10n.Compose, {
            get text() {
              return unit.name;
            }
          });
        }
      }), null);
      insert(_el$17, createComponent(L10n.Stylize, {
        get text() {
          return unit.description;
        }
      }), null);
      createRenderEffect(() => _el$14.classList.toggle("mb-9", !!(index() < props.length - 1)));
      return _el$14;
    })()
  });
};
const LoadScreenConstructibles = (props) => {
  return createComponent(For, {
    each: props,
    children: (constructible, index) => [(() => {
      var _el$18 = _tmpl$7(), _el$20 = _el$18.firstChild, _el$21 = _el$20.firstChild;
      insert(_el$18, createComponent(Show, {
        get when() {
          return constructible.isUniqueQuarter;
        },
        get fallback() {
          return createComponent(Icon, {
            "class": "load-screen-icon",
            get name() {
              return constructible.icon;
            },
            isUrl: true,
            context: "CIV_BONUS"
          });
        },
        get children() {
          var _el$19 = _tmpl$6();
          insert(_el$19, createComponent(Icon, {
            "class": "m-3\\.5 load-screen-icon",
            get name() {
              return constructible.icon;
            },
            isUrl: true,
            context: "CIV_BONUS"
          }));
          return _el$19;
        }
      }), _el$20);
      insert(_el$21, createComponent(Show, {
        get when() {
          return constructible.isUniqueQuarter;
        },
        get children() {
          return createComponent(CondensedHeader, {
            "class": "text-accent-2",
            get children() {
              return createComponent(L10n.Compose, {
                text: "LOC_LOADING_UNIQUE_QUARTER"
              });
            }
          });
        }
      }), null);
      insert(_el$21, createComponent(CondensedHeader, {
        get children() {
          return createComponent(L10n.Compose, {
            get text() {
              return constructible.name;
            }
          });
        }
      }), null);
      insert(_el$20, createComponent(L10n.Stylize, {
        get text() {
          return constructible.description;
        }
      }), null);
      createRenderEffect((_p$) => {
        var _v$ = !!(!constructible.isUniqueQuarter && index() < props.length - 1), _v$2 = !constructible.isUniqueQuarter;
        _v$ !== _p$.e && _el$18.classList.toggle("mb-7", _p$.e = _v$);
        _v$2 !== _p$.t && _el$18.classList.toggle("ml-7", _p$.t = _v$2);
        return _p$;
      }, {
        e: void 0,
        t: void 0
      });
      return _el$18;
    })(), createComponent(Show, {
      get when() {
        return constructible.isUniqueQuarter;
      },
      get children() {
        return createComponent(HorizontalDivider, {
          "class": "mt-4 mb-2"
        });
      }
    })]
  });
};
const LoadScreenTraditions = (props) => {
  return createComponent(For, {
    each: props,
    children: (tradition, index) => (() => {
      var _el$22 = _tmpl$8(), _el$23 = _el$22.firstChild, _el$24 = _el$23.firstChild, _el$25 = _el$24.firstChild, _el$26 = _el$25.firstChild, _el$27 = _el$25.nextSibling, _el$28 = _el$24.nextSibling, _el$29 = _el$28.firstChild;
      insert(_el$25, createComponent(L10n.Compose, {
        text: "LOC_LOADING_TRADITION_UNLOCKED_WITH"
      }), _el$26);
      insert(_el$27, createComponent(L10n.Compose, {
        get text() {
          return tradition.civic;
        }
      }));
      insert(_el$28, createComponent(Icon, {
        "class": "load-screen-icon-sm",
        name: 'url("blp:unlock_tradition")',
        isUrl: true
      }), _el$29);
      insert(_el$29, createComponent(CondensedHeader, {
        get children() {
          return createComponent(L10n.Compose, {
            get text() {
              return tradition.name;
            }
          });
        }
      }), null);
      insert(_el$29, createComponent(L10n.Stylize, {
        get text() {
          return tradition.description;
        }
      }), null);
      createRenderEffect(() => _el$22.classList.toggle("mb-9", !!(index() < props.length - 1)));
      return _el$22;
    })()
  });
};
const LoadScreenMementos = (props) => {
  return createComponent(For, {
    each: props,
    children: (memento, index) => (() => {
      var _el$30 = _tmpl$10(), _el$31 = _el$30.firstChild, _el$32 = _el$31.nextSibling;
      insert(_el$31, createComponent(Show, {
        get when() {
          return memento.isLocked;
        },
        get fallback() {
          return createComponent(Icon, {
            "class": "load-screen-icon m-3\\.5",
            get name() {
              return memento.icon;
            },
            isUrl: true
          });
        },
        get children() {
          return createComponent(Icon, {
            "class": "load-screen-lock-icon",
            name: 'url("blp:shell_memento-maj-lock")',
            isUrl: true
          });
        }
      }));
      insert(_el$32, createComponent(Switch, {
        get fallback() {
          return [createComponent(CondensedHeader, {
            get children() {
              return createComponent(L10n.Compose, {
                get text() {
                  return memento.name ?? "";
                }
              });
            }
          }), createComponent(L10n.Stylize, {
            get text() {
              return memento.description ?? "";
            }
          })];
        },
        get children() {
          return [createComponent(Match, {
            get when() {
              return memento.isLocked;
            },
            get children() {
              var _el$33 = _tmpl$9();
              insert(_el$33, createComponent(L10n.Compose, {
                get text() {
                  return memento.unlockReason ?? "";
                }
              }));
              return _el$33;
            }
          }), createComponent(Match, {
            get when() {
              return memento.isEmpty;
            },
            get children() {
              var _el$34 = _tmpl$9();
              insert(_el$34, createComponent(L10n.Compose, {
                text: "LOC_LOADING_MEMENTO_EMPTY"
              }));
              return _el$34;
            }
          })];
        }
      }));
      createRenderEffect(() => _el$30.classList.toggle("mb-9", !!(index() < props.length - 1)));
      return _el$30;
    })()
  });
};
const Navigation = () => {
  return [createComponent(HorizontalDivider, {}), (() => {
    var _el$35 = _tmpl$11();
    insert(_el$35, createComponent(Tab.TabListPips, {}));
    return _el$35;
  })(), createComponent(HorizontalDivider, {})];
};
const LoadScreenProgressBar = (props) => {
  return (() => {
    var _el$36 = _tmpl$12(), _el$37 = _el$36.firstChild;
    createRenderEffect((_$p) => (_$p = `scaleX(${props.progress})`) != null ? _el$37.style.setProperty("transform", _$p) : _el$37.style.removeProperty("transform"));
    return _el$36;
  })();
};
const LoadScreenContext = createContext();
function useLoadScreenContext() {
  const context = useContext(LoadScreenContext);
  if (!context) {
    throw new Error("Unable to get load screen context!");
  }
  return context;
}
const LoadScreen = (props) => {
  const model = useLoadScreenContext();
  const defaultTab = createMemo(() => model.startOnCivTab ? "civ-info" : "leader-info");
  const beginGameSounds = {};
  beginGameSounds.group = "main-menu-audio";
  beginGameSounds.onActivate = "data-audio-begin-game";
  beginGameSounds.onPress = "data-audio-begin-game-press";
  return createComponent(Panel, {
    ref(r$) {
      var _ref$ = props.ref;
      typeof _ref$ === "function" ? _ref$(r$) : props.ref = r$;
    },
    name: "load-screen",
    "class": "fullscreen load-screen-fade-in",
    id: "load-screen",
    get children() {
      return createComponent(Show, {
        get when() {
          return model.data;
        },
        get children() {
          return [(() => {
            var _el$38 = _tmpl$13();
            createRenderEffect((_$p) => (_$p = model.data.backgroundImage) != null ? _el$38.style.setProperty("background-image", _$p) : _el$38.style.removeProperty("background-image"));
            return _el$38;
          })(), _tmpl$14(), _tmpl$15(), (() => {
            var _el$41 = _tmpl$16(), _el$42 = _el$41.firstChild, _el$43 = _el$42.nextSibling;
            insert(_el$41, createComponent(Filigree.H3, {
              "class": "load-screen-filigree-top absolute top-3 left-1\\/2",
              style: {
                transform: "scaleY(-1) translateX(-50%)"
              }
            }), _el$43);
            insert(_el$41, createComponent(Filigree.H3, {
              "class": "load-screen-filigree-bottom absolute bottom-3 left-1\\/2 -translate-x-1\\/2"
            }), null);
            return _el$41;
          })(), (() => {
            var _el$44 = _tmpl$18(), _el$45 = _el$44.firstChild, _el$46 = _el$45.nextSibling, _el$47 = _el$46.nextSibling, _el$48 = _el$47.firstChild, _el$49 = _el$48.nextSibling, _el$50 = _el$49.firstChild, _el$51 = _el$50.nextSibling;
            insert(_el$47, createComponent(Tab, {
              "class": "load-screen-info absolute inset-0 flex flex-col",
              get defaultTab() {
                return defaultTab();
              },
              get onTabChanged() {
                return model.onTabChanged;
              },
              get children() {
                return [createComponent(Header, {
                  "class": "text-2xl font-medium",
                  get children() {
                    return createComponent(Tab.Title, {});
                  }
                }), createComponent(HorizontalDivider, {
                  "class": "mt-1"
                }), createComponent(ScrollArea, {
                  "class": "load-screen-info-scrollable flex-auto pt-3",
                  useProxy: true,
                  reserveSpace: true,
                  get children() {
                    var _el$52 = _tmpl$17();
                    insert(_el$52, createComponent(Tab.Output, {}));
                    return _el$52;
                  }
                }), createComponent(HorizontalDivider, {
                  "class": "my-1"
                }), createComponent(LoadScreenTipsAndHints, {
                  get text() {
                    return model.data.tipText;
                  },
                  "class": "my-2"
                }), createComponent(HorizontalDivider, {
                  "class": "my-1"
                }), createComponent(Navigation, {}), createComponent(HorizontalDivider, {
                  "class": "my-1"
                }), createComponent(Filigree.H4, {
                  get ["class"]() {
                    return `load-screen-begin-game-button mt-11 ${model.hideBeginButton ? "hidden" : ""}`;
                  },
                  filigreeClass: "mt-5 mx-5",
                  get children() {
                    return createComponent(HeroButton2, {
                      "class": "mx-3 px-8",
                      get disabled() {
                        return !model.canBeginGame;
                      },
                      get onActivate() {
                        return model.onBeginGame;
                      },
                      audio: beginGameSounds,
                      get classList() {
                        return {
                          hidden: model.hideBeginButton
                        };
                      },
                      get children() {
                        return [createComponent(NavHelp, {
                          "class": "-ml-10 mr-2",
                          get disabled() {
                            return !model.canBeginGame;
                          }
                        }), createComponent(L10n.Compose, {
                          text: "LOC_LOADING_BEGIN_GAME"
                        })];
                      }
                    });
                  }
                }), createComponent(Tab.Item, {
                  name: "leader-info",
                  title: () => createComponent(L10n.Compose, {
                    get text() {
                      return model.data.leaderInfo.name;
                    }
                  }),
                  body: () => createComponent(LoadScreenInfoSection, mergeProps(() => model.data.leaderInfo))
                }), createComponent(Tab.Item, {
                  name: "civ-info",
                  title: () => createComponent(L10n.Compose, {
                    get text() {
                      return model.data.civInfo.name;
                    }
                  }),
                  body: () => createComponent(LoadScreenInfoSection, mergeProps(() => model.data.civInfo))
                }), createComponent(Tab.Item, {
                  name: "constructible-info",
                  title: () => createComponent(L10n.Compose, {
                    text: "LOC_LOADING_UNIQUE_BUILDINGS"
                  }),
                  body: () => createComponent(LoadScreenConstructibles, mergeProps(() => model.data.constructibleInfo))
                }), createComponent(Tab.Item, {
                  name: "unit-info",
                  title: () => createComponent(L10n.Compose, {
                    text: "LOC_LOADING_UNIQUE_UNITS"
                  }),
                  body: () => createComponent(LoadScreenUnits, mergeProps(() => model.data.unitInfo))
                }), createComponent(Tab.Item, {
                  name: "tradition-info",
                  title: () => createComponent(L10n.Compose, {
                    text: "LOC_LOADING_TRADITIONS"
                  }),
                  body: () => createComponent(LoadScreenTraditions, mergeProps(() => model.data.traditionInfo))
                }), createComponent(Tab.Item, {
                  name: "memento-info",
                  title: () => createComponent(L10n.Compose, {
                    text: "LOC_LOADING_EQUIPPED_MEMENTOS"
                  }),
                  body: () => createComponent(LoadScreenMementos, mergeProps(() => model.data.mementoInfo))
                })];
              }
            }), null);
            createRenderEffect((_p$) => {
              var _v$3 = model.data.backgroundImage, _v$4 = model.data.leaderImage;
              _v$3 !== _p$.e && ((_p$.e = _v$3) != null ? _el$44.style.setProperty("background-image", _v$3) : _el$44.style.removeProperty("background-image"));
              _v$4 !== _p$.t && ((_p$.t = _v$4) != null ? _el$51.style.setProperty("background-image", _v$4) : _el$51.style.removeProperty("background-image"));
              return _p$;
            }, {
              e: void 0,
              t: void 0
            });
            return _el$44;
          })(), (() => {
            var _el$53 = _tmpl$19(), _el$54 = _el$53.firstChild, _el$55 = _el$54.nextSibling;
            insert(_el$53, createComponent(LoadScreenProgressBar, {
              get progress() {
                return model.progress;
              }
            }), null);
            return _el$53;
          })()];
        }
      });
    }
  });
};
ComponentUtilities.loadStyles(style);

if (UI.isInGame() || UI.isInLoading()) {
  const model = createLoadScreenModel();
  const [ref, setRef] = createSignal();
  if (model) {
    render(() => {
      createEffect(() => {
        if (model.data || UI.getGameLoadingState() == UIGameLoadingState.GameStarted) {
          const hourglassElement = document.getElementById("load-screen-flip-book");
          hourglassElement?.remove();
        }
      });
      createEffect(() => {
        if (IsControllerActive() || IsTouchActive()) {
          UI.hideCursor();
        } else {
          UI.showCursor();
        }
      });
      onMount(() => {
        Input.setActiveContext(InputContext.Shell);
        FocusManager.setFocus(ref());
      });
      onCleanup(() => {
        Input.setActiveContext(InputContext.World);
      });
      return createComponent(LoadScreenContext.Provider, {
        value: model,
        get children() {
          return createComponent(LoadScreen, {
            ref: setRef
          });
        }
      });
    }, document.getElementById("loading-curtain"));
  } else {
    console.error("Unable to render load screen - model could not be created");
  }
}
//# sourceMappingURL=load-screen-bootstrap.js.map
