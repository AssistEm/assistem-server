var errors = require('./components/errors');
var config = require('./config/environment');

module.exports = function(app) {
	app.use('/api/user', require('./api/user'));
	app.use('/api/communities', require('./api/community'));

	app.use('/auth', require('./auth'));

	app.route('/:url(api|auth|components|app|bower_components|assets)/*')
		.get(errors[404]);

	app.route('/*')
		.get(function(req, res) {
			res.sendFile(app.get('appPath') + '/index.html', {root: config.root});
		});
};
