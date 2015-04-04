var User = require('../api/user/user.model');

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
};
