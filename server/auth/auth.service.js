var passport = require('passport');
var jwt = require('jsonwebtoken');
var config = require('../config/environment');

exports.isAuthenticated = passport.authenticate('bearer',
	{session: false}, function(err, user, info) {
																								console.log("jlaskfjlsadkjflsajfldj");
																								console.log(res);
	});

exports.createToken = function(payload) {
	return jwt.sign(payload, config.secrets.token/*, {expiresInMinutes: 60*5}*/);
};
