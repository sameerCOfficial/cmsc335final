const path = require("path");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
require("dotenv").config();
const portNumber = process.env.PORT || 5001;
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

app.get("/", async (req, res) => {
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
  } finally {
    if (client) {
      await client.close();
    }
  }
});

app.get("/wrong", (req, res) => {
  res.render("wrong");
});

app.post("/form", async (req, res) => {
  const { playerName, pokemonName} = req.body;
  // console.log(playerName);
  // console.log(pokemonName);
  let pokemon;
  let result;
  try  {
    pokemon = await getPokemon(pokemonName.toLowerCase()); 
    // console.log(pokemon);
  } catch (err) {
    console.error("not a name", err);
    res.status(404).send("Internal Server Error");
  }
  
  if (!pokemon) {
    pokemon = {
      name: "this isnt a pokemon",
      weight: 0,
      height: 0,
      stats: [
        {
          base_stat: 0
        }
      ],
      types: [
        {
          type: {
            name: "this guy doesnt have a type"
          }
        }
      ]
    }
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
  } finally {
    if (client) {
      await client.close();
    }
  }
  console.log(result);
  console.log(pokemon);
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
  } finally {
    if (client) {
      await client.close();
    }
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
      `https://pokeapi.co/api/v2/pokemon/${pokemonName}`
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
