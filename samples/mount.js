var express = require('express');
var githubhook = require('../').handler;

var app = express.createServer();

app.get('/', function(req, res) {
    res.send('hello, world');
});

app.use(githubhook({ 'secret': 'https://github.com/yourusername/yourrepo' }, function(err, payload) {
    if (err) {
        console.error(err);
    }
    else {
        console.log('github post-receive hook payload:', payload);
    }
}));

app.listen(5000);