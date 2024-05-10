const express = require("express");
const router = express.Router();

router
	.route("/")
	.get((req, res) => {
		res.statusCode = 200;
		res.setHeader("Content-Type", "text/plain");
		res.end("Initialized!");
	})
	.put((req, res) => {});

module.exports = router;
