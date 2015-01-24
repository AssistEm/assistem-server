var Event = require('./event.model');
var _ = require('lodash');

exports.index = function(req, res) {
	var date = new Date();
	var month = undefined;
	var day = undefined; 
	var weekOffset = 0;

	console.log(req.query);

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

	var prev = _.merge(new Event(), req.body, function(a, b) {
		return _.isArray(a) ? a.concat(b) : undefined;
	});
	var newEvent = null;
	//console.log(prev);

	var events = [];
	var weeks_to_repeat = req.body.time.weeks_to_repeat;
	var days_of_week = req.body.time.days_of_week;

	for (var i = 0; i < weeks_to_repeat; i++) {
		for (var j = 0; j < days_of_week.length; j++) {
			newEvent = _.clone(prev, true);
			/*newEvent = _.merge(new Event(), prev, function(a, b) {
				return _.isArray(a) ? a.concat(b) : undefined;
			});*/
			newEvent.community_id = req.community._id;

			newEvent.time.start.setDate(newEvent.time.start.getDate() -
					(newEvent.time.start.getDay() - days_of_week[j]));

			newEvent.time.end.setDate(newEvent.time.end.getDate() -
					(newEvent.time.end.getDay() - days_of_week[j]));

			events.push(newEvent);
		}

		newEvent.time.start.setDate(newEvent.time.start.getDate() + (7 * i));
		newEvent.time.end.setDate(newEvent.time.end.getDate() + (7 * i));
		prev = newEvent;
	}

	console.log(events);
	Event.collection.insert(events, function() {
		console.log("saved events");
	});
};

exports.update = function(req, res) {
};

exports.delete = function(req, res) {
};
