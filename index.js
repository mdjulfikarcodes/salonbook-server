import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
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



app.listen(port, () => {
  console.log(`SallonBook App is running ${port}`);
});