var Grocery = require('./grocery.model');

exports.index = function(req, res) {
	res.send({msg: 'foo'});
};

exports.createItem = function(req, res) {
	res.send({msg: 'foo'});
};

exports.updateItem = function(req, res) {
	res.send({msg: 'foo'});
};

exports.volunteerItem = function(req, res) {
	res.send({msg: 'foo'});
};

exports.deleteItem = function(req, res) {
	res.send({msg: 'foo'});
};

exports.autocompleteItem = function(req, res) {
	res.send({msg: 'foo'});
};


/*From Website:
Patient:
	Add/Remove/Edit list items
	Items (Title, Quantity, Location, Urgency(need vs want), Description
Caretaker:
	Search (by urgency, location, etc)
	Assign item to themselves
	Delivery time
	Delivery location
Extras:
	Ping caretakers nearby when a list is added
	Allow geolocation so when a caretaker is at the grocery store the list shows up as a notification 
*/