const express = require('express');
const graphology = require('graphology');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events'); // Import the events package


// Create an Express app
const app = express();
const port = process.env.PORT || 3027;

// Create an instance of the graph

// Create an event emitter instance
const eventEmitter = new EventEmitter();

// Define event listeners for different changes
eventEmitter.on('nodeAdded', () => saveGraphToJson());
eventEmitter.on('nodeDeleted', () => saveGraphToJson());
eventEmitter.on('edgeAdded', () => saveGraphToJson());
eventEmitter.on('edgeDeleted', () => saveGraphToJson());
eventEmitter.on('propertyUpdated', () => saveGraphToJson());
eventEmitter.on('propertyDeleted', () => saveGraphToJson());

// Example usage
const graph = loadGraphFromJson(path.join(__dirname, 'graph_file.json'));

// Save the graph data to a JSON file
function saveGraphToJson() {
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

  const filePath = path.join(__dirname, 'graph_file.json');

  fs.writeFile(filePath, JSON.stringify(graphData, null, 2), 'utf8', err => {
    if (err) {
      console.error('Error saving graph data to JSON file:', err);
    } else {
      console.log('Graph data saved to graph_file.json');
    }
  });
}

// Middleware to enable CORS
app.use(cors()); // Add this line to enable CORS

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
  eventEmitter.emit('nodeAdded');

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
  eventEmitter.emit('edgeAdded');

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
    eventEmitter.emit('nodeDeleted'); // Emit event for node deletion
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
    eventEmitter.emit('edgeDeleted');

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
    eventEmitter.emit('propertyUpdated');

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
      eventEmitter.emit('propertyDeleted');
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
// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

