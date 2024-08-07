import express from 'express';
import mongoose from 'mongoose';
import Busboy from 'busboy'; // fazer upload/receber arquivos
import bcrypt from 'bcrypt'; // criptar senhas
// import moment from 'moment'; // trabalha com datas

import aws from '../services/aws.js'; // aqui é node nao react
//import pagarme from '../services/pagarme.js';

import User from '../models/user.js';
//import Challenge from '../models/challenge.js';
//import UserChallenge from '../models/relationship/userChallenge.js';
//import Tracking from '../models/tracking.js';
const router = express.Router();

// ROTA DE CONVITE OK
router.post('/', async (req, res) => {
  const busboy = new Busboy({ headers: req.headers }); // recebe header da requisiçap
  // on quando acabar o upload, cai na funçao aqui  
  busboy.on('finish', async () => {
    console.log(req.body);
    try {
      // UPLOAD ALL FILES
      //let errors = [];
      const userId = new mongoose.Types.ObjectId();
      let photo = '';

      // UPLOAD DA IMAGEM. 
      if (req.files) {
        const file = req.files.photo;
        const nameParts = file.name.split('.');
        const fileName = `${userId}.${nameParts[nameParts.length - 1]}`;
        photo = `users/${fileName}`;

        const response = await aws.uploadToS3(
          file,
          photo
          //, acl = https://docs.aws.amazon.com/pt_br/AmazonS3/latest/dev/acl-overview.html
        );

        if (response.error) {
          res.json({ error: true, message: response.message });
          // errors.push({ error: true, message: response.message.message });
          return false;
        }

      }

      // SE ERRO, ABORTA TUDO
      /*
      if (errors.length > 0) {
        res.json(errors[0]);
        return false;
      }
*/
      // CRIAR SENHA COM BCRYPT
      const password = await bcrypt.hash(req.body.password, 10); // p password é um heache.
      const user = await new User({
        ...req.body,
        _id: userId,
        password,
        photo,
      }).save();

      res.json({ user });
    } catch (err) {
      res.json({ error: true, message: err.message });

    }
  });
  req.pipe(busboy); // resposta
});


// ROTA DE LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    // Achar o usuario onde email for igual a email e status igual a A
    const user = await User.findOne({
      email,
      status: 'A',
    });

    // se nao tiver usuario
    if (!user) {
      res.json({ error: true, message: 'Nenhum e-mail ativo encontrado.' });
      return false;
    }

    // se tiver verificar a senha do usuario e o hasch do banco dedados
    const isPasswordValid = await bcrypt.compare(password, user.password);

    // se nao bater as senhas
    if (!isPasswordValid) {
      res.json({
        error: true,
        message: 'Combinação errada de E-mail / Senha.',
      });
      return false;
    }

    delete user.password; // isso nao funcionou (nao era para retornar o passwod)
    // se der certo
    res.json({
      user,
    });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

/*
router.get('/:id/challenge', async (req, res) => {
  try {
    // RECUPERAR DESAFIO ATUAL
    // CRONJOB CUIDARÁ DO STATUS
    const challenge = await Challenge.findOne({
      status: 'A',
    });

    if (!challenge) {
      res.json({ error: true, message: 'Nenhum desafio ativo.' });
      return false;
    }

    // VERIFICAR SE O USUÁRIO ESTÁ NELE
    const userChallenge = await UserChallenge.findOne({
      userId: req.params.id,
      challengeId: challenge._id,
    });

    // VERIFICAR VALOR DIÁRIO
    const dayStart = moment(challenge.date.start, 'YYYY-MM-DD');
    const dayEnd = moment(challenge.date.end, 'YYYY-MM-DD');
    const challengePeriod = dayEnd.diff(dayStart, 'days');
    const currentPeriod = moment().diff(dayStart.subtract(1, 'day'), 'days');

    const dailyAmount = challenge.fee / challengePeriod;

    // VERIFICAR QUANTAS VEZES ELE PARTICIPOU
    const participatedTimes = await Tracking.find({
      operation: 'G',
      userId: req.params.id,
      challengeId: challenge._id,
    });

    // CALCULAR SALDO CONQUISTADO
    const balance = participatedTimes.length * dailyAmount;

    // CALCULAR SE JÁ FEZ O DESAFIO HOJE
    const challengeFinishedToday = await Tracking.findOne({
      userId: req.params.id,
      challengeId: challenge._id,
      register: {
        $lte: moment().endOf('day'),
        $gte: moment().startOf('day'),
      },
      operation: {
        $in: ['G', 'L'],
      },
    });

    // CALCULAR A DISCIPLINA
    const periodDiscipline = Boolean(challengeFinishedToday)
      ? currentPeriod
      : currentPeriod - 1;
    const discipline = participatedTimes?.length / periodDiscipline;

    // RECUPERANDO TODOS OS RESULTADOS DO DIA
    const dailyResults = await Tracking.find({
      challengeId: challenge._id,
      register: {
        $lte: moment().endOf('day'),
        $gte: moment().startOf('day'),
      },
      operation: {
        $in: ['G', 'L'],
      },
    })
      .populate('userId', 'name photo')
      .select('userId amount operation');

    res.json({
      challenge,
      isParticipant: Boolean(userChallenge),
      dailyAmount,
      challengePeriod,
      participatedTimes: participatedTimes?.length,
      discipline,
      balance,
      challengeFinishedToday: Boolean(challengeFinishedToday),
      currentPeriod,
      dailyResults,
    });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.get('/:id/accept', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    const pagarmeUser = await pagarme('/customers', {
      external_id: userId,
      name: user.name,
      type: 'individual',
      country: 'br',
      email: user.email,
      documents: [
        {
          type: 'cpf',
          number: user.cpf,
        },
      ],
      phone_numbers: ['+55' + user.phone],
      birthday: user.birthday,
    });

    if (pagarmeUser.error) {
      throw pagarmeCliente;
    }

    await User.findByIdAndUpdate(userId, {
      customerId: pagarmeUser.data.id,
      status: 'A',
    });

    // ENVIAR PUSH NOTIFICATION
    res.json({ message: 'Usuário aceito na plataforma' });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.get('/:id/balance', async (req, res) => {
  try {
    const userId = req.params.id;

    const records = await Tracking.find({
      userId,
    }).sort([['register', -1]]);

    const balance = records
      .filter((t) => t.operation === 'G')
      .reduce((total, t) => {
        return total + t.amount;
      }, 0);

    // ENVIAR PUSH NOTIFICATION
    res.json({
      records,
      balance,
    });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});
*/
export default router;
