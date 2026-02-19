/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const Verse = require('../models/Verse');
const { hashData } = require('../config/web3');
const winston = require('winston');

const router = express.Router();

// @route   GET /api/verses
// @desc    Get all verses with pagination
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const verses = await Verse.find()
      .sort({ surahNumber: 1, verseNumber: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Verse.countDocuments();

    res.json({
      success: true,
      data: verses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/verses/:id
// @desc    Get single verse
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const verse = await Verse.findById(req.params.id);
    if (!verse) {
      return res.status(404).json({ message: 'Verse not found' });
    }
    res.json({ success: true, data: verse });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/verses/surah/:surahNumber/ayah/:verseNumber
// @desc    Get verse by surah and ayah
// @access  Public
router.get('/surah/:surahNumber/ayah/:verseNumber', async (req, res, next) => {
  try {
    const { surahNumber, verseNumber } = req.params;
    const verse = await Verse.findOne({ surahNumber: parseInt(surahNumber), verseNumber: parseInt(verseNumber) });
    if (!verse) {
      return res.status(404).json({ message: 'Verse not found' });
    }
    res.json({ success: true, data: verse });
  } catch (error) {
    next(error);
  }
});
// @desc    Create new verse
// @access  Private (Admin)
router.post('/', auth, adminAuth, async (req, res, next) => {
  try {
    const { surahNumber, verseNumber, arabicText, transliteration, audioUrl } = req.body;

    // Generate hash for data integrity
    const dataToHash = { surahNumber, verseNumber, arabicText, transliteration, audioUrl };
    const hash = await hashData(dataToHash);

    const verse = await Verse.create({
      surahNumber,
      verseNumber,
      arabicText,
      transliteration,
      audioUrl,
      hash,
    });

    winston.info(`New verse created: ${verse._id}`);
    res.status(201).json({ success: true, data: verse });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/verses/:id
// @desc    Update verse
// @access  Private (Admin)
router.put('/:id', auth, adminAuth, async (req, res, next) => {
  try {
    const { surahNumber, verseNumber, arabicText, transliteration, audioUrl } = req.body;

    // Generate new hash
    const dataToHash = { surahNumber, verseNumber, arabicText, transliteration, audioUrl };
    const hash = await hashData(dataToHash);

    const verse = await Verse.findByIdAndUpdate(
      req.params.id,
      {
        surahNumber,
        verseNumber,
        arabicText,
        transliteration,
        audioUrl,
        hash,
        isVerified: false, // Reset verification on update
      },
      { new: true, runValidators: true }
    );

    if (!verse) {
      return res.status(404).json({ message: 'Verse not found' });
    }

    winston.info(`Verse updated: ${verse._id}`);
    res.json({ success: true, data: verse });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/verses/:id
// @desc    Delete verse
// @access  Private (Admin)
router.delete('/:id', auth, adminAuth, async (req, res, next) => {
  try {
    const verse = await Verse.findByIdAndDelete(req.params.id);
    if (!verse) {
      return res.status(404).json({ message: 'Verse not found' });
    }

    winston.info(`Verse deleted: ${verse._id}`);
    res.json({ success: true, message: 'Verse deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;