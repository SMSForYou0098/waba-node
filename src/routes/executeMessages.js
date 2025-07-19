import express from 'express';
import { executeMessages } from '../controllers/ExecuteMessagesController.js';
const router = express.Router();

router.post('/execute-messages', executeMessages);

export default router;
