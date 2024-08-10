
import express from 'express';
import moment from 'moment';
import _ from 'lodash';

import User from '../models/user.js';
import Challenge from '../models/challenge.js';
import Tracking from '../models/tracking.js';
import UserChallenge from '../models/relationship/userChallenge.js';
import pagarme from '../services/pagarme.js';
import util from '../util.js';

const router = express.Router();

router.post('/join', async (req, res) => {
  try {
    const { userId, challengeId, payments } = req.body;

    // LENDO DADOS DO USUARIO E DESAFIO
    const user = await User.findById(userId);
    const challenge = await Challenge.findById(challengeId);
    const challengePrice = util.toCents(challenge.fee) * 10;

    // CRIAR TRANSAÇÃO PAGARME
    const createPayment = await pagarme('/orders', {
      customer_id: user.customerId,
      shipping: {
        address: {
          line_1: "10880, Malibu Point, Malibu Central",
          zip_code: "90265",
          city: "Malibu",
          state: "CA",
          country: "US"
        },
        description: challenge.description,
      },
      payments: [
        {
          payment_method: "credit_card",
          credit_card: {
            recurrence: false,
            installments: 1,
            statement_descriptor: "AVENGERS",
            card: {
              number: "4000000000000010",
              holder_name: "Tony Stark",
              exp_month: 1,
              exp_year: 30,
              cvv: "3531",
              billing_address: {
                line_1: "10880, Malibu Point, Malibu Central",
                zip_code: "90265",
                city: "Malibu",
                state: "CA",
                country: "US"
              }
            }
          }
        }
      ],
      items: [
        {
          amount: challengePrice,
          description: challenge.description,
          quantity: 1,
          code: challengeId,
        }
      ]
    });


    if (createPayment.error) {
      throw createPayment;
    }
    

   // COLOCAR REGISTRO NO TRACKING
   await new Tracking({
     userId,
     challengeId,
     transactionId: createPayment.data.id,
     operation: 'F', //FEE
     amount: challenge.fee,
   }).save();
 
   // ATRELAR CHALLENGE (desafio) AO USER
 
   await new UserChallenge({
     userId,
     challengeId,
   }).save();

    res.json({ message: 'Desafio aceito!' });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

// ROTA REGISTRAR A ATIVIDADE
router.post('/tracking', async (req, res) => {
  try {
    const { userId, challengeId, operation } = req.body;

    const existentTracking = await Tracking.findOne({
      userId,
      challengeId,
      operation,
      register: {
        $lte: moment().endOf('day'),
        $gte: moment().startOf('day'),
      },
    });

    // COLOCAR REGISTRO NO TRACKING
    if (!existentTracking) {
      await new Tracking(req.body).save();
    }
    res.json({ message: 'Evento Registrado!' });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

// ULTIMA ROTA DE RANKING
router.get('/:id/ranking', async (req, res) => {
  try {
    const challengeId = req.params.id;

    const challenge = await Challenge.findById(challengeId);

    //PERIODO ATUAL, PERIODO OTTLA
    const dayStart = moment(challenge.date.start, 'YYYY-MM-DD');
    const dayEnd = moment(challenge.date.end, 'YYYY-MM-DD');
    const challengePeriod = dayEnd.diff(dayStart, 'days');
    const currentPeriod = moment().diff(dayStart.subtract(1, 'day'), 'days');

    const trackings = await Tracking.find({
      challengeId,
      operation: ['G', 'L'],
    }).populate('userId', 'name photo');

    const extraBalance = trackings
      .filter((t) => t.operation === 'L')
      .reduce((total, t) => {
        return total + t.amount;
      }, 0);

    const trackingByUser = _.chain(trackings)
      .groupBy('userId._id')
      .toArray()
      .map((tu) => ({
        _id: tu[0].userId._id,
        name: tu[0].userId.name,
        photo: tu[0].userId.photo,
        performance: tu.filter((t) => t.operation === 'G').length,
      }))
      .orderBy('performance', 'desc');

    res.json({
      challengeDate: challenge.date,
      challengePeriod,
      currentPeriod,
      extraBalance,
      trackingByUser,
    });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

export default router;
