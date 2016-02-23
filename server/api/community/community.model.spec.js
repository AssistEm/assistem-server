var auth = require('../../auth/auth.service');
var Community = require('./community.model');
var User = require('../user/user.model');
var request = require('superagent');
var mongoose = require('mongoose');
var should = require('should');
var faker = require('faker');

var Promise = require('bluebird');
Promise.promisifyAll(Community);
Promise.promisifyAll(Community.prototype);

Promise.promisifyAll(User);
Promise.promisifyAll(User.prototype);

// Requires running server, currently uses server on local machine
// TODO: Research, mocking so that we don't have to mess with production data
var serverRoot = "localhost";
mongoose.connect(serverRoot + '/ct1');


/**
 * Creates a dummy community 
 *
 * @return  The dummy community
 */
function stub() {
	return {
		name: faker.name.findName(),
		patient: mongoose.Types.ObjectId(),
		caretakers: (function() {
			var vals = [];
			var num = Math.floor(Math.random() * 10) + 1;
			for (var i = 0; i < num; i++) {
				vals.push(mongoose.Types.ObjectId());
			}
			return vals;
		})(),
		privacy: Math.floor(Math.random() * 2) === 0 ? false : true
	};
}

describe('Community Endpoints', function() {
	var communities = new Array(3);
	var token = undefined;
	var community = null;
	var user = null;

	before(function(done) {
		var tasks = [];

		// TODO: Research, how to test without inserting test data into database
		// create test user, for validation purposes
		user = new User({
			first_name: 'test_first',
			last_name: 'test_last',
			type: 'caretaker',
			phone: faker.phone.phoneNumber(),
			login_info: {
				email: 'model.spec@test.com',
				password: 'testpswd123'
			}
		});
		tasks.push(user.saveAsync());

		// create test communities
		for (var i = 0; i < communities.length; i++) {
			communities[i] = new Community(stub());
			tasks.push(communities[i].saveAsync());
		}

		Promise.settle(tasks).then(function() { done(); });
	});

	after(function(done) {
		var tasks = [];

		// remove test user
		tasks.push(user.removeAsync());

		// remove test communities
		for (var i = 0; i < communities.length; i++) {
			tasks.push(communities[i].removeAsync());
		}

		Promise.settle(tasks).then(function() { done(); });
	});

	describe('Get collection', function() {
		it('should retrive a collection of communities', function(done) {
			request
			.get(serverRoot + '/api/communities')
			.end(function(res) {
				res.status.should.equal(200);
				res.body.should.be.an.Array;
				res.body.should.not.be.empty;

				done();
			});
		});
	});

	describe('Create collection', function() {
		it('Should create a new community', function(done) {
			community = new Community(stub());
			token = auth.createToken({_id: user._id});

			request
			.post(serverRoot + '/api/communities')
			.send(community)
			.set('Authorization', 'Bearer ' + token)
			.end(function(res) {
				res.status.should.equal(201);
				res.body.should.be.an.Object;
				res.body.should.not.be.empty;
                console.log(res.body);
                console.log(community._doc);
				//TODO: Why '._doc'? Replace with easier to understand assertion.
				res.body.should.containDeep(community._doc);

				done();
			});
		});
	});

	describe('Update collection', function() {
		it('Should update an existing community', function(done) {
			var id = community._id;
			var updates = {name: "New Name"};

			request
			.post(serverRoot + '/api/communities/' + id)
			.send(updates)
			.set('Authorization', 'Bearer ' + token)
			.end(function(res) {
				res.status.should.equal(201);
				res.body.should.be.an.Object;
				res.body.should.not.be.empty;
				res.body.should.containDeep(updates);

				done();
			});
		});
	});

	describe('Delete collection', function() {
		it('Should delete an existing community', function(done) {
			var id = community._id;

			request
			.del(serverRoot + '/api/communities/' + id)
			.set('Authorization', 'Bearer ' + token)
			.end(function(res) {
				res.status.should.equal(204);
				res.body.should.be.empty;

				done();
			});
		});
	});

});
