var express = require('express');
var controller = require('./events.controller');
var auth = require('../../../auth/auth.service');

var router = express.Router();

router.get('/', controller.index);
router.post('/', controller.create);
router.post('/:id', controller.update);
router.delete('/:id', controller.delete);

module.exports = router;
