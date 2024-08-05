import mongoose from 'mongoose';

// mongodb enclaud gratuita

// const URI = 'mongodb://localhost:27017/money';
const URI = 'mongodb+srv://macielysons:9lsYhpzEUQwr1dUK@dev.kd2funn.mongodb.net/money-runners?retryWrites=true&w=majority&appName=Dev';

let options = {};

mongoose
  .connect(URI, options)
  .then(() => console.log('DB is Up!'))
  .catch((err) => console.log(err));
