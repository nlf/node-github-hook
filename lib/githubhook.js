var express = require('express');

var githubhook = exports.githubhook = function (port, path, url, callback) {
    if (!(this instanceof githubhook)) return new githubhook(port, path, url, callback);
    var self = this;
    self.port = port;
    self.path = path;
    self.url = url;
    self.callback = callback;
    
    self.listener = express.createServer();
    self.listener.use(express.bodyParser());
    self.listener.post('/:id', function (req, res) {
        if ((req.params.id !== path) || (req.headers['x-github-event'] !== 'push')) {
            callback(new Error('Posted data does not appear to be a github event'));
            res.end();
        } else {
            var payload;
            if (typeof req.body.payload === 'object') {
                payload = req.body.payload;
            } else {
                payload = JSON.parse(req.body.payload);
            }
            if (payload.repository.url === self.url) {
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
