var jwt = require('jsonwebtoken');
var passport = require('passport');
var BearerStrategy = require('passport-http-bearer').Strategy;

exports.setup = function(User, config) {
	passport.use(new BearerStrategy(
		function(token, done) {
			jwt.verify(token, config.secrets.token, function(err, decoded) {
				if (err) {
					return done(err);
				}

				User.findById(decoded._id, function(err, user) {
					if (err) {
						return done(err);
					}

					if (!user) {
						return done(null, false);
					}

					return done(null, user);
				});
			});
		}
	));
};
