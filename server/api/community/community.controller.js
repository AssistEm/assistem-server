var Community = require('./community.model');
var _ = require('lodash');

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
 		community_ids.push(user._id);
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
var mongoose = require('mongoose');
exports.create = function(req, res, next) {
	var community = _.merge(new Community(), req.body);

	community.patient = mongoose.Types.ObjectId();

	community.save(function(err, community) {
		if (err) {
			return next(err);
		}

		return res.status(201).json(community);
	});
};

/*
 * Update a community
 */
exports.update = function(req, res) {
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
