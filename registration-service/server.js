const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
app.use(express.json());
const client = new MongoClient(process.env.MONGO_URL || 'mongodb://mongo:27017');
let registrations;

async function connect() {
  for (let i = 0; i < 40; i++) {
    try {
      await client.connect();
      registrations = client.db('registrationdb').collection('registrations');
      return;
    } catch (err) {
      console.log('Waiting for MongoDB: ' + err.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  process.exit(1);
}

app.get('/api/registrations', async (req, res) => {
  const list = await registrations.find().sort({ _id: -1 }).limit(10).toArray();
  res.json(list.map((r) => ({
    id: r._id.toString(),
    event_id: r.event_id,
    event_name: r.event_name,
    name: r.name,
    email: r.email,
    tickets: r.tickets,
    created: r.created
  })));
});

app.post('/api/registrations', async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim();
  const eventName = String(b.event_name || '').trim();
  const eventId = parseInt(b.event_id, 10);
  const tickets = parseInt(b.tickets, 10);
  if (!name || !email || !eventName || !eventId || !(tickets >= 1)) {
    return res.status(400).json({ error: 'Please fill all fields' });
  }
  const result = await registrations.insertOne({
    event_id: eventId,
    event_name: eventName,
    name,
    email,
    tickets,
    created: new Date().toISOString()
  });
  res.status(201).json({ message: 'Registration confirmed', id: result.insertedId.toString() });
});

connect().then(() => {
  app.listen(5002, '0.0.0.0', () => console.log('registration-service listening on 5002'));
});
