var express = require('express');
// var passport = require('passport');
var config = require('../config/environment');
var User = require('../api/user/user.model');

require('./local/passport').setup(User, config);
require('./bearer/passport').setup(User, config);

var router = express.Router();

router.use('/local', require('./local'));

module.exports = router;
