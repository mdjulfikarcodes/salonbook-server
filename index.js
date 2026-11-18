import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import 'dotenv/config';


const app = express();
const port = process.env.PORT || 5000;


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

connectToMongoDB()

//middleware
app.use(express.json())
app.use(cors())

   const database = client.db("salonbookdb");

app.get('/', (req, res) => {
  res.send('Saloon Book is Cutting');
});

app.listen(port, () => {
  console.log(`SallonBook App is running ${port}`);
});