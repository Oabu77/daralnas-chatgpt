const mongoose = require('mongoose');

const translationSchema = new mongoose.Schema({
  verseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Verse',
    required: true,
  },
  language: {
    type: String,
    required: true,
    enum: ['english', 'arabic', 'urdu', 'french', 'german', 'spanish', 'turkish', 'indonesian'],
  },
  translator: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  hash: {
    type: String,
    required: true,
  },
  blockchainTxHash: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Compound index for unique translation
translationSchema.index({ verseId: 1, language: 1, translator: 1 }, { unique: true });

module.exports = mongoose.model('Translation', translationSchema);