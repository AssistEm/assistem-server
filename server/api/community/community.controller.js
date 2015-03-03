var Community = require('./community.model');
var Grocery = require('./grocery/grocery.model');
var mongoose = require('mongoose');
var _ = require('lodash');

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

/*
 * Get list of all communities
 */
exports.index = function(req, res) {
	Community.find({}, function(err, communities) {
		if (err) {
			return res.status(500).send(err);
		}

		res.status(200).json(communities);
	});
};

/*
 * Get a community of a specific user
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

/*
 * Create a community
 */
module.exports.createCommunity = function(req, res, next) {
	var b = req.body;
	var userData = b.user;
	var communityData = b.community;

	var communityToSave = null;
	var userToSave = res.locals.user;

	if (userData.type.toLowerCase() === 'caretaker') {
		// grab associated community
		communityToSave = res.locals.community;

		communityToSave.caretakers.push(userToSave._id);
		userToSave.caretaker_info.communities.push(communityToSave._id);
	}
	else {
		// create new community
		communityToSave = _.merge(new Community(), communityData);
		groceryList = new Grocery({community_id: communityToSave._id});
		communityToSave.grocery_list_id = groceryList._id;

		communityToSave.patient = userToSave._id;
		userToSave.patient_info.community_id = communityToSave._id;
	}

	communityToSave.save(function(err, community) {
		if (err) {
			// nothing saved yet, abort with erro
			var payload = {
				err: err, user: userData, community: communityData
			};
			errorHandler(res, err, payload);
		}
		else {
			groceryList.save(function(err, savedGroceryList) {
				if (err) {
					// remove id from community
					community.update({$unset: {grocery_list_id: ""}}).exec();
					savedGroceryList.remove();

					var payload = {
						err: err, user: userData, community: communityData
					};
					errorHandler(res, err, payload);
				}
				else {
					// add created/updated community to payload ## payload->ADD COMMUNITY
					res.locals.payload.community = community;

					// ## user->SAVE INSTANCE
					userToSave.save(function(err, user) {
						if (err) {
							// community already saved
							// caretaker: repair caretakers array
							// patient: community no longer usable, delete created community

							if (userData.type.toLowerCase() === 'caretaker') {
								// caretaker
								// TODO: use lodash.without(), mongodb -> update with $pull operator
								var recIdx = community.caretakers.indexOf(userToSave._id);
								community.caretakers.splice(recIdx, 1);
								var recArr = community.caretakers;

								Community.update({'_id': community._id}, {'caretakers': recArr}).exec();
							}
							else {
								// patient
								community.remove();
							}

							var payload = {
								err: err, user: userData, community: communityData
							};
							errorHandler(res, err, payload);


							//res.status(400).json({err: err, user: userData, community: communityData});
						}
						else {
							// add updated user to payload ## payload->ADD USER
							res.locals.payload.user = user;

							res.json(res.locals.payload);
						}
					});
				}
			});
		}
	});
};

/*
 * Update a community
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

/*
 * Delete a community
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
