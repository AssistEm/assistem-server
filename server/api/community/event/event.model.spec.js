var should = require('should');
var moment = require('moment');
var express = require('express');
var request = require('supertest');
var mongoose = require('mongoose');
var _ = require('lodash');

var Event = require('./event.model');
var eventRouter = require('./index');

var Promise = require('bluebird');
Promise.promisifyAll(Event);
Promise.promisifyAll(Event.prototype);

describe('event tests', function() {
	var app = express();
	var communityId = mongoose.Types.ObjectId();
	var url = '/api/communities/' + communityId + '/events';

	// clean event
	var event = {
		start_time: "2015-03-23T13:00:00Z",
		end_time: "2015-03-23T14:00:00Z"
	};
	// will store cloned event for use in tests
	var eventJSON = null;

	before(function() {
		// setup express
		app.use(require('body-parser').json());
		app.use('/api/communities/:id/events', function(req, res, next) {
			req.community = { _id: communityId };
			next();
		}, eventRouter);

		// setup database
		mongoose.connect('localhost/ct_event_test');
	});

	after(function() {
		// drop test database
		mongoose.connection.db.dropDatabase();
	});


	describe('event creation', function() {

		before(function() {
			eventJSON = _.clone(event);
		});

		it('should create single event', function(done) {
			request(app)
				.post(url + '/')
				.send(eventJSON)
				.expect(200)
				.end(function(err, res) {
					if (err) {
						return done(err);
					}

					var b = res.body;

					b.should.have.properties({
						time: {
							days_of_week: [],
							// TODO: seems kinda silly to create date only to convert into
							// str immediately, research why returns date str with extra zero
							start: (new Date(eventJSON.start_time)).toISOString(),
							end: (new Date(eventJSON.end_time)).toISOString()
						}
					});

					done();
				});
		});

		it('should create repeated events in a single week', function(done) {
			eventJSON.days_of_week = [1, 3, 5];

			request(app)
				.post(url + '/')
				.send(eventJSON)
				.expect(200)
				.end(function(err, res) {
					if (err) {
						return done(err);
					}

					var b = res.body;

					// TODO: add more assertions to test
					b.should.have.lengthOf(3);

					done();
				});
		});

		it('should create repeated events spanning multiple weeks', function(done) {
			eventJSON.weeks_to_repeat = 1;

			request(app)
				.post(url + '/')
				.send(eventJSON)
				.expect(200)
				.end(function(err, res) {
					if (err) {
						return done(err);
					}

					var b = res.body;

					// TODO: add more assertions to test
					b.should.have.lengthOf(6);

					done();
				});
		});
	});

	describe('event update', function() {
		var singleEvent = null;
		var repeatedEvent = null;

		before(function(done) {
			// create single event
			eventJSON = _.clone(event);

			singleEvent = new Event(eventJSON);

			// create repeated event
			eventJSON = _.clone(event);
			eventJSON.start_time = moment(eventJSON.start_time).add(1, 'w');
			eventJSON.end_time = moment(eventJSON.end_time).add(1, 'w');
			eventJSON.days_of_week = [1, 3, 5];

			repeatedEvent = new Event(eventJSON);

			// save events to database
			Promise.settle([
				singleEvent.saveAsync(),
				repeatedEvent.saveAsync()
			])
			.then(function() { done(); });
		});

		it('should udpate start and end date of single event', function(done) {
			updatedEvent = _.clone(event);
			updatedEvent.start_time = moment(updatedEvent.start_time).add(1, 'd').toISOString();
			updatedEvent.end_time = moment(updatedEvent.end_time).add(1, 'd').toISOString();

			request(app)
				.post(url + '/' + singleEvent._id)
				.send(updatedEvent)
				.expect(200)
				.end(function(err, res) {
					if (err) {
						return done(err);
					}
					var b = res.body;

					b.should.have.property('_id', singleEvent._id.toString());
					b.should.have.propertyByPath('time', 'start').eql(updatedEvent.start_time);
					b.should.have.propertyByPath('time', 'end').eql(updatedEvent.end_time);

					done();
				});
		});

	});
});
