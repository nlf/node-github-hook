node-github-hook
================

This is a very simple, easy to use web hook for github. To use, install with npm (`githubhook`) and require it in a server process.

```javascript
var githubhook = require('githubhook'),
    servers = {
        'supersecretpath': 'https://github.com/yourusername/yourrepo',
        'anotherpath': 'https://github.com/yourusername/yourotherrepo'
    };

var thishook = githubhook(3000, servers, function (err, payload) {
    if (!err) {
        console.log(payload); // payload is the JSON blob that github POSTs to the server
    } else {
        console.log(err);
    }
});
```

One can also use the handler directly and mount it into an existing `express` app.

```javascript
var express = require('express');
var githubhook = require('githubhook').handler;

var app = express.createServer();

app.get('/', function(req, res) {
    res.send('hello, world\n');
});

// other routes...

app.use(githubhook({ 'secret': 'https://github.com/yourusername/yourrepo' }, function(err, payload) {
    if (err) {
        console.error(err);
    }
    else {
        console.log('github post-receive hook payload:', payload);
    }
}));

app.listen(5000);
```

License
=======

MIT
