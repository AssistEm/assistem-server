var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/*
 * Schema definition
 */
var communitySchema = new Schema({
	name: {
		type: String,
		required: true,
		unique: true
	},
	patient: {
		type: Schema.Types.ObjectId,
		required: true
	},
	caretakers: [Schema.Types.ObjectId],
	privacy: {
		type: Boolean,
		required: true
	},
	grocery_list_id: Schema.Types.ObjectId
});

module.exports = mongoose.model('Community', communitySchema);
