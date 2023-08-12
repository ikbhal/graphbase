const express = require('express');
const fs = require('fs');
const path = require('path');
const graphology = require('graphology');
const EventEmitter = require('events'); 
const {getDefaultGraphFile, getGraphFile,
  saveGraphToJson,
  loadGraphFromJson} = require('../util/graph_util');

const router = express.Router();
// Create an event emitter instance
const eventEmitter = new EventEmitter();
eventEmitter.on('nodeAdded', (filePath) => saveGraphToJson(filePath));
eventEmitter.on('nodeDeleted', (filePath) => saveGraphToJson(filePath));
eventEmitter.on('edgeAdded', (filePath) => saveGraphToJson(filePath));
eventEmitter.on('edgeDeleted', (filePath) => saveGraphToJson(filePath));
eventEmitter.on('propertyUpdated', (filePath) => saveGraphToJson(filePath));
eventEmitter.on('propertyDeleted', (filePath) => saveGraphToJson(filePath));

// Middleware to load the graph from a JSON file
router.use('/:filename', (req, res, next) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, `${filename}.json`);

  req.graph = loadGraphFromJson(filePath);
  next();
});

// Define API endpoints

// Example: POST /graph/:filename/addNode
router.post('/:filename/addNode', (req, res) => {
  // get filename from req.params
  const { filename } = req.params;
  const fileNameJson = `${filename}.json`;
  const graph_file_path= getGraphFile(fileNameJson);

  const { nodeKey, properties } = req.body;
  const graph = req.graph;

  graph.addNode(nodeKey, properties);
  // saveGraphToJson(graph_file_path);
  eventEmitter.emit('nodeAdded', graph_file_path);
  res.json({
    success: true,
    message: 'Node added successfully',
  });

});

// Example: POST /graph/:filename/addEdge
router.post('/:filename/addEdge', (req, res) => {
  const { edgeKey, sourceNodeKey, targetNodeKey, properties } = req.body;
  const graph = req.graph;

  graph.addEdgeWithKey(edgeKey, sourceNodeKey, targetNodeKey, properties);
  // saveGraphToJson(graph);
  
  const { filename } = req.params;
  const fileNameJson = `${filename}.json`;
  const graph_file_path= getGraphFile(fileNameJson);
  eventEmitter.emit('edgeAdded', graph_file_path);

  // Respond with success message
  res.json({
    success: true,
    message: 'Edge added successfully',
  });

});

// ... (similarly, define other API endpoints)

module.exports = router;
