var http = require('http'),
    qs = require('querystring'),
    error = JSON.stringify({ message: 'error' }),
    errorLength = error.length,
    ok = JSON.stringify({ message: 'ok' }),
    okLength = ok.length;

function isJSON(obj) {
    var json;
    try {
        JSON.parse(obj);
        json = true;
    } catch (e) {
        json = false;
    }
    return json;
}

var githubhook = exports.githubhook = function (port, sites, callback) {
    if (!(this instanceof githubhook)) return new githubhook(port, sites, callback);
    var self = this;
    self.port = port;
    self.callback = callback;
    self.sites = sites;
    
    self.listener = http.createServer(function (req, res) {
        // Note that we manually track the body length in buflen, rather than trusting
        // the content-length header, this avoids crashes due to invalid headers
        var id = req.url.match(/\/([\w_\-]*)/)[1],
            bufs = [],
            buflen = 0,
            bufpos = 0,
            buffer;

        if (req.method.toLowerCase() !== 'post' || req.headers['x-github-event'] !== 'push' || !~Object.keys(self.sites).indexOf(id)) {
            res.writeHead(400, { 'Content-Type': 'application/json', 'Content-Length': errorLength });
            return res.end(error);
        }

        req.on('data', function (chunk) {
            bufs.push(chunk);
            buflen += chunk.length;
        });

        req.on('end', function (chunk) {
            buffer = new Buffer(buflen);
            bufs.forEach(function (buf) {
                buf.copy(buffer, bufpos);
                bufpos += buf.length;
            });

            // Github posted as a form, so let's parse it and get the JSON out
            if (!isJSON(buffer)) buffer = qs.parse(buffer.toString()).payload;
            var payload = JSON.parse(buffer);
            if (payload.repository.url === self.sites[id]) {
                callback(null, payload);
            } else {
                callback(new Error('Posted URL does not match configuration'));
            }
            res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': okLength });
            res.end(ok);
        });
    });

    self.listener.listen(port);
};

module.exports = githubhook;
