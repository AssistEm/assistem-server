var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var pingedCaretaker = new Schema({
	app_id: Schema.Types.ObjectId,
	sns_id: String
});

var Ping = new Schema({
	available: [pingedCaretaker],
	deffered: [pingedCaretaker],
	no_count: {
		type: Number,
		default: 0
	}
});

module.exports = mongoose.model('Ping', Ping);
