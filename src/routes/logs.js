const logController = require('../controller/logsController.js');
const validateLog = require('../middleware/validate.js');

const router = require('express').Router();

router.get('/active-users', logController.getActiveUsers); // minutes as query param

router.post('/logs', validateLog, logController.addLog); 
module.exports = router;

