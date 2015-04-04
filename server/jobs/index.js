// Jobs
var pingJobs = require('./ping-processing');

// Setup agenda
var agenda = new require('agenda')({
	db: {address: require('../config/environment').mongo.uri}
});

// Setup jobs
pingJobs(agenda);

agenda.start();

module.exports = agenda;
