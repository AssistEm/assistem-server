var User = require('./user.model');
var Community = require('../community/community.model');
var passport = require('passport');
var auth = require('../../auth/auth.service');
var moment = require('moment');
var _ = require('lodash');
var secrets = require('../community/ping/secrets');
var SNS = require('sns-mobile');
var Promise = require('bluebird');
var AWS = require('aws-sdk');

Promise.promisifyAll(User);
Promise.promisifyAll(User.prototype);

var androidApp = new SNS({
  platform: SNS.SUPPORTED_PLATFORMS.ANDROID,
  region: "us-west-2",
  apiVersion: '2010-03-31',
  accessKeyId: secrets.SNS_KEY_ID,
  secretAccessKey: secrets.SNS_ACCESS_KEY,
  platformApplicationArn: secrets.SNS_ANDROID_ARN
});

AWS.config = secrets.AWS_CONFIG;
var s3Bucket = new AWS.S3( { params: {Bucket: 'assistem-images'} } );

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
	.then(function() {
		res.status(200).json({});
	})
	.catch(function(err) {
		console.log(err);
		res.status(500).json(err);
	});
};



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
	var profilePictureBinaryImage = b.profile_picture;

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
					//uploadImageToAWS(newCaretaker, profilePictureBinaryImage, function() {
					next();
					//});
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
		//uploadImageToAWS(newPatient, profilePictureBinaryImage, function() {
			next();
		//});
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

	if (req.user.type.toLowerCase() === 'caretaker') {
		var community = req.user.type.toLowerCase() === 'caretaker' ? req.user.caretaker_info.communities : req.user.patient_info.community_id;	
		User.findById(userId).where('_id').in(community).exec(function(err, user) {
			if (err) {
				return next(err);
			}

			if (!user) {
				return res.sendStatus(401);
			}

			// TODO Maybe don't return the complete user object
			res.json(user);
		});
	}
	else {
		var community = req.user.patient_info.community_id;
		User.findById(userId).where('_id').in(community).exec(function(err, user) {
			if (err) {
				return next(err);
			}

			if (!user) {
				return res.sendStatus(401);
			}

			// TODO Maybe don't return the complete user object
			res.json(user);
		});
	}
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

function uploadImageToAWS(user, binaryImage, callback) {
	var userId = user._id;
	buf = new Buffer(binaryImage.replace(/^data:image\/\w+;base64,/, ""),'base64');
	var params = {
		Key: userId.toString(), 
		Body: buf,
		ContentEncoding: 'base64',
		ContentType: 'image/jpeg',
		ACL: 'public-read'
	};
	s3Bucket.upload(params, function(err, data) {
		if (err) {
		  console.log("Error uploading profile picture: ", err);
		} else {
		  console.log("Successfully uploaded image to AWS");
		  user.profile_picture_url = data.Location;
		}
		callback();
	});
};

/**
 * Transform object with nested keys into object with flat keys to facilitate
 * updates using mongo update with $set operator
 *
 * @param  obj  Object sent from client with updates to document on database
 * @example
 * // returns {'foo': 1, 'bar.fizz.buzz': 2}
 * transformUpdates({foo: 1, bar: {fizz: {buzz: 2}}})
 * @return      Object with flat keys
 */
function transformUpdates(obj) {
	function bar1(prnt, sub_o) {
		if (typeof sub_o !== 'object' || sub_o.constructor === Array)
			return prnt;

		var res = [];

		for (var s_key in sub_o) {
			var egg = bar1(s_key, sub_o[s_key]);

			if (egg.constructor === Array) {
				bar1(s_key, sub_o[s_key]).map(function(path) {
					res.push(prnt + '.' + path);
				});
			}
			else
				res.push(prnt + '.' + bar1(s_key, sub_o[s_key]));
		}

		return res;
	}

	function bar2(path, obj) {
		var cpv = obj[path.split('.').shift()];

		if (typeof cpv !== 'object' || cpv.constructor === Array)
			return cpv;

		var np = path.split('.').splice(1, path.length).join('.');
		return bar2(np, cpv);
	}

	var res = {};

	for (var fld in obj) {
		var val = obj[fld];

		if (typeof val === 'object' && val.constructor !== Array) {
			bar1(fld, val).map(function(path) {
				res[path] = bar2(path, obj);
			});
		}
		else
			res[fld] = val;
	}

	return res;
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
	var updates = [];
	var query, tmp;

	if (req.body.caretaker_info.availability) {
		tmp = req.body.caretaker_info.availability;
		//var update = { $push: { 'caretaker_info.availability': { $each: tmp } } };
		var update = {$set: {'caretaker_info.availability': tmp}};

		updates.push(User.updateAsync({_id: userId}, update));
	}

	delete req.body.caretaker_info.availability;
	updates.push(User.updateAsync({_id: userId}, {$set: transformUpdates(req.body)}));

	Promise.all(updates).then(function() {
		console.log(arguments);
		res.status(200).json({});
	});

	/*console.log(JSON.stringify(updates));

	User.update({_id: userId}, {$set: updates}, function(err) {
		if (err) {
			console.log(err);
			res.status(500).send(err);
		}
		else {
			res.status(200).json({});
		}
	});*/

	/*User.update({ '_id' : userId}, updated_info, function(err) {
		if (err) {
			console.log('err = ' + err);
			return res.status(409).send(err);
		}

		res.status(200).json({});
	});*/
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

exports.getScheduledAvailability = function(req, res) {
	User
	.findOne({_id: req.user._id})
	.select('caretaker_info.availability')
	.exec(function(err, user) {
		if (err) {
			console.log(err);
			res.status(500).json(err);
		}
		else if (!user) {
			res.status(404).json({});
		}
		else {
			var payload = {
				is_available: user.isAvailableSchedule(moment.utc())
			};

			res.status(200).json(payload);
		}
	});
};

exports.getGlobalAvailability = function(req, res) {
	User
	.findOne({_id: req.user._id})
	.select('caretaker_info.global_availability')
	.exec(function(err, user) {
		if (err) {
			console.log(err);
			res.status(500).json(err);
		}
		else if (!user) {
			res.status(404).json({});
		}
		else {
			var payload = {
				is_available: user.isAvailableGlobal()
			};

			res.status(200).json(payload);
		}
	});
};

exports.updateAvailability = function(req, res) {
	var availabilityId = req.params.availability_id;
	req.body._id = availabilityId;

	User
	.update(
		{
			_id: req.user._id,
			'caretaker_info.availability._id': availabilityId
		},
		{$set: {'caretaker_info.availability.$': req.body}},
		function(err, numAffected) {
			if (err) {
				console.log(err);
				res.status(500).json(err);
			}
			else {
				res.status(200).json({});
			}
	});
};

exports.removeAvailability = function(req, res) {
	var availabilityId = req.params.availability_id;

	req.user.caretaker_info.availability.pull({_id: availabilityId});

	req
	.user
	.update(
		{'caretaker_info.availability': req.user.caretaker_info.availability},
		function(err, numAffected) {
			if (err) {
				console.log(err);
				res.status(500).json(err);
			}
			else {
				res.status(204).json({});
			}
	});
};
