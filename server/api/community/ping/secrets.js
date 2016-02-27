var secret_access_key = "Q3x5z9ylpHLVFbC6+TKqJSe7URiAX4APgOpra7cO";
var access_key_id = "AKIAIBARKMHMWSFNRFLA";

var secrets = {
        SNS_KEY_ID : access_key_id,
        SNS_ACCESS_KEY : secret_access_key,
        SNS_ANDROID_ARN : "arn:aws:sns:us-west-2:316846284886:app/GCM/AssistEm",
        AWS_CONFIG: {
            "accessKeyId": access_key_id,
            "secretAccessKey": secret_access_key,
            "region": "us-east-1"
        }
};

module.exports = secrets;