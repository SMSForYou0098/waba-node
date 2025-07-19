import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import routes from './src/routes/index.js';
// import connectDB from './config/db.js';

dotenv.config();
// connectDB();

const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());


app.use('/api', routes);

// Only redirect if the path is exactly '/'
app.get('/', (req, res) => res.redirect('https://web.smsforyou.biz'));
// Optionally, handle all other non-API routes with a 404 or redirect
// app.use((req, res) => res.redirect('https://web.smsforyou.biz'));

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST === '0.0.0.0' ? '192.168.0.141' : HOST}:${PORT}`);
});
