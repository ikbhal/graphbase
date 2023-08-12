const express = require('express');
const graphology = require('graphology');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events'); // Import the events package
const v6Router = require('./routes/v6'); // Import the v6 router
const {getDefaultGraphFile, 
  saveGraphToJson,
  loadGraphFromJson} = require('./util/graph_util'); // Import the graph utility functions


// Create an Express app
const app = express();
const port = process.env.PORT || 3027;

// Create an instance of the graph

// Create an event emitter instance
const eventEmitter = new EventEmitter();

eventEmitter.on('nodeAdded', (graph, filePath) =>{ 
  
  saveGraphToJson(graph, filePath);
});
eventEmitter.on('nodeDeleted', (graph, filePath) => saveGraphToJson(graph, filePath));
eventEmitter.on('edgeAdded', (graph, filePath) => saveGraphToJson(graph, filePath));
eventEmitter.on('edgeDeleted', (graph, filePath) => saveGraphToJson(graph, filePath));
eventEmitter.on('propertyUpdated', (graph, filePath) => saveGraphToJson(graph, filePath));
eventEmitter.on('propertyDeleted', (graph, filePath) => saveGraphToJson(graph, filePath));


// default graph file 
// const defaultGraphFile = path.join(__dirname, 'graph_file.json');
// getDefaultGraphFile

// Example usage
const graph = loadGraphFromJson(getDefaultGraphFile());

// Middleware to enable CORS
app.use(cors()); // Add this line to enable CORS

app.use('/v6/graph', v6Router);

// Middleware to parse JSON in request bodies
app.use(express.json());

app.get('/ping', (req, res)=> {
  res.send('pong');
});

// Define the POST /addNode endpoint
app.post('/addNode', (req, res) => {
  const { nodeKey, properties } = req.body;

  // Add the node to the graph
  graph.addNode(nodeKey, properties);
  // eventEmitter.on('nodeAdded', (filePath) => saveGraphToJson(filePath));
  eventEmitter.emit('nodeAdded', graph, getDefaultGraphFile());

  // Respond with success message
  res.json({
    success: true,
    message: 'Node added successfully',
  });
});

// GET /getNodes endpoint
app.get('/getNodes', (req, res) => {
  const nodes = graph.nodes(); // Get all node keys

  const nodeList = nodes.map(nodeKey => {
    const properties = graph.getNodeAttributes(nodeKey);
    return {
      nodeKey,
      properties,
    };
  });

  res.json({
    nodes: nodeList,
  });
});

// POST /addEdge endpoint
app.post('/addEdge', (req, res) => {
  const { edgeKey, sourceNodeKey, targetNodeKey, properties } = req.body;

  // Add the edge to the graph
  graph.addEdgeWithKey(edgeKey, sourceNodeKey, targetNodeKey, properties);
  eventEmitter.emit('edgeAdded', graph, getDefaultGraphFile());

  // Respond with success message
  res.json({
    success: true,
    message: 'Edge added successfully', 
  });
});

// GET /getEdge/:key endpoint
app.get('/getEdge/:key', (req, res) => {
  const edgeKey = req.params.key;

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
app.get('/getNode/:key', (req, res) => {
  const nodeKey = req.params.key;

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
app.delete('/deleteNode/:key', (req, res) => {
  const nodeKey = req.params.key;

  if (graph.hasNode(nodeKey)) {
    graph.dropNode(nodeKey);
    eventEmitter.emit('nodeDeleted', graph, getDefaultGraphFile());
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
app.delete('/deleteEdge/:key', (req, res) => {
  const edgeKey = req.params.key;

  if (graph.hasEdge(edgeKey)) {
    graph.dropEdge(edgeKey);
    // edgeDeleted
    eventEmitter.emit('edgeDeleted', graph, getDefaultGraphFile());

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


app.put('/updateProperty/:nodeKey', (req, res) => {
  const nodeKey = req.params.nodeKey;
  const { propertyKey, propertyValue } = req.body;

  if (graph.hasNode(nodeKey)) {
    graph.setNodeAttribute(nodeKey, propertyKey, propertyValue);
    eventEmitter.emit('propertyUpdated', graph, getDefaultGraphFile());

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

app.delete('/deleteProperty/:nodeKey/:propertyKey', (req, res) => {
  const nodeKey = req.params.nodeKey;
  const propertyKey = req.params.propertyKey;

  if (graph.hasNode(nodeKey)) {

    if (graph.hasNodeAttribute(nodeKey, propertyKey)) {
      graph.removeNodeAttribute(nodeKey, propertyKey);
      eventEmitter.emit('propertyDeleted', graph, getDefaultGraphFile());

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

app.get('/exportGraph', (req, res) => {
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


app.get('/getEdges/:source/:target', (req, res) => {
  const sourceNodeKey = req.params.source;
  const targetNodeKey = req.params.target;

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

app.get('/getEdges', (req, res) => {
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
app.delete('/deleteEdge/:source/:target', (req, res) => {
  const sourceNodeKey = req.params.source;
  const targetNodeKey = req.params.target;

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

  res.json({
    success: true,
    message: 'Edges deleted successfully',
  });
});


//v 6 drop edge by key
app.delete('/deleteEdgeByKey/:key', (req, res) => {
  const edgeKey = req.params.key;

  if (graph.hasEdge(edgeKey)) {
    graph.dropEdge(edgeKey);

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

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

