const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  volume: {
    type: Number,
    default: 100, // Volume padrão é 100%
  },
  gold: {
    type: Number,
    default: 1000,
  },
  gems: {
    type: Number,
    default: 10,
  },
  dragons: {
    type: Number,
    default: 0,
  },
  habitats: {
    type: Number,
    default: 0,
  },
  islands: {
    type: Number,
    default: 1,
  },
  placedItems: [{
    itemType: String,
    x: Number,
    y: Number,
    dragons: [String]
  }],
  food: {
    type: Number,
    default: 200,
  },
  level: {
    type: Number,
    default: 1,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);
