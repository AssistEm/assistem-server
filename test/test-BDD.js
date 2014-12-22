/*var async = require('async'),
    request = require('supertest'),
    should = require('should'),
    //app = require('../server'),
    connection = require('../database'),
    User = require('../models/user');*/
var mongoose = require('mongoose');
mongoose.connect('localhost', 'ct1');

var should = require('should');
//var connection = require('../database');
var User = require('../server/api/user/user.model');
var request = require('superagent');
 
describe('Req 1: Landing page functionality', function(){
  before(function (done) {
    var user = new User({
      first_name: 'deepti',
      last_name: 'gupta',

      login_info: {
      email: 'mochaTest@test.com',
      password: 'password123',
      },

      type: 'mochaType',
      phone: '815-354-0501'
    });

    user.save(function(err) {
      if (err) {
        console.log(err);
      }

      console.log("saved to database");
      done();
    });
  });

  it('should caontain k,v foo,bar', function(done) {
    User.findOne({first_name: 'deepti'}, function(err, user) {
      user.should.have.property('first_name','deepti');
      done();
    });
  });

  describe('1. User creation endpoint', function() {
    it('1.1 reject poorly formatted email', function(done) {
        request
          .post('localhost/api/user')
          .send({
            first_name: 'firstName',
            last_name: 'lastName',
            type: 'caretaker',
            password: 'password123',

            email: 'not properly formatted'
          })
          .end(function(res) {
            res.body.message.should.equal('Validation failed');
            
            done();
          });
    });

    it('1.2 reject poorly formatted password', function(done) {
        request
          .post('localhost/api/user')
          .send({
            first_name: 'firstName',
            last_name: 'lastName',
            type: 'caretaker',
            email: 'email@email.com',

            password: '123'
          })
          .end(function(res) {
            res.body.message.should.equal('Validation failed');
            
            done();
          });
    });
  });
  
  after(function(done) {
    User.findOneAndRemove({first_name: 'deepti'}, function(err, user) {
      if (err) {
        console.log(err);
      }

      console.log("removed test user form database")
      done();
    });
  });

  /*
  it('1.1 Text of landing page', function(done){
    request(app)
      .get('/')
      .expect(200)
      .end(function (err, res) {
        res.text.should.include('Home');
        done();
      });
  });
  it('1.2 Link to the login page', function(done){
    request(app)
      .get('/')
      .expect(200)
      .end(function (err, res) {
        res.text.should.include('/login');
        done();
      });
  });*/
});
