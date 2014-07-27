var Http = require('http');
var Url = require('url');
var Querystring = require('querystring');
var EventEmitter = require('events').EventEmitter;
var Util = require('util');
var format = Util.format;
var Crypto = require('crypto');

function reply(statusCode, res) {

    var message = { message: Http.STATUS_CODES[statusCode].toLowerCase() };
    message.result = statusCode >= 400 ? 'error' : 'ok';
    message = JSON.stringify(message);

    var headers = {
        'Content-Type': 'application/json',
        'Content-Length': message.length
    };

    res.writeHead(statusCode, headers);
    res.end(message);
}

function parse(data) {

    var result;
    try {
        result = JSON.parse(data);
    } catch (e) {
        result = false;
    }
    return result;
}

function serverHandler(req, res) {

    var self = this;
    var url = Url.parse(req.url, true);
    var buffer = [];
    var bufferLength = 0;
    var isForm = false;
    var failed = false;
    var remoteAddress = req.ip || req.socket.remoteAddress || req.socket.socket.remoteAddress;

    req.on('data', function (chunk) {

        if (failed) {
            return;
        }

        buffer.push(chunk);
        bufferLength += chunk.length;
    });

    req.on('end', function (chunk) {

        if (failed) {
            return;
        }

        var data;

        if (chunk) {
            buffer.push(chunk);
            bufferLength += chunk.length;
        }


        self.logger.log(format('received %d bytes from %s', bufferLength, remoteAddress));

        if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
            isForm = true;
        }

        data = Buffer.concat(buffer, bufferLength).toString();

        // if a secret is configured, make sure the received signature is correct
        if (self.secret) {
            var signature = req.headers['x-hub-signature'];

            if (!signature) {
                self.logger.error('secret configured, but missing signature, returning 403');
                return reply(403, res);
            }

            signature = signature.replace(/^sha1=/, '');
            var digest = Crypto.createHmac('sha1', self.secret).update(data).digest('hex');

            if (signature !== digest) {
                self.logger.error('got invalid signature, returning 403');
                return reply(403, res);
            }
        }

        if (isForm) {
            data = Querystring.parse(data).payload;
        }
        data = parse(data);

        // invalid json
        if (!data) {
            self.logger.error(format('received invalid data from %s, returning 400', remoteAddress));
            return reply(400, res);
        }
        if (!data.repository || !data.repository.name) {
            self.logger.error(format('received incomplete data from %s, returning 400', remoteAddress));
            return reply(400, res);
        }

        var event = req.headers['x-github-event'];
        var repo = data.repository.name;
        var ref = data.ref;

        // and now we emit a bunch of data
        self.logger.log(format('got %s event on %s:%s from %s', event, repo, ref, remoteAddress));
        self.emit('*', event, repo, ref, data);
        self.emit(repo, event, ref, data);
        self.emit(repo + ':' + ref, event, data);
        self.emit(event, repo, ref, data);
        self.emit(event + ':' + repo, ref, data);
        self.emit(event + ':' + repo + ':' + ref, data);

        reply(200, res);
    });

    self.logger.log(format(req.method, req.url, remoteAddress));

    // 404 if the path is wrong
    if (url.pathname !== self.path) {
        self.logger.error(format('got invalid path from %s, returning 404', remoteAddress));
        failed = true;
        return reply(404, res);
    }

    // 405 if the method is wrong
    if (req.method !== 'POST') {
        self.logger.error(format('got invalid method from %s, returning 405', remoteAddress));
        failed = true;
        return reply(405, res);
    }

    // 400 if it's not a github event
    if (!req.headers.hasOwnProperty('x-github-event')) {
        self.logger.error(format('missing x-github-event header from %s, returning 400', remoteAddress));
        failed = true;
        return reply(400, res);
    }
}

function bindLogger(self, type) {
  self.logger[type] = function (str) {
    self._logger[type](self.logger.prefix() + ' ' + str);
  };
}

var GithubHook = function (options) {

    if (!(this instanceof GithubHook)) {
        return new GithubHook(options);
    }

    options = options || {};
    this.port = options.port || 3420;
    this.host = options.host || '0.0.0.0';
    this.secret = options.secret || false;

    this._logger = options.logger || { log: function () {}, error: function () {} };
    this.logger = {};
    this.logger.prefix = options.prefix || function () { return '[GithubHook]'; };
    bindLogger(this, 'log');
    bindLogger(this, 'error');

    this.path = options.path || '/github/callback';

    this.server = Http.createServer(serverHandler.bind(this));
    EventEmitter.call(this);
};

Util.inherits(GithubHook, EventEmitter);

GithubHook.prototype.listen = function (callback) {

    var self = this;

    self.server.listen(self.port, self.host, function () {

        self.logger.log(format('listening for github events on %s:%d', self.host, self.port));

        if (typeof callback === 'function') {
            callback();
        }
    });
};


module.exports = GithubHook;
