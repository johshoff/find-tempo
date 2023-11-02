'use strict';

import { getDatabase } from "./db.mjs";
import { open } from 'node:fs/promises';

const db = await getDatabase();

const seedFile = process.argv[2] || "seed.json";
const file = await open(seedFile);
const data = await file.readFile('utf8');

await db.run(`insert into bpms (
    id, added, artist, title,
    uri, author, notes, bpm_avg_bpm,
    bpm_avg_delta, bpm_least_sq, bpm_median, deltas
  )
  select
    value->>'id', value->>'added', value->>'artist', value->>'title',
    value->>'uri', value->>'author', value->>'notes', value->>'bpm_avg_bpm',
    value->>'bpm_avg_delta', value->>'bpm_least_sq', value->>'bpm_median', value->>'deltas'
  from json_each(?)`, [data]);
