var express = require('express');
var handler = require('./handler');

var githubhook = exports.githubhook = function (port, sites, callback) {
    if (!(this instanceof githubhook)) return new githubhook(port, sites, callback);
    var self = this;
    self.port = port;
    self.callback = callback;
    self.sites = sites;
    self.listener = handler(sites, callback);
    self.listener.listen(port);
};

module.exports = githubhook;
module.exports.handler = handler;