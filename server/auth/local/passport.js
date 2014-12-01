var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

exports.setup = function(User, config) {
	passport.use(new LocalStrategy({
		usernameField: 'email'
		}, function(email, password, done) {
			User.findOne({
				'login_info.email': email
			}, function(err, user) {
				if (err) {
					return done(err);
				}

				if (!user) {
					return done(null, false, {message: 'incorrect username'});
				}

				user.verifyPassword(password, function(err, res) {
					if (err) {
						return done(err);
					}

					if (!res) {
						return done(null, false, {message: 'incorrect password'});
					}

					return done(null, user);
				});
			});
		}
	));
};
