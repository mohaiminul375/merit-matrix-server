const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use("/", (req, res) => {
  res.send("server is working");
});

app.listen(port, () => {
  console.log(`server running on port ${port}`);
});
