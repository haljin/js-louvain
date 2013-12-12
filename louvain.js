/************************************************************************
*       CLASS: Graph                                                    *
*       This class represents an undirected graph, that is meant        *
*       to be used in louvain clustering. Contains basic API to         *
*       for graph operation.                                            *
*                                                                       *
************************************************************************/
var Graph = (function () {

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

/************************************************************************
*       MODULE: louvain                                                  *
*       Based on Python code by Thomas Aynaud <thomas.aynaud@lip6.fr>   *
*       Implements Louvain method of community detection in graphs      *
*                                                                       *
************************************************************************/
var louvain = function () {

    var _node2com = {};
    var _total_weight = 0;
    var _degrees = {};
    var _gdegrees = {};
    var _internals = {};
    var _loops = {};
    var __PASS_MAX = -1;
    var __MIN = 0.0000001;

    var communities_at_level = function (dendro, level) {
        var partition = {}
        for (keys in dendro[0])
            partition[keys] = dendro[0][keys];

        for (var i = 1; i < level + 1; i++)
            for (node in partition)
                partition[node] = dendro[i][partition[node]];

        return partition;
    };

    var best_communities = function (graph) {
        var dendro = generate_dendogram(graph);
        return communities_at_level(dendro, dendro.length - 1);
    };

    var generate_dendogram = function (graph) {

        if (graph.edge_count() == 0) {
            var part = {};
            var nodes = graph.get_nodes();
            for(node in nodes)
                part[node] = node;
            return part;
        }

        var curr_graph = new Graph([],[]);
        graph.copy(curr_graph);

        __init_state(curr_graph);
        var mod = __modularity();
        var status_list = [];
        __one_level(curr_graph);
        var new_mod = __modularity();
        var partition = __renumber(_node2com);
        status_list.push(partition);
        mod = new_mod;

        curr_graph = induced_graph(partition, curr_graph);
        __init_state(curr_graph);

        while (true) {
            __one_level(curr_graph);
            new_mod = __modularity();

            if (new_mod - mod < __MIN)
                break;
            partition = __renumber(_node2com);
            status_list.push(partition);
            mod = new_mod;
            curr_graph = induced_graph(partition, curr_graph);
            __init_state(curr_graph);
        }

        return status_list;
    };

    var induced_graph = function (partition, graph) {
        var ret = new Graph([],[]);
        for (key in partition)
            ret.add_node(partition[key]);

        var edges = graph.get_edges();
        for (var i = 0; i < edges.length; i++) {
            var weight = edges[i].data.weight;
            var com1 = partition[edges[i].a];
            var com2 = partition[edges[i].b];
            var e = ret.get_edge(com1, com2);
            var w_prec = e ? e.weight : 0;
            ret.add_edge(com1, com2, w_prec + weight);
        }

        return ret;
    };

    var __renumber = function (dict) {
        var count = 0;
        var ret = {};
        var new_values = {};

        for (key in dict) {
            var value = dict[key];
            var new_value = new_values[value] === undefined? -1 : new_values[value];
            if (new_value == -1) {
                new_values[value] = count;
                new_value = count;
                count = count + 1;
            }
            ret[key] = new_value;
        };

        return ret;
    };

    var __one_level = function (graph) {
        var modif = true;
        var nb_pass_done = 0;
        var cur_mod = __modularity();
        var new_mod = cur_mod;

        while (modif && nb_pass_done != __PASS_MAX) {
            cur_mod = new_mod;
            modif = false;
            nb_pass_done++;

            var graphnodes = graph.get_nodes();
            for (node in graphnodes) {
                var com_node = _node2com[node];
                var degc_totw = (_gdegrees[node] || 0) / (_total_weight * 2);
                var neigh_communities = __neighcom(node, graph);
                __remove(node, com_node, neigh_communities[com_node] || 0);

                var best_com = com_node;
                var best_increase = 0;
                for (com in neigh_communities) {
                    var incr = neigh_communities[com] - (_degrees[com] || 0) * degc_totw;
                    if (incr > best_increase) {
                        best_increase = incr;
                        best_com = com;
                    }
                }
                __insert(node, best_com, (neigh_communities[best_com] || 0));
                if (best_com != com_node)
                    modif = true;                
            }
            new_mod = __modularity();
            if (new_mod - cur_mod < __MIN)
                break;
        }

    };

    var __neighcom = function (node, graph) {
        var weights = {};
        var graphnode = graph.get_node(node);
        for (nb in graphnode) {
            if (nb != node) {
                var weight = graphnode[nb].weight;
                var neighborcom = _node2com[nb];
                weights[neighborcom] = (weights[neighborcom] || 0) + weight;
            }
        };
        return weights;
    };

    var __remove = function (node, com, weight) {
        _degrees[com] = (_degrees[com] || 0) - (_gdegrees[node] || 0);
        _internals[com] = (_internals[com] || 0) - weight - (_loops[node] || 0);
        _node2com[node] = -1;
    };

    var __insert = function (node, com, weight) {
        _node2com[node] = com;
        _degrees[com] = (_degrees[com] || 0) + (_gdegrees[node] || 0);
        _internals[com] = (_internals[com] || 0) + weight + (_loops[node] || 0);
    };


    var __modularity = function () {
        var links = _total_weight;
        var result = 0;
        var valset = {};
        for (key in _node2com)
            valset[_node2com[key]] = {};

        for (community in valset) {            
            var in_degree = _internals[community] || 0;
            var degree = _degrees[community] || 0;
            if (links > 0)
                result = result + in_degree/links - (Math.pow(degree / (2 * links), 2));
        }
        return result;
        
    };

   

    var __init_state = function (graph) {
        _node2com = {};
        _total_weight = 0;
        _degrees = {};
        _gdegrees = {};
        _internals = {};
        var count = 0;

        var allnodes = graph.get_nodes();
        var alledges = graph.get_edges();
        for (var i = 0; i < alledges.length; i++) {
            _total_weight += alledges[i].data.weight;
        };

        for (node in allnodes) {       
            _node2com[node] = count;
            var deg = graph.degree(node, true);
            _degrees[count] = deg;
            _gdegrees[node] = deg;
            var possible_loop = graph.get_edge(node, node);
            _loops[node] = possible_loop ? possible_loop.weight : 0;
            _internals[count] = _loops[node];
            count++;
        }


    };



    return {
        best_communities: best_communities
    };

}();


