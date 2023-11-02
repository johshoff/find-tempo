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

let cachedSpotifyCredentials = null;
async function getSpotifyCredentials() {
  if (cachedSpotifyCredentials) {
    console.log('Using cached spotify credentials');
    return cachedSpotifyCredentials;
  }
  console.log('Authenticating with Spotify');

  const clientId = process.env['SPOTIFY_CLIENT_ID'];
  const clientSecret = process.env['SPOTIFY_CLIENT_SECRET'];

  if (!clientId || !clientSecret) {
    throw 'Spotify credentials not set up (set with environment variables SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET)';
  }

  const tokenResult = await fetch("https://accounts.spotify.com/api/token", {
    method: 'POST',
    headers: new Headers({
      'Content-type': 'application/x-www-form-urlencoded'
    }),
    body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
  });
  const credentials = await tokenResult.json();

  if (credentials.expires_in && credentials.expires_in > 60) {
    cachedSpotifyCredentials = credentials;
    setTimeout(() => { cachedSpotifyCredentials = null; }, (credentials.expires_in - 60) * 1000)
  }

  return cachedSpotifyCredentials;
}

async function getSpotifyAuthHeaders() {
  const credentials = await getSpotifyCredentials();
  return { 'Authorization': `${credentials.token_type} ${credentials.access_token}` };
}

async function getTrackMeta(spotifyUri) {

  const lookupUrl = trackLookupUrl(spotifyUri);

  if (!lookupUrl) {
    throw 'Invalid spotifyUri';
  }
  console.log(lookupUrl);

  const response = await fetch(lookupUrl, { headers: new Headers(await getSpotifyAuthHeaders()) });

  if (response.status !== 200) {
    throw 'Failed to get artist and title';
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
