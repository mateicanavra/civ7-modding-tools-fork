/**
 * @file utils.ts
 * @copyright 2022, Firaxis Games
 * @description Graph utilities and simplified versions of "lodash" functions for specific purposes
 */

import { Graph, Label, isEmpty as graphIsEmpty, constant as graphConstant } from '/core/ui/graph-layout/graph.js';
import { EntryResolved, EntryResolvedSortable } from '/core/ui/graph-layout/layout-order.js';

interface GraphDefaults {
    ranksep: number
    edgesep: number
    nodesep: number
    rankdir: string
}

interface NodeDefaults {
    width: number
    height: number
}

interface EdgeDefaults {
    minlength: number
    weight: number
    width: number
    height: number
    labeloffset: number
    labelpos: string
}

export interface PartitionLR {
    lhs: EntryResolvedSortable[],
    rhs: EntryResolved[]
}

export namespace utils {
    export const graphDefaults: GraphDefaults = { ranksep: 50, edgesep: 20, nodesep: 50, rankdir: "tb" };
    export const graphNumAttrs: string[] = ["nodesep", "edgesep", "ranksep", "marginx", "marginy"];
    export const graphAttrs: string[] = ["acyclicer", "ranker", "rankdir", "align"];
    export const nodeNumAttrs: string[] = ["width", "height"];
    export const nodeDefaults: NodeDefaults = { width: 0, height: 0 };
    export const edgeNumAttrs: string[] = ["minlength", "weight", "width", "height", "labeloffset"];
    export const edgeAttrs = ["labelpos"];
    export const edgeDefaults: EdgeDefaults = {
        minlength: 1, weight: 1, width: 0, height: 0,
        labeloffset: 10, labelpos: "r"
    };

    export function asNonCompoundGraph(g: Graph) {
        const simplified: Graph = new Graph({ multigraph: g.isMultigraph() }).setGraph(g.graph());

        g.nodes().forEach(v => {
            if (!g.children(v).length) {
                simplified.setNode(v, g.node(v));
            }
        });

        g.edges().forEach(e => {
            simplified.setEdge(e, g.edge(e));
        });

        return simplified;
    }

    // for objects only
    export const isEmpty = graphIsEmpty;

    export const constant = graphConstant;

    /*
    * Adds a dummy node to the graph and return v.
    */
    export function addDummyNode(g: Graph, type: string, attrs: Label, name: string) {
        let v: string;
        do {
            v = uniqueId(name);
        } while (g.hasNode(v));

        attrs.dummy = type;
        g.setNode(v, attrs);
        return v;
    }

    let idCounter: number = 0;
    export function uniqueId(prefix: string) {
        let id: number = ++idCounter;
        return prefix + id;
    }

    export function maxRank(g: Graph): number {
        const nodeRanks: number[] = g.nodes().reduce<number[]>((results, v) => {
            const rank: number = g.node(v).rank;
            if (rank != undefined) {
                results.push(rank);
            }
            return results;
        }, []);
        return Math.max(...nodeRanks);
    }

    export function maxOrder(g: Graph): number {
        const nodeRanks: number[] = g.nodes().reduce<number[]>((results, v) => {
            const order: number = g.node(v).order;
            if (order != undefined) {
                results.push(order);
            }
            return results;
        }, []);
        return Math.max(...nodeRanks);
    }

    /*
    * Given a DAG with each node assigned "rank" and "order" properties, this
    * function will produce a matrix with the ids of each node.
    */
    export function buildLayerMatrix(g: Graph) {
        const layering: string[][] = range(0, maxRank(g) + 1).map(function () { return []; });

        g.nodes().forEach(function (v) {
            const node: Label = g.node(v);
            const rank: number = node.rank;
            const order: number = node.order;
            if (rank != undefined) {
                layering[rank][order] = v;
            }
        });
        return layering;
    }
    /*  
    * Returns an array with a range of numbers (start and end inclusive)
    * eg: range(1, 4) => [1, 2, 3, 4]
    */
    export function range(start: number = 0, end: number, step: number = 1, fromRight: boolean = false): number[] {
        let index: number = -1,
            length = Math.max(Math.ceil((end - start) / (step || 1)), 0),
            result = Array(length);

        while (length--) {
            result[fromRight ? length : ++index] = start;
            start += step;
        }
        return result;
    }

    export function flatten(array: any[]) {
        const length: number = array == null ? 0 : array.length;
        return length ? baseFlatten(array, 1) : [];
    }

    // flattens an array 1 level deep
    function baseFlatten(array: any[], depth: number, isStrict?: boolean) {
        let index: number = -1;
        let length: number = array.length;

        const result: any[] = [];

        while (++index < length) {
            let value: any = array[index];
            if (depth > 0 && Array.isArray(value)) {
                arrayPush(result, value);
            } else if (!isStrict) {
                result[result.length] = value;
            }
        }
        return result;
    }

    function arrayPush(array: any[], values: any) {
        let index: number = -1;
        let length: number = values.length;
        let offset: number = array.length;

        while (++index < length) {
            array[offset + index] = values[index];
        }
        return array;
    }

    /*
    * Partition a collection into two groups: `lhs` and `rhs`. If the supplied
    * function returns true for an entry it goes into `lhs`. Otherwise it goes
    * into `rhs`.
    */
    export function partition(collection: any[], fn: Function) {
        const result: PartitionLR = { lhs: [], rhs: [] };
        collection.forEach(function (value) {
            if (fn(value)) {
                result.lhs.push(value);
            } else {
                result.rhs.push(value);
            }
        });
        return result;
    }

    export function zipObject(props: any[], values: any[]) {
        return baseZipObject(props || [], values || []);
    }

    function baseZipObject(props: any[], values: any[]) {
        let index: number = -1;
        let length: number = props.length;
        let valsLength: number = values.length;
        let result: any = {};

        while (++index < length) {
            const value: any = index < valsLength ? values[index] : undefined;
            result[props[index]] = value;

        }
        return result;
    }

    export function cloneSimpleArray(arrayToClone: any[]): any[] {
        const clone: any[] = new Array();
        for (let i: number = 0; i < arrayToClone.length; i++) {
            const value: any = arrayToClone[i];
            clone.push(value);
        }
        return clone;
    }

    export function clamp(value: number, min: number, max: number): number {
        return Math.min(max, Math.max(min, value));
    }
}