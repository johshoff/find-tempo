'use strict';

var express      = require('express');
var r            = require('rethinkdb');
var router       = express.Router();
var https        = require("https");

const with_db_connection = function() {
  var db_connection = null;
  r.connect({ host:    process.env.RETHINKDB_HOST || 'localhost',
              port:    process.env.RETHINKDB_PORT || 28015,
              authKey: process.env.RETHINKDB_AUTH,
              db:      'bpm'
            }, function(err, connection) {
    if (err) { console.log(err); throw err; }

    db_connection = connection;

    console.log("Established db connection");
  });

  return function(request, response, next) {
    if (!db_connection)
    {
      response.writeHead(503, {"Content-Type": "text/plain"});
      response.end("No DB connection");
      return;
    }
    next(request, response, next, db_connection);
  }
}();


router.get('/', function(_req, response, next) {
  with_db_connection(_req, response, function(_req, response, next, db_connection) {
    response.writeHead(200, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "http://johanneshoff.com"});
    r.table('bpm').orderBy(r.desc('added')).run(db_connection, function(err, cursor) {
      if (err) { console.log(err); throw err; }
      cursor.toArray(function(err, array) {
        if (err) { console.log(err); throw err; }
        response.end(JSON.stringify(array));
      });
    });
  });
});

router.post('/', function(request, response, next) {
  with_db_connection(request, response, function(_req, response, next, db_connection) {

    request.on('data', function (new_bpm) {
      request.on('end', function () {
        response.writeHead(200, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "http://johanneshoff.com"});
        var data = JSON.parse(new_bpm);
        data.added = r.now();

        // find song title and artist
        getTrackMeta(data.uri, function (err, meta) {
          if (err) {
            console.warn(err);
            // no return: we can proceed without this information
          } else {
            data.artist = meta.artist;
            data.title  = meta.title;
          }

          r.table('bpm').insert(data).run(db_connection, function(err, reply) {
            if (err) { console.log(err); throw err; }
            console.log('Inserted row');
            response.end(JSON.stringify(reply));
          });
        });
      });
    });
  });
});

function trackLookupUrl(spotifyUri) {
  const prefix = 'spotify:track:';
  if (!spotifyUri.startsWith(prefix)) {
    return null;
  }

  const trackId = spotifyUri.slice(prefix.length);

  return 'https://api.spotify.com/v1/tracks/' + trackId;
}

function getTrackMeta(spotifyUri, next) {
  const lookupUrl = trackLookupUrl(spotifyUri);

  if (!lookupUrl) {
    return setImmediate(() => next('Invalid spotifyUri'));
  }
  console.log(lookupUrl);

  https.get(lookupUrl, response => {
    const contentType = response.headers['content-type'];
    if (response.statusCode !== 200) {
      return next('Failed to get artist and title');
    }

    if (contentType != 'application/json') {
      return next('Unexpected content type: ' + contentType);
    }

    let body = "";
    response.on("data", chunk => { body += chunk; });
    response.on("end", () => {
      try {
        const track_info = JSON.parse(body);
        console.log(track_info);
        return next(null, {
          artist: track_info.artists[0].name,
          title:  track_info.name
        });
      }
      catch (e) {
        return next({ message: 'Got response from spotify but failed to parse as expected', e });
      }
    });
  })
  .on('error', err => {
    return next(err);
  });
}

module.exports = router;
