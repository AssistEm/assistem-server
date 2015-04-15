var Grocery = require('./grocery.model');
var moment = require('moment');
var fuzzy = require('fuzzy');

exports.attachGroceryList = function(req, res, next) {
	var grocery_id = req.community.grocery_list_id;

	Grocery
		.findOne({'_id' : grocery_id})
		.populate('item_list.volunteer.volunteer_id', '-login_info.password')
		.exec(function(err, grocery_list) {
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

	console.log("here is the list");
	console.log(item_list);

	console.log(req.grocery_list);

	for (var i = 0; i < item_list.length; i++) {
		var item = item_list[i];

		if (!item.hasOwnProperty('volunteer') || req.user.type === 'patient') {
			result.push(item._id);
		}
	}

	console.log("here is the result");
	console.log(result);

	res.json(item_list);

	/*List
		.find({'_id': {$in: result}})
		.populate('volunteer.volunteer_id')
		.exec(function(err, items) {
			if (err) {
				console.log('error');
				console.log(err);
			}
			else {
				console.log('good');
				console.log(items);
			}

			res.json(items);
		});*/

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

/*
 * Function that volunteers or un-volunteers a user for an item in a grocery
 * list.
 */
exports.volunteerItem = function(req, res) {
	var b = req.body;
	var item = req.grocery_list.item_list.id(req.params.item_id);

	if (!item) {
		res.status(404).json({msg: "cannot find item with id '" + req.params.item_id + "'"});
	}

	if (b.volunteer) { // attempting to volunteer
		if (item.volunteer && item.volunteer.volunteer_id) { // already a volunteer
			// only patients should get these messages because
			// caretakers will get list of un-volunteered for items
			if (!item.volunteer.volunteer_id._id.equals(req.user._id)) { // req.user !== item.volunteer
				res.status(403).json({msg: "someone already volunteering for item"});
			}
			else {
				res.status(403).json({msg: "you are already volunteering for this item"});
			}
		}
		else { // no volunteer present
			item.volunteer.volunteer_id = req.user._id;
			item.volunteer.delivery_time = moment(b.delivery_time).toDate();
			saveGroceryList();
		}
	}
	else { // attemtping to un-volunteer
		if (item.volunteer && item.volunteer.volunteer_id) { // already a volunteer
			if (!item.volunteer.volunteer_id._id.equals(req.user._id)) { // req.user !== item.volunteer
				res.status(403).json({msg: "you can only un-volunteer yourself"});
			}
			else {
				item.volunteer = undefined;
				saveGroceryList();
			}
		}
		else { // no volunteer present
			res.status(400).json({msg: "no volunteer present to un-volunteer"});
		}
	}

	function saveGroceryList() {
		req.grocery_list.save(function(err, savedGroceryList) {
			if (err) {
				next(err);
			}
			else {
				res.status(200).json({});
			}
		});
	}
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

/*
 * Function that takes the URL PARAM search and does a fuzzy search on the
 * community's item_list for an item with its title property matching the
 * search string. Returns all the items in the item_list if no search URL
 * PARAM is specified
 */
exports.autocompleteItem = function(req, res) {
	var search = req.query.search || '';
	var item_list = req.grocery_list.item_list;

	var options = {
		extract: function(el) { return el.title; }
	};

	var results = (fuzzy
		.filter(search, item_list, options)
		.map(function(el) { return el.string; }));

	res.send(results);
};
