var Event = require('./event.model');
var EventGroup = require('./event.group.model');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');

exports.index = function(req, res) {
	var date = new Date();
	var month, day;
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
	var b = req.body;
	var newEvent = null;

	// add community id
	b.community_id = req.community._id;

	// assuming have either single or repeated event
	// single: only on one date
	// repeated-one: same event, same time, repeated multiple times on same week
	// repeated-more-than-one: similar to repeated-one except for more than one week

		// repeated-one:
		// bs: should have option to repeat same event, same time of day, on seperate
		// days of the SAME week, i.e. not repeated beyond week of first occurance

	if (b.days_of_week) {
		var group = new EventGroup();
		b.group_id = group._id;
		var events = [];

		for (var i = 0; i < b.days_of_week.length; i++) {
			var day = b.days_of_week[i];

			// create new event plain javascript object from req.body
			newEvent = _.merge({}, b);

			// modify dates accordingly
			newEvent.start_time = moment(b.start_time).day(day).toDate();
			newEvent.end_time = moment(b.end_time).day(day).toDate();

			// push to events array
			events.push(newEvent);
		}

		if (b.weeks_to_repeat) {
			var repeatedWeeks = [];

			for (var j = 1; j <= b.weeks_to_repeat; j++) {
				events.forEach(function(day) {
					newEvent = _.merge({}, day, function(a, b) {
						return _.isDate(b) ? moment(b).add(j, 'w').toDate() : undefined;
					});

					repeatedWeeks.push(newEvent);
				});
			}

			events = events.concat(repeatedWeeks);
		}

		Event.create(events, function(err) {
			if (err) {
				next(err);
			}

			var docs = Array.prototype.slice.call(arguments, 1);
			docs = docs.sort();

			// create new group
			group.events = [];

			// add each eventId to group
			for (var i = 0; i < docs.length; i++) {
				group.events.push(docs[i]._id);
			}

			// save group to db
			group.save(function(err, group) {
				if (err) {
					next(err);
				}

				res.send(docs);
			});
		});
	} else {
		// create new single event
		newEvent = new Event(b);

		// save single event
		newEvent.save(function(err, newEvent) {
			if (err) {
				next(err);
			}

			res.send([newEvent]);
		});
	}
};

exports.update = function(req, res) {
	// update single event, single event from repeated, 
	//
	// update single event or event from group
	// single: just update single event
	// group: either update all in group, selected event and newer, only selected
	// event (in which case we remove from group)

	var b = req.body;

	if ('volunteer' in b) {
		res.send({msg: "added user to volunteer"});
	}

	// b should have event doing update on

	Event.findOne({_id: req.params.id}, function(err, event) {
		if (err) {
			next(err);
		} else if (!event) {
			res.status(404).json(err);
		}

		if (event.group_id) {
			// group event
			var conditions = {
				group_id: event.group_id,
				'time.start': { $gte: moment(event.time.start).toDate() }
			};

			var updates = {}; //_.clone({}, b);
			console.log(updates);

			var updatedEvents = [];
			Event.find(conditions, function(err, events) {
				if (err) {
					next(err);
				}

				for (var i = 0; i < events.length; i++) {
					updatedEvents.push(Event.update({_id: events[i]._id}, updates).exec());
				}

				Promise.all(updatedEvents).then(function() {
					res.send(events);
				});
			});

			/*
			var conditions = {
				group_id: event.group_id,
				'time.start': { $gte: moment(event.time.start).toDate() }
			};

			var update = {
			};

			Event.update({
				group_id: event.group_id,
				'time.start': { $gte: moment(event.time.start).toDate() }
				},
				{ thingsToUpdate },
				{ multi: true }

			Event.find({group_id: event.group_id})
				.where('time.start').gte().lte()
				.exec(function(err, events) {
				});
			*/

		} else {
			// single event
			for (var property in b) {
				if (b.hasOwnProperty(property)) {
					event[property] = b[property];
				}
			}

			event.save(function(err, event) {
				if (err) {
					next(err);
				}

				res.send(event);
			});
		}
	});
};

exports.delete = function(req, res) {
};
