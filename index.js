var Http = require('http');
var Https = require('https');
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
    var failed = false;
    var isForm = false;
    var remoteAddress;
    if (this.trustProxy !== false) {
      remoteAddress = req.headers['x-forwarded-for'];
    }
    remoteAddress = remoteAddress || req.ip || req.socket.remoteAddress || req.socket.socket.remoteAddress;

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
        var event = req.headers['x-github-event'] || req.headers['x-gogs-event'] || req.headers['x-event-key'] || (req.headers['x-gitlab-event'] ? req.headers['x-gitlab-event'].split(' ')[0].toLowerCase() : 'unknown');
        if (event === 'ping') {
            self.emit(event, null, null, data);
            return reply(200, res);
        }

        if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
            isForm = true;
            data = Buffer.concat(buffer, bufferLength).toString();
        } else {
            //this is already a string when sent as JSON
            data = Buffer.concat(buffer, bufferLength);
        }

        self.getSecret(req, function (err, secret) {

            if (err) {
                self.logger.error(Util.format('error getting secret for %s, returning 403',  res.url));
                self.logger.error(err.stack);
                return reply(403, res);
            }

            if (secret) {
                var signature = req.headers['x-hub-signature'];

                if (!signature) {
                    self.logger.error('secret configured, but missing signature, returning 403');
                    return reply(403, res);
                }

                signature = signature.replace(/^sha1=/, '');
                var digest = Crypto.createHmac('sha1', secret).update(data).digest('hex');

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

            data.request = req;

            // handle GitLab system hook
            if (event !== 'system'){
                // invalid json
                if (!data.repository || !data.repository.name) {
                    self.logger.error(Util.format('received incomplete data from %s, returning 400', remoteAddress));
                    return reply(400, res);
                }

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
            } else {
                var type = data.event_name;

                // invalid json
                if (!type) {
                    self.logger.error(Util.format('received incomplete data from %s, returning 400', remoteAddress));
                    return reply(400, res);
                }

                self.logger.log(Util.format('got %s event of type %s from %s', event, type, remoteAddress));

                // and now we emit a bunch of data
                self.emit('*', event, type, data);
                self.emit(type, event, data);
            }

            reply(200, res);
        });
    });

    self.logger.log(Util.format(req.method, req.url, remoteAddress));

    // 404 if the path is wrong
    if (!self.checkUrl(url)) {
        self.logger.error(Util.format('got invalid path from %s, returning 404', remoteAddress));
        failed = true;
        return reply(404, res);
    }

    // 204 if healthchecks are enabled and it's a GET
    // note that we flag the request as failed only to
    // stop processing any further incoming request data
    if (req.method === 'GET' && this.enableHealthcheck) {
        failed = true;
        return reply(this.healthcheckCode, res);
    }

    // 405 if the method is wrong
    if (req.method !== 'POST') {
        self.logger.error(Util.format('got invalid method from %s, returning 405', remoteAddress));
        failed = true;
        return reply(405, res);
    }

    // 400 if it's not a github, gitlab, or bitbucket event
    if (!req.headers.hasOwnProperty('x-github-event') && !req.headers.hasOwnProperty('x-gitlab-event') && !req.headers.hasOwnProperty('x-gogs-event') && !req.headers.hasOwnProperty('x-event-key')) {
        self.logger.error(Util.format('missing x-github-event, x-gitlab-event, x-gogs-event, or x-event-key header from %s, returning 400', remoteAddress));
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
    this.wildcard = options.wildcard || false;
    this.trustProxy = options.trustProxy || false;
    this.enableHealthcheck = options.enableHealthcheck || false;
    this.healthcheckCode = options.healthcheckCode || 204;

    if (options.https) {
      this.server = Https.createServer(options.https, serverHandler.bind(this));
    }
    else {
      this.server = Http.createServer(serverHandler.bind(this));
    }

    EventEmitter.call(this);
};

Util.inherits(GithubHook, EventEmitter);

GithubHook.prototype.listen = function (callback) {

    var self = this;

    self.server.listen(self.port, self.host, function () {

        self.logger.log(Util.format('listening for hook events on %s:%d', self.host, self.port));

        if (typeof callback === 'function') {
            callback();
        }
    });
};


GithubHook.prototype.checkUrl = function (url) {

    if (url.pathname === this.path) {
        return true;
    }

    if (this.wildcard && (url.pathname.indexOf(this.path + '/') === 0)) {
        return true;
    }

    return false;
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

GithubHook.prototype.getSecret = function (req, next) {

    if (typeof this.secret === 'function') {
        return this.secret(req, next);
    }
    return next(null, this.secret);
};

module.exports = GithubHook;
