var User = require('./user.model');
var Community = require('../community/community.model');
var passport = require('passport');
var auth = require('../../auth/auth.service');
var moment = require('moment');
var _ = require('lodash');

var secrets = require('../community/ping/secrets');

var SNS = require('sns-mobile');

var Promise = require('bluebird');

Promise.promisifyAll(User);
Promise.promisifyAll(User.prototype);

var androidApp = new SNS({
  platform: SNS.SUPPORTED_PLATFORMS.ANDROID,
  region: 'us-west-2',
  apiVersion: '2010-03-31',
  accessKeyId: secrets.SNS_KEY_ID,
  secretAccessKey: secrets.SNS_ACCESS_KEY,
  platformApplicationArn: secrets.SNS_ANDROID_ARN
});

Promise.promisifyAll(androidApp);

//Registers a mobile client (android)
exports.register = function(req, res, next) {
	var deviceId = req.body.deviceId;
	console.log('Registering android device with id: ' + deviceId);

	androidApp
	.addUserAsync(deviceId, null)
	.then(function(endpointArn) {
		return req.user.updateAsync({$set: {'login_info.endpoint_arn': endpointArn}});
	})
	.then(function(registeredUser) {
		console.log('Registered new user with endpoint_arn: ' + endpointArn);
		res.status(200).json({});
	})
	.catch(function(err) {
		console.log(err);
		res.status(500).json(err);
	});
};


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

/*
 * Get a single user
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
	var updated_info = req.body;
	
	User.update({ '_id' : userId}, updated_info, function(err) {
		if (err) {
			console.log('err = ' + err);
			return res.status(409).send(err);
		}

		res.status(200).json({});
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

exports.setAvailability = function(req, res) {
	var isAvailable = req.body.is_available;
	var duration = req.body.duration;

	User
	.update(
		{_id: req.user._id},
		{$set: {'caretaker_info.global_availability': isAvailable}}
	)
	.exec(function(err, user) {
		if (err) {
			console.log(err);
			res.status(500).json(err);
		}
		else {
			if (duration) {
				var resetDate = moment().add(moment.duration(duration, 'hours'));
				req.app.get('agenda').schedule(
					resetDate.toDate(), 'reset availability', {userId: req.user._id}
				);
			}

			res.status(200).json({});
		}
	});
};

exports.getAvailability = function(req, res) {
	User
	.findOne({_id: req.user._id})
	.select('caretaker_info.global_availability')
	.exec(function(err, user) {
		if (err) {
			console.log(err);
			res.status(500).json(err);
		}
		else {
			res.status(200).json({is_available: user.caretaker_info.global_availability});
		}
	});
};
