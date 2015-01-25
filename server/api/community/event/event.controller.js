var Event = require('./event.model');
var _ = require('lodash');

exports.index = function(req, res) {
	var date = new Date();
	var month = undefined;
	var day = undefined; 
	var weekOffset = 0;

	if (req.query) {
		if (req.query.month && req.query.day) {
			month = req.query.month - 1;
			day = req.query.day;

			date.setMonth(month, day); // 
		}

		if (req.query.week) {
			weekOffset = 7 * req.query.week;
		}
	}

	if (!month || !day) {
		month = date.getMonth();
		day = date.getDate();
	}

	var dayOffset = date.getDay();
	var sunday = new Date();

	var currentSunday = day - dayOffset;
	var newSunday = currentSunday + weekOffset;

	sunday.setMonth(month, newSunday);

	var saturday = new Date();
	saturday.setMonth(sunday.getMonth(), sunday.getDate() + 6);

	sunday.setMonth(4, 2);
	sunday.setFullYear(2015);
	sunday.setHours(0, 0);

	saturday.setHours(23, 59);

	console.log(sunday);
	console.log(saturday);

	Event.find({community_id: req.community._id})
		.where('time.start').gte(sunday).lte(saturday)
		.where('time.end').gte(sunday).lte(saturday)
		.exec(function(err, events) {
			console.log(events);
			res.send(events);
		});
};

exports.create = function(req, res) {
	var newEvent = null;
	var prev = _.merge({}, req.body);
	prev.time.start = new Date(prev.time.start);
	prev.time.end = new Date(prev.time.end);

	var events = [];
	var weeks_to_repeat = req.body.time.weeks_to_repeat;
	var days_of_week = req.body.time.days_of_week;

	for (var i = 0; i <= weeks_to_repeat; i++) {
		for (var j = 0; j < days_of_week.length; j++) {
			newEvent = _.merge({}, prev, function(a, b) {
				return _.isDate(b) ? new Date(b.toISOString()) : undefined;
			});

			newEvent.community_id = req.community._id;

			newEvent.time.start.setDate(newEvent.time.start.getDate() -
					(newEvent.time.start.getDay() - days_of_week[j]));

			newEvent.time.end.setDate(newEvent.time.end.getDate() -
					(newEvent.time.end.getDay() - days_of_week[j]));

			events.push(newEvent);

		}
		prev = _.merge({}, newEvent, function(a, b) {
			return _.isDate(b) ? new Date(b.toISOString()) : undefined;
		});

		prev.time.start.setDate(prev.time.start.getDate() + (7 * (i + 1)));
		prev.time.end.setDate(prev.time.end.getDate() + (7 * (i + 1)));
	}

	Event.collection.insert(events, function(err, docs) {
		if (err) {
			console.log(err);
		} else {
			console.log("events saved");
			console.log(docs);

			for (var i = 0; i < docs.length; i++) {
				var curEvent = docs[0];
				curEvent.sibling_events = [];

				for (var j = 0; j < docs.length; j++) {
					curEvent.sibling_events.push(docs[j]);
				}
			}
		}
	});
};

exports.update = function(req, res) {
};

exports.delete = function(req, res) {
};
