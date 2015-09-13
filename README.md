node-github-hook
================

This is a very simple, easy to use evented web hook API for github or gitlab. A command-line executable is also available.

To Install:
-----------
```
npm install githubhook
```

To Use:
-------

```javascript
var githubhook = require('githubhook');
var github = githubhook({/* options */});

github.listen();

github.on('*', function (event, repo, ref, data) {
});

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

// if you'd like to programmatically stop listening
// github.stop();
```

Where 'event' is the event name to listen to (sent by github, typically 'push'), 'reponame' is the name of your repo (this one is node-github-hook), and 'ref' is the git reference (such as ref/heads/master)

Configure a WebHook URL to whereever the server is listening, with a path of ```/github/callback``` and you're done!

Available options are:

* host: the host to listen on, defaults to '0.0.0.0'
* port: the port to listen on, defaults to 3420
* path: the path for the github callback, defaults to '/github/callback'
* secret: if specified, you must use the same secret in your webhook configuration in github. if a secret is specified, but one is not configured in github, the hook will fail. if a secret is *not* specified, but one *is* configured in github, the signature will not be validated and will be assumed to be correct. consider yourself warned.
* logger: an optional instance of a logger that supports the "log" and "error" methods and one parameter for data (like console), default is `console`.


Command-line
-------------

You can use the command-line client to execute a shell script when a particular 
event occurs.

Install it globally:

```bash
$ npm install -g node-github-hook
```

Then you can run `githubhook`:

```bash
$ githubhook --help

Usage:
  githubhook [--host=HOST] [--port=PORT] [--callback=URL_PATH] [--secret=SECRET] [--verbose] <trigger> <script>

Options:

  --host=HOST             Address to listen on
  --port=PORT             Port to listen on
  --callback=URL_PATH     The callback URL path
  --secret=SECRET         The secret you use the in the Github webhook config
  --verbose               Log to console
  --version               Output the version number
  -h, --help              Output usage information
```

Default values for options are same as for the API (see above).

Example usage:

```bash
$ githubhook push:node-github-hook ./some_script.sh
```


License
=======

MIT
