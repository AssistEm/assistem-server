// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var debug = require('debug')('caretaker');
var express = require('express');
var mongoose = require('mongoose');
var config = require('./config/environment');

// Connect to database
mongoose.connect(config.mongo.uri);

// Setup server
var app = express();
require('./config/express')(app);
require('./routes')(app);

var server = app.listen(config.port, function() {
  	console.log('Express server listening on port ' + server.address().port);
	debug('Express server listening on port ' + server.address().port);
});

exports = module.exports = app;
