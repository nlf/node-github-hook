var express = require('express');

module.exports = function (sites, callback) {
    var listener = express.createServer();
    listener.use(express.bodyParser());
    listener.post('/:id', function (req, res) {
        if ((Object.keys(sites).indexOf(req.params.id) === -1) || (req.headers['x-github-event'] !== 'push')) {
            callback(new Error('Posted data does not appear to be a github event'));
            res.end();
        } else {
            var payload;
            if (typeof req.body.payload === 'object') {
                payload = req.body.payload;
            } else {
                payload = JSON.parse(req.body.payload);
            }
            if (payload.repository.url === sites[req.params.id]) {
                callback(null, payload);
            } else {
                callback(new Error('Posted URL does not match configuration'));
            }
            res.end();
        }
    });
    return listener;
};
