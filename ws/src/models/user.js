import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const User = new Schema({
  name: {
    type: String,
    required: [true, 'Nome é obrigatório'],
  },
  email: {
    type: String,
    required: [true, 'E-mail é obrigatório'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Senha é obrigatório'],
  },
  photo: {
    type: String,
    required: [true, 'Foto é obrigatório'],
  },
  phone: {
    type: String,
    required: [true, 'Telefone é obrigatório'],
  },
  cpf: {
    type: String,
    required: [true, 'CPF é obrigatório'],
  },
  birthday: {
    type: String,
    required: [true, 'Data de Nascimento é obrigatório'],
  },
  customerId: {
    type: String,
  },
  status: {
    type: String,
    default: 'P', // pendente
    enum: ['A', 'I', 'P'], // ativo, inativo, pendente
  },
  register: {
    type: Date,
    default: Date.now, // data atual
  },
});

export default mongoose.model('User', User);
