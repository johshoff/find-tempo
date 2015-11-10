var express      = require('express');
var r            = require('rethinkdb');
var router       = express.Router();
var make_request = require('request');

var SPOTIFY_LOOKUP_URL = 'http://ws.spotify.com/lookup/1/.json?uri='

with_db_connection = function() {
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
        make_request(SPOTIFY_LOOKUP_URL+data.uri, function (err, _, body) {
          if (!err)
          {
            try {
              var track_info = JSON.parse(body).track;
              console.log(track_info);
              data.artist = track_info.artists[0].name;
              data.title  = track_info.name;
            }
            catch (e) {
              console.warn("Got response from spotify but failed to parse as expected:", e);
            }
          }
          else
            console.warn("Failed to get artist and title");

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

module.exports = router;
