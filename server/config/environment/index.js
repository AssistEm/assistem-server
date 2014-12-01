var path = require('path');

module.exports = {
	root: path.normalize(__dirname + '/../../..'),

	secrets: {
		token: 'C8E11EB0F3D9EA9BE691A4AA7B2EF02947A6C0171F006EDFB04CB419A1F11ADD'
	},

	port: process.env.PORT || 80,

	mongo: {
		uri: 'mongodb://localhost/ct1'
	}
};
