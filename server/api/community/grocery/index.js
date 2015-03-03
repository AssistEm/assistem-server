var Grocery = require('./grocery.model');
var express = require('express');
var controller = require('./grocery.controller');
var auth = require('../../../auth/auth.service');

// Grocery
var router = express.Router();

router.use(auth.isAuthenticated);

router.get('/', controller.index);
router.post('/', controller.createItem);
router.post('/:item_id', controller.updateItem);
router.put('/:item_id', controller.volunteerItem);
router.delete('/item_id', controller.deleteItem);
router.put('/autocomplete', controller.autocompleteItem);

module.exports = router;
