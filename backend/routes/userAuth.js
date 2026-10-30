const { verifyToken } = require("../utils/jwt");

// Preserve the existing middleware name for route compatibility.
module.exports = { authentificateToken: verifyToken };
