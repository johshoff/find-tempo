'use strict';

import { getDatabase } from "./db.mjs";

const db = await getDatabase();

await db.run(`insert into bpms values (
	"0b22d361-9dde-43f4-ac6b-142c433b100f",
	"2014-04-28T03:03:54.849Z",
	"Louis Jordan",
	"A Man's Best Friend Is A Bed",
	"spotify:track:3NVLXCwpfZaCH00tJP5jUu",
	"johannes",
	"",
	150.0,
	150.0,
	150.0,
	150.0,
	"[360, 408, 407]"
);`)
