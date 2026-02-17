#!/usr/bin/env node
const mongoose = require('mongoose');
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wakapadi';

function formatForStorage(name) {
  if (!name) return '';
  let s = String(name).replace(/\s+/g, ' ').trim();
  // Title-case words (Unicode aware)
  s = s.replace(/([^\s]+)/g, (token) => {
    return token.replace(/\p{L}[^\s]*/gu, (word) => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  });
  return s;
}

function stripParenthetical(name) {
  return (name || '').replace(/\s*\(.*?\)\s*/g, '').trim();
}

async function run() {
  console.log('Connecting to', MONGODB_URI);
  const client = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const db = client.db();
  const citiesColl = db.collection('cities');
  const toursColl = db.collection('tours');

  const cities = await citiesColl.find().toArray();
  console.log(`Found ${cities.length} city documents`);

  const map = new Map(); // key -> { id, name }
  const byStripped = new Map(); // stripped -> key

  let merged = 0;
  for (const c of cities) {
    const origName = c.name || '';
    const formatted = formatForStorage(origName);
    const stripped = stripParenthetical(formatted).toLowerCase();
    const key = formatted.toLowerCase();

    if (map.has(key)) {
      // exact duplicate name exists -> delete this one and update tours
      const existing = map.get(key);
      if (existing.id.toString() === c._id.toString()) continue; // same doc
      console.log(`Duplicate exact: keeping '${existing.name}' (${existing.id}) removing '${formatted}' (${c._id})`);
      await toursColl.updateMany({ location: origName }, { $set: { location: existing.name } });
      await citiesColl.deleteOne({ _id: c._id });
      merged++;
      continue;
    }

    if (byStripped.has(stripped)) {
      const existingKey = byStripped.get(stripped);
      const existing = map.get(existingKey);
      // choose canonical by longer name length (prefer more specific with parenthetical)
      const preferNew = formatted.length > existing.name.length;
      if (preferNew) {
        console.log(`Merging: prefer new '${formatted}' over '${existing.name}'`);
        // update tours referencing existing.name -> formatted
        await toursColl.updateMany({ location: existing.name }, { $set: { location: formatted } });
        // delete existing city doc
        await citiesColl.deleteOne({ _id: existing.id });
        // insert/ensure current doc uses formatted name
        await citiesColl.updateOne({ _id: c._id }, { $set: { name: formatted } });
        // replace map entry
        map.set(key, { id: c._id, name: formatted });
        map.delete(existingKey);
        byStripped.set(stripped, key);
        merged++;
      } else {
        console.log(`Merging: prefer existing '${existing.name}' over '${formatted}'`);
        await toursColl.updateMany({ location: origName }, { $set: { location: existing.name } });
        await citiesColl.deleteOne({ _id: c._id });
        merged++;
      }
      continue;
    }

    // otherwise keep this as canonical (but update its stored name to formatted)
    await citiesColl.updateOne({ _id: c._id }, { $set: { name: formatted } });
    map.set(formatted.toLowerCase(), { id: c._id, name: formatted });
    byStripped.set(stripped, formatted.toLowerCase());
  }

  console.log(`Done. Merged/removed ${merged} city documents. Final city count: ${await citiesColl.countDocuments()}`);
  await client.close();
}

run().catch((err) => {
  console.error('Error during normalization:', err);
  process.exit(1);
});
