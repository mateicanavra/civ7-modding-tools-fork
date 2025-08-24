/**
 * @file utils.ts
 * @copyright 2022, Firaxis Games
 * @description Graph utilities and simplified versions of "lodash" functions for specific purposes
 */
import { Graph, isEmpty as graphIsEmpty, constant as graphConstant } from '/core/ui/graph-layout/graph.js';
export var utils;
(function (utils) {
    utils.graphDefaults = { ranksep: 50, edgesep: 20, nodesep: 50, rankdir: "tb" };
    utils.graphNumAttrs = ["nodesep", "edgesep", "ranksep", "marginx", "marginy"];
    utils.graphAttrs = ["acyclicer", "ranker", "rankdir", "align"];
    utils.nodeNumAttrs = ["width", "height"];
    utils.nodeDefaults = { width: 0, height: 0 };
    utils.edgeNumAttrs = ["minlength", "weight", "width", "height", "labeloffset"];
    utils.edgeAttrs = ["labelpos"];
    utils.edgeDefaults = {
        minlength: 1, weight: 1, width: 0, height: 0,
        labeloffset: 10, labelpos: "r"
    };
    function asNonCompoundGraph(g) {
        const simplified = new Graph({ multigraph: g.isMultigraph() }).setGraph(g.graph());
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
    utils.asNonCompoundGraph = asNonCompoundGraph;
    // for objects only
    utils.isEmpty = graphIsEmpty;
    utils.constant = graphConstant;
    /*
    * Adds a dummy node to the graph and return v.
    */
    function addDummyNode(g, type, attrs, name) {
        let v;
        do {
            v = uniqueId(name);
        } while (g.hasNode(v));
        attrs.dummy = type;
        g.setNode(v, attrs);
        return v;
    }
    utils.addDummyNode = addDummyNode;
    let idCounter = 0;
    function uniqueId(prefix) {
        let id = ++idCounter;
        return prefix + id;
    }
    utils.uniqueId = uniqueId;
    function maxRank(g) {
        const nodeRanks = g.nodes().reduce((results, v) => {
            const rank = g.node(v).rank;
            if (rank != undefined) {
                results.push(rank);
            }
            return results;
        }, []);
        return Math.max(...nodeRanks);
    }
    utils.maxRank = maxRank;
    function maxOrder(g) {
        const nodeRanks = g.nodes().reduce((results, v) => {
            const order = g.node(v).order;
            if (order != undefined) {
                results.push(order);
            }
            return results;
        }, []);
        return Math.max(...nodeRanks);
    }
    utils.maxOrder = maxOrder;
    /*
    * Given a DAG with each node assigned "rank" and "order" properties, this
    * function will produce a matrix with the ids of each node.
    */
    function buildLayerMatrix(g) {
        const layering = range(0, maxRank(g) + 1).map(function () { return []; });
        g.nodes().forEach(function (v) {
            const node = g.node(v);
            const rank = node.rank;
            const order = node.order;
            if (rank != undefined) {
                layering[rank][order] = v;
            }
        });
        return layering;
    }
    utils.buildLayerMatrix = buildLayerMatrix;
    /*
    * Returns an array with a range of numbers (start and end inclusive)
    * eg: range(1, 4) => [1, 2, 3, 4]
    */
    function range(start = 0, end, step = 1, fromRight = false) {
        let index = -1, length = Math.max(Math.ceil((end - start) / (step || 1)), 0), result = Array(length);
        while (length--) {
            result[fromRight ? length : ++index] = start;
            start += step;
        }
        return result;
    }
    utils.range = range;
    function flatten(array) {
        const length = array == null ? 0 : array.length;
        return length ? baseFlatten(array, 1) : [];
    }
    utils.flatten = flatten;
    // flattens an array 1 level deep
    function baseFlatten(array, depth, isStrict) {
        let index = -1;
        let length = array.length;
        const result = [];
        while (++index < length) {
            let value = array[index];
            if (depth > 0 && Array.isArray(value)) {
                arrayPush(result, value);
            }
            else if (!isStrict) {
                result[result.length] = value;
            }
        }
        return result;
    }
    function arrayPush(array, values) {
        let index = -1;
        let length = values.length;
        let offset = array.length;
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
    function partition(collection, fn) {
        const result = { lhs: [], rhs: [] };
        collection.forEach(function (value) {
            if (fn(value)) {
                result.lhs.push(value);
            }
            else {
                result.rhs.push(value);
            }
        });
        return result;
    }
    utils.partition = partition;
    function zipObject(props, values) {
        return baseZipObject(props || [], values || []);
    }
    utils.zipObject = zipObject;
    function baseZipObject(props, values) {
        let index = -1;
        let length = props.length;
        let valsLength = values.length;
        let result = {};
        while (++index < length) {
            const value = index < valsLength ? values[index] : undefined;
            result[props[index]] = value;
        }
        return result;
    }
    function cloneSimpleArray(arrayToClone) {
        const clone = new Array();
        for (let i = 0; i < arrayToClone.length; i++) {
            const value = arrayToClone[i];
            clone.push(value);
        }
        return clone;
    }
    utils.cloneSimpleArray = cloneSimpleArray;
    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }
    utils.clamp = clamp;
})(utils || (utils = {}));

//# sourceMappingURL=file:///core/ui/graph-layout/utils.js.map
