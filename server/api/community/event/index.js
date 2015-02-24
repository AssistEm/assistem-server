var express = require('express');
var controller = require('./event.controller');
var auth = require('../../../auth/auth.service');

var router = express.Router();

router.get('/', controller.index);
router.post('/', controller.create);
router.post('/:event_id', controller.update);
router.delete('/:event_id', controller.delete);

module.exports = router;
