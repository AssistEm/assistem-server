var request = require('supertest')('localhost');
var mongoose = require('mongoose');
var User = require('./user.model');
var Promise = require('bluebird');

Promise.promisifyAll(User);
Promise.promisifyAll(User.prototype);

var serverRoot = 'localhost';
mongoose.connect(serverRoot + '/ct1');

describe('User endpoints', function() {
	describe('Creating user with duplicate email', function() {
		it('should fail and return status 409', function(done) {
			var userInfo = {
				first_name: 'John',
				last_name: 'Doe',
				type: 'test',
				phone: '555-555-5555',
				email: 'duplicate@test.com',
				password: 'dupTest123'
			};
			var user = new User(userInfo);

			user.saveAsync().then(function() {
				request
				.post('/api/user')
				.send(userInfo)
				.expect(409)
				.end(function(err, res) {
					if (err) { return done(err); }

					user.removeAsync().then(function() {
						done();
					});
				});
			});
		});
	});
});
