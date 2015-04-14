var express = require('express');
var controller = require('./ping.controller');
var auth = require('../../../auth/auth.service');


//Ping
var router = express.Router();


//Middleware
router.use(auth.isAuthenticated);


router.post('/register', controller.register);
router.post('/', controller.initiatePing);
router.put('/:ping_id', controller.respondPing);


/*router.use(function(err, req, res, next) {
	console.error('router specific error handler');
	console.error(err.stack);
	res.status(500).send('Something broke!');
});*/


module.exports = router;
