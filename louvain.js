/************************************************************************
*       CLASS: Graph                                                    *
*       This class represents an undirected graph, that is meant        *
*       to be used in louvain clustering. Contains basic API to         *
*       for graph operation.                                            *
*                                                                       *
************************************************************************/

var Graph = (function () {
    function Graph(inNodes, edges) {
        this.nodes = {};

        for (var i = 0; i < inNodes.length; i++) {
            nodes[inNodes[i]] = {};
        }
        for (var i = 0; i < edges.length; i++) {
            nodes[edges[i].a][edges[i].b] = { weight: edges[i].score };
            nodes[edges[i].b][edges[i].a] = { weight: edges[i].score };
        }

    };

    Graph.prototype.add_node = function (node) {
        if (!this.nodes[node])
            this.nodes[node] = {};
    };

    Graph.prototype.add_edge = function (a, b, score) {
        this.nodes[a][b] = this.nodes[b][a] = { weight: score };
    };

    Graph.prototype.get_edge = function (a, b) {
        return this.nodes[a][b];
    };

    Graph.prototype.get_node = function (node) {
        return this.nodes[node];
    };


    Graph.prototype.degree = function (node) {
        var deg = 0;
        for (nb in this.nodes[node]) deg++;
        return deg;
    };




    return Graph;
})();


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
            partition[keys] = null;

        for (var i = 1; i < level + 1; i++)
            for (node in partition)
                partition[node] = dendro[i][node];

        return partition;
    };

    var best_communities = function (nodes, connections) {
        var dendro = generate_dendogram({ nodes: nodes, conns: connections });
        return communities_at_level(dendro, dendro.length - 1);
    };

    var generate_dendogram = function (graph) {

        if (graph.conns.length == 0) {
            var part = {};
            for (var i = 0; i < graph.nodes.length; i++) 
                part[graph.nodes[i]] = graph.nodes[i];            
            return part;
        }

        var curr_graph = __copy_graph(graph);
        __init_state(graph);
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
        var ret = { nodes: [], conns: [] };



    };   

    var __modularity = function () {
        var links = _total_weight;
        var result = 0;

        for (key in _node2com) {
            var in_degree = _internals[_node2com[key]];
            var degree = _degrees[_node2com[key]];
            if (links > 0)
                result = result - (Math.pow(degree / (2 * links), 2));
        }
        return result;
        
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

            for (var i = 0; i < graph.nodes.length; i++) {
                var node = graph.nodes[i];
                var com_node = _node2com[node];
                var degc_totw = _gdegrees[node] ? _gdegrees[node] : 0 / (_total_weight * 2);
                var neigh_communities = __neighcom(node, graph);



            }


        }

    };

    var __init_state = function (graph) {
        _node2com = {};
        _total_weight = 0;
        _degrees = {};
        _gdegrees = {};
        var count = 0;

        for (var i = 0; i < graph.nodes.length; i++) {
            var node = graph.nodes[i];          
            _node2com[node] = i;
            var deg = __degree(graph, node);
            _degrees[i] = deg;
            _gdegrees[i] = deg;
            _total_weight += deg;
            _loops[node] = __get_edge(node, node, graph);
            _internals[i] = _loops[node];
        }


    };

    var __degree = function(graph, node) {
        var result = 0;
        for(var i = 0; i< graph.conns.length; i++){
            if(graph.conns[i].a == node || graph.conns[i].b == node)
                result += graph.conns[i].score;
        };
    };

    var __get_edge = function(a, b, graph) {
        for(var i = 0; i< graph.conns.length; i++){
            if ((graph.conns[i].a == a && graph.conns[i].b == b) ||
                (graph.conns[i].a == b && graph.conns[i].b == a))
                return graph.conns[i].score;
        }
        return 0;
    };

    var __copy_graph = function (graph) {
        var newGraph = { nodes: [], conns: [] };

        for(var i = 0; i< graph.nodes.length; i++)
            newGraph.nodes.append(graph.nodes[i]);
        for (var i = 0; i < graph.conns.length; i++)
            newGraph.conns.append({
                a: graph.conns[i].a,
                b: graph.conns[i].b,
                score: graph.conns[i].score
            });
        return newGraph
    }

    return {
        best_communities: best_communities
    };

}();


