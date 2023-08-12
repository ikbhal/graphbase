
const path = require('path');
const fs = require('fs');
const graphology = require('graphology');

function getDefaultGraphFile(){
    return path.join(__dirname, '..', 'data', 'graph_file.json')
}

function getGraphFile(fileName){
    return  path.join(__dirname, '..', 'data', fileName);
}

function loadGraphFromJson(filePath) {
    try {

        // Check if the file path exists
        if (!fs.existsSync(filePath)) {
            console.log('JSON file does not exist. Returning empty graph.');
            return new graphology.Graph();
        }

        const rawData = fs.readFileSync(filePath, 'utf8');
        const graphData = JSON.parse(rawData);

        // Create a new graph instance
        const graph = new graphology.Graph();

        // Add nodes and their attributes
        graphData.nodes.forEach(nodeData => {
            graph.addNode(nodeData.nodeKey, nodeData.properties);
        });

        // Add edges and their attributes
        graphData.edges.forEach(edgeData => {
            graph.addEdgeWithKey(
                edgeData.edgeKey,
                edgeData.sourceNodeKey,
                edgeData.targetNodeKey,
                edgeData.properties
            );
        });

        console.log('Graph loaded successfully from JSON file.');

        return graph;
    } catch (error) {
        console.error('Error loading graph from JSON file:', error);
        return null;
    }
}

// const filePath = path.join(__dirname, 'graph_file.json');
function saveGraphToJson(filePath = getDefaultGraphFile()) {
    const graphData = {
        nodes: [],
        edges: [],
    };

    graph.forEachNode((node, attributes) => {
        graphData.nodes.push({
            nodeKey: node,
            properties: attributes,
        });
    });

    graph.forEachEdge((edge, attributes, source, target) => {
        graphData.edges.push({
            edgeKey: edge,
            sourceNodeKey: source,
            targetNodeKey: target,
            properties: attributes,
        });
    });

    fs.writeFile(filePath, JSON.stringify(graphData, null, 2), 'utf8', err => {
        if (err) {
            console.error('Error saving graph data to JSON file:', err);
        } else {
            console.log(`Graph data saved to ${filepath}`);
        }
    });
}

module.exports = {
    getDefaultGraphFile,getGraphFile,
    loadGraphFromJson,
    saveGraphToJson
}