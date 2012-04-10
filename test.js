var githubhook = require('./'),
    http = require('http');

var testHook = githubhook(8123, { 'testPath': 'https://github.com/andyet/test' }, function (err, payload) {
    if (!err) {
        console.log(payload.repository.url);
    } else {
        console.log(err);
    }
});

var testData = {
    payload: {
        pusher: { name: 'nathan-lafreniere', email: 'nlf@andyet.net' },
        repository: { 
            name: 'node-github-hook',
            url: 'https://github.com/andyet/test',
            owner: { name: 'nathan-lafreniere', email: 'nlf@andyet.net' }
        },
        ref: 'refs/heads/master'
    }
};

var postOptions = {
    host: 'localhost',
    port: 8123,
    path: '/testPath',
    method: 'POST',
    headers: {
        'x-github-event': 'push',
        'Content-Type': 'application/json'
    }
};

var postReq = http.request(postOptions, function (res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
        console.log('Response:', chunk);
    });
});

postReq.write(JSON.stringify(testData), 'utf8');
postReq.end();
