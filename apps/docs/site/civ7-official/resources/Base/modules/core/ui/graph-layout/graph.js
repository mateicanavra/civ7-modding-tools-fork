/**
 * @file graph.ts
 * @copyright 2022, Firaxis Games
 * @description Graph data structure.
 */
/*
    The graph automatic layout algorithms and the graph data structure contained in the /graph-layout folder were taken
    from "dagre", a javaScript library from Chris Pettitt, and rewritten in TypeScript to use in this project.
    The original library contained the following copyright:

    Copyright (c) 2012-2014 Chris Pettitt

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
*/
const DEFAULT_EDGE_NAME = "\x00";
const GRAPH_NODE = "\x00";
const EDGE_KEY_DELIM = "\x01";
// for objects only
export function isEmpty(value) {
    if (value == null) {
        return true;
    }
    for (let key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
            return false;
        }
    }
    return true;
}
export function constant(value) {
    return function () {
        return value;
    };
}
export class Graph {
    constructor(opts) {
        this._parent = {};
        this._children = {};
        this._nodeCount = 0;
        this._edgeCount = 0;
        this._isDirected = true;
        this._isMultigraph = false;
        this._isCompound = false;
        if (opts != null) {
            this._isDirected = opts.directed != undefined ? opts.directed : true;
            this._isMultigraph = opts.multigraph != undefined ? opts.multigraph : false;
            this._isCompound = opts.compound != undefined ? opts.compound : false;
        }
        // Label for the graph itself
        this._label = undefined;
        // Defaults to be set when creating a new node
        this._defaultNodeLabelFn = constant(undefined);
        // Defaults to be set when creating a new edge
        this._defaultEdgeLabelFn = constant(undefined);
        // v -> label
        this._nodes = {};
        if (this._isCompound) {
            // v -> parent
            this._parent = {};
            // v -> children
            this._children = {};
            this._children[GRAPH_NODE] = {};
        }
        // v -> edgeObj
        this._in = {};
        // u -> v -> Number
        this._predecessors = {};
        // v -> edgeObj
        this._out = {};
        // v -> w -> Number
        this._successors = {};
        // e -> edgeObj
        this._edgeObjs = {};
        // e -> label
        this._edgeLabels = {};
    }
    /**
     * A directed graph is one that has no cycles,
     * as those used in Civ7 in Tech, Civics, and promotions
     * @returns Option for directed graph
    */
    isDirected() {
        return this._isDirected;
    }
    ;
    /**
     * A multi graph is one that has multiple edges for the same ending node
     * @returns Option for multi graph
    */
    isMultigraph() {
        return this._isMultigraph;
    }
    ;
    /**
     * Sets the graph label
     * @returns The graph
    */
    setGraph(label) {
        this._label = label;
        return this;
    }
    ;
    graph() {
        return this._label;
    }
    ;
    /*==== NODE METHODS ====*/
    /**
     * Sets a label as default for the v node
     * @param labelFn Function that returns a node name
     * @returns The graph
    */
    setDefaultNodeLabel(labelFn) {
        this._defaultNodeLabelFn = labelFn;
        return this;
    }
    ;
    /**
     * @returns Number of nodes in the graph
    */
    nodeCount() {
        return this._nodeCount;
    }
    ;
    /**
     * @returns The node names
    */
    nodes() {
        return Object.keys(this._nodes);
    }
    ;
    /**
     * A source node is the node where the edge starts
     * @returns List of source nodes
    */
    sources() {
        return this.nodes().filter((v) => {
            return isEmpty(this._in[v]);
        });
    }
    ;
    /**
     * A sink node is the node where the edge ends
     * @returns List of sink nodes
    */
    sinks() {
        return this.nodes().filter((v) => {
            return this._out[v] == undefined;
        });
    }
    ;
    /**
     * Sets a single node
     * @param v Node identifier
     * @param value A label, for computation purposes it may be an object
     * @returns List of sink nodes
    */
    setNode(v, value) {
        if (this._nodes.hasOwnProperty(v)) {
            if (value != undefined) {
                this._nodes[v] = value;
            }
            return this;
        }
        this._nodes[v] = value != undefined ? value : this._defaultNodeLabelFn(v);
        if (this._isCompound) {
            this._parent[v] = GRAPH_NODE;
            this._children[v] = {};
            this._children[GRAPH_NODE][v] = true;
        }
        this._in[v] = {};
        this._predecessors[v] = {};
        this._out[v] = {};
        this._successors[v] = {};
        ++this._nodeCount;
        return this;
    }
    ;
    /**
     * @returns Node label, used to access the rank property
    */
    node(v) {
        return this._nodes[v];
    }
    ;
    /**
     * Checks if a node is in the graph
     * @param v Node identifier.
    */
    hasNode(v) {
        return this._nodes[v] != undefined;
    }
    ;
    /**
     * Removes a node with the provided identifier
     * @param v Node identifier.
     * @returns The graph.
    */
    removeNode(v) {
        if (this._nodes[v] != undefined) {
            const removeEdge = (e) => { this.removeEdge(this._edgeObjs[e]); };
            delete this._nodes[v];
            if (this._isCompound) {
                this.removeFromParentsChildList(v);
                delete this._parent[v];
                this.children(v).forEach(child => {
                    this.setParent(child);
                });
                delete this._children[v];
            }
            Object.keys(this._in[v]).forEach(e => removeEdge(e));
            delete this._in[v];
            delete this._predecessors[v];
            Object.keys(this._out[v]).forEach(e => removeEdge(e));
            delete this._out[v];
            delete this._successors[v];
            --this._nodeCount;
        }
        return this;
    }
    ;
    /**
     * Sets a parent to the provided node.
     * @param v Node identifier.
     * @param parent Parent node identifier.
     * @returns The graph.
    */
    setParent(v, parent) {
        if (!this._isCompound) {
            throw new Error("Cannot set parent in a non-compound graph");
        }
        if (parent == undefined) {
            parent = GRAPH_NODE;
        }
        else {
            for (let ancestor = parent; ancestor != undefined; ancestor = this.parent(ancestor)) {
                if (ancestor === v) {
                    throw new Error("Setting " + parent + " as parent of " + v +
                        " would create a cycle");
                }
            }
            this.setNode(parent);
        }
        this.setNode(v);
        this.removeFromParentsChildList(v);
        this._parent[v] = parent;
        this._children[parent][v] = true;
        return this;
    }
    ;
    /**
     * Removes a node from the parent.
     * @param v Node identifier.
    */
    removeFromParentsChildList(v) {
        delete this._children[this._parent[v]][v];
    }
    ;
    /**
     * @param v Node identifier.
     * @returns The parent of the node.
    */
    parent(v) {
        if (this._isCompound) {
            const parent = this._parent[v];
            if (parent !== GRAPH_NODE) {
                return parent;
            }
        }
        return undefined;
    }
    ;
    /**
     * @param v Node identifier.
     * @returns The children of the node or root.
    */
    children(v) {
        if (v == undefined) {
            v = GRAPH_NODE;
        }
        if (this._isCompound) {
            const children = this._children[v];
            if (children) {
                return Object.keys(children);
            }
        }
        else if (v === GRAPH_NODE) {
            return this.nodes();
        }
        return [];
    }
    ;
    /**
     * @param v Node identifier.
     * @returns List of node's predecessors ids.
    */
    predecessors(v) {
        const predsV = this._predecessors[v];
        if (predsV) {
            return Object.keys(predsV);
        }
        else {
            return [];
        }
    }
    ;
    /**
     * @param v Node identifier.
     * @returns List of node's successors ids.
    */
    successors(v) {
        const sucsV = this._successors[v];
        if (sucsV) {
            return Object.keys(sucsV);
        }
        return undefined;
    }
    ;
    /**
     * @param v Node identifier.
     * @returns List of node's neighbors ids.
    */
    neighbors(v) {
        const neighbors = [];
        const preds = this.predecessors(v);
        if (preds) {
            preds.forEach(p => neighbors.push(p));
            const succ = this.successors(v);
            if (succ) {
                succ.forEach(s => neighbors.push(s));
            }
            return neighbors;
        }
        return undefined;
    }
    ;
    setDefaultEdgeLabel(label) {
        if (typeof label !== "function") {
            label = constant(label);
        }
        this._defaultEdgeLabelFn = label;
        return this;
    }
    ;
    /**
     * @returns Number of edges
    */
    edgeCount() {
        return this._edgeCount;
    }
    ;
    /**
     * @returns List of edges
    */
    edges() {
        const edgeValues = Object.values(this._edgeObjs);
        return edgeValues;
    }
    ;
    setEdge(v, w, value, name) {
        const arg0 = arguments[0];
        let valueSpecified = false;
        if (typeof arg0 === "object" && arg0 !== null && "v" in arg0) { // is the second function signature
            v = arg0.v;
            w = arg0.w;
            name = arg0.name;
            if (arguments.length === 2) {
                value = arguments[1];
                valueSpecified = true;
            }
        }
        else {
            v = arg0;
            w = arguments[1];
            name = arguments[3];
            if (arguments.length > 2) {
                value = arguments[2];
                valueSpecified = true;
            }
        }
        v = "" + v;
        w = "" + w;
        if (name != undefined) {
            name = "" + name;
        }
        const e = this.edgeArgsToId(this._isDirected, v, w, name);
        if (this._edgeLabels[e] != undefined) {
            if (valueSpecified && value != undefined) {
                this._edgeLabels[e] = value;
            }
            return this;
        }
        if (name != undefined && !this._isMultigraph) {
            throw new Error("Cannot set a named edge when isMultigraph = false");
        }
        // It didn't exist, so we need to create it.
        // First ensure the nodes exist.
        this.setNode(v);
        this.setNode(w);
        this._edgeLabels[e] = valueSpecified ? value : this._defaultEdgeLabelFn(v, w, name);
        const edgeObj = this.edgeArgsToObj(this._isDirected, v, w, name);
        // Ensure we add undirected edges in a consistent way.
        v = edgeObj.v;
        w = edgeObj.w;
        Object.freeze(edgeObj);
        this._edgeObjs[e] = edgeObj;
        this.incrementOrInitEntry(this._predecessors[w], v);
        this.incrementOrInitEntry(this._successors[v], w);
        this._in[w][e] = edgeObj;
        this._out[v][e] = edgeObj;
        this._edgeCount++;
        return this;
    }
    ;
    edge(v, w, name) {
        let e = (arguments.length === 1
            ? this.edgeObjToId(this._isDirected, arguments[0])
            : this.edgeArgsToId(this._isDirected, v, w, name));
        return this._edgeLabels[e];
    }
    ;
    hasEdge(v, w, name) {
        let e = "";
        if (typeof v == "string" && w) {
            e = this.edgeArgsToId(this._isDirected, v, w, name);
        }
        else if (typeof v != "string") {
            e = this.edgeObjToId(this._isDirected, v);
        }
        return this._edgeLabels[e] != undefined;
    }
    ;
    removeEdge(v, w, name) {
        let e = "";
        if (typeof v != "string") {
            e = this.edgeObjToId(this._isDirected, v);
        }
        else if (w) {
            e = this.edgeArgsToId(this._isDirected, v, w, name);
        }
        if (!e) {
            throw Error(`edge v: ${v} couldn't be found`);
        }
        const edge = this._edgeObjs[e];
        if (edge) {
            v = edge.v;
            w = edge.w;
            delete this._edgeLabels[e];
            delete this._edgeObjs[e];
            this.decrementOrRemoveEntry(this._predecessors[w], v);
            this.decrementOrRemoveEntry(this._successors[v], w);
            delete this._in[w][e];
            delete this._out[v][e];
            this._edgeCount--;
        }
        return this;
    }
    ;
    /**
     * @param v The node identifier
     * @returns A list of edges that are getting in the provided node
    */
    inEdges(v, u) {
        const inV = this._in[v];
        if (inV) {
            const edges = Object.values(inV);
            if (!u) {
                return edges;
            }
            return edges.filter(edge => edge.v === u);
        }
        return undefined;
    }
    ;
    /**
     * @param v The node identifier
     * @returns A list of edges that are getting out the provided node
    */
    outEdges(v, w) {
        const outV = this._out[v];
        if (outV) {
            const edges = Object.values(outV);
            if (!w) {
                return edges;
            }
            return edges.filter(edge => edge.w === w);
        }
        return undefined;
    }
    ;
    /**
     * @param v The node identifier
     * @returns All edges getting in or out the provided node
    */
    nodeEdges(v, w) {
        const inEdges = this.inEdges(v, w);
        if (inEdges) {
            const outEdges = this.outEdges(v, w);
            if (outEdges) {
                return inEdges.concat(outEdges);
            }
        }
        return undefined;
    }
    ;
    /**
     * Initializes an entry accumulator with 1 or increases it
     * @param v The node identifier
     * @returns All edges getting in or out the provided node
    */
    incrementOrInitEntry(map, k) {
        if (map[k]) {
            map[k]++;
        }
        else {
            map[k] = 1;
        }
    }
    /**
     * Deletes an entry accumulator when it it reaches zero or decreases it.
     * @param v The node identifier
     * @returns All edges getting in or out the provided node
    */
    decrementOrRemoveEntry(map, k) {
        if (!--map[k]) {
            delete map[k];
        }
    }
    /**
     * Creates an id for and edge using the params
     * @param isDirected Is used to know the direction of the edge
     * @param v_ Origin node
     * @param w_ End node
     * @param name Edge name
     * @returns Unique id
    */
    edgeArgsToId(isDirected, v_, w_, name) {
        let v = "" + v_;
        let w = "" + w_;
        if (!isDirected && v > w) {
            let tmp = v;
            v = w;
            w = tmp;
        }
        return v + EDGE_KEY_DELIM + w + EDGE_KEY_DELIM + (name == undefined ? DEFAULT_EDGE_NAME : name);
    }
    /**
     * Creates an edge object using the params
     * @param isDirected Used to know the direction of the edge
     * @param v_ Origin node
     * @param w_ End node
     * @param name Edge name
     * @returns Unique id
    */
    edgeArgsToObj(isDirected, v_, w_, name) {
        let v = "" + v_;
        let w = "" + w_;
        if (!isDirected && v > w) {
            let tmp = v;
            v = w;
            w = tmp;
        }
        let edgeObj = { v: v, w: w };
        if (name) {
            edgeObj.name = name;
        }
        return edgeObj;
    }
    /**
     * Creates and id for and edge using the object
     * @param isDirected Used to know the direction of the edge
     * @param edgeObj Edge object used to grab params
     * @returns Unique id
    */
    edgeObjToId(isDirected, edgeObj) {
        return this.edgeArgsToId(isDirected, edgeObj.v, edgeObj.w, edgeObj.name);
    }
}

//# sourceMappingURL=file:///core/ui/graph-layout/graph.js.map
