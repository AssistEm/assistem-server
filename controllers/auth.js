var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/user');

passport.use(new LocalStrategy({
		usernameField: 'email',
	},
	function(email, password, done) {
		User.findOne({ 'login_info.email': email }, function(err, user) {
			if (err) { return done(err); }

			// No user found with that email
			if (!user) { return done(null, false, { message: 'Unknown email ' + email }); }

			// Make sure the password is correct
			user.comparePassword(password, function(err, isMatch) {
				if (err) return done(err);

				// Password did not match
				if(!isMatch) {
					return done(null, false, { message: 'Invalid password' });
				}

				// Success
				return done(null, user);
			});
		});
	}
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});
