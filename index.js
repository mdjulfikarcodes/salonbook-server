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



//delete service
app.delete('/services/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await services.deleteOne(query);
  res.send(result);
})

// all service add in admin
app.get('/services', async (req, res) => {
  try {
    const services = database.collection("services");
    const result = await services.find().toArray(); 
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch services" });
  }
});

// Service active / Inactive api
app.patch('/services/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updatedData = req.body; 
    const services = database.collection("services");
  
    // ID data update
    const result = await services.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to update service" });
  }
});

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

// appointment calcel for customer
app.patch('/appointments/:id', async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  const query = { _id: new ObjectId(id) };
  const updatedDoc = { $set: { status: status } };
  const result = await database.collection("appointments").updateOne(query, updatedDoc);
  res.send(result);
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

//payment count for admin dashboard
app.get('/payments/count', async (req, res) => {
  const count = await database.collection("payments").countDocuments({ status: "paid" });
  res.send({ totalPaid: count });
});

//Payment Verify
app.post('/payments/payments-verify', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) return res.status(400).send({ success: false, message: 'Session ID required' });
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
        // ⬇️ ইমেইল না পেলে "N/A" সেভ হবে, যাতে UI খালি না দেখায়
        customer_email: session.customer_details?.email || session.customer_email || "N/A",
        userId: session.metadata?.userId,
        appointmentId: session.metadata?.appointmentId,
        payment_intent: session.payment_intent,
        
        // ⬇️ Amount এবং Currency নিখুঁতভাবে সেভ হবে
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency ? session.currency.toUpperCase() : "BDT",
        
        createdAt: new Date()
      };
      
      const result = await database.collection("payments").insertOne(payment);

     //user Update
      if (session.metadata?.userId) {
        await database.collection("users").updateOne(
          { _id: new ObjectId(session.metadata.userId) },
          { $set: { premium: true } }
        );
      }

      // appointment update
      if (session.metadata?.appointmentId) {
        await database.collection("appointments").updateOne(
          { _id: new ObjectId(session.metadata.appointmentId) },
          { $set: { paymentStatus: "Paid" } }
        );
      }
      return res.send({ success: true, result });
    }
    return res.status(400).send({ success: false, message: 'Payment verification failed' });
  } catch (error) {
    console.error("Payment verify error:", error);
    return res.status(500).send({ success: false, message: 'Internal Server Error' });
  }
});

// অ্যাডমিনের জন্য সব ট্রানজেকশন দেখার API
app.get('/admin/transactions', async (req, res) => {
  try {
    const payments = database.collection("payments");
    // নতুন পেমেন্ট আগে দেখাবে
    const result = await payments.find().sort({ createdAt: -1 }).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch transactions" });
  }
});

// API for admin to view all appointments
app.get('/admin/appointments', async (req, res) => {
  try {
    const appointments = database.collection("appointments");
    const result = await appointments.find().sort({ createdAt: -1 }).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch all appointments" });
  }
});

// API for admins to update status (Confirm or Cancel)
app.patch('/admin/appointments/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    const appointments = database.collection("appointments");
    const result = await appointments.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: status } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).send({ error: "Appointment not found or status unchanged" });
    }
    res.send({ success: true, message: "Status updated successfully", result });
  } catch (error) {
    console.error("Backend update error:", error); 
    res.status(500).send({ error: "Failed to update status" });
  }
});

app.listen(port, () => {
  console.log(`SallonBook App is running ${port}`);
});