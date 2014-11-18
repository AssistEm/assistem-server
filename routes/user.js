var express = require('express');
var passport = require('passport');
var router = express.Router();

var User = require('../models/user.js');

router.get('/register', function(req, res) {
  res.render('register');
});

router.post('/register', function(req, res) {
	var type = req.body.type;

	var first_name = req.body.first_name;
	var last_name = req.body.last_name;
	var phone = req.body.phone;
	var email = req.body.email;
	var password = req.body.password;

	var user = new User({
		first_name: first_name,
		last_name: last_name,
		phone: phone,
		type: type,

		login_info: {
			email: email,
			password: password,
		}
	});

	console.log(user);

	user.save(function(err) {
		if(err) {
			res.send(err);
		} else {
			res.redirect('login');
		}
	});
});

router.get('/login', function(req, res, next) {
	res.render('login');
});

router.post('/login', function(req, res, next) {
	passport.authenticate('local', function(err, user, info) {
		if (err) { return next(err) }
		if (!user) {
			req.session.messages =  [info.message];
			return res.redirect('login');
		}
		req.logIn(user, function(err) {
			if (err) { return next(err); }
			return res.redirect('restricted');
		});
	})(req, res, next);
});

router.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});

router.get('/settings', ensureAuthenticated, function(req, res, next) {
	res.render('settings', {user: req.user});
});

router.post('/settings', ensureAuthenticated, function(req, res, next) {
	var first_name = req.body.first_name;
	var last_name = req.body.last_name;
	var phone = req.body.phone;
	var email = req.body.email;
	var password = req.body.password;

	req.user.set('first_name', first_name);
	req.user.set('last_name', last_name);
	req.user.set('phone', phone);
	req.user.set('email', email);
	req.user.set('password', password);


	console.log(req.user);
	req.user.save();
	res.render('home', {user: req.user});

});

router.get('/restricted', ensureAuthenticated, function(req, res, next) {
	res.render('home', {user: req.user});
});

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
console.log("not loged in");
	res.redirect('login')
}

module.exports = router;
