var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/*
 * Schema definition
 */
var eventSchema = new Schema({
	title: String,
	description: String,
	community_id: Schema.Types.ObjectId,
	group_id: Schema.Types.ObjectId,
	time: {
		weeks_to_repeat: Number,
		total_repeats: Number,
		days_of_week: [Number],
		start: Date,
		end: Date
	},
	location: String,
	volunteer: {
		type: Schema.Types.ObjectId,
		ref: 'User'
	},
	category: String,
	priority: Number
});

/*
 * Schema Virtuals
 * root.{start_time, end_time, days_of_week, weeks_to_repeat}
 */

// Both parameters st and et passed as ISO 8601 formated string in UTC

eventSchema.virtual('start_time').set(function(st) {
	this.time.start = new Date(st);
});

eventSchema.virtual('end_time').set(function(et) {
	this.time.end = new Date(et);
});

eventSchema.virtual('days_of_week').set(function(dw) {
	this.time.days_of_week = dw;
});

eventSchema.virtual('weeks_to_repeat').set(function(wr) {
	this.time.weeks_to_repeat = wr;
});

eventSchema.virtual('start_time').get(function() {
	return this.time.start;
});

eventSchema.virtual('end_time').get(function() {
	return this.time.end;
});

module.exports = mongoose.model('Event', eventSchema);
