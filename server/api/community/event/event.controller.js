var Event = require('./event.model');
var EventGroup = require('./event.group.model');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');

exports.index = function(req, res) {
	// var date = new Date();
	// var month, day;
	// var weekOffset = 0;
	// var currentYear = date.getFullYear();
	var current_month = moment().get('month');
	var focused_month;

	if (req.query) {
		if(req.query.month) {
			month = req.query.month;
			offset = current_month + Number(month);
			focused_month = moment().set('month', current_month + offset - 1);
		}

		// if (req.query.month && req.query.day) {
		// 	month = req.query.month - 1;
		// 	day = req.query.day;

		// 	date.setMonth(month, day); // 
		// }

		// if (req.query.week) {
		// 	weekOffset = 7 * req.query.week;
		// }
	}

	var first_day = moment(focused_month).startOf('month').toDate();
	var last_day = moment(focused_month).endOf('month').toDate();

	Event.find({community_id: req.community._id})
			.where('time.start').gte(first_day).lte(last_day)
			.where('time.end').gte(first_day).lte(last_day)
			.populate('volunteer')
			.exec(function(err, events) {
				if(err){
					return next(err);
				}
				else{
					console.log(events);
					res.status.json(events);	
				}	
			});



	// if (!month || !day) {
	// 	month = date.getMonth();
	// 	day = date.getDate();
	// }

	// var dayOffset = date.getDay();
	// var sunday = new Date();

	// var currentSunday = day - dayOffset;
	// var newSunday = currentSunday + weekOffset;

	// sunday.setMonth(month, newSunday);

	// var saturday = new Date();
	// saturday.setMonth(sunday.getMonth(), sunday.getDate() + 6);

	// sunday.setMonth(4, 2);
	// sunday.setFullYear(2015);
	// sunday.setHours(0, 0);

	// saturday.setHours(23, 59);

	// console.log(sunday);
	// console.log(saturday);

	// Event.find({community_id: req.community._id})
	// 	.where('time.start').gte(sunday).lte(saturday)
	// 	.where('time.end').gte(sunday).lte(saturday)
	// 	.exec(function(err, events) {
	// 		console.log(events);
	// 		res.send(events);
	// 	});
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

				res.json(docs);
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

			res.json([newEvent]);
		});
	}
};

// update single event or event from group
// single: just update single event
// group: either update all in group, selected event and newer, only selected
// event (in which case we remove from group)
exports.update = function(req, res) {
	var b = _.clone(req.body, true);

	Event.findOne({_id: req.params.event_id}, function(err, event) {
		if (err) {
			next(err);
		}
		else if (!event) {
			res.status(404).json(err);
		}

		if (event.group_id) {
			// group event
			var conditions = {
				group_id: event.group_id,
				'time.start': { $gte: moment(event.time.start).toDate() }
			};

			var newTimes = [];

			if (b.start_time || b.end_time) {

				if (b.start_time) {
					var oldStart = moment(event.time.start);
					var newStart = moment(b.start_time);

					var startDur = moment.duration(newStart.diff(oldStart));

					newTimes.push({type: 'start_time', dur: startDur, path: 'start'});
				}
				if (b.end_time) {
					var oldEnd = moment(event.time.end);
					var newEnd = moment(b.end_time);

					var endDur = moment.duration(newEnd.diff(oldEnd));

					newTimes.push({type: 'end_time', dur: endDur, path: 'end'});
				}
			}

			var updatedEvents = [];
			Event.find(conditions, function(err, events) {
				if (err) {
					next(err);
				}

				if (b.weeks_to_repeat) {
					b['time.weeks_to_repeat'] = _.clone(b.weeks_to_repeat, true);
					delete b.weeks_to_repeat;
				}

				if (b.days_of_week) {
					b['time.days_of_week'] = _.clone(b.days_of_week, true);
					delete b.days_of_week;
				}

				for (var i = 0; i < events.length; i++) {
					var curEvent = events[i];
					var curData = _.clone(b, true);

					for (var j = 0; j < newTimes.length; j++) {
						var newTime = newTimes[j];
						var curTime = moment(curEvent.get(newTime.type));

						delete curData[newTime.type];

						var updatedTime = curTime.clone();
						updatedTime
							.add(newTime.dur.hours(), 'h')
							.add(newTime.dur.minutes(), 'm');

						curData['time.' + newTime.path] = updatedTime.toDate();
					}
					console.log(curData);

					var updatePromise = Event.update({_id: curEvent._id}, {$set: curData}).exec();
					updatedEvents.push(updatePromise);
				}
				Promise.all(updatedEvents).then(function() {
					res.json(event);
				});
			});
		}
		else {
			// single event
			for (var singleP in b) {
				if (b.hasOwnProperty(singleP)) {
					event[singleP] = b[singleP];
				}
			}

			event.save(function(err, event) {
				if (err) {
					next(err);
				}

				res.json(event);
			});
		}
	});
};
/*
 * Deletes an event from a community or a group of events in the future
 */
exports.delete = function(req, res) {
	var delete_repeating = req.query.delete_repeating;

	var event_id = req.params.event_id;

	//If we are deleting a repeating event
	if(delete_repeating === "true"){
		var group_id;
		Event.find({'_id' : event_id}, function(err, current_event){
			if(err){
				next(err);
			}
			if(!current_event.length)
			{
				res.status(404).json({});
			}
			else{


				//find group of current
				group_id = current_event[0].group_id;

				//Remove the current group in the future (inlcuding today)
				Event.remove({'group_id' : group_id, 'time.start' : {$gte : moment().startOf('day').toDate() } }, function(err, event_group){
					if(err){
						next(err);
					}
					res.status(204).json({});
				});

				//If we want to remove all the events in a group and not just the future ones
				// Event.remove({'group_id' : group_id}, function(err, event_group){
				// 	if(err){
				// 		next(err);
				// 	}
				// 	console.log("EVENT GROUP = "+ event_group);
				// 	res.status(204).end();
				// });
			}
			
		});

		
	}
	//If we are deleting a single event
	else{
		Event.remove({'_id' : event_id }, function(err){
			if(err){
				next(err);
			}
			res.status(204).json({});
		});
		
	}


};

/*
 * Volunteer for an event
 */
exports.volunteer = function(req, res) {
	var b = req.body;

	if (!('volunteer' in b)) {
		res.status(400).json({msg: "improperly formatted request, try again."});
	}
	else {
		Event.findOne({_id: req.params.event_id}, function(err, requestedEvent) {
			if (err) {
				next(err);
			}
			else {
				console.log(requestedEvent);
				if (!requestedEvent) {
					res.status(404).json({msg: "requested event not found"});
				}
				else if (b.volunteer === false) { // wanting to un-volunteer
					if (requestedEvent.volunteer) { // requested event has a volunteer
						if (!requestedEvent.volunteer.equals(req.user._id)) { // but you are not them
							res.status(403).json({msg: "you can only un-volunteer yourself"});
						}
						else { // if you are the current volunteer, then you can un-volunteer yourself
							requestedEvent.update({$unset: {volunteer: ""}})
								.exec(function(err, updatedEvent) {
									if (err) {
										next(err);
									}
									else {
										res.status(200).json({msg: "successfully un-volunteered for event"});
									}
								});
						}
					} // requested event does not have volunteer field
					else {
						res.status(409).json({msg: "there is no-one to un-volunteer"});
					}
				}
				else { // wanting to volunteer
					if (requestedEvent.volunteer) { // requested event already has a volunteer
						res.status(409).json({msg: "there is already someone volunteering for the event"});
					}
					else { // someone hasn't volunteer for the event
						requestedEvent.update({$set: {volunteer: req.user._id}})
							.exec(function(err, updatedEvent) {
								if (err) {
									next(err);
								}
								else {
									res.status(200).json({msg: "successfully volunteered for event"});
								}
							});
					}
				}
			}
		});
	}
};
