/************************************************************************
*       CLASS: Graph                                                    *
*       This class represents an undirected graph, that is meant        *
*       to be used in louvain clustering. Contains basic API to         *
*       for graph operation.                                            *
*                                                                       *
************************************************************************/
var Graph = (function () {
	"Graph:nomunge"

    function Graph(inNodes, edges) {
        this._nodes = {};

        for (var i = 0; i < inNodes.length; i++) {
           this._nodes[inNodes[i]] = {};
        }
        for (var i = 0; i < edges.length; i++) {
            this._nodes[edges[i].a][edges[i].b] = { weight: edges[i].score };
            this._nodes[edges[i].b][edges[i].a] = { weight: edges[i].score };
        }

    };

    Graph.prototype.copy = function (newGraph) {
        for (node in this._nodes) {
            newGraph.add_node(node);
            for (nb in this._nodes[node]) {
                if (!newGraph.get_node(nb))
                    newGraph.add_node(nb);                    
                newGraph.add_edge(node, nb, this._nodes[node][nb].weight);
            }
        }

    };

    Graph.prototype.clear = function () {
        this._nodes = {};
    };

    Graph.prototype.add_node = function (node) {
        if (!this._nodes[node])
            this._nodes[node] = {};
    };

    Graph.prototype.add_edge = function (a, b, score) {
        if (this._nodes[a] === undefined)
            this.add_node(a);
        if (this._nodes[b] === undefined)
            this.add_node(b);

        this._nodes[a][b] = this._nodes[b][a] = { weight: score };
    };

    Graph.prototype.remove_node = function (node) {
        for (n in this._nodes)
            delete this._nodes[n][node];
        delete this._nodes[node];
    };

    Graph.prototype.remove_edge = function (a, b) {
        delete this._nodes[a][b];
        delete this._nodes[b][a];
    };

    Graph.prototype.get_edge = function (a, b) {
        if (this._nodes[a] !== undefined)
            return this._nodes[a][b];
        else
            return undefined;
    };

    Graph.prototype.get_node = function (node) {
        return this._nodes[node];
    };

    Graph.prototype.get_nodes = function () {
        return this._nodes;
    };

    Graph.prototype.get_edges = function () {
        var result = [];
        var visited = {};
        for (node in this._nodes)
            for (nb in this._nodes[node])
                if (!visited[nb + node]) {
                    result.push({ a: node, b: nb, data: this._nodes[node][nb] });
                    visited[node + nb] = true;
                }
        return result;
    };

    Graph.prototype.node_count = function () {
        return this.get_nodes().length;
    };

    Graph.prototype.edge_count = function () {
        return this.get_edges().length;
    }

    Graph.prototype.degree = function (node, weighted) {
        var deg = 0;
        for (nb in this._nodes[node]){
            var this_deg = weighted ? this._nodes[node][nb].weight : 1;
            deg += (nb === node) ? this_deg*2 : this_deg;
        }
        return deg;
    };

    return Graph;
})();
