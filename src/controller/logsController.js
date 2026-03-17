const logService = require('../service/logStore.js');

module.exports = {
  getActiveUsers: (req, res, next) => {
    try {
      const minutes = parseInt(req.query.minutes, 10) || 5;
      if (minutes <= 0) {
        return res.status(400).json({ message: "Minutes must be a positive integer" });
      }
      const count = logService.getActiveUsersCount(minutes);
      res.status(200).json({ count });
    } catch (error) {
      next(error);
    }

  },
  addLog: (req, res, next) => {
    try {
      const { userId, timestamp } = req.body;
      logService.addEntry({ userId, timestamp });
      res.status(201).json({ message: "Log entry added" });
    } catch (error) {
      next(error);
    }
  }
};
