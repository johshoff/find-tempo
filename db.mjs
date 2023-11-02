'use strict';

import { open } from 'node:fs/promises';
import sqlite3 from 'sqlite3';

let db = null;

function run(db, query, args) {
  return new Promise((resolve, reject) => {
    db.run(query, args,
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
  });
}

function get(db, query, args) {
  return new Promise((resolve, reject) => {
    db.get(query, args,
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
  });
}

function all(db, query, args) {
  return new Promise((resolve, reject) => {
    db.all(query, args,
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
  });
}

async function loadMigration(version) {
  const fileName = `migrations/${String(version).padStart(3, '0')}.sql`;
  let file;
  try {
    file = await open(fileName);
  }
  catch (err) {
    if (err.message.match(/ENOENT/)) {
      // migration not found
      return null;
    }
    throw err;
  }

  const data = await file.readFile('utf8');
  file.close();

  return data;
}

function connect() {
  const db = new (sqlite3.verbose()).Database(process.env['BPMS_DB'] || ':memory:');

  return {
    run: (query, args) => run(db, query, args),
    get: (query, args) => get(db, query, args),
    all: (query, args) => all(db, query, args),
  }
}

export function getDatabase() {
  if (db !== null) {
    return db;
  }
  db = getDatabaseInternal();
  return db;
}

async function getDatabaseInternal() {
  const db = connect();
  await db.run('PRAGMA foreign_keys = ON');

  const startVersion = (await db.get('PRAGMA user_version')).user_version;

  for (let version=startVersion+1;; ++version) {
    let migration = await loadMigration(version);
    if (migration == null) {
      break;
    }

    for (let stmt of migration.split(';').map(s => s.trim())) {
      if (stmt.length === 0) {
        continue;
      }

      await db.run(stmt);
    }

    await db.run(`PRAGMA user_version = ${version}`);
  }

  return db;
}
