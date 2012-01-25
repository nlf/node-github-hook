module.exports = {
    port: 3000, // The port to listen on
    'supersecretpath': { // This is the URL you'll tell github to post to, ie: www.yourserver.com:3000/supersecretpath
        url: 'https://github.com/yourusername/yourrepo', // Some basic security, we make sure the POST came from this URL
        action: function (err, payload) { // Here you define what runs when a push is received
            if (err) { // This will return an error if the URL doesn't match
                console.log(err);
            } else {
                console.log(payload.repository.name); // payload will contain the data received from github for you to process however you like
            }
        }
    },
} 
