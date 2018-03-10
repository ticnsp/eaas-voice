import express from 'express';
import twilio from 'twilio';
import moment from 'moment';
import request from 'request';

import settings from '@/config/settings';
import logger from '@/config/logger';

const HTTP_OK = 200;
const CONTENT_XML = { 'Content-Type': 'text/xml' };

const VoiceResponse = twilio.twiml.VoiceResponse;
var router = express.Router();

router.get('/answerLiturgy', (req, res) => {
  const twiml = new VoiceResponse();
  let gather = twiml.gather({
    input: 'dtmf',
    action: '/replyLang',
    numDigits: 1
  });

  gather.say('For Spanish, press 1. For English, stay on the line.');
  twiml.redirect({
    method: 'POST'
  }, '/replyLang');

  res.writeHead(HTTP_OK, CONTENT_XML);
  res.end(twiml.toString());
});

router.post('/replyLang', (req, res) => {
  let prompt = '';
  let lang = '';
  let actionStr = '';
  let restart = false;

  let paramDigit = req.body['Digits'];
  logger.debug(req.body);

  if (paramDigit != undefined) {
    if (paramDigit === '1') {
      lang = 'es-MX';
      prompt = 'Por favor indica la fecha de la que quieras escuchar el Evangelio. Puedes decir "hoy", "ayer" o "mañana"';
      actionStr = '/replyLiturgia';
    } else {
      lang = 'en-US';
      prompt = 'Not a valid option.';
      actionStr = '/answerLiturgy';
      restart = true;
    }
  } else {
    lang = 'en-US';
    prompt = 'Please tell me the date of the Gospel you would like to hear. You can say "today", "yesterday" or "tomorrow".';
    actionStr = '/replyLiturgy';
  }

  const twiml = new VoiceResponse();

  if (restart) {
    twiml.say(prompt);
    twiml.redirect({
      method: 'GET'
    }, actionStr);
  } else {
    let gather = twiml.gather({
      input: 'speech',
      action: actionStr,
      language: lang
    });
    gather.say({ 
      language: lang 
    }, prompt);
    twiml.redirect({
      method: 'POST'
    }, actionStr);
  }

  res.writeHead(HTTP_OK, CONTENT_XML);
  res.end(twiml.toString());
});

router.post('/replyLiturgia', (req, res) => {
  let paramSpeech = req.body['SpeechResult'];
  let reqDate = '';
  let reqLang = 'SP';
  let prompt = '';

  if (paramSpeech != undefined) {
    reqDate = setDate(paramSpeech);
  } else {
    reqDate = setDate('hoy');
  }

  request.get(`${settings.liturgicEndpoint}?date=${reqDate}&lang=${reqLang}`, function(err, httpResponse, body) {
    if (err) {
      prompt = 'Error.';
    } else {
      let litData = JSON.parse(body).data;
      if (typeof(litData) === 'string') {
        prompt = 'Error.';
      } else {
        // Finally, a successful response
        prompt = genResponse(litData);
      }
    }

    const twiml = new VoiceResponse();
    twiml.say({
      language: 'es-MX'
    }, prompt);

    res.writeHead(HTTP_OK, CONTENT_XML);
    res.end(twiml.toString());
  });
});

router.post('/replyLiturgy', (req, res) => {
  let paramSpeech = req.body['SpeechResult'];
  let reqDate = '';
  let reqLang = 'AM';
  let prompt = '';

  if (paramSpeech != undefined) {
    reqDate = setDate(paramSpeech);
  } else {
    reqDate = setDate('today');
  }

  request.get(`${settings.liturgicEndpoint}?date=${reqDate}&lang=${reqLang}`, function(err, httpResponse, body) {
    if (err) {
      prompt = 'Error.';
    } else {
      let litData = JSON.parse(body).data;
      if (typeof(litData) === 'string') {
        prompt = 'Error.';
      } else {
        // Finally, a successful response
        prompt = genResponse(litData);
      }
    }

    const twiml = new VoiceResponse();
    twiml.say({
      language: 'en-US'
    }, prompt);

    res.writeHead(HTTP_OK, CONTENT_XML);
    res.end(twiml.toString());
  });
});

function setDate(dateResponse) {
  let reqDate = '';
  let momentCurDate = moment().utcOffset(settings.utcOffset);

  if ( dateResponse.match(/today/i) ) {
    reqDate = momentCurDate.format('YYYYMMDD');
  } else if ( dateResponse.match(/hoy/i) ) {
    reqDate = momentCurDate.format('YYYYMMDD');
  } else if ( dateResponse.match(/tomorrow/i) ) {
    reqDate = momentCurDate.add(1, 'days').format('YYYYMMDD');
  } else if ( dateResponse.match(/ma.ana/i) ) {
    reqDate = momentCurDate.add(1, 'days').format('YYYYMMDD');
  } else if ( dateResponse.match(/yesterday/i) ) {
    reqDate = momentCurDate.subtract(1, 'days').format('YYYYMMDD');
  } else if ( dateResponse.match(/ayer/i) ) {
    reqDate = momentCurDate.subtract(1, 'days').format('YYYYMMDD');
  } else {
    reqDate = momentCurDate.format('YYYYMMDD');
  }

  return reqDate;
}

function genResponse(litData) {
  let liturgy = litData.content;
  let litResponse = '';

  // Go through response and collect what is needed.
  if (typeof(liturgy['fr']['st']) === 'undefined') {
    litResponse = 'Error';
  } else {
    litResponse = litResponse.concat(`${liturgy['gsp']['text']}`);
  }

  return litResponse;
}

module.exports = router;
