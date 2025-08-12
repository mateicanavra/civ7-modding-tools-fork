/**
 * @file layout-normalize.ts
 * @copyright 2022, Firaxis Games
 * @description Creates dummy chains from not normalized edges (edges that span more than one layer/level of tree depth)
 */
import { utils } from '/core/ui/graph-layout/utils.js';
/*
 * Breaks any long edges in the graph into short segments that span 1 layer
 * each. This operation is undoable with the denormalize function.
 *
 * Pre-conditions:
 *
 *    1. The input graph is a DAG.
 *    2. Each node in the graph has a "rank" property.
 *
 * Post-condition:
 *
 *    1. All edges in the graph have a length of 1.
 *    2. Dummy nodes are added where edges have been split into segments.
 *    3. The graph is augmented with a "dummyChains" attribute which contains
 *       the first dummy in each chain of dummy nodes produced.
 */
export var normalize;
(function (normalize) {
    function run(g) {
        g.graph().dummyChains = [];
        g.edges().forEach(function (edge) { normalizeEdge(g, edge); });
    }
    normalize.run = run;
    function normalizeEdge(g, e) {
        let v = e.v;
        let vRank = g.node(v).rank;
        const w = e.w;
        const wRank = g.node(w).rank;
        const name = e.name;
        const edgeLabel = g.edge(e);
        const labelRank = edgeLabel.labelRank;
        if (wRank === vRank + 1)
            return;
        g.removeEdge(e);
        let dummy;
        let attrs;
        let i;
        for (i = 0, ++vRank; vRank < wRank; ++i, ++vRank) {
            edgeLabel.points = [];
            attrs = {
                width: 0, height: 0,
                edgeLabel: edgeLabel, edgeObj: e,
                rank: vRank
            };
            dummy = utils.addDummyNode(g, "edge", attrs, "_d");
            if (vRank === labelRank) {
                attrs.width = edgeLabel.width;
                attrs.height = edgeLabel.height;
                attrs.dummy = "edge-label";
                attrs.labelpos = edgeLabel.labelpos;
            }
            g.setEdge(v, dummy, { weight: edgeLabel.weight }, name);
            const graphDummyChains = g.graph().dummyChains;
            if (i === 0 && graphDummyChains) {
                graphDummyChains.push(dummy);
            }
            v = dummy;
        }
        g.setEdge(v, w, { weight: edgeLabel.weight }, name);
    }
})(normalize || (normalize = {}));

//# sourceMappingURL=file:///core/ui/graph-layout/layout-normalize.js.map
