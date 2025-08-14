/**
 * @file layout-order.ts
 * @copyright 2022, Firaxis Games
 * @description Ordering algorithms to reduce cross counting in graph layers. 
 */

import { Edge, Graph, Label } from '/core/ui/graph-layout/graph.js';
import { utils, PartitionLR } from '/core/ui/graph-layout/utils.js';
import { VisitedElement } from '/core/ui/graph-layout/layout-ranker.js';

enum EdgeRelations {
    in = "inEdges",
    out = "outEdges"
}

interface Barycenter {
    v: string,
    barycenter?: number,
    weight?: number
}

export interface EntryResolved {
    vs: string[],
    i: number,
    barycenter?: number,
    weight?: number
}

export interface EntryResolvedSortable {
    vs: string[],
    i: number,
    barycenter: number,
    weight: number
}

interface Entries {
    [key: string]: Entry
}
interface Entry {
    indegree: number,
    in: Entry[],
    out: Entry[],
    vs: string[],
    i: number,
    barycenter?: number,
    weight?: number,
    merged?: boolean,
}
interface SortResult {
    vs: string[]
    barycenter?: number
    weight?: number
}

interface PrevObject {
    [key: string]: string
}

interface Subgraphs {
    [key: string]: SortResult
}

interface PosOutEdges {
    pos: number,
    weight: number
}

interface BarycenterResult {
    sum: number;
    weight: number;
}

export namespace order {
    export function run(g: Graph) {
        const maxRank: number = utils.maxRank(g);
        const downLayerGraphs: Graph[] = buildLayerGraphs(g, utils.range(1, maxRank + 1), EdgeRelations.in);
        const upLayerGraphs: Graph[] = buildLayerGraphs(g, utils.range(maxRank - 1, -1, -1), EdgeRelations.out);

        let layering: string[][] = initOrder(g); // inits the order with the current arrangement
        assignOrder(g, layering);    // assigns the order property to the node from this original layering

        let bestCC: number = Number.POSITIVE_INFINITY;
        let best: string[][] = [];

        for (let i: number = 0, lastBest = 0; lastBest < 4; ++i, ++lastBest) {
            sweepLayerGraphs(i % 2 ? downLayerGraphs : upLayerGraphs, i % 4 >= 2);

            layering = utils.buildLayerMatrix(g);  // Constructs an array of layers with ordered nodes.
            let cc: number = crossCount(g, layering);      // Counts the crossings from this layering.
            if (cc < bestCC) {                     // Assign "best" to the layer with less crossings.
                lastBest = 0;
                best = utils.cloneSimpleArray(layering);
                bestCC = cc;
            }
        }

        assignOrder(g, best);  // Assigns the order on the layer with less crossings
    }

    function buildLayerGraphs(g: Graph, ranks: number[], relationship: EdgeRelations): Graph[] {
        return ranks.map(function (rank) {
            return buildLayerGraph(g, rank, relationship);
        });
    }

    function buildLayerGraph(g: Graph, rank: number, relationship: EdgeRelations) {
        let root: string = createRootNode(g)
        const result: Graph = new Graph({ compound: true }).setGraph({ root: root }).setDefaultNodeLabel(function (v: string) { return g.node(v); });

        g.nodes().forEach(function (v) {
            const node: Label = g.node(v);
            const parent: string | undefined = g.parent(v);

            if (node.rank === rank || node.minRank <= rank && rank <= node.maxRank) {
                result.setNode(v);
                result.setParent(v, parent || root);

                // This assumes we have only short edges!
                g[relationship](v)?.forEach(function (e) {
                    const u: string = e.v === v ? e.w : e.v,
                        edge = result.edge(u, v),
                        weight = edge !== undefined ? edge.weight : 0;
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

    function createRootNode(g: Graph): string {
        let v: string;
        while (g.hasNode((v = utils.uniqueId("_root"))));
        return v;
    }

    function sweepLayerGraphs(layerGraphs: Graph[], biasRight: boolean) {
        const cg: Graph = new Graph();
        layerGraphs.forEach(function (lg) {
            const root: string | undefined = lg.graph().root;
            const sorted: SortResult = sortSubgraph(lg, root as string, cg, biasRight);
            sorted.vs.forEach(function (v, i) {
                lg.node(v).order = i;
            });
            addSubgraphConstraints(lg, cg, sorted.vs);
        });
    }

    function sortSubgraph(g: Graph, v: string, cg: Graph, biasRight: boolean) {
        let movable: string[] = g.children(v);
        const node: Label | undefined = g.node(v);
        const bl: string = node ? node.borderLeft : undefined;
        const br: string = node ? node.borderRight : undefined;
        const subgraphs: Subgraphs = {};

        if (bl) {
            movable = movable.filter(function (w) { return w !== bl && w !== br; });
        }

        const barycenters: Barycenter[] = barycenter(g, movable);
        barycenters.forEach(function (entry) {
            if (g.children(entry.v).length) {
                let subgraphResult: SortResult = sortSubgraph(g, entry.v, cg, biasRight);

                subgraphs[entry.v] = subgraphResult;
                if (subgraphResult.hasOwnProperty("barycenter")) {
                    mergeBarycenters(entry, subgraphResult);
                }
            }
        });

        const entries: EntryResolved[] = resolveConflicts(barycenters, cg);
        expandSubgraphs(entries, subgraphs);

        const result: SortResult = sort(entries, biasRight);

        if (bl) {
            result.vs = utils.flatten([bl, result.vs, br]);
            if (g.predecessors(bl).length) {
                const blPred: Label = g.node(g.predecessors(bl)[0]);
                const brPred: Label = g.node(g.predecessors(br)[0]);
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

    function addSubgraphConstraints(g: Graph, cg: Graph, vs: string[]) {
        const prev: PrevObject = {};
        let rootPrev: string;

        vs.forEach(function (v) {
            let child: string | undefined = g.parent(v);
            let parent: string | undefined;
            let prevChild: string;
            while (child) {
                parent = g.parent(child);
                if (parent) {
                    prevChild = prev[parent];
                    prev[parent] = child;
                } else {
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

    function barycenter(g: Graph, movable: string[]): Barycenter[] {
        return movable.map(function (v) {
            const inV: Edge[] | undefined = g.inEdges(v);
            if (!inV?.length) {
                return { v: v };
            } else {
                const result: BarycenterResult = inV.reduce(function (acc, e) {
                    const edge: Label = g.edge(e);
                    const nodeU: Label = g.node(e.v);
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

    function resolveConflicts(entries: Barycenter[], cg: Graph) {
        const mappedEntries: Entries = {};
        entries.forEach(function (entry, i) {
            const tmp: Entry = mappedEntries[entry.v] = {
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
            const entryV: Entry = mappedEntries[e.v];
            const entryW: Entry = mappedEntries[e.w];
            if (entryV != undefined && entryW != undefined) {
                entryW.indegree++;
                entryV.out.push(mappedEntries[e.w]);
            }
        });

        const sourceSet: Entry[] = [];
        for (const entryKey in mappedEntries) {
            const entry: Entry = mappedEntries[entryKey];
            if (!entry.indegree) {
                sourceSet.push(entry)
            }
        }

        return doResolveConflicts(sourceSet);
    }

    function doResolveConflicts(sourceSet: Entry[]): EntryResolved[] {
        const entries: Entry[] = [];

        function handleIn(vEntry: Entry) {
            return function (uEntry: Entry) {
                if (uEntry.merged) {
                    return;
                }
                if (uEntry.barycenter == undefined || vEntry.barycenter == undefined || uEntry.barycenter >= vEntry.barycenter) {
                    mergeEntries(vEntry, uEntry);
                }
            };
        }

        function handleOut(vEntry: Entry) {
            return function (wEntry: Entry) {
                wEntry["in"].push(vEntry);
                if (--wEntry.indegree === 0) {
                    sourceSet.push(wEntry);
                }
            };
        }

        while (sourceSet.length) {
            const entry: Entry | undefined = sourceSet.pop();
            if (entry) {
                entries.push(entry);
                entry["in"].reverse().forEach(entry => handleIn(entry));
                entry.out.forEach(entry => handleOut(entry));
            }
        }

        return entries.filter(function (entry) { return !entry.merged; }).map(entry => {
            const newEntry: EntryResolved = {
                vs: entry.vs,
                i: entry.i,
            }

            if (entry.barycenter != undefined && entry.weight != undefined) {
                newEntry.barycenter = entry.barycenter;
                newEntry.weight = entry.weight;
            }

            return newEntry
        });

    }

    function expandSubgraphs(entries: EntryResolved[], subgraphs: Subgraphs) {
        entries.forEach(function (entry) {
            entry.vs = utils.flatten(entry.vs.map(function (v) {
                if (subgraphs[v]) {
                    return subgraphs[v].vs;
                }
                return v;
            }));
        });
    }

    function sort(entries: EntryResolved[], biasRight: boolean): SortResult {
        const parts: PartitionLR = utils.partition(entries, function (entry: EntryResolved) {
            return (entry.hasOwnProperty("barycenter"));
        });
        const sortable: EntryResolvedSortable[] = parts.lhs;
        const unsortable: EntryResolved[] = parts.rhs.sort(function (entryA, entryB) { return entryB.i - entryA.i; });
        const vs: string[][] = [];
        let sum: number = 0;
        let weight: number = 0;
        let vsIndex: number = 0;

        sortable.sort(compareWithBias(!!biasRight));

        vsIndex = consumeUnsortable(vs, unsortable, vsIndex);

        sortable.forEach(function (entry) {
            vsIndex += entry.vs.length;
            vs.push(entry.vs);
            sum += entry.barycenter * entry.weight;
            weight += entry.weight;
            vsIndex = consumeUnsortable(vs, unsortable, vsIndex);
        });

        const result: SortResult = { vs: utils.flatten(vs) };
        if (weight) {
            result.barycenter = sum / weight;
            result.weight = weight;
        }
        return result;
    }

    function compareWithBias(bias: boolean) {
        return function (entryV: EntryResolved, entryW: EntryResolved): number {
            if (entryV.barycenter != undefined && entryW.barycenter != undefined && entryV.barycenter < entryW.barycenter) {
                return -1;
            } else if (entryV.barycenter != undefined && entryW.barycenter != undefined && entryV.barycenter > entryW.barycenter) {
                return 1;
            }

            return !bias ? entryV.i - entryW.i : entryW.i - entryV.i;
        };
    }

    function consumeUnsortable(vs: string[][], unsortable: EntryResolved[], index: number): number {
        let last: EntryResolved;
        while (unsortable.length && (last = unsortable[unsortable.length - 1]).i <= index) {
            unsortable.pop();
            vs.push(last.vs);
            index++;
        }
        return index;
    }

    function mergeEntries(target: Entry, source: Entry) {
        let sum: number = 0;
        let weight: number = 0;

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

    function mergeBarycenters(target: Barycenter, other: SortResult) {
        if (target.barycenter != undefined && target.weight != undefined && other.barycenter != undefined && other.weight != undefined) {
            target.barycenter = (target.barycenter * target.weight + other.barycenter * other.weight) / (target.weight + other.weight);
            target.weight += other.weight;
        } else {
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
    function initOrder(g: Graph): string[][] {
        const visited: VisitedElement = {};
        const simpleNodes: string[] = g.nodes().filter(function (v) { return !g.children(v).length; });
        const maxRank: number = Math.max(...simpleNodes.map(function (v) { return g.node(v).rank; }));
        const layers: string[][] = utils.range(0, maxRank + 1).map<string[]>(function () { return []; });

        function dfs(v: string) {
            if (visited[v] != undefined) return;
            visited[v] = true;
            const node: Label = g.node(v);
            layers[node.rank].push(v);
            g.successors(v)?.forEach(v => dfs(v));
        }

        const orderedVs: string[] = simpleNodes.sort(function (v, w) { return g.node(v).rank - g.node(w).rank; });
        orderedVs.forEach(v => dfs(v));

        return layers;
    }

    function assignOrder(g: Graph, layering: string[][]) {
        layering.forEach(function (layer) {
            layer.forEach(function (v, i) {
                g.node(v).order = i;
            });
        });
    }

    function crossCount(g: Graph, layering: string[][]) {
        let cc: number = 0;
        for (let i: number = 1; i < layering.length; ++i) {
            cc += twoLayerCrossCount(g, layering[i - 1], layering[i]);
        }
        return cc;
    }

    function twoLayerCrossCount(g: Graph, northLayer: string[], southLayer: string[]) {
        // Sort all of the edges between the north and south layers by their position
        // in the north layer and then in the south layer. Map these edges to the position of
        // their head in the south layer.
        const southPos = utils.zipObject(southLayer, southLayer.map(function (_v, i) { return i; }));
        const southEntries = utils.flatten(northLayer.map(function (v) {
            const posOutEdges: PosOutEdges[] | undefined = g.outEdges(v)?.map(function (e) {
                return { pos: southPos[e.w], weight: g.edge(e).weight };
            })
            const southEntries: PosOutEdges[] | undefined = posOutEdges?.sort((a, b) => a.pos - b.pos);
            return southEntries || [];
        }));

        // Build the accumulator tree
        let firstIndex: number = 1;
        while (firstIndex < southLayer.length) firstIndex <<= 1;
        const treeSize: number = 2 * firstIndex - 1;
        firstIndex -= 1;
        const tree: Array<number> = new Array(treeSize).fill(0);

        // Calculate the weighted crossings
        let cc: number = 0;
        southEntries.forEach(function (entry) {
            let index: number = entry.pos + firstIndex;
            tree[index] += entry.weight;
            let weightSum: number = 0;
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
}