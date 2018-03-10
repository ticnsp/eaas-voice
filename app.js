import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import cors from 'cors';

import logger from '@/config/logger';
import settings from '@/config/settings';

import voiceRouter from '@/server/voice';

// Evangelio MicroService
const app = express();

// Middleware
app.use(morgan('tiny'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('*', cors());

app.use(function (err, req, res, next) {
  logger.error(err.stack);
  res.status(500).json({ error: "There was an error" });
});

app.get('/health', (req, res) => {
  logger.info(`${req.ip} requested health status`);
  res.status(200).send('OK');
});

app.use('/', voiceRouter);

app.listen(settings.port, () => {
  logger.info(`Listening on port ${settings.port}` );
});
