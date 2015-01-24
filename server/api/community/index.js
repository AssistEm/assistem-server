var express = require('express');
var controller = require('./community.controller');
var auth = require('../../auth/auth.service');

// Communities
var router = express.Router();

router.get('/', controller.index);
router.post('/',  controller.create);
router.post('/:id', auth.isAuthenticated, controller.update);
router.delete('/:id', auth.isAuthenticated, controller.delete);

// Communities/:id/Events
var eventsRouter = require('./event');

var mongoose = require('mongoose');
var Community = require('./community.model');

router.use('/:id/events', function(req, res, next) {
	// TODO: attach valid community to req

	Community.findOne({name: 'test'}, function(err, community) {
		console.log(community);
		req.community = community;
		next();
	});
}, eventsRouter);

module.exports = router;
