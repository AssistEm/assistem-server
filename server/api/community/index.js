var Community = require('./community.model');
var express = require('express');
var controller = require('./community.controller');
var auth = require('../../auth/auth.service');

// Communities
var router = express.Router();

router.get('/', controller.index);
router.get('/me', auth.isAuthenticated, controller.myCommunities);
router.post('/:id', auth.isAuthenticated, controller.update);
router.delete('/:id', auth.isAuthenticated, controller.delete);

// Communities/:id/Events
var eventsRouter = require('./event');

// TODO: use app.param instead
router.use('/:id/events', function(req, res, next) {
	Community.findOne({_id: req.params.id}, function(err, community) {
		if (err) {
			next(err);
		}

		if (!community) {
			res.json({msg: "community not found"});
		}

		req.community = community;

		next();
	});
}, eventsRouter);

module.exports = router;
