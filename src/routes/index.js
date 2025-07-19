import express from 'express';
import { index } from '../controllers/HomeController.js';
import executeMessagesRouter from './executeMessages.js';

const router = express.Router();
// router.get('/1', (req, res) => res.redirect('https://web.smsforyou.com'));
router.get('/', index);
router.use(executeMessagesRouter);

export default router;
