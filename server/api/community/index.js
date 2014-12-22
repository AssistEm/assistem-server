var express = require('express');
var controller = require('./community.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', controller.index);
router.post('/', auth.isAuthenticated, controller.create);
router.post('/:id', auth.isAuthenticated, controller.update);
router.delete('/:id', auth.isAuthenticated, controller.delete);

module.exports = router;
