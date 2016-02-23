var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/*
 * Schema definition
 */

// sub-document
var listSchema = new Schema({
	title: String,
	description: String,
	quantity: String,
	location: String,
	urgency: Date,
	volunteer: {
		volunteer_id: {
			type: Schema.Types.ObjectId,
			ref: 'User'
		},
		delivery_time: Date
	}
});

// parent document
var grocerySchema = new Schema({
	community_id: {
		type: Schema.Types.ObjectId,
		required: true,
		ref: 'Community'
	},
	item_list: [listSchema]
});

module.exports = mongoose.model('Grocery', grocerySchema);
