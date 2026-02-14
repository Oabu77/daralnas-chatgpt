const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const Translation = require('../models/Translation');
const Verse = require('../models/Verse');
const { hashData } = require('../config/web3');
const winston = require('winston');

const router = express.Router();

// @route   GET /api/translations
// @desc    Get all translations with pagination
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const translations = await Translation.find()
      .populate('verseId', 'surahNumber verseNumber arabicText')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Translation.countDocuments();

    res.json({
      success: true,
      data: translations,
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

// @route   GET /api/translations/:id
// @desc    Get single translation
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const translation = await Translation.findById(req.params.id)
      .populate('verseId', 'surahNumber verseNumber arabicText');

    if (!translation) {
      return res.status(404).json({ message: 'Translation not found' });
    }

    res.json({ success: true, data: translation });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/translations/verse/:verseId
// @desc    Get translations for a specific verse
// @access  Public
router.get('/verse/:verseId', async (req, res, next) => {
  try {
    const translations = await Translation.find({ verseId: req.params.verseId })
      .populate('verseId', 'surahNumber verseNumber arabicText');

    res.json({ success: true, data: translations });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/translations
// @desc    Create new translation
// @access  Private (Admin)
router.post('/', auth, adminAuth, async (req, res, next) => {
  try {
    const { verseId, language, translator, text } = req.body;

    // Check if verse exists
    const verse = await Verse.findById(verseId);
    if (!verse) {
      return res.status(404).json({ message: 'Verse not found' });
    }

    // Generate hash for data integrity
    const dataToHash = { verseId, language, translator, text };
    const hash = await hashData(dataToHash);

    const translation = await Translation.create({
      verseId,
      language,
      translator,
      text,
      hash,
    });

    winston.info(`New translation created: ${translation._id}`);
    res.status(201).json({ success: true, data: translation });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/translations/:id
// @desc    Update translation
// @access  Private (Admin)
router.put('/:id', auth, adminAuth, async (req, res, next) => {
  try {
    const { verseId, language, translator, text } = req.body;

    // Generate new hash
    const dataToHash = { verseId, language, translator, text };
    const hash = await hashData(dataToHash);

    const translation = await Translation.findByIdAndUpdate(
      req.params.id,
      {
        verseId,
        language,
        translator,
        text,
        hash,
        isVerified: false, // Reset verification on update
      },
      { new: true, runValidators: true }
    );

    if (!translation) {
      return res.status(404).json({ message: 'Translation not found' });
    }

    winston.info(`Translation updated: ${translation._id}`);
    res.json({ success: true, data: translation });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/translations/:id
// @desc    Delete translation
// @access  Private (Admin)
router.delete('/:id', auth, adminAuth, async (req, res, next) => {
  try {
    const translation = await Translation.findByIdAndDelete(req.params.id);
    if (!translation) {
      return res.status(404).json({ message: 'Translation not found' });
    }

    winston.info(`Translation deleted: ${translation._id}`);
    res.json({ success: true, message: 'Translation deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;