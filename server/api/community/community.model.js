var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * The Community Schema Definition
 */
var communitySchema = new Schema({
	name: {
		type: String,
		required: true,
		unique: true
	},
	patient: {
		type: Schema.Types.ObjectId,
		required: true,
		ref: 'User'
	},
	caretakers: [{
		type: Schema.Types.ObjectId,
		ref: 'User'
	}],
	privacy: {
		type: Boolean,
		required: true
	},
	primary_caretaker: {
		type: Schema.Types.ObjectId,
		ref: 'User'
	},
	grocery_list_id: Schema.Types.ObjectId
});

module.exports = mongoose.model('Community', communitySchema);
