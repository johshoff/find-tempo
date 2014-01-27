var http         = require('http');
var url          = require('url');
var fs           = require('fs');
var r            = require('rethinkdb');
var make_request = require('request');

var spotify_lookup_url='http://ws.spotify.com/lookup/1/.json?uri='

var server = http.createServer(function (request, response) {
	var parts = url.parse(request.url);

	if (parts.pathname === '/')
	{
		response.writeHead(200, {"Content-Type": "text/html"});
		fs.createReadStream('find-tempo.html').pipe(response);
	}
	else if (parts.pathname === '/d3.min.js')
	{
		response.writeHead(200, {"Content-Type": "text/javascript"});
		fs.createReadStream('d3.min.js').pipe(response);
	}
	else if (parts.pathname === '/bpms')
	{
		if (!db_connection)
		{
			response.writeHead(500, {"Content-Type": "text/plain"});
			response.end("No DB connection");
			return;
		}

		if (request.method === "GET")
		{
			response.writeHead(200, {"Content-Type": "application/json"});
			r.table('bpm').run(db_connection, function(err, cursor) {
				if (err) throw err;
				cursor.toArray(function(err, array) {
					if (err) throw err;
					response.end(JSON.stringify(array));
				});
			});
		}
		else if (request.method === "POST")
		{
			var body = '';

			request.on('data', function (data) { body += data; });
			request.on('end', function () {
				response.writeHead(200, {"Content-Type": "application/json"});
				var data = JSON.parse(body);
				data.added = r.now();

				// find song title and artist
				make_request(spotify_lookup_url+data.uri, function (err, _, body) {
					if (!err)
					{
						var track_info = JSON.parse(body).track;
						console.log(track_info);
						data.artist = track_info.artists[0].name;
						data.title  = track_info.name;
					}
					else
						console.warn("Failed to get artist and title");

					r.table('bpm').insert(data).run(db_connection, function(err, reply) {
						if (err) throw err;
						console.log('Inserted row');
						response.end(JSON.stringify(reply));
					});
				});
			});
		}
		else
		{
			response.writeHead(405, {"Content-Type": "text/plain"});
			response.end('Method not allowed');
		}
	}
	else
	{
		response.writeHead(404, {"Content-Type": "text/plain"});
		response.end('Not found');
	}
});

var db_connection = null;

r.connect({ host:    process.env.RETHINKDB_HOST || 'localhost',
            port:    process.env.RETHINKDB_PORT || 28015,
            authKey: process.env.RETHINKDB_AUTH,
			db: 'bpm' 
		  }, function(err, connection) {
	if (err) throw err;

	db_connection = connection;
	
	console.log("Established db connection");
});

var port = Number(process.env.PORT || 8000);

server.listen(port);

console.log("Server running at http://localhost:"+port);

