var User = require('../api/user/user.model');
var Ping = require('../api/community/ping/ping.model');

var SNS = require('sns-mobile');
var secrets = require('../api/community/ping/secrets');
var Promise = require('bluebird');

var androidApp = new SNS({
  platform: SNS.SUPPORTED_PLATFORMS.ANDROID,
  region: 'us-west-2',
  apiVersion: '2010-03-31',
  accessKeyId: secrets.SNS_KEY_ID,
  secretAccessKey: secrets.SNS_ACCESS_KEY,
  platformApplicationArn: secrets.SNS_ANDROID_ARN
});

Promise.promisifyAll(androidApp);

module.exports = function(agenda) {
	agenda.define('reset availability', function(job, done) {
		User.update(
			{_id: job.attrs.data.userId},
			{$set: {'caretaker_info.global_availability': false}}
		)
		.exec(function(err, numAffected) {
			if (err) {
				console.log(err);
			}
			else {
				console.log('Successfully reset global_availability for: ' + job.attrs.data.userId);
			}
		});
	});

	agenda.define('expire ping', function(job, done) {
		Ping.findOneAndRemove(
			{_id: job.attrs.data.pingId}
		)
		.exec(function(err, ping) {
			if (err) {
				console.log(err);
			}
			else {
				var payload = {
					data: {
						type: 'expired',
						ping: {
							title: ping.title,
							description: ping.description,
							location: ping.location,
							time: ping.time,
							ping_id: ping._id
						}
					}
				};

				var msgs = [];

				msgs.push(androidApp.sendMessageAsync(ping.getPatient().sns_id));

				for (var i = 0; i < ping.available.length; i++) {
					msgs.push(
						androidApp.sendMessageAsync(ping.available[i].sns_id, payload)
					);
				}

				Promise.all(msgs).then(function() {
					console.log('deleted expired ping');
				});
			}
		});
	});
};
