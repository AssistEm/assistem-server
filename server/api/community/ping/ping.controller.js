var SNS = require('sns-mobile');

//Environment variables to keep the access keys from being plaintext
var SNS_KEY_ID = process.env['SNS_KEY_ID'];  
var SNS_ACCESS_KEY = process.env['SNS_ACCESS_KEY'];
var ANDROID_ARN = process.env['SNS_ANDROID_ARN'];


var androidApp = new SNS({  
  platform: SNS.SUPPORTED_PLATFORMS.ANDROID,
  region: 'us-west-2',
  apiVersion: '2010-03-31',
  accessKeyId: SNS_ACCESS_KEY,
  secretAccessKey: SNS_KEY_ID,
  platformApplicationArn: ANDROID_ARN
});


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


//Registers a mobile client (android)
exports.register = function(req, res, next) {
	var deviceId = req.body.deviceId;

	console.log('Registering android device with id: ' + deviceId);

	androidApp.addUser(deviceId, null, function(err, endpointArn) {
		if (err) {
			console.log(err);
			res.status(500).json(err);
		}
		else {
			req.user.update(
				{$set: {'login_info.endpointArn': endpointArn}},
				function(err, user) {
					if (err) {
						console.log(err);
						res.status(500).json(err);
					}
					else {
						res.end();
					}
				}
			);
		}
	});
};


//Initiates a ping sent out to all the correct caretakers
exports.initiatePing = function(req, res, next) {
	var ping = req.body;

	androidApp.broadcastMessage(ping, function(err) {
		if (err) {
			console.log(err);
			res.status(500).json(err);
		}
		else {
			res.end();
		}
	});
};


//Responds to a ping from the correct caretaker
exports.respondPing = function(req, res, next) {


};
