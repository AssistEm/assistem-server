var Grocery = require('./grocery.model');
var _ = require('lodash');

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
	var result = [];
	var item_list = req.grocery_list.item_list;

	for (var i = 0; i < item_list.length; i++) {
		var item = item_list[i];

		if (!item.hasOwnProperty('volunteer') || req.user.type === 'patient') {
			result.push(item);
		}
	}

	res.json(result);
};

/*
 * Function that takes the optional grocery item properties,
 * creates a grocery item, and returns the list with the new item.
 */
exports.addItem = function(req, res) {
	// JSON: {title:String, description:String, location:String, quantity:String, urgency:Date(PASS AS STRING)}
	var b = req.body;
	var grocery_id = req.community.grocery_list_id;
	var grocery_list = req.grocery_list;

	grocery_list.item_list.push(b);
	grocery_list.save(function(err){
		if(err){
			next(err);
		}
		else{
			res.send(grocery_list);
		}
	});
};


/*
 * Function that takes all the grocery item attributes as optional,
 * updates the grocery_list item elements, and returns the updated list (nothing).
 */
exports.updateItem = function(req, res) {
	var b = req.body;
	var grocery_list = req.grocery_list;
	var grocery_id = grocery_list._id;
	
	var item_list = grocery_list.item_list;
	var item_id = req.params.item_id;
	
	var item = grocery_list.item_list.id(item_id);
	console.log(b);
	for(var eachNewAttr in b)
	{
		item[eachNewAttr] = b[eachNewAttr];
	}
	console.log(item);

	grocery_list.save(function(err, saved){
		if(err){
			res.send(err);
		}
		else{
			res.send(grocery_list);
		}
	});

};

exports.volunteerItem = function(req, res) {
};

/*
 * Function that takes no arguments (the id of the item is in the url),
 * deletes the item from the list and returns 204 (nothing).
 */
exports.deleteItem = function(req, res) {
	grocery_item_id = req.params.item_id;
	var grocery_list = req.grocery_list;
	var item_list = undefined;


	var removed = false;
	item_list = grocery_list.item_list;
	for (var i = item_list.length - 1; i >= 0; i--){
		if(item_list[i]._id == grocery_item_id){
			item_list.splice(i,1);
			removed = true;
		}
	}
	if(!removed){
		res.send(404);
	}
	else{
		grocery_list.save(function(err){
			if(err){
				next(err);
			}
			else{
				res.send(204);
			}
		});
	}
};

exports.autocompleteItem = function(req, res) {
	res.send({msg: 'foo'});
};
