var express = require('express');
var path = require('path');
//var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');
var config = require('./environment');
var passport = require('passport');

module.exports = function(app) {
	var env = app.get('env');

	app.set('views', config.root + '/server/views');
	app.engine('html', require('ejs').renderFile);
	app.set('view engine', 'html');
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(passport.initialize());

	if (env === "production") {
		app.use(express.static(path.join(config.root, 'public')));
		app.set('appPath', config.root + '/public');
		app.use(logger('dev'));
	}

	if (env === "development" || env === "test") {
		app.use(express.static(path.join(config.root, 'client')));
		app.set('appPath', '/client');
		app.use(logger('dev'));
	}
};
