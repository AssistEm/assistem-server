var Grocery = require('./grocery.model');

/*
 * Function that takes the title(optional) or location(optional)
 * and returns the grocery list items that match
 */
exports.index = function(req, res) {
	res.send({msg: 'foo'});
};

exports.addItem = function(req, res) {
	// JSON: {title:String, description:String, location:String, quantity:String, urgency:Date(PASS AS STRING)}
	var b = req.body;
	var grocery_id = req.community.grocery_list_id;
	var grocery_list = undefined;

	Grocery.findOne({'_id' : grocery_id}, function(err, grocery_list){
		if(err){
			console.log("ERR = " + err);
			next(err);
		}
		else{
			console.log("GROCERY = " + grocery_list); 
			grocery_list.item_list.push(b);
			grocery_list.save(function(err){
				if(err){
					next(err);
				}
				else{
					res.send(grocery_list);
				}
			});
		}
	});
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
