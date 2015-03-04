var Grocery = require('./grocery.model');
var _ = require('lodash');

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

/*
 * Function that takes the optional grocery item properties,
 * creates a grocery item, and returns the list with the new item.
 */
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

/*
 * Function that takes no arguments (the id of the item is in the url),
 * deletes the item from the list and returns 204 (nothing).
 */
exports.deleteItem = function(req, res) {
	grocery_item_id = req.params.item_id;
	var grocery_id = req.community.grocery_list_id;
	var item_list = undefined;

	Grocery.findOne({'_id' : grocery_id}, function(err, grocery){
		if(err){
			next(err);
		}
		else{
			var removed = false;
			item_list = grocery.item_list;
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
				grocery.save(function(err){
					if(err){
						next(err);
					}
					else{
						res.send(204);
					}
				});
			}
		}
	});
};

exports.autocompleteItem = function(req, res) {
	res.send({msg: 'foo'});
};
