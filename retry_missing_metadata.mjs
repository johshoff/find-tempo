'use strict';
import { getDatabase } from "./db.mjs";
import { getTrackMeta } from "./spotify.mjs";

// Retry fetching missing metadata from spotify

const db = await getDatabase();
const missing = await db.all(`select id, uri from bpms where artist is null or title is null`);
for (const { id, uri } of missing) {
  console.log(id, uri);
  const meta = await getTrackMeta(uri);
  console.log(meta);
  await db.run(`update bpms
    set artist = ?, title = ?
    where id = ?`,
    [meta.artist, meta.title, id]
  );
}
