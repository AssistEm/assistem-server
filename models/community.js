var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var communitySchema = new Schema({
	name: String,
	patient: Schema.Types.ObjectId,
	caretakers: [Schema.Types.ObjectId],
	privacy: Boolean
});

module.exports = mongoose.model('community', communitySchema);
