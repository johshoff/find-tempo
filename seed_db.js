'use strict';

const r = require('rethinkdb');
const rethinkConfig = {
  host:    process.env.RETHINKDB_HOST || 'localhost',
  port:    process.env.RETHINKDB_PORT || 28015,
  authKey: process.env.RETHINKDB_AUTH
};

r.connect(rethinkConfig, function(err, connection) {
  console.log("Established db connection");
  r.dbCreate('bpm').run(connection, function (err, result) {
    if (err) {
      console.log('error creating db', err);
    }
    else{
      console.log("Created database");
    }
    r.db('bpm').tableCreate('bpm').run(connection, function (err, result) {
      if (err) {
        console.log('error creating table', err);
      }
      else{
        console.log("Created table");
      }
      connection.close();
    });
  });
});
