var express = require('express');
var controller = require('./ping.controller');
var auth = require('../../../auth/auth.service');


//Ping
var router = express.Router();

//Middleware
router.use(auth.isAuthenticated);


router.post('/', controller.initiatePing);
router.put('/:ping_id', controller.respondPing);


module.exports = router;

