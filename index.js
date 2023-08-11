const express = require('express');
const graphology = require('graphology');
const cors = require('cors');

// Create an Express app
const app = express();
const port = process.env.PORT || 3028;

// Create an instance of the graph
const graph = new graphology.Graph();

// Middleware to enable CORS
app.use(cors()); // Add this line to enable CORS

// Middleware to parse JSON in request bodies
app.use(express.json());

// Define the POST /addNode endpoint
app.post('/addNode', (req, res) => {
  const { nodeKey, properties } = req.body;

  // Add the node to the graph
  graph.addNode(nodeKey, properties);

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

