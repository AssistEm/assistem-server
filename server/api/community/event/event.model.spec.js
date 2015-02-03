var express = require('express');
var request = require('supertest');
var mongoose = require('mongoose');
var mockgoose = require('mockgoose');
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
		// TODO: mockgoose not working, fix that or just clear db
		// mockgoose(mongoose);
		mongoose.connect('localhost/ct_event_test');
	});

	describe('event creation', function() {
		var event = {
			start_time: "2015-03-23T13:00:00Z",
			end_time: "2015-03-23T14:00:00Z"
		};

		it('should create single event', function(done) {
			request(app)
				.post(url + '/')
				.send(event)
				.expect(200)
				.end(function(err, res) {
					if (err) {
						return done(err);
					}

					console.log(res.body);
					done();
				});
		});

		it('should create multiple events in a single week', function(done) {
			event.days_of_week = [1, 3, 5];

			request(app)
				.post(url + '/')
				.send(event)
				.expect(200)
				.end(function(err, res) {
					if (err) {
						return done(err);
					}

					console.log(res.body);
					done();
				});
		});
	});

});
