var User = require('./user.model');
var passport = require('passport');
var config = require('../../config/environment');
var auth = require('../../auth/auth.service');
var _ = require('lodash');

var validationError = function(res, err) {
	if (err.code === 11000) {
		// Duplicate user
		return res.status(409).json(err);
	}

	return res.status(422).json(err);
};

/*
 * User login
 */
exports.login = function(req, res, next) {
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
};

/*
 * Get list of useres
 */
exports.index = function(req, res) {
	User.find({}, '-login_info.password', function(err, users) {
		if (err) {
			return res.status(500).send(err);
		}

		res.status(200).json(users);
	});
};

/*
 * Create a new user
 */
exports.create = function(req, res) {
	var user = _.merge(new User(), req.body);

	// TODO Add w/e else properties that the server assumes
	// of a new user, i.e. independent of user input

	user.save(function(err, user) {
		if (err) {
			return validationError(res, err);
		}

		var token = auth.createToken({_id: user._id});

		res.json({token: token, user: user});
	});
};

/*
 * Get a single user
 */
exports.show = function(req, res, next) {
	var userId = req.params.id;

	User.findById(userId, function(err, user) {
		if (err) {
			return next(err);
		}

		if (!user) {
			return res.sendStatus(401);
		}

		// TODO Maybe don't return the complete user object
		res.json(user);
	});
};

/*
 * Delete a user
 */
exports.destroy = function(req, res) {
	var userId = req.params.id;

	User.findByIdAndRemove(userId, function(err, user) {
		if (err) {
			return res.status(500).json(err);
		}

		return res.sendStatus(204);
	});
};

/*
 * Change a users password
 */
exports.changePassword = function(req, res, next) {
	var userId = req.user._id;
	var oldPass = req.body.oldPass;
	var newPass = req.body.newPass;

	User.findById(userId, function(err, user) {
		user.verifyPassword(oldPass, function(err, match) {
			if (err) {
				return next(err);
			}

			if (!match) {
				return res.sendStatus(403);
			}

			user.login_info.password = newPass;

			user.save(function(err) {
				if (err) {
					return validationError(res, err);
				}

				res.sendStatus(200);
			});
		});
	});
};

/*
 * Change a users settings
 */
exports.changeSettings = function(req, res, next) {
	var userId = req.user._id;

	User.findById(userId, '-login_info.password', function(err, user) {
		if (err) {
			return next(err);
		}

		_.merge(user, req.body);

		user.save(function(err) {
			if (err) {
				return res.status(409).send(err);
			}

			res.sendStatus(200);
		});
	});
};

/*
 * Get my info
 */
exports.me = function(req, res, next) {
	var userId = req.user._id;

	User.findOne({
		_id: userId
	}, '-login_info.password', function(err, user) {
		if (err) {
			return next(err);
		}

		if (!user) {
			return res.sendStatus(401);
		}

		res.json(user);
	});
};
