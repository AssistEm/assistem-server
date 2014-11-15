var express = require('express');
var passport = require('passport');
var router = express.Router();

router.get('/', ensureAuthenticated, function(req, res) {
  res.send("You are on the community page");
});

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	res.redirect('../user/login')
}

module.exports = router;
