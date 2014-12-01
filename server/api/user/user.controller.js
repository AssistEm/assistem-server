var User = require('./user.model');
var passport = require('passport');
var config = require('../../config/environment');
var auth = require('../../auth/auth.service');

var validationError = function(res, err) {
	return res.status(422).json(err);
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
var faker = require('faker');

exports.create = function(req, res) {
	var newUser = new User({
		first_name: faker.name.firstName(),
		last_name: faker.name.lastName(),
		type: 'caretaker',
		phone: faker.phone.phoneNumber(),
		login_info: {
			email: req.body.email,
			password: req.body.password
		}
	});

	// TODO Add w/e else properties that the server assumes
	// of a new user, i.e. independent of user input

	newUser.save(function(err, user) {
		if (err) {
			return validationError(res, err);
		}

		var token = auth.createToken({_id: user._id});

		res.json(token);
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
