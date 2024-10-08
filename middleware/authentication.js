const jwt = require("jsonwebtoken");

  const authentication = (req, res, next) => {
    const token = req.header("x-auth-token");
    if (!token) {
      res.status(401).send("Access denied. No token provider");
      return;
    }
    try {
      const decode = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decode;
      next();
    } catch (err) {
      res.status(400).send("Invalid token.");
    }

  }

  module.exports = authentication;
