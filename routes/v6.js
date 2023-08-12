const express = require('express');
const fs = require('fs');
const path = require('path');
const graphology = require('graphology');
const EventEmitter = require('events'); 
const {getDefaultGraphFile, getGraphFile,
  saveGraphToJson,
  loadGraphFromJson} = require('../util/graph_util');

const router = express.Router();
router.use(express.json());
// Create an event emitter instance
const eventEmitter = new EventEmitter();
eventEmitter.on('nodeAdded', (graph, filePath) => {
  saveGraphToJson(graph, filePath);
  
});

eventEmitter.on('saveGraph', (graph, filePath) => saveGraphToJson(graph, filePath));
eventEmitter.on('nodeDeleted', (graph, filePath) => saveGraphToJson(graph, filePath));
eventEmitter.on('edgeAdded', (graph, filePath) => saveGraphToJson(graph, filePath));
eventEmitter.on('edgeDeleted', (graph, filePath) => saveGraphToJson(graph, filePath));
eventEmitter.on('propertyUpdated', (graph, filePath) => saveGraphToJson(graph, filePath));
eventEmitter.on('propertyDeleted', (graph, filePath) => saveGraphToJson(graph, filePath));

// Middleware to load the graph from a JSON file
router.use('/:filename', (req, res, next) => {
  const { filename } = req.params;
  const fileNameJson = `${filename}.json`;
  const graph_file_path= getGraphFile(fileNameJson);
  req.graph = loadGraphFromJson(graph_file_path);
  req.graph_file_path = graph_file_path;

  next();
});

// Define API endpoints

// Example: POST /graph/:filename/addNode
router.post('/:filename/addNode', (req, res) => {
  const { nodeKey, properties } = req.body;
  const graph = req.graph;
  const graph_file_path = req.graph_file_path;

  graph.addNode(nodeKey, properties);
  eventEmitter.emit('nodeAdded', graph, graph_file_path);
  res.json({
    success: true,
    message: 'Node added successfully',
  });

});

// Example: POST /graph/:filename/addEdge
router.post('/:filename/addEdge', (req, res) => {
  const { edgeKey, sourceNodeKey, targetNodeKey, properties } = req.body;
  const graph = req.graph;
  const graph_file_path = req.graph_file_path;

  graph.addEdgeWithKey(edgeKey, sourceNodeKey, targetNodeKey, properties);
  
  eventEmitter.emit('edgeAdded', graph, graph_file_path);

  // Respond with success message
  res.json({
    success: true,
    message: 'Edge added successfully',
  });

});

// GET /getEdge/:key endpoint
router.get('/:filename/getEdge/:key', (req, res) => {
  const edgeKey = req.params.key;
  const graph = req.graph;

  if (graph.hasEdge(edgeKey)) {
    //   const { source, target, attributes } = graph.getEdgeAttributes(edgeKey);

    const attributes = graph.getEdgeAttributes(edgeKey);

    res.json({
      edgeKey,
      // sourceNodeKey: source,
      // targetNodeKey: target,
      properties: attributes,
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Edge not found',
    });
  }
});

// GET /getNode/:key endpoint
router.get('/:filename/getNode/:key', (req, res) => {
  const nodeKey = req.params.key;
  const graph = req.graph;

  if (graph.hasNode(nodeKey)) {
    const properties = graph.getNodeAttributes(nodeKey);

    res.json({
      nodeKey,
      properties,
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Node not found',
    });
  }
});

// delete node 
router.delete('/:filename/deleteNode/:key', (req, res) => {
  const nodeKey = req.params.key;
  const graph = req.graph;
  const graph_file_path = req.graph_file_path;

  if (graph.hasNode(nodeKey)) {
    graph.dropNode(nodeKey);
    eventEmitter.emit('nodeDeleted', graph, graph_file_path);
    res.json({
      success: true,
      message: 'Node deleted successfully',
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Node not found',
    });
  }
});


// DELETE /deleteEdge/:key endpoint
router.delete('/:filename/deleteEdge/:key', (req, res) => {
  const edgeKey = req.params.key;
  const graph = req.graph;
  const graph_file_path = req.graph_file_path;

  if (graph.hasEdge(edgeKey)) {
    graph.dropEdge(edgeKey);
    // edgeDeleted
    eventEmitter.emit('edgeDeleted', graph, graph_file_path);

    res.json({
      success: true,
      message: 'Edge deleted successfully',
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Edge not found',
    });
  }
});


router.put('/:filename/updateProperty/:nodeKey', (req, res) => {
  const nodeKey = req.params.nodeKey;
  const { propertyKey, propertyValue } = req.body;
  const graph = req.graph;
  const graph_file_path = req.graph_file_path;

  if (graph.hasNode(nodeKey)) {
    graph.setNodeAttribute(nodeKey, propertyKey, propertyValue);
    eventEmitter.emit('propertyUpdated', graph, graph_file_path);

    res.json({
      success: true,
      message: 'Property updated for node successfully',
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Node not found',
    });
  }
});

router.delete('/:filename/deleteProperty/:nodeKey/:propertyKey', (req, res) => {
  const nodeKey = req.params.nodeKey;
  const propertyKey = req.params.propertyKey;
  const graph = req.graph;
  const graph_file_path = req.graph_file_path;

  if (graph.hasNode(nodeKey)) {

    if (graph.hasNodeAttribute(nodeKey, propertyKey)) {
      graph.removeNodeAttribute(nodeKey, propertyKey);
      eventEmitter.emit('propertyDeleted', graph, graph_file_path);

      res.json({
        success: true,
        message: 'Property deleted from node successfully',
      });
    }
    else {
      res.status(404).json({
        success: false,
        message: 'Node property not found',
      });
    }


  } else {
    res.status(404).json({
      success: false,
      message: 'Node not found',
    });
  }
});

//v 5

router.get('/:filename/exportGraph', (req, res) => {
  const graph = req.graph;
  try {
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

    res.json(graphData); // Send the graph data as JSON response
  } catch (error) {
    console.error('Error exporting graph:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting graph',
    });
  }
});


router.get('/getEdges/:source/:target', (req, res) => {
  const sourceNodeKey = req.params.source;
  const targetNodeKey = req.params.target;
  const graph = req.graph;

  const edges = graph.outEdges(sourceNodeKey, targetNodeKey);

  const edgeList = edges.map(edgeKey => {
    const attributes = graph.getEdgeAttributes(edgeKey);
    return {
      edgeKey,
      properties: attributes,
    };
  });

  res.json({
    edges: edgeList,
  });
});

router.get('/getEdges', (req, res) => {
  const graph = req.graph;
  const edges = graph.edges(); // Get all edge keys

  const edgeList = edges.map(edgeKey => {
    const attributes = graph.getEdgeAttributes(edgeKey);
    return {
      edgeKey,
      properties: attributes,
    };
  });

  res.json({
    edges: edgeList,
  });
});


// drop edges between source and target key
router.delete('/deleteEdge/:source/:target', (req, res) => {
  const sourceNodeKey = req.params.source;
  const targetNodeKey = req.params.target;
  const graph = req.graph;
  const graph_file_path = req.graph_file_path;

  const edges = graph.outEdges(sourceNodeKey, targetNodeKey);

  if (edges.length === 0) {
    res.status(404).json({
      success: false,
      message: 'Edges not found between the specified nodes',
    });
    return;
  }

  edges.forEach(edgeKey => {
    graph.dropEdge(edgeKey);
  });
  eventEmitter.emit('saveGraph', graph, graph_file_path);

  res.json({
    success: true,
    message: 'Edges deleted successfully',
  });
});


//v 6 drop edge by key
router.delete('/deleteEdgeByKey/:key', (req, res) => {
  const edgeKey = req.params.key;
  const graph = req.graph;
  const graph_file_path = req.graph_file_path;

  if (graph.hasEdge(edgeKey)) {
    graph.dropEdge(edgeKey);
    eventEmitter.emit('saveGraph', graph, graph_file_path);

    res.json({
      success: true,
      message: 'Edge deleted successfully',
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Edge not found',
    });
  }
});

module.exports = router;
