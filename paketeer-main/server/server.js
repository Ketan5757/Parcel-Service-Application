const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const cors = require("cors");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();

const app = express();
app.use(express.json()); // to accept json data

app.use(cors());
app.options("*", cors());

app.use("/", require("./routes/index"));
app.use(notFound);
app.use(errorHandler);

module.exports = app;
