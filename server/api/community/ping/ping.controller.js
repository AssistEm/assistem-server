var SNS = require('sns-mobile');
var moment = require('moment');
//var secrets = require('./secrets');

var Promise = require('bluebird');

var User = require('../../user/user.model');
Promise.promisifyAll(User);
Promise.promisifyAll(User.prototype);

var Ping = require('./ping.model');
Promise.promisifyAll(Ping);
Promise.promisifyAll(Ping.prototype);

var androidApp = {};

androidApp.sendMessage = function(arn, data, cb) {
	setTimeout(function() {
		if (data === null)
			cb('error', null);
		console.log('Sending message to arn: ' + arn);
		console.log('\nWith data payload: ' + JSON.stringify(data));
		cb(null, 'message from function mock');
	}, 1000);
};

/*var androidApp = new SNS({
  platform: SNS.SUPPORTED_PLATFORMS.ANDROID,
  region: 'us-west-2',
  apiVersion: '2010-03-31',
  accessKeyId: secrets.SNS_KEY_ID,
  secretAccessKey: secrets.SNS_ACCESS_KEY,
  platformApplicationArn: secrets.SNS_ANDROID_ARN
});*/


// Handle user added events
/*androidApp.on('userAdded', function(endpointArn, deviceId) {
	console.log(
		'Successfully added device with deviceId: ' + deviceId +
		'\nEndpoint for user is: ' + endpointArn
	);
});*/


// Handle single/multiple messages fail in a broadcast
/*androidApp.on('sendFailed', function(endpointArn, err) {
	console.log(
		'Failed to send message for endpoint: ' + endpointArn +
		'\nError returned: ' + err
	);
});*/


//Registers a mobile client (android)
exports.register = function(req, res, next) {
	var deviceId = req.body.deviceId;
	console.log(deviceId);

	console.log('Registering android device with id: ' + deviceId);

	androidApp.addUser(deviceId, null, function(err, endpointArn) {
		if (err) {
			console.log(err);
			res.status(500).json(err);
		}
		else {
			req.user.update(
				{$set: {'login_info.endpoint_arn': endpointArn}},
				function(err, user) {
					if (err) {
						console.log(err);
						res.status(500).json(err);
					}
					else {
						console.log(endpointArn);
						console.log(user);
						res.end();
					}
				}
			);
		}
	});
};


//Initiates a ping sent out to all the correct caretakers
exports.initiatePing = function(req, res, next) {
	var pingBody = req.body;
	var dateOfPing = pingBody.time ? moment(pingBody.time) : moment();
	var day = dateOfPing.day();


	User.find({_id: {$in: req.community.caretakers}}).exec(function(err, users) {
		if (err) {
			console.log(err);
			res.json(err);
		}
		else {
			availUsers = users.filter(function(user) {
				var curAvail = user.caretaker_info.availability;

				if (!curAvail) return false;

				for (var i = 0; i < curAvail.length; i++) {
					var av = curAvail[i];

					var avsm = moment(av.start.time);
					var avem = moment(av.end.time);

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
					var DayBool = av.start.day_of_week >= day && av.end.day_of_week <= day;
					//var endDayBool = av.end.day_of_week <= day;

					if (timeBool && DayBool) return true;
				}

				return false;
			})
			.map(function(user) {
				return {app_id: user._id, sns_id: user.login_info.endpoint_arn};
			});

			if (availUsers.length === 0) {
				console.log('pinging regular guy');
				res.end();
				// ping regular guy
			}
			else {
				console.log('Ping, available users: ' + JSON.stringify(availUsers));
				var ping = new Ping({available: availUsers});

				ping.save(function(err, group) {
					if (err) {
						console.log(err);
						next(err);
					}
					else {
						var payload = {
							data: {
								message: pingBody,
								group_id: group._id
							}
						};

						for (var i = 0; i < availUsers.length; i++) {
							androidApp.sendMessage(availUsers[i].sns_id, payload, function(err, msgId) {
								if (err) {
									console.log(msgId);
									console.log(err);
								}
								else {
									console.log('Message successfully sent, to:');
									console.log(msgId);
								}
							});
						}

						res.send(group._id);
					}
				});
			}
		}
	});
};


sendMessageAsync = Promise.promisify(androidApp.sendMessage);


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


function sendPings(group, payload) {
	var msgs = [];

	for (var i = 0; i < group.available.length; i++) {
		msgs.push(sendMessageAsync(group.available[i].sns_id, payload));
	}

	return Promise.all(msgs);
}


//Responds to a ping from the correct caretaker
exports.respondPing = function(req, res, next) {
	var userId = req.user._id;
	var response = req.body.response;

	var YES = 1,
			NO = 2,
			DEFFER = 3; 

	Ping.findOne({_id: req.params.ping_id}, function(err, group) {
		if (err) {
			handleErrors(err, res);
		}
		else if (!group) {
			console.log('NOT FOUND, ping with id: ' + req.params.ping_id);
			res.end();
		}
		else {
			var payload = { data: { message: '' } };

			if (response === YES) {
				payload.message = 'Someone has volunteered';
				var volunteer = extractVolunteer(group.available, userId);

				sendPings(group, payload)
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

				res.end();
			}
			else if (response === NO || DEFFER) {
				console.log('picked DEFFER or NO');

				if (response === NO)
					group.no_count += 1;
				else if (response === DEFFER)
					group.deffered.push(searchForUser(group.available, userId));

				if (group.no_count + group.deffered.length === group.available.length) {
					if (group.deffered.length) {
						group.available = group.deffered;
						group.deffered = [];
						group.no_count = 0;

						group
						.saveAsync()
						.then(function() {
							payload.message = 'Second attempt ping';
							return sendPings(group, payload);
						})
						.then(function() {
							console.log('finished sending second attempt ping');
							res.end();
						})
						.catch(function() {
							console.log('Error, something whent wrong when sending second ping');
						});
					}
					else { // if no one deffered
						// send to regular guy
						console.log('sending regular guy ping');
					}
				}
				else { // if not everyone has responded
					group.save(function(err, group) {
						if (err) {
							console.log(err);
							res.status(500).json(err);
						}
						else {
							res.end();
						}
					});
				}
			}
			/*else if (response === DEFFER) {
				console.log('picked DEFFER');
				res.end();
			}*/
		}
	});
};
