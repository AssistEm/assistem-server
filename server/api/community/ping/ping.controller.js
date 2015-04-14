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
// TODO: change to extractUser
function extractUser(group, volunteer) {
	for (var i = 0; i < group.length; i++) {
		if (group[i].app_id.equals(volunteer))
			return group.splice(i, 1).pop();
	}
}


// TODO: change to getUser
function getUser(group, user_id) {
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
function availableUsers(dateOfPing) {
	return function(user) {
		var dayOfWeek;

		// has no registered device
		if (!user.login_info.endpoint_arn) return false;

		// is currently available, regardless of availability times
		if (user.caretaker_info.global_availability) return true;

		var curAvail = user.caretaker_info.availability;

		// has not set availability times
		if (!curAvail) return false;

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
	};
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
		msgs.push(androidApp.sendMessageAsync(group[i].sns_id, payload));
	}

	return Promise.all(msgs);
}


function pingPrimary(ping, payload, res) {
	payload.data.type = 'primary';

	androidApp
	.sendMessageAsync(ping.getPrimary().sns_id, payload)
	.then(function() {
		return ping.removeAsync();
	})
	.then(function(removedPing) {
		res.status(200).json(removedPing);
	})
	.catch(function() {
		res.status(500).json({});
	});
}


function exhaustedAvailable(ping) {
	return ping.no_count + ping.deferred.length === ping.available.length;
}


function pingDeferred(ping, payload, res) {
	ping.available = ping.deferred;
	ping.isDeferred = true;
	ping.deferred = [];
	ping.no_count = 0;

	ping
	.saveAsync()
	.then(function() {
		payload.data.type = 'defer';

		return sendPings(ping.available, payload);
	})
	.then(function() {
		res.status(200).json({});
	})
	.catch(function() {
		res.status(500).json({});
	});
}


//Initiates a ping sent out to all the correct caretakers
exports.initiatePing = function(req, res, next) {
	//if (req.user.type !== 'patient') return res.status(403).json({});

	var pingBody = req.body;

	req
	.community
	.populate('patient primary_caretaker caretakers', function(err, community) {
		if (err) {
			console.log(err);
			res.status(500).json(err);
		}
		else {
			var dateOfPing = pingBody.time ? moment.utc(pingBody.time) : moment.utc();

			availUsers = community.caretakers
				.filter(availableUsers(dateOfPing))
				.map(pingAddress);

			if (availUsers.length === 0) {
				res.status(200).json({});
			}
			else {
				var ping = new Ping({
					title: pingBody.title,
					location: pingBody.location,
					description: pingBody.description,
					time: pingBody.time || moment.utc().toDate(),
					available: availUsers,
					patient: [{
						app_id: community.patient._id,
						sns_id: community.patient.login_info.endpoint_arn
					}],
					primary_caretaker: [{
						app_id: community.primary_caretaker._id,
						sns_id: community.primary_caretaker.login_info.endpoint_arn
					}]
				});

				pingBody.ping_id = ping._id;
				pingBody.patient_name = community.patient.getFullName();


				var payload = {
					data: {
						type: 'request',
						ping: pingBody
					}
				};

				ping
				.saveAsync()
				.then(function() {
					return sendPings(availUsers, payload);
				})
				.then(function() {
					expTime = moment(dateOfPing).add(moment.duration(4, 'hours'));

					req.app.get('agenda').schedule(
						expTime.toDate(), 'expire ping', {pingId: ping._id}
					);

					res.status(200).json({ping_id: ping._id});
				})
				.catch(function() {
					console.log('an error has occured');
					console.log(arguments);
					res.status(500).json({});
				});
			}
		}
	});
};


// Types Of Pings
// --------------
// Caretaker:
// request
// fulfilled
// defer
//
// Patient:
// response
//
// Primary:
// primary
//
// caretaker and patient:
// expired


function cleanPing(ping) {
	var o = {};

	o.title = ping.title;
	o.description = ping.description;
	o.location = ping.location;
	o.time = ping.time;

	return o;
}

//Responds to a ping from the correct caretaker
exports.respondPing = function(req, res, next) {
	var respondeeId = req.user._id;
	var response = req.body.response;

	Ping.findOne({_id: req.params.ping_id}, function(err, ping) {
		if (err) {
			//handleErrors(err, res);
		}
		else if (!ping) {
			console.log('NOT FOUND, ping with id: ' + req.params.ping_id);
			res.status(404).json({});
		}
		else {
			var payload = { data: {type: '', ping: cleanPing(ping)} };

			if (response === PING_RESPONSE.YES) {
				var volunteer = extractUser(ping.available, respondeeId);

				// message group - volunteer that the ping has beeen fulfilled
				payload.data.type = 'fulfilled';
				sendPings(ping.available, payload)
				.then(function() {
				// message patient that the request has been fulfilled
					payload.data.type = 'response';

					return androidApp.sendMessageAsync(ping.getPatient().sns_id, payload);
				})
				.then(function() {
				// remove ping from database
					return ping.removeAsync();
				})
				.then(function(removedPing) {
				// respond to volunteer that they have successfully volunteered
					console.log(removedPing);

					res.status(200).json(removedPing);
				})
				.catch(function() {
					console.log('an error occured while trying to ping group');
					console.log(arguments);

					res.status(500).json({});
				});
			}
			else if (response === PING_RESPONSE.NO || PING_RESPONSE.DEFFER) {
				if (response === PING_RESPONSE.NO)
					ping.no_count += 1;
				else if (response === PING_RESPONSE.DEFFER)
					ping.deferred.push(getUser(ping.available, respondeeId));

				// everybody has replied to ping and no one has chosen YES
				if (exhaustedAvailable(ping)) {
					// some have chosen to defer
					if (ping.deferred.length && !ping.isDeferred) {
						pingDeferred(ping, payload, res);
					}
					// no one has chosen to defer
					else {
						pingPrimary(ping, payload, res);
					}
				}
				// not everybody has responded to ping
				else {
					ping.save(function(err, ping) {
						if (err) {
							console.log(err);
							res.status(500).json({});
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
