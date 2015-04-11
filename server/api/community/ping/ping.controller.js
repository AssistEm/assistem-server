var SNS = require('sns-mobile');
var moment = require('moment');
var secrets = require('./secrets');
var Promise = require('bluebird');

var User = require('../../user/user.model');
Promise.promisifyAll(User);
Promise.promisifyAll(User.prototype);

var Ping = require('./ping.model');
Promise.promisifyAll(Ping);
Promise.promisifyAll(Ping.prototype);

/**
 * Enum for a ping response
 * @readonly
 * @enum {Number}
 */
var PING_RESPONSE = {
	YES: 1,
	NO: 2,
	DEFFER: 3
};

var androidApp = new SNS({
  platform: SNS.SUPPORTED_PLATFORMS.ANDROID,
  region: 'us-west-2',
  apiVersion: '2010-03-31',
  accessKeyId: secrets.SNS_KEY_ID,
  secretAccessKey: secrets.SNS_ACCESS_KEY,
  platformApplicationArn: secrets.SNS_ANDROID_ARN
});

Promise.promisifyAll(androidApp);

// Handle user added events
androidApp.on('userAdded', function(endpointArn, deviceId) {
	console.log(
		'Successfully added device with deviceId: ' + deviceId +
		'\nEndpoint for user is: ' + endpointArn
	);
});


// Handle single/multiple messages fail in a broadcast
androidApp.on('sendFailed', function(endpointArn, err) {
	console.log(
		'Failed to send message for endpoint: ' + endpointArn +
		'\nError returned: ' + err
	);
});


// helper functions
function extractVolunteer(group, volunteer) {
	for (var i = 0; i < group.length; i++) {
		if (group[i].app_id.equals(volunteer))
			return group.splice(i, 1).pop();
	}
}


function searchForUser(group, user_id) {
	for (var i = 0; i < group.length; i++) {
		if (group[i].app_id.equals(user_id))
			return group[i];
	}
}


/*
 * Check a users availability based on their settings.
 * @param {String} ping An ISO 8601 UTC formatted string
 * @param user an object returned from mongoose js
 */
function availableUsers(ping, user) {
	var dateOfPing,
			dayOfWeek;

	// has no registered device
	if (!user.login_info.endpoint_arn) return false;

	// is currently available, regardless of availability times
	if (user.caretaker_info.global_availability) return true;

	var curAvail = user.caretaker_info.availability;

	// has not set availability times
	if (!curAvail) return false;

	dateOfPing = pingBody.time ? moment(pingBody.time) : moment();
	dayOfWeek = dateOfPing.day();

	for (var i = 0; i < curAvail.length; i++) {
		var av = curAvail[i];

		var avsm = moment.utc(av.start.time);
		var avem = moment.utc(av.end.time);

		var startBool;
		var endBool;

		if (avsm.hour() < dateOfPing.hour())
			startBool = true;
		else if (avsm.hour() === dateOfPing.hour() && avsm.minute() <= dateOfPing.minute())
			startBool = true;
		else
			startBool = false;

		if (avem.hour() > dateOfPing.hour())
			endBool = true;
		else if (avem.hour() === dateOfPing.hour() && avem.minute() >= dateOfPing.minute())
			endBool = true;
		else
			endBool = false;

		var timeBool = startBool && endBool;
		var DayBool = av.start.day_of_week >= dayOfWeek && av.end.day_of_week <= dayOfWeek;

		if (timeBool && DayBool) return true;
	}

	return false;
}


/**
 * Maps a user object into smaller object with required info to ping devices
 * @param user an object returned from mongoose js
 */
function pingAddress(user) {
	return {app_id: user._id, sns_id: user.login_info.endpoint_arn};
}


/**
 * Asynchronously send messages to group of caretakers
 * @param group array of objects with field 'sns_id' as amazon aws sns arn
 * @param payload object being sent as JSON to caretakers as ping response
 * @param payload.message string human readable message sent to each caretaker
 * @returns {Array} an array of promises to send message to caretakers
 */
function sendPings(group, payload) {
	var msgs = [];

	for (var i = 0; i < group.length; i++) {
		msgs.push(sendMessageAsync(group[i].sns_id, payload));
	}

	return Promise.all(msgs);
}


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


//Initiates a ping sent out to all the correct caretakers
exports.initiatePing = function(req, res, next) {
	// TODO: only patients can ping

	var pingBody = req.body;

	req
	.community
	.populate('patient caretakers', function(err, community) {
		if (err) {
			console.log(err);
			res.status(500).json(err);
		}
		else {
			availUsers = community.caretakers
				.filter(availableUsers)
				.map(pingAddress);

			if (availUsers.length === 0) {
				console.log('pinging regular guy');
				res.status(200).json({});
			}
			else {
				var ping = new Ping({available: availUsers});

				pingBody.ping_id = ping._id;
				pingBody.patient_name = community.patient.first_name + ' ' + community.patient.last_name;

				var payload = {
					data: {
						type: 'request',
						ping: pingBody
					}
				};

				ping
				.saveAsync()
				.then(function() {
					console.log('pinging available');
					return sendPings(availUsers, payload);
				})
				.then(function() {
					console.log('returning ping id');
					res.status(200).json({ping_id: ping._id});
				})
				.catch(function() {
					console.log('an error has occured');
					console.log(arguments);
					res.status(500).json(arguments);
				});
			}
		}
	});
};


//Responds to a ping from the correct caretaker
exports.respondPing = function(req, res, next) {
	var userId = req.user._id;
	var response = req.body.response;

	Ping.findOne({_id: req.params.ping_id}, function(err, group) {
		if (err) {
			handleErrors(err, res);
		}
		else if (!group) {
			console.log('NOT FOUND, ping with id: ' + req.params.ping_id);
			res.status(404).json({});
		}
		else {
			console.log('picked YES');
			var payload = { data: { message: '' } };

			if (response === PING_RESPONSE.YES) {
				payload.message = 'Someone has volunteered';
				var volunteer = extractVolunteer(group.available, userId);

				sendPings(group.available, payload)
				.then(function() {
					payload.message = 'You have successfully volunteered';
					return sendMessageAsync(volunteer.sns_id, payload);
				})
				.then(function() {
					console.log('pings sent to group successfully');
					//group.remove();
				})
				.catch(function() {
					console.log('an error occured while trying to ping group');
				});

				res.status(200).json({});
			}
			else if (response === PING_RESPONSE.NO || PING_RESPONSE.DEFFER) {
				console.log('picked DEFFER or NO');

				if (response === PING_RESPONSE.NO)
					group.no_count += 1;
				else if (response === PING_RESPONSE.DEFFER)
					group.deferred.push(searchForUser(group.available, userId));

				// everybody has replied to ping and no one has chosen YES
				if (group.no_count + group.deferred.length === group.available.length) {
					// some have chosen to defer
					if (group.deferred.length) {
						group.available = group.deferred;
						group.deferred = [];
						group.no_count = 0;

						group
						.saveAsync()
						.then(function() {
							payload.message = 'No one was available on initial ping. Are you available now?';
							return sendPings(group, payload);
						})
						.then(function() {
							console.log('finished sending second attempt ping');
							res.status(200).json({});
						})
						.catch(function() {
							console.log('Error, something whent wrong when sending second attempt ping');
						});
					}
					// no one has chosen to defer
					else {
						// send to regular guy
						console.log('sending regular guy ping');
					}
				}
				// not everybody has responded to ping
				else {
					group.save(function(err, group) {
						if (err) {
							console.log(err);
							res.status(500).json(err);
						}
						else {
							res.status(200).json({});
						}
					});
				}
			}
		}
	});
};
