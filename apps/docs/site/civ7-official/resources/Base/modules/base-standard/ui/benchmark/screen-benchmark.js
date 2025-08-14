/**
 * @file screen-benchmark.ts
 * @copyright 2025, Firaxis Games
 * @description Displays information about currently running benchmarks.
 */
import ContextManager from "/core/ui/context-manager/context-manager.js";
import Panel from "/core/ui/panel-support.js";
import { Layout } from "/core/ui/utilities/utilities-layout.js";
import { InterfaceMode } from "/core/ui/interface-modes/interface-modes.js";
let openBenchmarkScreen;
class ScreenBenchmark extends Panel {
    constructor() {
        super(...arguments);
        this.benchUpdateListener = this.onBenchmarkUpdate.bind(this);
        this.benchEndedListener = this.onBenchmarkEnded.bind(this);
        this.navigateInputListener = this.onNavigateInput.bind(this);
        this.engineInputListener = this.onEngineInput.bind(this);
        this.isGraphicsBenchmark = Benchmark.Game.getBenchmarkType() == GameBenchmarkType.GRAPHICS;
        this.resultsFrame = document.createElement("div");
        this.counter = this.createInfoElement(this.isGraphicsBenchmark ? "LOC_UI_BENCHMARK_FRAME" : "LOC_UI_BENCHMARK_TURN");
        this.turnTime = this.createInfoElement("LOC_UI_BENCHMARK_TURN_TIME");
        this.percentile99 = this.createInfoElement("LOC_UI_BENCHMARK_99_PERCENTILE");
        this.average = this.createInfoElement("LOC_UI_BENCHMARK_AVERAGE");
        this.lightGraph = document.createElement("div");
        this.closeButton = document.createElement("fxs-hero-button");
        this.graphCanvas = document.createElement("canvas");
        this.filePath = document.createElement("div");
        this.graphConfig = {};
        this.graphData = [];
        this.frameValues = [];
    }
    onInitialize() {
        this.Root.classList.add("img-modal-frame", "w-100", "flex", "flex-col");
        const title = document.createElement("fxs-header");
        title.classList.add("font-title", "text-xl", "text-center", "uppercase", "tracking-100", "m-4");
        title.setAttribute("filigree-style", "none");
        title.setAttribute("title", this.isGraphicsBenchmark ? "LOC_MAIN_MENU_BENCHMARK_GRAPHICS" : "LOC_MAIN_MENU_BENCHMARK_AI");
        this.Root.appendChild(title);
        this.resultsFrame.classList.add("img-simple-square", "mx-4", "flex", "flex-col");
        this.resultsFrame.classList.toggle("hidden", this.isGraphicsBenchmark);
        this.Root.appendChild(this.resultsFrame);
        this.lightGraph.classList.toggle("hidden", !this.isGraphicsBenchmark);
        this.Root.appendChild(this.lightGraph);
        if (this.isGraphicsBenchmark) {
            this.lightGraph.classList.add("m-2", "h-52", "w-128", "flex-auto");
            waitForLayout(() => {
                const rect = this.lightGraph.getBoundingClientRect();
                Benchmark.Game.setLightweightGraphPosition(rect.x, rect.y, rect.width, rect.height);
            });
        }
        const valuesAndGraph = document.createElement("div");
        valuesAndGraph.classList.add("flex", "flex-row");
        this.resultsFrame.appendChild(valuesAndGraph);
        const values = document.createElement("div");
        values.classList.add("flex", "flex-col", "justify-center");
        valuesAndGraph.appendChild(values);
        this.counter.value.setAttribute("data-l10n-id", Locale.toNumber(1));
        this.counter.root.classList.toggle("hidden", this.isGraphicsBenchmark);
        this.turnTime.root.classList.toggle("hidden", this.isGraphicsBenchmark);
        this.percentile99.root.classList.toggle("hidden", true);
        this.average.root.classList.toggle("hidden", true);
        values.appendChild(this.counter.root);
        values.appendChild(this.turnTime.root);
        values.appendChild(this.percentile99.root);
        values.appendChild(this.average.root);
        const graphArea = document.createElement("div");
        graphArea.classList.add("m-2", "h-52", "w-96", "flex-auto");
        valuesAndGraph.appendChild(graphArea);
        this.graphCanvas.style.setProperty("fxs-font-gradient-color", "#E5E5E5");
        graphArea.appendChild(this.graphCanvas);
        this.initGraph();
        this.filePath.classList.add("hidden", "font-body", "text-2xs", "text-accent-1", "m-2");
        this.resultsFrame.appendChild(this.filePath);
        this.closeButton.setAttribute("caption", "LOC_GENERIC_CANCEL");
        this.closeButton.classList.add("mx-4", "mb-4");
        this.closeButton.setAttribute("action-key", "inline-cancel");
        this.closeButton.addEventListener("action-activate", this.closeBenchmark.bind(this));
        this.Root.appendChild(this.closeButton);
    }
    onAttach() {
        this.Root.addEventListener("navigate-input", this.navigateInputListener);
        this.Root.addEventListener("engine-input", this.engineInputListener);
        engine.on("BenchUpdated", this.benchUpdateListener);
        engine.on("BenchEnded", this.benchEndedListener);
    }
    onDetach() {
        this.Root.removeEventListener("navigate-input", this.navigateInputListener);
        this.Root.removeEventListener("engine-input", this.engineInputListener);
        engine.off("BenchUpdated", this.benchUpdateListener);
        engine.off("BenchEnded", this.benchEndedListener);
    }
    onNavigateInput(navigationEvent) {
        // Eat all navigation input
        navigationEvent.preventDefault();
        navigationEvent.stopImmediatePropagation();
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status == InputActionStatuses.FINISH) {
            if (inputEvent.detail.name == 'cancel' || inputEvent.detail.name == 'keyboard-escape') {
                this.closeBenchmark();
            }
        }
        // Eat all engine input
        inputEvent.preventDefault();
        inputEvent.stopImmediatePropagation();
    }
    onBenchmarkEnded(endData) {
        this.closeButton.setAttribute("caption", "LOC_GENERIC_CLOSE");
        this.resultsFrame.classList.remove("hidden");
        this.lightGraph.classList.add("hidden");
        this.counter.root.classList.add("hidden");
        this.filePath.classList.remove("hidden");
        this.filePath.setAttribute("data-l10n-id", endData.pathCSV);
        if (this.isGraphicsBenchmark) {
            this.percentile99.root.classList.remove("hidden");
            this.percentile99.value.setAttribute("data-l10n-id", Locale.toNumber(endData.quantile99S * 1000));
            this.average.root.classList.remove("hidden");
            this.average.value.setAttribute("data-l10n-id", Locale.toNumber(endData.meanS * 1000));
            this.drawDistributionGraph(endData.quantile99S * 1000);
        }
        else {
            this.turnTime.value.setAttribute("data-l10n-id", Locale.toNumber(endData.meanS));
        }
    }
    onBenchmarkUpdate(updateData) {
        const frameTimeMs = updateData.durationS * 1000;
        this.frameValues.push(frameTimeMs);
        // The UI panel has a nontrivial impact on graphics benchmark data, only show data at the end
        if (!this.isGraphicsBenchmark) {
            this.graphData.push({ x: updateData.currentMeasurement, y: updateData.durationS });
            this.graph.update();
            this.counter.value.setAttribute("data-l10n-id", Locale.toNumber(updateData.currentMeasurement));
            this.turnTime.value.setAttribute("data-l10n-id", Locale.toNumber(updateData.durationS));
        }
    }
    closeBenchmark() {
        if (Benchmark.Game.isRunning()) {
            Benchmark.Game.cancel();
        }
        else {
            Benchmark.Automation.stop();
            openBenchmarkScreen = undefined;
        }
    }
    createInfoElement(label) {
        const infoElement = document.createElement("div");
        infoElement.classList.add("flex", "flex-row", "justify-between");
        const labelElement = document.createElement("div");
        labelElement.classList.add("font-body", "text-base", "text-accent-1", "m-2");
        labelElement.setAttribute("data-l10n-id", label);
        infoElement.appendChild(labelElement);
        const valueElement = document.createElement("div");
        valueElement.classList.add("font-body", "text-base", "text-accent-1", "m-2");
        valueElement.setAttribute("data-l10n-id", "-");
        infoElement.appendChild(valueElement);
        return { root: infoElement, label: labelElement, value: valueElement };
    }
    initGraph() {
        const currLocale = Locale.getCurrentDisplayLocale();
        // map body font variants to current locale
        let fontFamily = "BodyFont";
        switch (currLocale) {
            case "ko_KR":
                fontFamily = "BodyFont-KR";
                break;
            case "ja_JP":
                fontFamily = "BodyFont-JP";
                break;
            case "zh_Hans_CN":
                fontFamily = "BodyFont-SC";
                break;
            case "zh_Hant_HK":
                fontFamily = "BodyFont-TC";
                break;
        }
        ;
        if (typeof Chart != 'undefined') {
            Chart.defaults.maintainAspectRatio = false;
            Chart.defaults.font.size = Layout.textSizeToScreenPixels("base");
            Chart.defaults.font.family = fontFamily;
            Chart.defaults.color = '#E5E5E5';
        }
        const title = this.isGraphicsBenchmark ? "LOC_UI_BENCHMARK_FRAME_TIME_TITLE" : "LOC_UI_BENCHMARK_TURN_TIME_TITLE";
        this.graphConfig = {
            type: "line",
            data: {
                datasets: [{
                        parsing: false,
                        data: this.graphData,
                        backgroundColor: "black",
                        borderColor: "grey",
                    }],
            },
            options: {
                normalized: true,
                spanGaps: true,
                scales: {
                    y: {
                        grid: { color: '#85878C' },
                        type: 'linear',
                        title: { display: false }
                    },
                    x: {
                        grid: { color: '#85878C' },
                        type: 'linear',
                        title: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: Locale.compose(title) },
                    subtitle: { display: false },
                    decimation: { enabled: true, algorithm: "lttb" }
                },
                elements: {
                    point: { radius: 0 }
                }
            }
        };
        const context2d = this.graphCanvas.getContext('2d');
        if (context2d) {
            this.graph = new Chart(context2d, this.graphConfig);
        }
    }
    drawDistributionGraph(percentile99) {
        const NUM_BUCKETS = 100;
        const buckets = new Array(NUM_BUCKETS).fill(0);
        const maxOutlier = percentile99 * 1.5;
        const filteredFrames = this.frameValues.filter(v => v < maxOutlier);
        const frameMax = Math.max(...filteredFrames);
        const frameMin = Math.min(...filteredFrames);
        const range = frameMax - frameMin;
        const bucketTime = range / NUM_BUCKETS;
        this.graphData.length = 0;
        for (const frameTime of filteredFrames) {
            const index = Math.floor(((frameTime - frameMin) * NUM_BUCKETS) / range);
            buckets[index]++;
        }
        for (const [index, entries] of buckets.entries()) {
            const frameTime = frameMin + (index * bucketTime);
            this.graphData.push({ x: frameTime, y: entries });
        }
        const graphTitle = this.graphConfig?.options?.plugins?.title;
        if (graphTitle) {
            graphTitle.text = Locale.compose("LOC_UI_BENCHMARK_FRAME_DISTRIBUTION_TITLE");
        }
        const yAxis = this.graphConfig?.options?.scales?.y;
        if (yAxis) {
            yAxis.display = false;
        }
        this.graph.update();
    }
}
Controls.define("screen-benchmark", {
    createInstance: ScreenBenchmark,
    description: "Save/load and manage saved games.",
});
export function openBenchmarkUi() {
    // Only show the benchmark UI if the benchmark debug UI is disabled
    if (!Benchmark.Game.getDebugUiVisiblity() && openBenchmarkScreen == undefined) {
        InterfaceMode.switchTo("INTERFACEMODE_CINEMATIC", { lazyInit: true });
        openBenchmarkScreen = ContextManager.push("screen-benchmark", { singleton: true, createMouseGuard: true, attributes: { shouldDarken: false } });
    }
}

//# sourceMappingURL=file:///base-standard/ui/benchmark/screen-benchmark.js.map
