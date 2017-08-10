node-github-hook
================

This is a very simple, easy to use evented web hook API for GitHub or GitLab. A command-line executable is also available.

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

// GitLab system hooks
github.on('*', function (event, type, data) {
});

github.on('type', function (event, data) {
});

// if you'd like to programmatically stop listening
// github.stop();
```

Where 'event' is the event name to listen to (sent by GitHub or Gitlab, typically 'push' or 'system'), 'reponame' is the name of your repo (this one is node-github-hook), 'ref' is the git reference (such as ref/heads/master), and 'type' is the type of system hook.

Configure a WebHook URL to whereever the server is listening, with a path of ```/github/callback``` and you're done!

Available options are:

* **host**: the host to listen on, defaults to '0.0.0.0'
* **port**: the port to listen on, defaults to 3420
* **path**: the path for the GitHub callback, defaults to '/github/callback'
* **wildcard**: if true, the path for the GitHub callback will be considered valid as long as it *starts* with the configured path
* **secret**: if specified, you must use the same secret in your webhook configuration in GitHub. if a secret is specified, but one is not configured in GitHub, the hook will fail. if a secret is *not* specified, but one *is* configured in GitHub, the signature will not be validated and will be assumed to be correct. consider yourself warned. this option can also be a function that takes the following parameters: (request, data, callback). callback is error first and should be passed (err, secret)
* **logger**: an optional instance of a logger that supports the "log" and "error" methods and one parameter for data (like console), default is `console`.
* **https**: Options to pass to nodejs https server. If specified, you must follow documentation about nodejs https library (See options in https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener)
* **trustProxy**: By default the `x-forwarded-for` header is trusted when determining the remoteAddress to log for a request. Set this to `false` to disable this behavior
* **enableHealthcheck**: Respond to GET requests with a 204 response for healthcheck purposes
* **healthcheckCode**: Override the 204 status code for healthchecks (for systems that aren't friendly with HTTP spec compliance and want a 200, for example)


Command-line
-------------

You can use the command-line client to execute a shell script when a particular
event occurs.

Install it globally:

```bash
$ npm install -g githubhook
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
  --secret=SECRET         The secret you use the in the GitHub webhook config
  --key=KEY_PATH          Path to read https certificate key file
  --cert=CERT_PATH        Path to read https certificate file
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
