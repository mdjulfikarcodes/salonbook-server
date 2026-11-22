import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';
import Stripe from 'stripe';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));


const client = new MongoClient(process.env.MONGODB_URI);


const JWKS = createRemoteJWKSet(
  new URL('http://localhost:3000/api/auth/jwks') 
);

// টোকেন ভেরিফাই করার মিডলওয়্যার (jose দিয়ে ঠিক করা হলো)
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ No token provided");
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // ⬇️ jose দিয়ে JWT টোকেন ভেরিফাই করা হচ্ছে
    const { payload } = await jwtVerify(token, JWKS);

    // ⬇️ payload থেকে ডেটা বের করা হচ্ছে
    req.user = {
      id: payload.id || payload.sub, 
      email: payload.email,
      role: payload.role || "customer"
    };

    console.log("✅ Token Verified! User:", req.user.email);
    next();
  } catch (error) {
    console.log("❌ Invalid JWT:", error.message);
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// অ্যাডমিন চেক করার মিডলওয়্যার
const verifyAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

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
const users = database.collection("users"); 
const services = database.collection("services");
const payments = database.collection("payments");

app.get('/', (req, res) => {
  res.send('Saloon Book is Cutting');
});

app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  const cursor = users.find({});
  const result = await cursor.toArray();
  res.send(result);
});

// ⬇️ কাস্টমারদের জন্য পাবলিক সার্ভিস API (শুধু Active)
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
});

// details page er data dekhanor jnno
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

// delete service (সুরক্ষিত)
app.delete('/services/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await services.deleteOne(query);
  res.send(result);
});

// Service active / Inactive api (সুরক্ষিত)
app.patch('/services/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const updatedData = req.body; 
    const result = await services.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to update service" });
  }
});

//appointments related api (সুরক্ষিত)
app.post('/appointments', verifyToken, async (req, res) => {
  try {
    const appointments = database.collection("appointments");
    const appointment = req.body;
    
    appointment.createdAt = new Date();
    if (req.user && req.user.id) {
        appointment.customerId = req.user.id;
    } else {
        return res.status(401).json({ error: "User not authenticated" });
    }

    const result = await appointments.insertOne(appointment);
    console.log("✅ Appointment saved for:", req.user?.email);
    res.status(201).send(result);
  } catch (error) {
    console.error("❌ Failed to book:", error.message);
    res.status(500).send({ error: "Failed to book appointment" });
  }
});

// get customer id (সুরক্ষিত)
app.get('/appointments', verifyToken, async (req, res) => {
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

// appointment calcel for customer (সুরক্ষিত)
app.patch('/appointments/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    // ⬇️ ইউজার শুধু নিজের অ্যাপয়েন্টমেন্টই ক্যান্সেল করতে পারবে
    const query = { _id: new ObjectId(id), customerId: req.user.id };
    const updatedDoc = { $set: { status: status } };
    const result = await database.collection("appointments").updateOne(query, updatedDoc);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to cancel" });
  }
});

app.get('/appointments/count', async (req, res) => {
  try {
    const { customerId } = req.query;
    const filter = customerId ? { customerId: customerId } : {};
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

app.get('/payments/count', async (req, res) => {
  const count = await database.collection("payments").countDocuments({ status: "paid" });
  res.send({ totalPaid: count });
});

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
        customer_email: session.customer_details?.email || session.customer_email || "N/A",
        userId: session.metadata?.userId,
        appointmentId: session.metadata?.appointmentId,
        payment_intent: session.payment_intent,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency ? session.currency.toUpperCase() : "BDT",
        createdAt: new Date()
      };
      
      const result = await database.collection("payments").insertOne(payment);

      if (session.metadata?.userId) {
        await database.collection("users").updateOne(
          { _id: new ObjectId(session.metadata.userId) },
          { $set: { premium: true } }
        );
      }

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

// Admin Transactions API (সুরক্ষিত)
app.get('/admin/transactions', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const payments = database.collection("payments");
    const result = await payments.find().sort({ createdAt: -1 }).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch transactions" });
  }
});

// API for admin to view all appointments (সুরক্ষিত)
app.get('/admin/appointments', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const appointments = database.collection("appointments");
    const result = await appointments.find().sort({ createdAt: -1 }).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch all appointments" });
  }
});

// API for admins to update status (Confirm or Cancel) (সুরক্ষিত)
app.patch('/admin/appointments/:id', verifyToken, verifyAdmin, async (req, res) => {
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