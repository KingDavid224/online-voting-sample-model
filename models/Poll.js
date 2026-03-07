const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  text:  { type: String, required: true, trim: true },
  votes: { type: Number, default: 0 }
});

const pollSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  options:  [optionSchema],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Poll', pollSchema);
