var request = require('supertest')('localhost');
var mongoose = require('mongoose');
var User = require('./user.model');
var Promise = require('bluebird');

Promise.promisifyAll(User);
Promise.promisifyAll(User.prototype);



describe('User endpoints', function() {

    //Set up environment
    before(function(){
        var serverRoot = 'localhost';
        mongoose.connect(serverRoot + '/ct1');
        db = mongoose.connection;
    });


    //Creates a new user based on correct info
    beforeEach(function(){
        userInfo = {
            first_name: 'John',
            last_name: 'Doe',
            type: 'test',
            phone: '555-555-5555',
            email: 'make@test.com',
            password: 'makeTest123'
        };
        user = new User(userInfo);
    });

    //Deletes a user from the database
    afterEach(function(){
        db.collection('users').remove({
            first_name: 'John',
            last_name: 'Doe'
        }, function(err, res) {});

    });

    //Create a new valid user test
    describe('Creating a new user with valid input', function(){
       it('Should pass and return a 200 status', function(done) {
           request
               .post('/api/user')
               .send(userInfo)
               .expect(200)
               .end(function(err, res) {
                   if(err) {return done(err); }
                   done();
               });
       });
    });

    //Create a conflicting user that should fail
	describe('Creating user with duplicate email', function() {
		it('should fail and return a 409 status', function(done) {
			user.saveAsync().then(function() {
				request
				.post('/api/user')
				.send(userInfo)
				.expect(409)
				.end(function(err, res) {
					if (err) { return done(err); }
                    done();
				});
			});
		});
	});


    //Create a bad user with invalid input
    describe('Creating a user with bad information', function() {
       it('should fail and return a 422 status', function(done) {
           var badUserInfo = {
               first_name: 'John',
               last_name: 'Doe',
               type: 'test',
               phone: '555-555555',
               email: 'make@',
               password: '3'
           };

            request
                .post('/api/user')
                .send(badUserInfo)
                .expect(422)
                .end(function(err, res){
                   if(err) { return done(err); }
                    done();
                });
       });
    });

    describe('Deleting a valid user', function(){
        it('Should pass and return a 204 status', function(done) {
            user.saveAsync().then(function() {
                var user_id = undefined;
                db.collection('users').findOne({'first_name' : 'John', 'last_name' : 'Doe'}, function(err, res){
                    user_id = res._id;
                });

                request
                    .delete('/api/user/'+user_id)
                    .expect(204)
                    .end(function(err, res){
                        if(err) {
                            console.log(err);
                            return done(err); }
                        done();
                        });
                    });
        });
    });
});
