module.exports[404] = function pageNotFound(req, res) {
	res.status(404);

	if (req.accepts('html')) {
		res.render('404');
		return;
	}

	if (req.accepts('json')) {
		res.send({error: 'NOT FOUND'});
		return;
	}

	res.type('txt').send('NOT FOUND');
};
