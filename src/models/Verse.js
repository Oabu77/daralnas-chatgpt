/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
const mongoose = require('mongoose');

const verseSchema = new mongoose.Schema({
  surahNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 114,
  },
  verseNumber: {
    type: Number,
    required: true,
    min: 1,
  },
  arabicText: {
    type: String,
    required: true,
  },
  transliteration: {
    type: String,
  },
  audioUrl: {
    type: String,
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

// Compound index for unique verse identification
verseSchema.index({ surahNumber: 1, verseNumber: 1 }, { unique: true });

module.exports = mongoose.model('Verse', verseSchema);