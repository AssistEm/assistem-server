var Grocery = require('./grocery.model');

exports.attachGroceryList = function(req, res, next) {
	var grocery_id = req.community.grocery_list_id;

	Grocery.findOne({'_id' : grocery_id}, function(err, grocery_list){
		if(err){
			console.log("ERR = " + err);

			res
			.status(500)
			.json({msg: "fatal error, community does not have attached grocery list"});
		}
		else {
			req.grocery_list = grocery_list;
			next();
		}
	});
};

/*
 * Function that takes the title(optional) or location(optional)
 * and returns the grocery list items that match
 */
exports.index = function(req, res) {
	var b = req.body;
	var grocery_id = req.community.grocery_list_id;

	Grocery.findOne({'_id' : grocery_id}, function(err, grocery_list){
		if(err){
			console.log("ERR = " + err);
			next(err);
		}
		else {
			var result = [];
			var item_list = grocery_list.item_list;

			for (var i = 0; i < item_list.length; i++) {
				var item = item_list[i];

				if (!item.hasOwnProperty('volunteer') || req.user.type === 'patient') {
					result.push(item);
				}
			}

			res.json(result);
		}
	});
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
};

exports.deleteItem = function(req, res) {
	res.send({msg: 'foo'});
};

exports.autocompleteItem = function(req, res) {
	res.send({msg: 'foo'});
};
