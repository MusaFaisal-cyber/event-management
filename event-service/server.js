const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const client = new MongoClient(process.env.MONGO_URL || 'mongodb://mongo:27017');
let events;

const seed = [
  { _id: 1, name: 'Tech Conference 2026', date: '2026-12-05', venue: 'Islamabad Convention Center', price: 2500,
    description: 'A full day of talks on cloud, DevOps and AI with industry speakers.' },
  { _id: 2, name: 'Live Music Night', date: '2026-12-12', venue: 'Lahore Open Arena', price: 1500,
    description: 'An open-air concert with live bands and food stalls.' },
  { _id: 3, name: 'Startup Pitch Day', date: '2026-12-20', venue: 'Karachi Expo Center', price: 1000,
    description: 'Young founders pitch their startups to investors and mentors.' },
  { _id: 4, name: 'Food Festival', date: '2027-01-10', venue: 'Rawalpindi Food Street', price: 500,
    description: 'Taste dishes from over 40 local restaurants and street vendors.' }
];

function format(e) {
  return { id: e._id, name: e.name, date: e.date, venue: e.venue, price: e.price, description: e.description };
}

async function connect() {
  for (let i = 0; i < 40; i++) {
    try {
      await client.connect();
      events = client.db('eventdb').collection('events');
      for (const item of seed) {
        const { _id, ...rest } = item;
        await events.updateOne({ _id }, { $setOnInsert: rest }, { upsert: true });
      }
      return;
    } catch (err) {
      console.log('Waiting for MongoDB: ' + err.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  process.exit(1);
}

app.get('/api/events', async (req, res) => {
  const list = await events.find().sort({ _id: 1 }).toArray();
  res.json(list.map(format));
});

app.get('/api/events/:id', async (req, res) => {
  const e = await events.findOne({ _id: parseInt(req.params.id, 10) });
  if (!e) return res.status(404).json({ error: 'Event not found' });
  res.json(format(e));
});

connect().then(() => {
  app.listen(5001, '0.0.0.0', () => console.log('event-service listening on 5001'));
});
