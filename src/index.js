import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import joi from "joi";
import dayjs from "dayjs";

// config
dotenv.config();
const now = dayjs();
const app = express();
app.use(express.json());
app.use(cors());
const mongoClient = new MongoClient("mongodb://localhost:27017");
let db;

//Schemas
const userSchema = joi.object({
  name: joi.string().required(),
});
const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().valid("message", "private_message").required(),
  from: joi.string().required(),
});

//conect db
try {
  await mongoClient.connect();
  db = mongoClient.db("bate_papo_uol");
  console.log("Conectado");
} catch (err) {
  console.log(err);
}

const participantsCollection = db.collection("participants");
const messageCollection = db.collection("messages");

//participants
app.post("/participants", async (req, res) => {
  const user = req.body;
  const { name } = user;
  const { error } = userSchema.validate(user, { abortEarly: false });
  console.log(name);
  try {
    const existsParticipants = await db.collection("participants").findOne({
      name: user.name,
    });

    if (existsParticipants) {
      return res.sendStatus(409);
    }

    if (error) {
      const erros = error.details.map((detail) => detail.message);
      return res.status(422).send(erros);
    }

    await participantsCollection.insertOne({ name, lastStatus: Date.now() });
    await messageCollection.insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: now.format("HH:MM:ss"),
    });
    res.sendStatus(201);
  } catch (error) {
    res.sendStatus(500);
  }
});

app.get("/participants", async (req, res) => {
  try {
    const participants = await participantsCollection.find().toArray();
    res.send(participants);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

//messages
app.get("/messages", async (req, res) => {
  try {
    const messages = await messageCollection.find().toArray();
    res.send(messages);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

app.post("/messages", async (req, res) => {
  const from = req.headers.user;
  const messageObject = { ...req.body, from };
  const { error } = messageSchema.validate(messageObject, {
    abortEarly: false,
  });
  if (error) {
    return res.status(422).send(error.details.map((detail) => detail.message));
  }

  try {
    await messageCollection.insertOne({
      ...messageObject,
      time: now.format("HH:MM:ss"),
    });
    console.log(now.format("HH:MM:ss"));

    res.sendStatus(201);
  } catch (error) {
    console.log(error);
    res.sendStatus(501);
  }
});

//status
app.post("/status", async (req, res) => {
  const headers = req.headers;
  try {
    const userExist = await participantsCollection.findOne({
      name: headers.user,
    });
    if (!userExist) {
      return res.sendStatus(404);
    }
    await participantsCollection.updateOne(
      { name: headers.user },
      { $set: { lastStatus: Date.now() } }
    );
    return res.sendStatus(201);
  } catch (error) {
    return res.sendStatus(404);
  }
});

//remove user
setInterval(async () => {
  try {
    const users = await db.collection("participants").find().toArray();

    const usersTimeOut = users.filter((element) => {
      return element.lastStatus + 10000 < Date.now();
    });
    if (!usersTimeOut) {
      return;
    }
    usersTimeOut.forEach(async (element) => {
      const id = element._id;
      const name = element.name;
      await db.collection("participants").deleteOne({ _id: ObjectId(id) });
      await db.collection("messages").insertOne({
        from: name,
        to: "Todos",
        text: "sai da sala...",
        type: "status",
        time: now.format("HH:MM:ss"),
      });
    });
    console.log(users);
  } catch (error) {
    console.log(error);
  }
}, 15000);

app.listen(5000, () => {
  console.log("Conectado na porta 5000");
});
