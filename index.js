var Http = require('http');
var Url = require('url');
var Querystring = require('querystring');
var EventEmitter = require('events').EventEmitter;
var Util = require('util');
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


        self.logger.log(Util.format('received %d bytes from %s', bufferLength, remoteAddress));

        if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
            isForm = true;
            data = Buffer.concat(buffer, bufferLength).toString();
        } else {
            //this is already a string when sent as JSON
            data = Buffer.concat(buffer, bufferLength);
        }
        
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
            self.logger.error(Util.format('received invalid data from %s, returning 400', remoteAddress));
            return reply(400, res);
        }
        if (!data.repository || !data.repository.name) {
            self.logger.error(Util.format('received incomplete data from %s, returning 400', remoteAddress));
            return reply(400, res);
        }

        var event = req.headers['x-github-event'] || (req.headers['x-gitlab-event'] ? req.headers['x-gitlab-event'].split(' ')[0].toLowerCase() : 'unknown');
        var repo = data.repository.name;
        var ref = data.ref;

        // and now we emit a bunch of data
        if (ref) {
            self.logger.log(Util.format('got %s event on %s:%s from %s', event, repo, ref, remoteAddress));
        }
        else {
            self.logger.log(Util.format('got %s event on %s from %s', event, repo, remoteAddress));
        }
        self.emit('*', event, repo, ref, data);
        self.emit(repo, event, ref, data);
        self.emit(repo + ':' + ref, event, data);
        self.emit(event, repo, ref, data);
        self.emit(event + ':' + repo, ref, data);
        self.emit(event + ':' + repo + ':' + ref, data);

        reply(200, res);
    });

    self.logger.log(Util.format(req.method, req.url, remoteAddress));

    // 404 if the path is wrong
    if (url.pathname !== self.path) {
        self.logger.error(Util.format('got invalid path from %s, returning 404', remoteAddress));
        failed = true;
        return reply(404, res);
    }

    // 405 if the method is wrong
    if (req.method !== 'POST') {
        self.logger.error(Util.format('got invalid method from %s, returning 405', remoteAddress));
        failed = true;
        return reply(405, res);
    }

    // 400 if it's not a github event
    if (!req.headers.hasOwnProperty('x-github-event')) {
        self.logger.error(Util.format('missing x-github-event header from %s, returning 400', remoteAddress));
        failed = true;
        return reply(400, res);
    }
}

var GithubHook = function (options) {

    if (!(this instanceof GithubHook)) {
        return new GithubHook(options);
    }

    options = options || {};
    this.port = options.port || 3420;
    this.host = options.host || '0.0.0.0';
    this.secret = options.secret || false;
    this.logger = options.logger || console;
    this.path = options.path || '/github/callback';

    this.server = Http.createServer(serverHandler.bind(this));
    EventEmitter.call(this);
};

Util.inherits(GithubHook, EventEmitter);

GithubHook.prototype.listen = function (callback) {

    var self = this;

    self.server.listen(self.port, self.host, function () {

        self.logger.log(Util.format('listening for github events on %s:%d', self.host, self.port));

        if (typeof callback === 'function') {
            callback();
        }
    });
};


GithubHook.prototype.stop = function (callback) {

    var self = this;

    self.server.close(function () {

        self.logger.log('stopped listening for github events');
        self.server = Http.createServer(serverHandler.bind(this));

        if (typeof callback === 'function') {
            callback();
        }
    });
};


module.exports = GithubHook;
