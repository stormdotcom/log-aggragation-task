
module.exports = function validateLog(req, res, next) {
  const { userId, timestamp } = req.body;

  if (userId === undefined || userId === null) {
    return res.status(400).json({ message: "userId is required" });
  }
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: "userId must be a positive integer" });
  }

  if (timestamp === undefined || timestamp === null) {
    return res.status(400).json({ message: "timestamp is required" });
  }
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp <= 0) {
    return res.status(400).json({ message: "timestamp must be a positive number (ms since epoch)" });
  }

  next();
};
