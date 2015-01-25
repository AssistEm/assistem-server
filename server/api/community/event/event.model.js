var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/*
 * Schema definition
 */
var eventSchema = new Schema({
	title: String,
	description: String,
	community_id: Schema.Types.ObjectId,
	sibling_events: [Schema.Types.ObjectId],
	time: {
		weeks_to_repeat: Number,
		total_repeats: Number,
		days_of_week: [Number],
		start: Date,
		end: Date
	},
	location: String,
	volunteer: Schema.Types.ObjectId,
	category: String,
	priority: Number
});

module.exports = mongoose.model('Event', eventSchema);
