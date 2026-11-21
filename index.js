import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(express.json())
app.use(cors())


const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const connectedClient = await connectToMongoDB();

const database = connectedClient.db("salonbookdb");
const users = database.collection("user");
const services = database.collection("services")
const payments = database.collection("payments")





app.get('/', (req, res) => {
  res.send('Saloon Book is Cutting');
});

app.get('/users', async (req, res) => {
  const cursor = users.find({});
  const result = await cursor.toArray()
  res.send(result)
});
//service related APIS
app.get('/services', async (req, res) => {
  let query = { status: "Active" };
  if (req.query.search) {
    query.name = { $regex: req.query.search, $options: "i" };
  }
  if (req.query.category) {
    query.category = { $regex: req.query.category, $options: "i" };
  }
  const cursor = services.find(query);
  const result = await cursor.toArray();
  res.send(result);
})

//details page er data dekhanor jnno

app.get('/services/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await services.findOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Invalid ID" });
  }
});



app.post('/services', async (req, res) => {
  const service = req.body;
  const result = await services.insertOne(service);
  res.send(result)
})

app.delete('/services/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await services.deleteOne(query);
  res.send(result);
})


//appointments related api
app.post('/appointments', async (req, res) => {
  try {
    const appointments = database.collection("appointments");

    const appointment = req.body
    appointment.createdAt = new Date()
    const result = await appointments.insertOne(appointment)
    res.status(201).send(result)
  } catch (error) {
    console.error("Failed to book appointment:", error)
    res.status(500).send({ error: "Failed to book appointment" })
  }
})

// get customer id
app.get('/appointments', async (req, res) => {
  try {
    const { customerId } = req.query;
    const query = customerId ? { customerId: customerId } : {};
    const appointmentsCollection = database.collection("appointments");
    const result = await appointmentsCollection.find(query).toArray();
    res.send(result);
  }
  catch (error) {
    console.error("Failed to fetch appointments:", error);
    res.status(500).send({ error: "Failed to fetch appointments" });
  }
});


app.get('/appointments/count', async (req, res) => {
  try {
    const { customerId } = req.query;
    const filter = customerId ? { customerId } : {};
    const collection = database.collection("appointments");

    const total = await collection.countDocuments(filter);
    const pending = await collection.countDocuments({ ...filter, status: "Pending" });
    const confirmed = await collection.countDocuments({ ...filter, status: "Confirmed" });
    const cancelled = await collection.countDocuments({ ...filter, status: "Cancelled" });

    res.send({ total, pending, confirmed, cancelled });
  } catch (error) {
    res.status(500).send({ error: "Failed to count" });
  }
});

// Payments Related APIs
app.post('/payments/payments-verify', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).send({ success: false, message: 'Session ID is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.status === 'complete' && session.payment_status === 'paid') {
      
      const existingPayment = await database.collection("payments").findOne({ sessionId: session.id });
      if (existingPayment) {
        return res.send({ success: true, message: 'Already verified', result: existingPayment });
      }

      const payment = {
        sessionId: session.id,
        status: session.status,
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email || session.customer_email,
        userId: session.metadata?.userId, 
        payment_intent: session.payment_intent,
        createdAt: new Date()
      };

      const result = await database.collection("payments").insertOne(payment);

      if (session.metadata?.userId) {
        const query = { _id: new ObjectId(session.metadata.userId) };
        const updateDoc = { $set: { premium: true } };
        await database.collection("users").updateOne(query, updateDoc);
      }

      return res.send({ success: true, result });
    }
    
    return res.status(400).send({ success: false, message: 'Payment verification failed' });

  } catch (error) {
    return res.status(500).send({ success: false, message: 'Internal Server Error' });
  }
});


app.listen(port, () => {
  console.log(`SallonBook App is running ${port}`);
});