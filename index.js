const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 3000;
const corsOptions = {
  origin: ["http://localhost:5173"],
  optionSuccessStatus: 200,
};
app.use(express.json());
app.use(cors(corsOptions));

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ixszr3u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)

    // collection

    const scholarshipCollection = client
      .db("merit-matrix")
      .collection("all-scholarship");
    const userCollection = client.db("merit-matrix").collection("users");

    // user
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user Already Exist", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // scholarship manage

    // data post to server
    app.get("/all-scholarship", async (req, res) => {
      const result = await scholarshipCollection.find().toArray();
      res.send(result);
    });
    app.get("/all-scholarship/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await scholarshipCollection.findOne(query);
      res.send(result);
    });
    app.post("/all-scholarship", async (req, res) => {
      const scholarship = req.body;
      const result = await scholarshipCollection.insertOne(scholarship);
      res.send(result);
    });

    app.patch("/all-scholarship/:id", async (req, res) => {
      console.log(req.body);
      const updateData = req.body;
      const query = { _id: new ObjectId(req.params.id) };
      const updateDoc = {
        $set: {
          ...updateData,
        },
      };
      const result = await scholarshipCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    app.delete("/all-scholarship/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await scholarshipCollection.deleteOne(query);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.use("/", (req, res) => {
  res.send("server is working");
});

app.listen(port, () => {
  console.log(`server running on port ${port}`);
});
