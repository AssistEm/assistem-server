var Grocery = require('./grocery.model');

exports.index = function(req, res) {
    console.log(req.body);
	res.send({msg: 'foo'});
};

exports.createItem = function(req, res) {
    console.log(req.body);
  // sample of req.body
  //   { title: 'tissue',
  // description: 'box',
  // location: 'here',
  // quantity: '1',
  // urgency: '8888-06-05T00:00:00.000Z' }
	res.send({msg: 'foo'});
};

exports.updateItem = function(req, res) {
    console.log(req.body);
	res.send({msg: 'foo'});
};

exports.volunteerItem = function(req, res) {
    console.log(req.body);
	res.send({msg: 'foo'});
};

exports.deleteItem = function(req, res) {
    console.log(req.body);
	res.send({msg: 'foo'});
};

exports.autocompleteItem = function(req, res) {
    console.log(req.body);
	res.send({msg: 'foo'});
};
