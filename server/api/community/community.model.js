var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/*
 * Schema definition
 */
var communitySchema = new Schema({
	name: {
		type: String,
		required: true
	},
	patient: {
		type: Schema.Types.ObjectId,
		required: true
	},
	caretakers: [Schema.Types.ObjectId],
	privacy: {
		type: Boolean,
		required: true
	}
});

module.exports = mongoose.model('Community', communitySchema);
