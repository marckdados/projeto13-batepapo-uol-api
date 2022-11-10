import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

// config
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
const mongoClient = new MongoClient("mongodb://localhost:27017");
let db;

//conect db
try {
  await mongoClient.connect();
  db = mongoClient.db("bate_papo_uol");
} catch (err) {
  console.log(err);
}

app.listen(5000, "Conectado na porta 5000");
