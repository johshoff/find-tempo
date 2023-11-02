'use strict';

function trimPrefix(string, prefix) {
  if (string.startsWith(prefix)) {
    return string.slice(prefix.length);
  }
  return null;
}

function trackLookupUrl(spotifyUri) {
  if (!spotifyUri || !spotifyUri.startsWith) {
    return null;
  }

  let trackId = trimPrefix(spotifyUri, 'https://open.spotify.com/track/');
  if (trackId) {
    // remove query string
    trackId = trackId.split('?', 1);
  } else {
    trackId = trimPrefix(spotifyUri, 'spotify:track:');
  }

  if (!trackId) {
    return null;
  }

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
    setTimeout(() => { cachedSpotifyCredentials = null; }, (credentials.expires_in - 60) * 1000).unref();
  }

  return cachedSpotifyCredentials;
}

async function getSpotifyAuthHeaders() {
  const credentials = await getSpotifyCredentials();
  return { 'Authorization': `${credentials.token_type} ${credentials.access_token}` };
}

export async function getTrackMeta(spotifyUri) {
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
