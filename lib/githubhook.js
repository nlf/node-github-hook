var express = require('express');

var githubhook = exports.githubhook = function (port, sites, callback) {
    if (!(this instanceof githubhook)) return new githubhook(port, sites, callback);
    var self = this;
    self.port = port;
    self.callback = callback;
    self.sites = sites;
    
    self.listener = express.createServer();
    self.listener.use(express.bodyParser());
    self.listener.post('/:id', function (req, res) {
        if ((Object.keys(self.sites).indexOf(req.params.id) === -1) || (req.headers['x-github-event'] !== 'push')) {
            callback(new Error('Posted data does not appear to be a github event'));
            res.end();
        } else {
            var payload;
            if (typeof req.body.payload === 'object') {
                payload = req.body.payload;
            } else {
                payload = JSON.parse(req.body.payload);
            }
            if (payload.repository.url === self.sites[req.params.id]) {
                callback(null, payload);
            } else {
                callback(new Error('Posted URL does not match configuration'));
            }
            res.end();
        }
    });
    self.listener.listen(port);
};

module.exports = githubhook;
