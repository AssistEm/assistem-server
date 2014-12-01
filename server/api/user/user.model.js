var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
	first_name: String,
	last_name: String,
	type: String,
	phone: String,

	login_info: {
		email: String,
		password: String,
		facebook_token: String,
	},

	patient_info: {
		community_id: Schema.Types.ObjectId,
		illness_description: String,
		emergency_contacts: [Number],
	},

	caretaker_info: {
		communities: [Schema.Types.ObjectId],
		availability: [{
			start: {
				day_of_week: String,
				time: Date
			},
			end:{
				day_of_week: String,
				time: Date
			}
		}],
		reminders: {
			new_event: Boolean,
			reminder_event: Boolean
		}
	}
});

/*
 * Pre-save hook
 */

UserSchema.pre('save', function(next) {
	var user = this;

	if(!user.isModified('login_info.password')) {
		return next();
	}

	bcrypt.genSalt(10, function(err, salt) {
		if (err) {
			return next(err);
		}

		var password = user.login_info.password;
		bcrypt.hash(password, salt, function(err, hash) {
			if (err) {
				return next(err);
			}

			user.login_info.password = hash;
			next();
		});
	});
});

/*
 * Methods
 */

UserSchema.methods.verifyPassword = function(password, callback) {
	var hash = this.login_info.password;

	bcrypt.compare(password, hash, function(err, res) {
		if (err) {
			return callback(err);
		}

		return callback(null, res);
	});
};

module.exports = mongoose.model('User', UserSchema);
