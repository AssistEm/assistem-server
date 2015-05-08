var User = require('./user.model');
var Community = require('../community/community.model');
var passport = require('passport');
var config = require('../../config/environment');
var auth = require('../../auth/auth.service');
var _ = require('lodash');


/**
 * Handles all the validation errors thrown by the controller
 *
 * @param  req  The request object of the HTTP request
 * @param  res  The response that will be returned to the client
 * @return      The 409 or 422 response associated with the error thrown
 */
var validationError = function(res, err) {
	if (err.code === 11000) {
		// Duplicate user
		return res.status(409).json(err);
	}

	return res.status(422).json(err);
};

/**
 * Logs a user into the application
 *
 * @param  req  The request object of the HTTP request
 * @param  res  The response that will be returned to the client
 * @param  next The next element in the middleware
 * @return      The user object with the associated authentication token and community
 */
exports.login = function(req, res, next) {
	passport.authenticate('local', function(err, user, info) {
		if (err) {
			return res.status(401).json(err);
		}

		if (!user) {
			return res.status(401).json(info);
		}

		var community_ids = [];

		if (user.type.toLowerCase() === 'caretaker') {
			community_ids = community_ids.concat(user.caretaker_info.communities);
		}
		else {
			community_ids = community_ids.concat(user.patient_info.community_id);
		}

		Community.find({_id: {$in: community_ids}}, function(err, community) {
			if (err) {
				next(err);
			}
			else {
				var token = auth.createToken({_id: user._id});
				user.login_info.password = undefined;

				res.json({token: token, user: user, community: community});
			}
		});
	})(req, res, next);
};

/**
 * Gets a list of names of all users
 *
 * @param  req  The request object of the HTTP request
 * @param  res  The response that will be returned to the client
 * @return      The response with the list of users attached
 */
exports.index = function(req, res) {
	User.find({}, '-login_info.password', function(err, users) {
		if (err) {
			return res.status(500).send(err);
		}

		res.status(200).json(users);
	});
};

/**
 * Creates a new user
 *
 * @param  req  The request object of the HTTP request
 * @param  res  The response that will be returned to the client
 * @param  next The next element in the middleware
 * @return      The response with the new user object in it
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

				else if (!patient) {
					res.json({ msg: "patient with specified email not found" });
				}

				else {
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
				}
			});
		}
		// query: name, search for community by name
		else {
			Community.findOne(query, function(err, community) {
				if (err) {
					next(err);
				}

				else if (!community) {
					res.json({ msg: "no community with that name found" });
				}

				else {
					var newCaretaker = _.merge(new User(), userData);

					res.locals.user = newCaretaker;
					var payload = {
						token: auth.createToken({_id: newCaretaker._id}),
					};
					
					res.locals.community = community;
					res.locals.payload = payload;
					next();
				}
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

/**
 * Gets a single user object
 *
 * @param  req  The request object of the HTTP request
 * @param  res  The response that will be returned to the client
 * @param  next The next element in the middleware
 * @return      The response with the proper user object attached
 */
exports.show = function(req, res, next) {
	var userId = req.params.id;
	var community = req.user.caretaker_info.communities;

	User.findById(userId).in(communities).exec(function(err, user) {
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

/**
 * Deletes a user from the database
 *
 * @param  req  The request object of the HTTP request
 * @param  res  The response that will be returned to the client
 * @param  next The next element in the middleware
 * @return      The 500 or 204 response of if the user is deleted successfully
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

/**
 * Changes the password for a user
 *
 * @param  req  The request object of the HTTP request
 * @param  res  The response that will be returned to the client
 * @param  next The next element in the middleware
 * @return      The 403 or 200 response depending on the success of changing the password
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

/**
 * Change the User Settings
 *
 * @param  req  The request object of the HTTP request
 * @param  res  The response that will be returned to the client
 * @param  next The next element in the middleware
 * @return      The 409 or 200 response depending on success of changing the user settings
 */
exports.changeSettings = function(req, res, next) {
	var userId = req.user._id;
	var updated_info = req.body;
	
	User.update({ '_id' : userId}, updated_info, function(err) {
		if (err) {
			console.log('err = ' + err);
			return res.status(409).send(err);
		}

		res.sendStatus(200);
	});
};

/**
 * Gets the information of a user
 *
 * @param  req  The request object of the HTTP request
 * @param  res  The response that will be returned to the client
 * @param  next The next element in the middleware
 * @return      The user object associated with the user id.
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
