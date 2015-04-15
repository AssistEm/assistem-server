var express = require('express');
var controller = require('./user.controller');
var communityController = require('../community/community.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', controller.index);
router.post('/login', controller.login);
router.delete('/:id', controller.destroy);
router.get('/me', auth.isAuthenticated, controller.me);
router.put('/me', auth.isAuthenticated, controller.changeSettings);
router.post('/me/pushregister', auth.isAuthenticated, controller.register);
router.put('/:id/password', auth.isAuthenticated, controller.changePassword);
router.get('/:id', auth.isAuthenticated, controller.show);
router.post('/', controller.create, communityController.createCommunity);
router.put(
	'/me/available',
	auth.isAuthenticated,
	controller.setAvailability
);
router.get(
	'/me/available',
	auth.isAuthenticated,
	controller.getAvailability
);
router.post(
	'/me/available/:availability_id',
	auth.isAuthenticated,
	controller.updateAvailability
);
router.delete(
	'/me/available/:availability_id',
	auth.isAuthenticated,
	controller.removeAvailability
);

module.exports = router;
