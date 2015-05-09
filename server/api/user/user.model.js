var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var Schema = mongoose.Schema;
var validate = require('mongoose-validator');
var isPhone = require('is-phone'); // simple library, maybe build custom or use better later
var moment = require('moment');

/*
 * Validations
 */
var emailValidator = [
	validate({
		validator: 'isEmail',
		message: 'Email entered must be valid'
	})
];

var phoneValidator = [
	validate({
		validator: function(val) {
			return isPhone(val);
		},
		message: 'Phone number entered must be valid'
	})
];

var passwordValidator = [
	validate({
		validator: 'isLength',
		arguments: [6, 12],
		message: 'Password must be of length 6 - 12'
	}),
	validate({
		validator: 'isAlphanumeric',
		message: 'Password may only contain alpha numeric values'
	})
];

/*
 * Schema
 */
var UserSchema = new Schema({
	first_name: String,
	last_name: String,
	type: {
		type: String,
		required: true
	},
	phone: {
		type: String,
		required: true,
		validate: phoneValidator
	},

	login_info: {
		email: {
			type: String,
			required: true,
			unique: true,
			validate: emailValidator
		},
		password: {
			type: String,
			required: true,
			validate: passwordValidator
		},
		facebook_token: String,
		endpoint_arn: String
	},

	patient_info: {
		community_id: Schema.Types.ObjectId,
		illness_description: String,
		emergency_contacts: [Number],
	},

	caretaker_info: {
		communities: [Schema.Types.ObjectId],
		global_availability: {
			type: Boolean,
			default: false
		},
		availability: [{
			start: {
				day_of_week: Number,
				time: Date
			},
			end:{
				day_of_week: Number,
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
 * Virtuals
 */
UserSchema.virtual('email').set(function(email) {
	this.login_info.email = email;
});

UserSchema.virtual('password').set(function(password) {
	this.login_info.password = password;
});

/*
 * Pre-save hook
 */
UserSchema.pre('save', function(next) {
	var user = this;

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

/**
 * Verifies the client passed the correct password for the user
 *
 * @param  password  The password to check
 * @param  callback  The callback function that will be called after this
 * @return           The return of the callback function
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

UserSchema.methods.getFullName = function() {
	return this.first_name + ' ' + this.last_name;
};


UserSchema.methods.getPhone = function() {
	return this.phone;
};

UserSchema.methods.isAvailableGlobal = function(dateOfPing) {
	return this.caretaker_info.global_availability;
};

UserSchema.methods.isAvailableSchedule = function(dateOfPing) {
	var dayOfWeek;

	var curAvail = this.caretaker_info.availability;

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

UserSchema.methods.isAvailable = function(dateOfPing) {
	// has no registered device
	if (!this.login_info.endpoint_arn) return false;

	return this.isAvailableGlobal() || this.isAvailableSchedule(dateOfPing);
};

module.exports = mongoose.model('User', UserSchema);
