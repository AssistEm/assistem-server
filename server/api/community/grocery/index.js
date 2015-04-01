var Grocery = require('./grocery.model');
var express = require('express');
var controller = require('./grocery.controller');
var auth = require('../../../auth/auth.service');

// Grocery
var router = express.Router();

// middleware
router.use(auth.isAuthenticated);
router.use(controller.attachGroceryList);

router.get('/', controller.index);
router.post('/', controller.addItem);
router.post('/:item_id', controller.updateItem);
router.put('/:item_id', controller.volunteerItem);
router.delete('/:item_id', controller.deleteItem);
router.get('/autocomplete', controller.autocompleteItem);

module.exports = router;
