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
	caretakers: [{
		type: Schema.Types.ObjectId,
		ref: 'User'
	}],
	privacy: {
		type: Boolean,
		required: true
	},
	primary_caretaker: Schema.Types.ObjectId,
	grocery_list_id: Schema.Types.ObjectId
});

module.exports = mongoose.model('Community', communitySchema);
