var User = require('./user.model');
var Community = require('../community/community.model');
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
exports.create = function(req, res, next) {
	var b = req.body;
	var userData = b.user;
	var communityData = b.community;

	// check the type of the new user
	if (userData.type.toLowerCase() === 'caretaker') { // caretaker
		var isEmail = /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/.test(communityData.query);
		var query = (isEmail ?
			{'login_info.email': communityData.query} : {name: communityData.query});
		
		// quer: emai, search for patient -> community
		if (isEmail) {
			User.findOne(query, function(err, patient) {
				if (err) {
					next(err);
				}

				if (!patient) {
					res.json({ msg: "patient with specified email not found" });
				}

				var assocCommunity = patient.patient_info.community_id;

				Community.findOne({_id: assocCommunity}, function(err, community) {
					if (err) {
						next(err);
					}

					if (!community) {
						res.json({ msg: "fatal error in search"});
					}

					res.locals.community = community;

					var newCaretaker = _.merge(new User(), userData);

					res.locals.user = newCaretaker;
					var payload = {
						token: auth.createToken({_id: newCaretaker._id}),
					};
					
					res.locals.payload = payload;
					next();
				});
			});
		}
		// query: name, search for community by name
		else {
			Community.findOne(query, function(err, community) {
				if (err) {
					next(err);
				}

				console.log(community);
				if (!community) {
					res.json({ msg: "no community with that name found" });
				}

				var newCaretaker = _.merge(new User(), userData);

				res.locals.user = newCaretaker;
				var payload = {
					token: auth.createToken({_id: newCaretaker._id}),
				};
				
				res.locals.community = community;
				res.locals.payload = payload;
				next();
			});
		}
	} else { // patient
		var newPatient = _.merge(new User(), userData);

		res.locals.user = newPatient;
		var payload = {
			token: auth.createToken({_id: newPatient._id}),
		};

		res.locals.payload = payload;
		next();
	}
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
