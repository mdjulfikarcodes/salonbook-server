import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';


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





app.get('/', (req, res) => {
  res.send('Saloon Book is Cutting');
});

app.get('/users', async(req, res) => {
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



app.post('/services', async (req, res) =>{
  const service = req.body;
  const result = await services.insertOne(service);
  res.send(result)
})

app.delete('/services/:id', async (req, res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)};
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
  } catch (error) {
    console.error("Failed to fetch appointments:", error);
    res.status(500).send({ error: "Failed to fetch appointments" });
  }
});



app.listen(port, () => {
  console.log(`SallonBook App is running ${port}`);
});