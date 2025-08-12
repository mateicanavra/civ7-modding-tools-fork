/**
 * @file layout.ts
 * @copyright 2022, Firaxis Games
 * @description Layout class for graphs
 */
import { Graph, Label } from '/core/ui/graph-layout/graph.js';
import { utils } from '/core/ui/graph-layout/utils.js';
import { normalize } from '/core/ui/graph-layout/layout-normalize.js';
import { ranker } from '/core/ui/graph-layout/layout-ranker.js';
import { order } from '/core/ui/graph-layout/layout-order.js';

export class GraphLayout {

    private inputGraph: Graph;
    private layoutGraph: Graph;
    private rankedLayoutGraph: Graph;

    constructor(graph: Graph) {
        this.inputGraph = graph;
        this.layoutGraph = new Graph();
        this.rankedLayoutGraph = new Graph();
    }

    // Auto resolve doesn't need more than the relations between nodes (connectedNodeTypes in our case, adjacency list for more general graphs)
    autoResolve(): Graph {
        this.layoutGraph = this.getLayoutGraph();
        this.rankedLayoutGraph = this.rank(utils.asNonCompoundGraph(this.layoutGraph)); // returns new Graph
        this.removeEmptyRanks(this.rankedLayoutGraph);  // mutation
        this.normalizeRanks(this.rankedLayoutGraph);    // mutation
        this.normalize(this.rankedLayoutGraph);         // mutation
        this.order(this.rankedLayoutGraph);             // mutation
        // after this.order() the rankedLayout graph nodes contain an order property which is the node position in the layer (rank)
        return this.rankedLayoutGraph;
    }

    // This will get us a layout graph so we can separate the steps for ranking, normalize and ordering if we want to.
    getLayoutGraph(): Graph {
        return this.buildLayoutGraph(this.inputGraph);
    }

    private buildLayoutGraph(inputGraph: Graph): Graph {
        let g: Graph = new Graph({ multigraph: true, compound: true });

        g.setGraph(utils.graphDefaults);

        inputGraph.nodes().forEach(v => {
            g.setNode(v, utils.nodeDefaults);
            g.setParent(v, inputGraph.parent(v));
        });

        inputGraph.edges().forEach(e => {
            g.setEdge(e, utils.edgeDefaults);
        })

        return g;
    }

    // Ranking will be private because the treeDepth (rank) is defined by the data and we will not automatically resolve the rank for now
    private rank(g: Graph): Graph {
        return this.networkSimplexRanker(g);
    }

    private networkSimplexRanker(g: Graph): Graph {
        return ranker.networkSimplex(g);
    }

    private removeEmptyRanks(g: Graph) {
        // Ranks may not start at 0, so we need to offset them
        const ranks: number[] = g.nodes().map(v => g.node(v).rank);
        const offset: number = Math.min(...ranks);

        const layers: string[][] = [];
        g.nodes().forEach(function (v) {
            let rank: number = g.node(v).rank - offset;
            if (!layers[rank]) {
                layers[rank] = [];
            }
            layers[rank].push(v);
        });

        let delta: number = 0;
        const nodeRankFactor: number = g.graph().nodeRankFactor || 0;
        layers.forEach(function (vs, i) {
            if (vs == undefined && i % nodeRankFactor != 0) {
                --delta;
            } else if (delta) {
                vs.forEach(function (v) { g.node(v).rank += delta; });
            }
        });
    }

    /*
    * Adjusts the ranks for all nodes in the graph such that all nodes v have
    * rank(v) >= 0 and at least one node w has rank(w) = 0.
    */
    private normalizeRanks(g: Graph) {
        const ranks: number[] = g.nodes().map(v => g.node(v).rank);
        const min: number = Math.min(...ranks);

        g.nodes().forEach(function (v) {
            const node: Label = g.node(v);
            if (node.hasOwnProperty("rank")) {
                node.rank -= min;
            }
        });
    }

    normalize(g: Graph) {
        normalize.run(g);
    }

    order(g: Graph) {
        order.run(g);
    }
}