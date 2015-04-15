var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Recipient = new Schema({
	app_id: Schema.Types.ObjectId,
	sns_id: String
});

var Ping = new Schema({
	isDeferred: {
		type: Boolean,
		default: false
	},
	title: String,
	description: String,
	location: String,
	time: Date,
	patient: [Recipient],
	primary_caretaker: [Recipient],
	available: [Recipient],
	deferred: [Recipient],
	no_count: {
		type: Number,
		default: 0
	}
});

Ping.methods.getPatient = function(cb) {
	var n = {sns_id: '', app_id: ''};
	return this.patient.length ? this.patient[0] : n;
};

Ping.methods.getPrimary = function(cb) {
	var n = {sns_id: '', app_id: ''};
	return this.primary_caretaker.length ? this.primary_caretaker[0] : n;
};

module.exports = mongoose.model('Ping', Ping);
