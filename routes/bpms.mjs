'use strict';

import express from 'express';
import https from 'https';
import { getDatabase } from "../db.mjs";
import { v4 as uuidv4 } from 'uuid';
import bodyParser from 'body-parser';

var jsonParser = bodyParser.json()

const router = express.Router();

router.get('/', async function(_req, response) {
  const db = await getDatabase();

  response.writeHead(200, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "http://johanneshoff.com"});

  const results = await db.all(`select * from bpms order by added desc`);

  response.end(JSON.stringify(results));
});

router.post('/', jsonParser, async function(request, response) {
  const data = request.body;

  const added = new Date().toISOString();

  // find song title and artist
  let meta = {};
  try {
    meta = await getTrackMeta(data.uri);
  }
  catch (err) {
    console.warn(err);
    // no return: we can proceed without this information
  }

  const db = await getDatabase();

  try {
    await db.run(`insert into bpms (
      id, added, artist, title,
      uri, author, notes, bpm_avg_bpm,
      bpm_avg_delta, bpm_least_sq, bpm_median, deltas
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(), added, meta.artist, meta.title,
      data.uri, data.author, data.notes, data.bpm_avg_bpm,
      data.bpm_avg_delta, data.bpm_least_sq, data.bpm_median, data.deltas
    ]);
  }
  catch (e) {
    response.writeHead(400);
    response.end();
    return;
  }

  console.log('Inserted row');
  response.writeHead(202, {"Access-Control-Allow-Origin": "http://johanneshoff.com"});
  response.end();
});

function trackLookupUrl(spotifyUri) {
  const prefix = 'spotify:track:';
  if (!spotifyUri || !spotifyUri.startsWith || !spotifyUri.startsWith(prefix)) {
    return null;
  }

  const trackId = spotifyUri.slice(prefix.length);

  return 'https://api.spotify.com/v1/tracks/' + trackId;
}

function getTrackMeta(spotifyUri) {
  return new Promise((resolve, reject) => {
    getTrackMetaCallback(spotifyUri, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function getTrackMetaCallback(spotifyUri, next) {
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

export default router;
