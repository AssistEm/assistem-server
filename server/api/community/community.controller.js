var Community = require('./community.model');
var Grocery = require('./grocery/grocery.model');
var mongoose = require('mongoose');
var _ = require('lodash');


/**
 * Handles Validation errors and general errors thrown by the controller
 *
 * @param  req  The request object of the HTTP request
 * @param  err  The error thrown by the controller
 * @return      The 422, 409, or 500 response
 */
function errorHandler(res, err, payload) {
	if (err.name === 'ValidationError') {
		res.status(422).json(err);
	}
	else if (err.name === 'MongoError') {
		res.status(409).json(payload);
	}
	else {
		res.status(500).json(err);
	}
}

/**
 * Gets a list of all the communities
 *
 * @param  req  The request object of the HTTP request
 * @param  res  The response that will be returned to the client
 * @return      The response with the proper communities attached
 */
exports.index = function(req, res) {
	Community.find({}, function(err, communities) {
		if (err) {
			return res.status(500).send(err);
		}

		res.status(200).json(communities);
	});
};

/**
 * Gets the communities of a specific user
 *
 * @param  req  The request object of the HTTP request
 * @param  res  The response that will be returned to the client
 * @return      The response with the proper communities attached
 */
exports.myCommunities = function(req, res) {
	var user = req.user;

	var community_ids = user.caretaker_info.communities;
	var patient_community_id = user.patient_info.community_id;

	if(patient_community_id){
		community_ids.push(patient_community_id);
	}
	Community.find({'_id' : { $in: community_ids} }, function(err, communities){
		if(err) {
			return res.status(500).send(err);
		}
		res.status(200).json(communities);

	});
};

/**
 * Creates a community
 *
 * @param  req  The request object of the HTTP request
 * @param  res  The response that will be returned to the client
 * @param  next The next element in the middleware
 * @return      The response with new community attached
 */
module.exports.createCommunity = function(req, res, next) {
	var b = req.body;
	var userData = b.user;
	var communityData = b.community;

	var communityToSave = null;
	var groceryListToSave = null;
	var userToSave = res.locals.user;

	if (userData.type.toLowerCase() === 'caretaker') {
		// grab associated community
		communityToSave = res.locals.community;

		communityToSave.caretakers.push(userToSave._id);

		console.log("userToSave!!!!!!!");
		console.log(userToSave);

		// if it is the first caretaker to join the community,
		// set him/her as the primary caretaker
		if (communityToSave.caretakers.length === 1) {
			communityToSave.primary_caretaker = userToSave._id;
		}

		userToSave.caretaker_info.communities.push(communityToSave._id);
	}
	else {
		// create new community
		communityToSave = _.merge(new Community(), communityData);

		// create a new grocery list
		groceryListToSave =  new Grocery({community_id: communityToSave._id});
		communityToSave.grocery_list_id = groceryListToSave._id;

		communityToSave.patient = userToSave._id;
		userToSave.patient_info.community_id = communityToSave._id;
	}

	communityToSave.save(function(err, savedCommunity) {
		if (err) {
			// nothing saved yet, abort with error
			var payload = {
				err: err, user: userData, community: communityData
			};
			errorHandler(res, err, payload);
		}
		else {
			// add created/updated community to payload ## payload->ADD COMMUNITY
			res.locals.payload.community = savedCommunity;

			if (userData.type.toLowerCase() === 'patient') {
				saveGroceryList(savedCommunity);
			}
			else {
				saveUser(savedCommunity, null);
			}
		}
	});

	/**
	 * Saves a grocery list to a community
	 *
	 * @param  community  The community to save the grocery list to
	 * @return            VOID (saves the community)
	 */
	function saveGroceryList(community) {
		groceryListToSave.save(function(err, savedGroceryList) {
			if (err) {
				// community no longer usable, delete created community
				community.remove();

				var payload = {
					err: err, user: userData, community: communityData
				};
				errorHandler(res, err, payload);
			}
			else {  // SAVED NEW GROCERY LIST
				saveUser(community, savedGroceryList);
			}
		});
	}

	/**
	 * Saves a user or grocery list in the community
	 *
	 * @param  community    The community of the user to save
	 * @param  groceryList  The grocery list to save
	 * @return              VOID (saves the community)
	 */
	function saveUser(community, groceryList) {
		userToSave.save(function(err, user) {
			if (err) {
				// community already saved, therefore
				// caretaker: repair caretakers array
				// patient: community/groceryList no longer usable, delete both

				if (userData.type.toLowerCase() === 'caretaker') {
					// caretaker
					community.update({$pull: {'caretakers': userToSave._id}}).exec();
				}
				else {
					// patient
					community.remove();
					groceryList.remove();
				}

				var payload = {
					err: err, user: userData, community: communityData
				};
				errorHandler(res, err, payload);
			}
			else {
				// add updated user to payload ## payload->ADD USER
				res.locals.payload.user = user;
				res.json(res.locals.payload);
			}
		});
	}
};

/**
 * Updates a community
 *
 * @param  req  The request object of the HTTP request
 * @param  res  The response that will be returned to the client
 * @param  next The next element in the middleware
 * @return      The response with the proper communities attached
 */
exports.update = function(req, res, next) {
	var communityId = req.params.id;

	Community.findById(communityId, function(err, community) {
		if (err) {
			return next(err);
		}

		if (!community) {
			return res.sendStatus(404);
		}

		_.merge(community, req.body, function(a, b) {
			return _.isArray(a) ? a.concat(b) : undefined;
		});

		community.save(function(err, community) {
			if (err) {
				return next(err);
			}

			return res.status(201).json(community);
		});
	});
};

/**
 * Deletes a specific community.
 *
 * @param  req  The request object of the HTTP request
 * @param  res  The response that will be returned to the client
 * @return      A 500, 404, or 204 response whether the delete was successful
 */
exports.delete = function(req, res) {
	var communityId = req.params.id;

	Community.findByIdAndRemove(communityId, function(err, community) {
		if (err) {
			return res.status(500).json(err);
		}

		if (!community) {
			console.log("not here");
			return res.sendStatus(404);
		}

		return res.sendStatus(204);
	});
};

exports.caretakers = function(req, res) {
	req
	.community
	.populate('caretakers', function(err, community) {
		if (err) {
			console.log(err);
			res.status(500).json(err);
		}
		else {
			res.status(200).json(community.caretakers);
		}
	});
};

exports.makePrimary = function(req, res) {
	var caretakerId = req.body.caretaker_id;

	req
	.community
	.update({$set: {primary_caretaker: caretakerId}})
	.exec(function(err, doc) {
		if (err) {
			console.log(err);
			res.status(500).json(err);
		}
		else {
			res.status(200).json({});
		}
	});
};
