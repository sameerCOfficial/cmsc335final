const path = require("path");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const portNumber = process.argv[2] || 5001;
require("dotenv").config({
  path: path.resolve(__dirname, "credentialsDontPost/.env"),
});

const name = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const uri = `mongodb+srv://${name}:${password}@cmsc335cluster.msmos.mongodb.net/?retryWrites=true&w=majority&appName=cmsc335cluster;`;
// console.log("Mongo Connection String:", uri);

app.use(bodyParser.urlencoded({ extended: false }));

const databaseAndCollection = {
  db: "CMSC335DB",
  collection: "basketballPlayers",
};

const { MongoClient, ServerApiVersion } = require("mongodb");

async function createClient() {
  let client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
  });

  try {
    await client.connect();
    console.log("MongoDB client connected successfully.");
  } catch (err) {
    console.error(err);
  }
  return client;
}

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/form", async (req, res) => {
  try {
    const client = await createClient();
    const players = await client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .find({})
      .toArray();
    res.render("form", { players });
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

app.get("/wrong", (req, res) => {
  res.render("wrong");
});

app.post("/form", async (req, res) => {
  const { playerName, pokemonName} = req.body;
  let pokemon;
  let result;
  try  {
    pokemon = await getPokemon(pokemonName); 
  } catch (err) {
    console.error("not a name", err);
    res.status(404).send("Internal Server Error");
  }

  try {
    let client = await createClient();
    let filter = { name: { $eq: playerName } };
    const cursor = client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .find(filter);
    result = await cursor.toArray();
    result = result[0];
  } catch (err) {
    console.error("cant find player", err);
    res.status(404).send("Internal Server Error");
  }
  res.render("fight", { pokemon: pokemon, player: result });
})

app.post("/addPlayer", async (req, res) => {
  const { name, team, height, weight, position} = req.body;

  const newPlayer = {
    name,
    team,
    height: parseFloat(height),
    weight: parseFloat(weight),
    position,
  };

  console.log("This is the new player: ", newPlayer);
  try {
    const client = await createClient();
    await insertPlayer(client, databaseAndCollection, newPlayer);
  } catch (err) {
    console.error("Error trying to add new player:", err);
    res.status(404).send("Internal Server Error");
  }
});

app.post("/playerSelect", async (req, res) => {
  let client = await createClient();
  let filter = { name };
  const cursor = client
    .db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .find(filter);
  const result = await cursor.toArray();
  res.render("playerSelect", { result: result });
});


async function insertPlayer(client, databaseAndCollection, player) {
  await client
    .db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .insertOne(player);
}

//This uses the API
async function getPokemon(pokemonName) {
  try {
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${pokemonName.toLowerCase()}`
    );
    if (!response.ok) {
      throw new Error(`Error fetching data`);
    }
    const pokemon = await response.json();
    return pokemon;
  } catch (error) {
    console.error(`Error fetching data for ${pokemonName}:`, error);
    return null;
  }
}

app.listen(portNumber, () => {
  console.log(`Server running on http://localhost:${portNumber}`);
});
