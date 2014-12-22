var express = require('express');
var controller = require('./user.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', controller.index);
router.post('/login', controller.login);
router.delete('/:id', controller.destroy);
router.get('/me', auth.isAuthenticated, controller.me);
router.put('/me', auth.isAuthenticated, controller.changeSettings);
router.put('/:id/password', auth.isAuthenticated, controller.changePassword);
router.get('/:id', auth.isAuthenticated, controller.show);
router.post('/', controller.create);

module.exports = router;
