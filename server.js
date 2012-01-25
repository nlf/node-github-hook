var express = require('express'),
    config = require('./config'),
    app = express.createServer();

app.use(express.bodyParser());

app.post('/:id', function (req, res, next) {
    if (!(req.params.id in config) || !(req.headers['x-github-event'] === 'push')) {
        res.end();
    } else {
        var payload = JSON.parse(req.body.payload);
        if (payload.repository.url === config[req.params.id].url) {
            config[req.params.id].action(null, payload);
        } else {
            config[req.params.id].action(new Error('URL does not match configuration'), null);
        }
        res.end();
    }
});

app.listen(config.port);
