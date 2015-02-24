var express = require('express');
var controller = require('./event.controller');
var auth = require('../../../auth/auth.service');

// Events
var router = express.Router();

router.use(auth.isAuthenticated);

router.get('/', controller.index);
router.post('/', controller.create);
router.post('/:event_id', controller.update);
router.delete('/:event_id', controller.delete);
router.put('/:event_id', controller.volunteer);

module.exports = router;
