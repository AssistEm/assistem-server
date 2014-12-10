var express = require('express');
var controller = require('./user.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

/*
 * TODO: force all endpoints to return json
 * TODO: at login return user object (very least {'token': })
 */

router.get('/', controller.index);
router.delete('/:id', controller.destroy);
router.get('/me', auth.isAuthenticated, controller.me);
router.put('/:id/password', auth.isAuthenticated, controller.changePassword);
router.get('/:id', auth.isAuthenticated, controller.show);
router.post('/', controller.create);

module.exports = router;
