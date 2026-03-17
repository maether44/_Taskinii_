const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const authRoute = require("./Routes/auth");
const userRoute = require("./Routes/userRoute");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoute);
app.use("/api", userRoute);

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});