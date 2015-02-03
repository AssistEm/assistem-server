var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var eventGroupSchema = Schema({
	events: [Schema.Types.ObjectId]
});

module.exports = mongoose.model('eventGroup', eventGroupSchema);
