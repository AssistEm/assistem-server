var Community = require('./community.model');
var _ = require('lodash');

exports.index = function(req, res) {
	Community.find({}, function(err, communities) {
		if (err) {
			return res.status(500).send(err);
		}

		res.status(200).json(communities);
	});
};

var mongoose = require('mongoose');
// TODO: only patient can create community 
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

// TODO: only patient can update
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
