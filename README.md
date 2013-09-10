node-github-hook
================

This is a very simple, easy to use evented web hook for github. To use:

```javascript
var githubhook = require('githubhook');
var github = githubhook({/* options */});

github.listen();

github.on('event', function (repo, ref, data) {
});

github.on('event:reponame', function (ref, data) {
});

github.on('event:reponame:ref', function (data) {
});

github.on('reponame', function (event, ref, data) {
});

github.on('reponame:ref', function (event, data) {
});
```

Where 'event' is the event name to listen to (sent by github, typically 'push'), 'reponame' is the name of your repo (this one is node-github-hook), and 'ref' is the git reference (such as ref/heads/master)

Configure a WebHook URL to whereever the server is listening, with a path of ```/github/callback``` (or ```/github/callback?secret=yoursecret'``` if you set a secret) and you're done!

Available options are:

* host: the host to listen on, defaults to '0.0.0.0'
* port: the port to listen on, defaults to 3240
* secret: an optional secret to require in callbacks as a query parameter, default is to not use a secret
* logger: an optional instance of a logger that supports the "log" and "error" methods and one parameter for data (like console), default is to not log. mostly only for debugging purposes.

License
=======

MIT
