var express = require('express');
var passport = require('passport');
var auth = require('../auth.service');

var router = express.Router();

router.post('/', function(req, res, next) {
	passport.authenticate('local', function(err, user, info) {
		if (err) {
			return res.status(401).json(err);
		}

		if (!user) {
			return res.status(401).json(info);
		}

		var token = auth.createToken({_id: user._id});
		user.login_info.password = undefined;

		res.json({token: token, user: user});
	})(req, res, next);
});

module.exports = router;
