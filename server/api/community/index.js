var Community = require('./community.model');
var express = require('express');
var controller = require('./community.controller');
var auth = require('../../auth/auth.service');

// Communities
var router = express.Router();

// Use router.param() on community_id

router.get('/', controller.index);
router.get('/me', auth.isAuthenticated, controller.myCommunities);
router.post('/:id', auth.isAuthenticated, controller.update);
router.delete('/:id', auth.isAuthenticated, controller.delete);
router.get('/:community_id/caretakers', auth.isAuthenticated, controller.caretakers);
router.post('/:community_id/makePrimary', auth.isAuthenticated, controller.makePrimary);

// TODO: factor out into community controller
function attachCommunity(req, res, next) {
	Community.findOne({_id: req.params.id}, function(err, community) {
		if (err) {
			next(err);
		}
		else if (!community) {
			res.json({msg: "community not found"});
		}
		else {
			req.community = community;
			next();
		}
	});
}

// Community sub resources
// TODO: use app.param instead
router.use('/:id/events', attachCommunity, require('./event'));
router.use('/:id/groceries', attachCommunity, require('./grocery'));
router.use('/:id/pings', attachCommunity, require('./ping'));

module.exports = router;
