/**
 * @file layout-order.ts
 * @copyright 2022, Firaxis Games
 * @description Ordering algorithms to reduce cross counting in graph layers.
 */
import { Graph } from '/core/ui/graph-layout/graph.js';
import { utils } from '/core/ui/graph-layout/utils.js';
var EdgeRelations;
(function (EdgeRelations) {
    EdgeRelations["in"] = "inEdges";
    EdgeRelations["out"] = "outEdges";
})(EdgeRelations || (EdgeRelations = {}));
export var order;
(function (order) {
    function run(g) {
        const maxRank = utils.maxRank(g);
        const downLayerGraphs = buildLayerGraphs(g, utils.range(1, maxRank + 1), EdgeRelations.in);
        const upLayerGraphs = buildLayerGraphs(g, utils.range(maxRank - 1, -1, -1), EdgeRelations.out);
        let layering = initOrder(g); // inits the order with the current arrangement
        assignOrder(g, layering); // assigns the order property to the node from this original layering
        let bestCC = Number.POSITIVE_INFINITY;
        let best = [];
        for (let i = 0, lastBest = 0; lastBest < 4; ++i, ++lastBest) {
            sweepLayerGraphs(i % 2 ? downLayerGraphs : upLayerGraphs, i % 4 >= 2);
            layering = utils.buildLayerMatrix(g); // Constructs an array of layers with ordered nodes.
            let cc = crossCount(g, layering); // Counts the crossings from this layering.
            if (cc < bestCC) { // Assign "best" to the layer with less crossings.
                lastBest = 0;
                best = utils.cloneSimpleArray(layering);
                bestCC = cc;
            }
        }
        assignOrder(g, best); // Assigns the order on the layer with less crossings
    }
    order.run = run;
    function buildLayerGraphs(g, ranks, relationship) {
        return ranks.map(function (rank) {
            return buildLayerGraph(g, rank, relationship);
        });
    }
    function buildLayerGraph(g, rank, relationship) {
        let root = createRootNode(g);
        const result = new Graph({ compound: true }).setGraph({ root: root }).setDefaultNodeLabel(function (v) { return g.node(v); });
        g.nodes().forEach(function (v) {
            const node = g.node(v);
            const parent = g.parent(v);
            if (node.rank === rank || node.minRank <= rank && rank <= node.maxRank) {
                result.setNode(v);
                result.setParent(v, parent || root);
                // This assumes we have only short edges!
                g[relationship](v)?.forEach(function (e) {
                    const u = e.v === v ? e.w : e.v, edge = result.edge(u, v), weight = edge !== undefined ? edge.weight : 0;
                    result.setEdge(u, v, { weight: g.edge(e).weight + weight });
                });
                if (node.hasOwnProperty("minRank")) {
                    result.setNode(v, {
                        borderLeft: node.borderLeft[rank],
                        borderRight: node.borderRight[rank]
                    });
                }
            }
        });
        return result;
    }
    function createRootNode(g) {
        let v;
        while (g.hasNode((v = utils.uniqueId("_root"))))
            ;
        return v;
    }
    function sweepLayerGraphs(layerGraphs, biasRight) {
        const cg = new Graph();
        layerGraphs.forEach(function (lg) {
            const root = lg.graph().root;
            const sorted = sortSubgraph(lg, root, cg, biasRight);
            sorted.vs.forEach(function (v, i) {
                lg.node(v).order = i;
            });
            addSubgraphConstraints(lg, cg, sorted.vs);
        });
    }
    function sortSubgraph(g, v, cg, biasRight) {
        let movable = g.children(v);
        const node = g.node(v);
        const bl = node ? node.borderLeft : undefined;
        const br = node ? node.borderRight : undefined;
        const subgraphs = {};
        if (bl) {
            movable = movable.filter(function (w) { return w !== bl && w !== br; });
        }
        const barycenters = barycenter(g, movable);
        barycenters.forEach(function (entry) {
            if (g.children(entry.v).length) {
                let subgraphResult = sortSubgraph(g, entry.v, cg, biasRight);
                subgraphs[entry.v] = subgraphResult;
                if (subgraphResult.hasOwnProperty("barycenter")) {
                    mergeBarycenters(entry, subgraphResult);
                }
            }
        });
        const entries = resolveConflicts(barycenters, cg);
        expandSubgraphs(entries, subgraphs);
        const result = sort(entries, biasRight);
        if (bl) {
            result.vs = utils.flatten([bl, result.vs, br]);
            if (g.predecessors(bl).length) {
                const blPred = g.node(g.predecessors(bl)[0]);
                const brPred = g.node(g.predecessors(br)[0]);
                if (!result.hasOwnProperty("barycenter")) {
                    result.barycenter = 0;
                    result.weight = 0;
                }
                if (result.barycenter != undefined && result.weight != undefined) {
                    result.barycenter = (result.barycenter * result.weight + blPred.order + brPred.order) / (result.weight + 2);
                    result.weight += 2;
                }
            }
        }
        return result;
    }
    function addSubgraphConstraints(g, cg, vs) {
        const prev = {};
        let rootPrev;
        vs.forEach(function (v) {
            let child = g.parent(v);
            let parent;
            let prevChild;
            while (child) {
                parent = g.parent(child);
                if (parent) {
                    prevChild = prev[parent];
                    prev[parent] = child;
                }
                else {
                    prevChild = rootPrev;
                    rootPrev = child;
                }
                if (prevChild && prevChild !== child) {
                    cg.setEdge(prevChild, child);
                    return;
                }
                child = parent;
            }
        });
    }
    function barycenter(g, movable) {
        return movable.map(function (v) {
            const inV = g.inEdges(v);
            if (!inV?.length) {
                return { v: v };
            }
            else {
                const result = inV.reduce(function (acc, e) {
                    const edge = g.edge(e);
                    const nodeU = g.node(e.v);
                    return {
                        sum: acc.sum + (edge.weight * nodeU.order),
                        weight: acc.weight + edge.weight
                    };
                }, { sum: 0, weight: 0 });
                return {
                    v: v,
                    barycenter: result.sum / result.weight,
                    weight: result.weight
                };
            }
        });
    }
    function resolveConflicts(entries, cg) {
        const mappedEntries = {};
        entries.forEach(function (entry, i) {
            const tmp = mappedEntries[entry.v] = {
                indegree: 0,
                "in": [],
                out: [],
                vs: [entry.v],
                i: i
            };
            if (entry.barycenter != undefined) {
                tmp.barycenter = entry.barycenter;
                tmp.weight = entry.weight;
            }
        });
        cg.edges().forEach(function (e) {
            const entryV = mappedEntries[e.v];
            const entryW = mappedEntries[e.w];
            if (entryV != undefined && entryW != undefined) {
                entryW.indegree++;
                entryV.out.push(mappedEntries[e.w]);
            }
        });
        const sourceSet = [];
        for (const entryKey in mappedEntries) {
            const entry = mappedEntries[entryKey];
            if (!entry.indegree) {
                sourceSet.push(entry);
            }
        }
        return doResolveConflicts(sourceSet);
    }
    function doResolveConflicts(sourceSet) {
        const entries = [];
        function handleIn(vEntry) {
            return function (uEntry) {
                if (uEntry.merged) {
                    return;
                }
                if (uEntry.barycenter == undefined || vEntry.barycenter == undefined || uEntry.barycenter >= vEntry.barycenter) {
                    mergeEntries(vEntry, uEntry);
                }
            };
        }
        function handleOut(vEntry) {
            return function (wEntry) {
                wEntry["in"].push(vEntry);
                if (--wEntry.indegree === 0) {
                    sourceSet.push(wEntry);
                }
            };
        }
        while (sourceSet.length) {
            const entry = sourceSet.pop();
            if (entry) {
                entries.push(entry);
                entry["in"].reverse().forEach(entry => handleIn(entry));
                entry.out.forEach(entry => handleOut(entry));
            }
        }
        return entries.filter(function (entry) { return !entry.merged; }).map(entry => {
            const newEntry = {
                vs: entry.vs,
                i: entry.i,
            };
            if (entry.barycenter != undefined && entry.weight != undefined) {
                newEntry.barycenter = entry.barycenter;
                newEntry.weight = entry.weight;
            }
            return newEntry;
        });
    }
    function expandSubgraphs(entries, subgraphs) {
        entries.forEach(function (entry) {
            entry.vs = utils.flatten(entry.vs.map(function (v) {
                if (subgraphs[v]) {
                    return subgraphs[v].vs;
                }
                return v;
            }));
        });
    }
    function sort(entries, biasRight) {
        const parts = utils.partition(entries, function (entry) {
            return (entry.hasOwnProperty("barycenter"));
        });
        const sortable = parts.lhs;
        const unsortable = parts.rhs.sort(function (entryA, entryB) { return entryB.i - entryA.i; });
        const vs = [];
        let sum = 0;
        let weight = 0;
        let vsIndex = 0;
        sortable.sort(compareWithBias(!!biasRight));
        vsIndex = consumeUnsortable(vs, unsortable, vsIndex);
        sortable.forEach(function (entry) {
            vsIndex += entry.vs.length;
            vs.push(entry.vs);
            sum += entry.barycenter * entry.weight;
            weight += entry.weight;
            vsIndex = consumeUnsortable(vs, unsortable, vsIndex);
        });
        const result = { vs: utils.flatten(vs) };
        if (weight) {
            result.barycenter = sum / weight;
            result.weight = weight;
        }
        return result;
    }
    function compareWithBias(bias) {
        return function (entryV, entryW) {
            if (entryV.barycenter != undefined && entryW.barycenter != undefined && entryV.barycenter < entryW.barycenter) {
                return -1;
            }
            else if (entryV.barycenter != undefined && entryW.barycenter != undefined && entryV.barycenter > entryW.barycenter) {
                return 1;
            }
            return !bias ? entryV.i - entryW.i : entryW.i - entryV.i;
        };
    }
    function consumeUnsortable(vs, unsortable, index) {
        let last;
        while (unsortable.length && (last = unsortable[unsortable.length - 1]).i <= index) {
            unsortable.pop();
            vs.push(last.vs);
            index++;
        }
        return index;
    }
    function mergeEntries(target, source) {
        let sum = 0;
        let weight = 0;
        if (target.weight && target.barycenter) {
            sum += target.barycenter * target.weight;
            weight += target.weight;
        }
        if (source.weight && source.barycenter) {
            sum += source.barycenter * source.weight;
            weight += source.weight;
        }
        target.vs = source.vs.concat(target.vs);
        target.barycenter = sum / weight;
        target.weight = weight;
        target.i = Math.min(source.i, target.i);
        source.merged = true;
    }
    function mergeBarycenters(target, other) {
        if (target.barycenter != undefined && target.weight != undefined && other.barycenter != undefined && other.weight != undefined) {
            target.barycenter = (target.barycenter * target.weight + other.barycenter * other.weight) / (target.weight + other.weight);
            target.weight += other.weight;
        }
        else {
            target.barycenter = other.barycenter;
            target.weight = other.weight;
        }
    }
    /*
    * Assigns an initial order value for each node by performing a DFS search
    * starting from nodes in the first rank. Nodes are assigned an order in their
    * rank as they are first visited.
    *
    * This approach comes from Gansner, et al., "A Technique for Drawing Directed
    * Graphs."
    *
    * Returns a layering matrix with an array per layer and each layer sorted by
    * the order of its nodes.
    */
    function initOrder(g) {
        const visited = {};
        const simpleNodes = g.nodes().filter(function (v) { return !g.children(v).length; });
        const maxRank = Math.max(...simpleNodes.map(function (v) { return g.node(v).rank; }));
        const layers = utils.range(0, maxRank + 1).map(function () { return []; });
        function dfs(v) {
            if (visited[v] != undefined)
                return;
            visited[v] = true;
            const node = g.node(v);
            layers[node.rank].push(v);
            g.successors(v)?.forEach(v => dfs(v));
        }
        const orderedVs = simpleNodes.sort(function (v, w) { return g.node(v).rank - g.node(w).rank; });
        orderedVs.forEach(v => dfs(v));
        return layers;
    }
    function assignOrder(g, layering) {
        layering.forEach(function (layer) {
            layer.forEach(function (v, i) {
                g.node(v).order = i;
            });
        });
    }
    function crossCount(g, layering) {
        let cc = 0;
        for (let i = 1; i < layering.length; ++i) {
            cc += twoLayerCrossCount(g, layering[i - 1], layering[i]);
        }
        return cc;
    }
    function twoLayerCrossCount(g, northLayer, southLayer) {
        // Sort all of the edges between the north and south layers by their position
        // in the north layer and then in the south layer. Map these edges to the position of
        // their head in the south layer.
        const southPos = utils.zipObject(southLayer, southLayer.map(function (_v, i) { return i; }));
        const southEntries = utils.flatten(northLayer.map(function (v) {
            const posOutEdges = g.outEdges(v)?.map(function (e) {
                return { pos: southPos[e.w], weight: g.edge(e).weight };
            });
            const southEntries = posOutEdges?.sort((a, b) => a.pos - b.pos);
            return southEntries || [];
        }));
        // Build the accumulator tree
        let firstIndex = 1;
        while (firstIndex < southLayer.length)
            firstIndex <<= 1;
        const treeSize = 2 * firstIndex - 1;
        firstIndex -= 1;
        const tree = new Array(treeSize).fill(0);
        // Calculate the weighted crossings
        let cc = 0;
        southEntries.forEach(function (entry) {
            let index = entry.pos + firstIndex;
            tree[index] += entry.weight;
            let weightSum = 0;
            while (index > 0) {
                if (index % 2) {
                    weightSum += tree[index + 1];
                }
                index = (index - 1) >> 1;
                tree[index] += entry.weight;
            }
            cc += entry.weight * weightSum;
        });
        return cc;
    }
})(order || (order = {}));

//# sourceMappingURL=file:///core/ui/graph-layout/layout-order.js.map
