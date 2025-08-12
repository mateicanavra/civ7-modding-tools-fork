/**
 * @file layout-ranker.ts
 * @copyright 2022, Firaxis Games
 * @description Layer assignment from Directed Acyclic Graphs
 */
import { Graph } from '/core/ui/graph-layout/graph.js';
import { graphAlgo } from './graph-algorithms.js';
export var ranker;
(function (ranker) {
    function networkSimplex(g) {
        g = simplify(g);
        longestPath(g); // init rank with longest path algorithm
        const t = feasibleTree(g);
        initLowLimValues(t);
        initCutValues(t, g);
        let e;
        let f;
        while ((e = leaveEdge(t))) {
            f = enterEdge(t, g, e);
            if (f) {
                exchangeEdges(t, g, e, f);
            }
            else {
                console.error("Couldn't exchange edges");
            }
        }
        return g;
    }
    ranker.networkSimplex = networkSimplex;
    function simplify(g) {
        const simplified = new Graph().setGraph(g.graph());
        g.nodes().forEach(v => { simplified.setNode(v, g.node(v)); });
        g.edges().forEach(e => {
            let simpleLabel = simplified.edge(e.v, e.w) || { weight: 0, minlength: 1 };
            let label = g.edge(e);
            if (simpleLabel.minlength) {
                simplified.setEdge(e.v, e.w, {
                    weight: simpleLabel.weight + label.weight,
                    minlength: Math.max(simpleLabel.minlength, label.minlength)
                });
            }
            else {
                console.error("No minlength for simpleLabel", simpleLabel);
            }
        });
        return simplified;
    }
    function longestPath(g) {
        const visited = {};
        const ranks = {};
        function dfs(v) {
            const label = ranks[v];
            if (visited[v] != undefined) {
                return label.rank;
            }
            visited[v] = true;
            let outEdges = g.outEdges(v);
            if (outEdges == undefined) {
                outEdges = [];
            }
            const mappedEdges = outEdges.map(e => {
                return dfs(e.w) - g.edge(e).minlength;
            });
            let rank = Math.min(...mappedEdges);
            if (rank === Number.POSITIVE_INFINITY || rank === undefined || rank === null) {
                rank = 0;
            }
            ranks[v] = { rank };
            return rank;
        }
        g.sources().forEach(s => dfs(s));
        // set nodes with rank value
        g.nodes().forEach(v => {
            const { rank } = ranks[v];
            g.setNode(v, { ...g.node(v), rank });
        });
    }
    function feasibleTree(g) {
        const t = new Graph({ directed: false });
        // Choose arbitrary node from which to start our tree
        const start = g.nodes()[0];
        const size = g.nodeCount();
        t.setNode(start, {});
        let edge;
        let delta;
        while (tightTree(t, g) < size) {
            edge = findMinSlackEdge(t, g);
            if (edge) {
                delta = t.hasNode(edge.v) ? slack(g, edge) : -slack(g, edge);
                shiftRanks(t, g, delta);
            }
            else {
                console.error("The edge is undefined");
                break;
            }
        }
        return t;
    }
    /*
    * Finds a maximal tree of tight edges and returns the number of nodes in the
    * tree.
    */
    function tightTree(t, g) {
        function dfs(v) {
            const nodeEdges = g.nodeEdges(v);
            if (nodeEdges != undefined) {
                nodeEdges.forEach(function (e) {
                    const edgeV = e.v;
                    const w = (v === edgeV) ? e.w : edgeV;
                    if (!t.hasNode(w) && !slack(g, e)) {
                        t.setNode(w, {});
                        t.setEdge(v, w, {});
                        dfs(w);
                    }
                });
            }
        }
        t.nodes().forEach(v => dfs(v));
        return t.nodeCount();
    }
    /*
     * Finds the edge with the smallest slack that is incident on tree and returns
     * it.
     */
    function findMinSlackEdge(t, g) {
        let minSlack = Number.POSITIVE_INFINITY;
        let minSlackEdge = undefined;
        g.edges().forEach(e => {
            if (t.hasNode(e.v) !== t.hasNode(e.w)) {
                let edgeSlack = slack(g, e);
                if (edgeSlack < minSlack) {
                    minSlack = edgeSlack;
                    minSlackEdge = e;
                }
            }
        });
        return minSlackEdge;
    }
    function shiftRanks(t, g, delta) {
        t.nodes().forEach(v => {
            g.node(v).rank += delta;
        });
    }
    /*
    * Returns the amount of slack for the given edge. The slack is defined as the
    * difference between the length of the edge and its minimum length.
    */
    function slack(g, e) {
        return g.node(e.w).rank - g.node(e.v).rank - g.edge(e).minlength;
    }
    function initLowLimValues(tree, root) {
        if (!root) {
            root = tree.nodes()[0];
        }
        dfsAssignLowLim(tree, {}, 1, root);
    }
    function dfsAssignLowLim(tree, visited, nextLim, v, parent) {
        const low = nextLim;
        const label = tree.node(v);
        visited[v] = true;
        const neighbors = tree.neighbors(v);
        if (neighbors) {
            neighbors.forEach(w => {
                if (visited[w] == undefined) {
                    nextLim = dfsAssignLowLim(tree, visited, nextLim, w, v);
                }
            });
        }
        else {
            console.error("There are no neighbors", neighbors);
        }
        label.low = low;
        label.lim = nextLim++;
        if (parent) {
            label.parent = parent;
        }
        else {
            delete label.parent;
        }
        return nextLim;
    }
    /*
    * Initializes cut values for all edges in the tree.
    */
    function initCutValues(t, g) {
        let vs = graphAlgo.postorder(t, t.nodes());
        vs = vs.slice(0, vs.length - 1);
        vs.forEach(v => {
            assignCutValue(t, g, v);
        });
    }
    function assignCutValue(t, g, child) {
        const childLab = t.node(child);
        const parent = childLab.parent;
        t.edge(child, parent).cutvalue = calcCutValue(t, g, child);
    }
    /*
     * Given the tight tree, its graph, and a child in the graph calculate and
     * return the cut value for the edge between the child and its parent.
     */
    function calcCutValue(t, g, child) {
        const childLab = t.node(child);
        const parent = childLab.parent;
        // True if the child is on the tail end of the edge in the directed graph
        let childIsTail = true;
        // The graph's view of the tree edge we're inspecting
        let graphEdge = g.edge(child, parent);
        // The accumulated cut value for the edge between this node and its parent
        let cutValue = 0;
        if (!graphEdge) {
            childIsTail = false;
            graphEdge = g.edge(parent, child);
        }
        cutValue = graphEdge.weight;
        const childEdges = g.nodeEdges(child);
        if (childEdges != undefined) {
            childEdges.forEach(e => {
                const isOutEdge = e.v === child;
                const other = isOutEdge ? e.w : e.v;
                if (other !== parent) {
                    const pointsToHead = isOutEdge === childIsTail;
                    const otherWeight = g.edge(e).weight;
                    cutValue += pointsToHead ? otherWeight : -otherWeight;
                    if (isTreeEdge(t, child, other)) {
                        const otherCutValue = t.edge(child, other).cutvalue;
                        cutValue += pointsToHead ? -otherCutValue : otherCutValue;
                    }
                }
            });
        }
        else {
            console.error("There are no edges in child: " + child);
        }
        return cutValue;
    }
    /*
    * Returns true if the edge is in the tree.
    */
    function isTreeEdge(tree, u, v) {
        return tree.hasEdge(u, v);
    }
    function leaveEdge(tree) {
        const foundEdge = tree.edges().find(e => tree.edge(e).cutvalue < 0);
        return foundEdge;
    }
    function enterEdge(t, g, edge) {
        let v = edge.v;
        let w = edge.w;
        // For the rest of this function we assume that v is the tail and w is the
        // head, so if we don't have this edge in the graph we should flip it to
        // match the correct orientation.
        if (!g.hasEdge(v, w)) {
            v = edge.w;
            w = edge.v;
        }
        const vLabel = t.node(v);
        const wLabel = t.node(w);
        let tailLabel = vLabel;
        let flip = false;
        // If the root is in the tail of the edge then we need to flip the logic that
        // checks for the head and tail nodes in the candidates function below.
        if (vLabel.lim > wLabel.lim) {
            tailLabel = wLabel;
            flip = true;
        }
        let candidates = g.edges().filter(function (edge) {
            return flip === isDescendant(t.node(edge.v), tailLabel) &&
                flip !== isDescendant(t.node(edge.w), tailLabel);
        });
        let minSlack = Number.POSITIVE_INFINITY;
        let minSlackEdge = undefined;
        candidates.forEach(edge => {
            let edgeSlack = slack(g, edge);
            if (edgeSlack < minSlack) {
                minSlack = edgeSlack;
                minSlackEdge = edge;
            }
        });
        return minSlackEdge;
    }
    function exchangeEdges(t, g, e, f) {
        const v = e.v;
        const w = e.w;
        t.removeEdge(v, w);
        t.setEdge(f.v, f.w, {});
        initLowLimValues(t);
        initCutValues(t, g);
        updateRanks(t, g);
    }
    /*
    * Returns true if the specified node is descendant of the root node per the
    * assigned low and lim attributes in the tree.
    */
    function isDescendant(vLabel, rootLabel) {
        return rootLabel.low <= vLabel.lim && vLabel.lim <= rootLabel.lim;
    }
    function updateRanks(t, g) {
        const root = t.nodes().find(function (v) { return !g.node(v).parent; });
        if (root != undefined) {
            let vs = graphAlgo.preorder(t, [root]);
            vs = vs.slice(1);
            vs.forEach(function (v) {
                const parent = t.node(v).parent;
                let edge = g.edge(v, parent);
                let flipped = false;
                if (!edge) {
                    edge = g.edge(parent, v);
                    flipped = true;
                }
                g.node(v).rank = g.node(parent).rank + (flipped ? edge.minlength : -edge.minlength);
            });
        }
        else {
            console.error("Root of updateRanks() tree is undefined");
        }
    }
})(ranker || (ranker = {}));

//# sourceMappingURL=file:///core/ui/graph-layout/layout-ranker.js.map
