const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 3000;

const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],

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
    const appliedCollection = client
      .db("merit-matrix")
      .collection("applied-scholarship");
    const reviewCollection = client
      .db("merit-matrix")
      .collection("all-reviews");

    //  jwt
    const verifyToken = (req, res, next) => {
      // console.log(req.headers);
      console.log("req", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access as" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
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
    const verifyAdminOrMod = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "Admin";
      const isModerator = user?.role === "Moderator";
      if (!isAdmin && !isModerator) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    const verifyOnlyAdmin = async (req, res, next) => {
      // console.log("verify admin");
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "Admin";
      console.log(user?.role);
      console.log(isAdmin);
      isAdmin ? next() : res.status(403).send({ message: "forbidden access" });
    };
    // user
    app.get("/users", verifyToken, verifyOnlyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    // get admin and moderator role
    app.get("/users/adminOrMod/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let isAdminOrMod;
      if (user) {
        isAdminOrMod =
          user?.role === "Admin"
            ? "Admin"
            : user?.role === "Moderator"
            ? "Moderator"
            : "User";
      }
      console.log(isAdminOrMod);
      res.send({ isAdminOrMod });
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
    app.patch(
      "/user/role/:id",
      verifyToken,
      verifyOnlyAdmin,
      async (req, res) => {
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
      }
    );
    app.delete("/users/:id", verifyToken, verifyOnlyAdmin, async (req, res) => {
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
    app.post(
      "/all-scholarship",
      verifyToken,
      verifyAdminOrMod,
      async (req, res) => {
        const scholarship = req.body;
        const result = await scholarshipCollection.insertOne(scholarship);
        res.send(result);
      }
    );

    app.patch(
      "/all-scholarship/:id",
      verifyToken,
      verifyAdminOrMod,
      async (req, res) => {
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
      }
    );
    app.delete(
      "/all-scholarship/:id",
      verifyToken,
      verifyAdminOrMod,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await scholarshipCollection.deleteOne(query);
        res.send(result);
      }
    );

    // manage applied scholarship
    app.get("/my-application", verifyToken, async (req, res) => {
      const tokenEmail = req.decoded.email;
      if (req.query?.email !== tokenEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }

      let query = {};
      if (req.query?.email) {
        query = {
          applicant_email: req.query.email,
        };
      }
      const result = await appliedCollection.find(query).toArray();
      res.send(result);
    });
    app.get(
      "/applied-scholarship",
      verifyToken,
      verifyAdminOrMod,
      async (req, res) => {
        const result = await appliedCollection.find().toArray();
        res.send(result);
      }
    );
    app.post("/applied-scholarship", verifyToken, async (req, res) => {
      const applied_info = req.body;
      const result = await appliedCollection.insertOne(applied_info);
      res.send(result);
    });
    // send feedback by Admin or Moderator
    app.patch(
      "/send-feedback/:id",
      verifyToken,
      verifyAdminOrMod,
      async (req, res) => {
        const id = req.params.id;
        const feedback_message = req.body;
        console.log(id, feedback_message);
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            feedback: feedback_message.feedback,
          },
        };
        const result = await appliedCollection.updateOne(query, updateDoc);
        res.send(result);
      }
    );
    // update status
    app.patch(
      "/update-status/:id",
      verifyToken,
      verifyAdminOrMod,
      async (req, res) => {
        const id = req.params.id;
        const new_status = req.body;
        // console.log(id,new_status);
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            status: new_status.updatedStatus,
          },
        };
        const result = await appliedCollection.updateOne(query, updateDoc);
        res.send(result);
      }
    );
    // cancel by user
    app.patch("/cancel/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      // console.log(id,new_status);
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "Canceled",
        },
      };
      const result = await appliedCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    // rejected by admin or moderator
    app.patch(
      "/reject/:id",
      verifyToken,
      verifyAdminOrMod,
      async (req, res) => {
        const id = req.params.id;
        // console.log(id,new_status);
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            status: "Rejected",
          },
        };
        const result = await appliedCollection.updateOne(query, updateDoc);
        res.send(result);
      }
    );
    app.patch("/update-my-application/:id", async (req, res) => {
      const id = req.params.id;
      const update_info = req.body;
      const query = { _id: new ObjectId(id) };
      console.log(update_info);
      const updateDoc = {
        $set: {
          ...update_info,
        },
      };
      console.log("update info", updateDoc);
      const result = await appliedCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // review

    // get all review for admin and moderator
    app.get("/all-reviews", verifyToken, verifyAdminOrMod, async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });
    // user review
    app.get("/my-reviews", verifyToken, async (req, res) => {
      const tokenEmail = req.decoded.email;
      if (req.query?.email !== tokenEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }

      let query = {};
      if (req.query?.email) {
        query = {
          applicant_email: req.query.email,
        };
      }
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });
    // review added by user
    app.post("/all-reviews", verifyToken, async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });
    // update review by user
    app.patch("/update-review/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const new_review = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          ...new_review,
        },
      };
      const result = await reviewCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    // payment
    app.post("/create-payment-intent", async (req, res) => {
      const { application_fees } = req.body;
      const amount = parseInt(application_fees * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
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
