/**
 * @file graph-algorithms.ts
 * @copyright 2022, Firaxis Games
 * @description Depth first search algorithms for graphs.
 */
export var graphAlgo;
(function (graphAlgo) {
    function postorder(g, vs) {
        return dfs(g, vs, "post");
    }
    graphAlgo.postorder = postorder;
    function preorder(g, vs) {
        return dfs(g, vs, "pre");
    }
    graphAlgo.preorder = preorder;
    /*
    * A helper that performs a pre- or post-order traversal on the input graph
    * and returns the nodes in the order they were visited. If the graph is
    * undirected then this algorithm will navigate using neighbors. If the graph
    * is directed then this algorithm will navigate using successors.
    *
    * Order must be one of "pre" or "post".
    */
    function dfs(g, vs, order) {
        if (!Array.isArray(vs)) {
            vs = [vs];
        }
        let navigation = (g.isDirected() ? g.successors : g.neighbors).bind(g);
        let acc = [];
        let visited = {};
        vs.forEach(v => {
            if (!g.hasNode(v)) {
                throw new Error("Graph does not have node: " + v);
            }
            doDfs(g, v, order === "post", visited, navigation, acc);
        });
        return acc;
    }
    function doDfs(g, v, postorder, visited, navigation, acc) {
        if (visited[v] == undefined) {
            visited[v] = true;
            if (!postorder) {
                acc.push(v);
            }
            const navigationResult = navigation(v);
            if (navigationResult != undefined) {
                navigationResult.forEach(w => {
                    doDfs(g, w, postorder, visited, navigation, acc);
                });
            }
            if (postorder) {
                acc.push(v);
            }
        }
    }
})(graphAlgo || (graphAlgo = {}));

//# sourceMappingURL=file:///core/ui/graph-layout/graph-algorithms.js.map
