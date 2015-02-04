var should = require('should');
var moment = require('moment');
var express = require('express');
var request = require('supertest');
var mongoose = require('mongoose');

var Event = require('./event.model');
var eventRouter = require('./index');

describe('event tests', function() {
	var app = express();
	var communityId = mongoose.Types.ObjectId();
	var url = '/api/communities/' + communityId + '/events';

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

	var event = {
		start_time: "2015-03-23T13:00:00Z",
		end_time: "2015-03-23T14:00:00Z"
	};

	describe('event creation', function() {

		it('should create single event', function(done) {
			request(app)
				.post(url + '/')
				.send(event)
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
							start: (new Date(event.start_time)).toISOString(),
							end: (new Date(event.end_time)).toISOString()
						}
					});

					done();
				});
		});

		it('should create repeated events in a single week', function(done) {
			event.days_of_week = [1, 3, 5];

			request(app)
				.post(url + '/')
				.send(event)
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
			event.weeks_to_repeat = 1;

			request(app)
				.post(url + '/')
				.send(event)
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

		it('should udpate start and end date of single event', function(done) {
			var newStart = moment(event.start_time).add(1, 'd');
			var newEnd = moment(event.end_time).add(1, 'd');

			var updatedEvent = {
				start_time: newStart.toISOString(),
				end_time: newEnd.toISOString()
			};

			request(app)
				.post(url + '/')
				.send(updatedEvent)
				.expect(200)
				.end(function(err, res) {
					if (err) {
						return done(err);
					}

					var b = req.body;
				});
		});

	});

});
