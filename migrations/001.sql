create table bpms (
	id text not null primary key  -- uuid, lowercase
	   check (id glob '[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'),
	added text not null,          -- RFC3339, e.g. "2014-04-28T03:03:54.849Z"

	artist text,                  -- e.g. "Louis Jordan", null if unresolved from spotify
	title text,                   -- e.g. "A Man's Best Friend Is A Bed", null if unresolved from spotify
	uri text not null,            -- e.g. "spotify:track:3NVLXCwpfZaCH00tJP5jUu"

	author text not null,         -- e.g. "johannes"
    notes text not null,          -- e.g. ""

    bpm_avg_bpm real not null,    -- e.g. 150.0
    bpm_avg_delta real not null,  -- e.g. 150.0
    bpm_least_sq real not null,   -- e.g. 150.0
    bpm_median real not null,     -- e.g. 150.0

    deltas text not null          -- JSON array, e.g. "[360, 408, 407]"
) strict;
