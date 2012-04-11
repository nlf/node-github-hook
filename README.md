node-github-hook
================

This is a very simple, easy to use web hook for github. To use, install with npm and require it in a server process.

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

License
=======

MIT
