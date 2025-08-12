/**
 * Typescript Profiler
 */
const MAX_PROFILES = 40; // Maximum number of sampled series (aka: "profiles") that can be set.
const MAX_SAMPLES = 1000; // Maximum pieces of sampled data for a given profile.
export class Profiler {
    //_highResolutionTicks:number;  // number of ticks between subsquent calls to now
    /**
     * Pre-allocate space for samples.
     */
    constructor() {
        this._label = new Array(MAX_PROFILES);
        this._start = new Array(MAX_PROFILES);
        this._durration = new Array(MAX_PROFILES);
        this._sampleIndexes = new Array(MAX_PROFILES);
        this._labelIndex = -1;
        for (let i = 0; i < MAX_PROFILES; i++) {
            this._start[i] = new Array(MAX_SAMPLES);
            this._durration[i] = new Array(MAX_SAMPLES);
            for (let j = 0; j < MAX_SAMPLES; j++) {
                this._start[i][j] = 0;
                this._durration[i][j] = 0;
            }
        }
        // Construct high speed counter by determining amount of iterations between now() calls.
        /*
        let samples:number[] = new Array<number>(100000).fill(0);
        samples.forEach( (_, index, array ) => {
          let ticks:number = 1;
          let now:number = performance.now();             // find now in current boundry
          while( now == performance.now() ) {}            // get to next boundry
          now = performance.now();                        // set now at the start of new boundry
          while( now == performance.now() ) { ticks++; }  // iterate until leaving boundry
          array[index] = ticks;                           // store iteration #
        });
        this._highResolutionTicks = samples.reduce((a:number, b:number) => a + b) / samples.length;   // compute average
        console.log("HSavg: "+this._highResolutionTicks);
        */
    }
    /**
     * Set a label an obtain it's ID.
     * @param name Label to associate with ID.
     * @returns The assigned ID for that label.
     */
    setLabel(name) {
        this._labelIndex++;
        if (this._labelIndex >= MAX_PROFILES) {
            console.error("Too many profile labels set. Increaese max # or remove series. Max= " + MAX_PROFILES);
            return -1;
        }
        this._label[this._labelIndex] = name;
        this._sampleIndexes[this._labelIndex] = 0;
        return this._labelIndex;
    }
    /**
     * Start tracking a profile
     * @param id Identifier of the area to profile; obtained by calling @function setLabel()
     * @param attributes optional, if useBoundry is set then start will spin until now() time boundry passes. (Don't use in nested profile calls or it will artifically inflate outter level calls.)
     */
    start(id, attributes) {
        // Using a boundry will wait until the next MS starts; not recommended if nested within other performance
        // counters as it will throw off the values.
        if (attributes?.useBoundry) {
            let now = performance.now();
            while (now == performance.now()) { } // wait until change
        }
        this._start[id][this._sampleIndexes[id]] = performance.now();
    }
    /**
     * End the tracking of a profile and record it's data.
     * @param id Identifier of the area to profile; obtained by calling @function setLabel()
     */
    end(id) {
        this._durration[id][this._sampleIndexes[id]] = performance.now() - this._start[id][this._sampleIndexes[id]];
        this._sampleIndexes[id]++;
        if (this._sampleIndexes[id] >= MAX_SAMPLES) { // Wrap sampling back to 0 if all samples are filled (TODO: track # of wraps? Would this be useful?)
            this._sampleIndexes[id] = 0;
        }
    }
    /**
     * Return the average for a given profile series.
     * @param id Identifier of the array to work on.
     */
    computeAverage(id) {
        let average = (array) => array.reduce((a, b) => a + b) / array.length;
        return average(this._durration[id]);
    }
    /**
     * Return the worst for a given profile series.
     * @param id Identifier of the array to work on.
     */
    findWorst(id) {
        let worst = (array) => array.reduce(function (a, b) { return Math.max(a, b); });
        return worst(this._durration[id]);
    }
    /**
     * Show output in CSV format
     * @returns A comma separated value (CSV) file of the output.  A header row is output first with newlines for each row.
     */
    toCSV() {
        let out = "#,label,average(ms),worst(ms),\n";
        for (let i = 0; i <= this._labelIndex; i++) {
            out += i.toString() + "," + this._label[i] + "," + this.computeAverage(i).toFixed(2) + "," + this.findWorst(i).toFixed(2) + ",\n";
        }
        return out;
    }
    /**
       * Show output in the JSON format used by the Google Chrome profiler via URL: chrome://tracing/
       * https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/edit#
       * @returns A comma separated value (CSV) file of the output.  A header row is output first with newlines for each row.
       */
    toChromeJSON() {
        let allEvents = {
            traceEvents: [],
            displayTimeUnit: "ns"
        };
        for (let i = 0; i <= this._labelIndex; i++) {
            let completeEvent = {
                name: this._label[i],
                cat: "PERF",
                ph: "X",
                ts: 0,
                dur: (this.computeAverage(i) * 100),
                pid: 1,
                tid: 1,
                args: {}
            };
            allEvents.traceEvents.push(completeEvent);
        }
        return JSON.stringify(allEvents);
    }
}

//# sourceMappingURL=file:///core/ui/utilities/Profiler.js.map
