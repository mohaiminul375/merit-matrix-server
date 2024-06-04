const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

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

    //  jwt
    const verifyToken = (req, res, next) => {
      // console.log(req.headers);
      // console.log(req.headers.authorization)
      if (!req.headers.authorization) {
        return res.send({ message: "unauthorized access as" }).status(401);
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.send({ message: "unauthorized access" }).status(401);
        }
        req.decoded = decoded;
        next();
      });
    };

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "72h",
      });
      res.send({ token });
    });
    // verify admin
    const verifyAdmin=async(req,res,next)=>{
         const email=req.decoded.email;
         const query={email:email}
         const user=await userCollection.findOne(query);
         const isAdmin= user?.role==='Admin';
         const isModerator= user?.role==='Moderator';
     if(!isAdmin && !isModerator){
      res.send({message:'forbidden access'}).status(403)
     }
     next()
    }

    // user
    app.get("/users", verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    // get admin and moderator role
    app.get("/users/adminOrMod/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
      return  res.status(403).send("forbidden access");
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let isAdminOrMod;
      if(user){
        isAdminOrMod=user?.role==='Admin'? 'Admin':user?.role==='Moderator'?'Moderator':null;
        
      }
      console.log(isAdminOrMod)
      res.send({isAdminOrMod})
    });
    app.post("/users", verifyToken, async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user Already Exist", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.patch("/user/role/:id", verifyToken, async (req, res) => {
      const newRole = req.body.role;
      console.log(newRole);
      const query = { _id: new ObjectId(req.params.id) };
      const updateDoc = {
        $set: {
          role: newRole,
        },
      };
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    app.delete("/users/:id", verifyToken, async (req, res) => {
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
