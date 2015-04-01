var SNS = require('sns-mobile');


//Environment variables to keep the access keys from being plaintext
var SNS_KEY_ID = process.env['SNS_KEY_ID'];  
var SNS_ACCESS_KEY = process.env['SNS_ACCESS_KEY'];


var ANDROID_ARN = process.env['SNS_ANDROID_ARN'];

var myApp = new SNS({  
  platform: 'android',
  region: 'us-west-1',
  apiVersion: '2010-03-31',
  accessKeyId: SNS_ACCESS_KEY,
  secretAccessKey: SNS_KEY_ID,
  platformApplicationArn: ANDROID_ARN
});


//Initiates a ping sent out to all the correct caretakers
exports.initiatePing = function(req, res, next) {


}


//Responds to a ping from the correct caretaker
exports.respondPing = function(req, res, next) {


}
