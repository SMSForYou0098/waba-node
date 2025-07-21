import express from 'express';
import { executeMessages } from '../controllers/ExecuteMessagesController.js';
import { webHook } from '../controllers/WebhookController.js';
const router = express.Router();

router.post('/execute-messages', executeMessages);

router.post('/webhook',webHook)

export default router;
