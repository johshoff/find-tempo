'use strict';

import express from 'express';
import { getDatabase } from "../db.mjs";
import { v4 as uuidv4 } from 'uuid';
import bodyParser from 'body-parser';
import { getTrackMeta } from '../spotify.mjs';

var jsonParser = bodyParser.json()

const router = express.Router();

router.use((request, response, next) => {
  response.set("Access-Control-Allow-Origin", "https://johanneshoff.com");
  next(request, response);
});


router.get('/', async function(_req, response) {
  const db = await getDatabase();

  const results = await db.all(`select * from bpms order by added desc`);
  for (const row of results) {
    row.deltas = JSON.parse(row.deltas);
  };

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
      data.bpm_avg_delta, data.bpm_least_sq, data.bpm_median, JSON.stringify(data.deltas)
    ]);
  }
  catch (e) {
    response.writeHead(400);
    response.end();
    return;
  }

  console.log('Inserted row');
  response.writeHead(202);
  response.end();
});

export default router;
