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

try{
  console.log(await getTrackMeta("spotify:track:3NVLXCwpfZaCH00tJP5jUu"));
}
catch (e) {
  console.error(e);
  throw e;
}

async function getTrackMeta(spotifyUri) {
  const lookupUrl = trackLookupUrl(spotifyUri);

  if (!lookupUrl) {
    throw 'Invalid spotifyUri';
  }
  console.log(lookupUrl);

  const response = await fetch(lookupUrl);
  if (response.statusCode !== 200) {
    throw 'Failed to get artist and title';
  }

  const contentType = response.headers.get('content-type');
  if (contentType != 'application/json') {
    throw `Unexpected content type: ${contentType}`;
  }

  try {
    const track_info = await response.json();
    console.log(track_info);
    return {
      artist: track_info.artists[0].name,
      title:  track_info.name
    };
  }
  catch (e) {
    throw { message: 'Got response from spotify but failed to parse as expected', e };
  }
}

export default router;
