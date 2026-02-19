/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * QuranChain Transaction
 * ======================
 * Transaction types:
 *  - VERSE_AUTH: Authenticate a Quran verse on-chain (hash + reference)
 *  - DATA_HASH: Store any data hash on-chain for integrity verification
 *  - TRANSFER: Transfer QRC (QuranChain Coin) between addresses
 *  - STAKE: Stake QRC for network validation
 *  - GENESIS: Genesis block transaction
 *  - REWARD: Mining/validation reward
 *
 * Founder: Omar Mohammad Abunadi™
 */

const crypto = require('crypto');

const TX_TYPES = {
  VERSE_AUTH: 'VERSE_AUTH',
  DATA_HASH: 'DATA_HASH',
  TRANSFER: 'TRANSFER',
  STAKE: 'STAKE',
  GENESIS: 'GENESIS',
  REWARD: 'REWARD',
  UNSTAKE: 'UNSTAKE',
  STAKING_REWARD: 'STAKING_REWARD',
  // Islamic Finance Transaction Types
  ZAKAT: 'ZAKAT',
  SADAQAH: 'SADAQAH',
  HALAL_PAYMENT: 'HALAL_PAYMENT',
  WAQF: 'WAQF',
  ISLAMIC_LOAN: 'ISLAMIC_LOAN',
};

// Founder royalty percentage on transactional fees
const FOUNDER_ROYALTY_RATE = 0.30; // 30%
const FOUNDER_ADDRESS = 'Omar_Mohammad_Abunadi';

class Transaction {
  constructor({ type, from, to, amount, data, timestamp, signature }) {
    this.id = crypto.randomUUID();
    this.type = type;
    this.from = from || 'SYSTEM';
    this.to = to || null;
    this.amount = amount || 0;
    this.data = data || {};
    this.timestamp = timestamp || Date.now();
    this.signature = signature || null;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return crypto.createHash('sha256').update(
      JSON.stringify({
        id: this.id,
        type: this.type,
        from: this.from,
        to: this.to,
        amount: this.amount,
        data: this.data,
        timestamp: this.timestamp,
      })
    ).digest('hex');
  }

  /**
   * Sign transaction with private key
   */
  sign(privateKey) {
    const sign = crypto.createSign('SHA256');
    sign.update(this.hash);
    this.signature = sign.sign(privateKey, 'hex');
    return this;
  }

  /**
   * Verify transaction signature
   */
  verify(publicKey) {
    if (this.from === 'SYSTEM') return true; // System transactions are auto-valid
    if (!this.signature) return false;
    const verify = crypto.createVerify('SHA256');
    verify.update(this.hash);
    return verify.verify(publicKey, this.signature, 'hex');
  }

  isValid() {
    if (!this.type || !TX_TYPES[this.type]) return false;
    if (this.type === TX_TYPES.TRANSFER && this.amount <= 0) return false;
    if (this.hash !== this.calculateHash()) return false;
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      from: this.from,
      to: this.to,
      amount: this.amount,
      data: this.data,
      timestamp: this.timestamp,
      signature: this.signature,
      hash: this.hash,
    };
  }

  static fromJSON(json) {
    const tx = new Transaction({
      type: json.type,
      from: json.from,
      to: json.to,
      amount: json.amount,
      data: json.data,
      timestamp: json.timestamp,
      signature: json.signature,
    });
    tx.id = json.id;
    tx.hash = json.hash;
    return tx;
  }

  /**
   * Create a verse authentication transaction
   */
  static createVerseAuth({ surah, ayah, text, arabicText, translation, authenticator }) {
    const verseHash = crypto.createHash('sha256').update(arabicText || text).digest('hex');
    return new Transaction({
      type: TX_TYPES.VERSE_AUTH,
      from: authenticator || 'SYSTEM',
      data: {
        surah,
        ayah,
        verseHash,
        textPreview: (text || '').substring(0, 100),
        arabicPreview: (arabicText || '').substring(0, 100),
        translation: translation || null,
        authenticatedAt: Date.now(),
      },
    });
  }

  /**
   * Create a data integrity hash transaction
   */
  static createDataHash({ dataHash, description, source }) {
    return new Transaction({
      type: TX_TYPES.DATA_HASH,
      from: source || 'SYSTEM',
      data: {
        dataHash,
        description,
        verifiedAt: Date.now(),
      },
    });
  }

  /**
   * Create a transfer transaction
   */
  static createTransfer({ from, to, amount, memo }) {
    return new Transaction({
      type: TX_TYPES.TRANSFER,
      from,
      to,
      amount,
      data: { memo: memo || '' },
    });
  }

  /**
   * Create a mining reward transaction
   */
  static createReward({ miner, amount }) {
    return new Transaction({
      type: TX_TYPES.REWARD,
      from: 'SYSTEM',
      to: miner,
      amount,
      data: { type: 'block_reward' },
    });
  }

  /**
   * Create a Zakat transaction (charitable obligation)
   */
  static createZakat({ from, to, amount, memo }) {
    return new Transaction({
      type: TX_TYPES.ZAKAT,
      from,
      to,
      amount,
      data: {
        category: 'zakat',
        memo: memo || 'Zakat payment — 2.5% obligatory charity',
        islamicCompliant: true,
      },
    });
  }

  /**
   * Create a Sadaqah transaction (voluntary charity)
   */
  static createSadaqah({ from, to, amount, memo }) {
    return new Transaction({
      type: TX_TYPES.SADAQAH,
      from,
      to,
      amount,
      data: {
        category: 'sadaqah',
        memo: memo || 'Sadaqah — voluntary charity',
        islamicCompliant: true,
      },
    });
  }

  /**
   * Create a Halal Payment transaction
   */
  static createHalalPayment({ from, to, amount, description, invoiceId }) {
    return new Transaction({
      type: TX_TYPES.HALAL_PAYMENT,
      from,
      to,
      amount,
      data: {
        category: 'halal_payment',
        description: description || 'Halal-verified payment',
        invoiceId: invoiceId || null,
        islamicCompliant: true,
        interestFree: true,
      },
    });
  }

  /**
   * Create a Waqf transaction (Islamic endowment)
   */
  static createWaqf({ from, amount, purpose, beneficiary }) {
    return new Transaction({
      type: TX_TYPES.WAQF,
      from,
      to: beneficiary || 'WAQF_FUND',
      amount,
      data: {
        category: 'waqf',
        purpose: purpose || 'Islamic endowment',
        islamicCompliant: true,
        irrevocable: true,
      },
    });
  }

  /**
   * Create an Islamic Loan (Qard al-Hasan — interest-free)
   */
  static createIslamicLoan({ from, to, amount, returnDate, memo }) {
    return new Transaction({
      type: TX_TYPES.ISLAMIC_LOAN,
      from,
      to,
      amount,
      data: {
        category: 'qard_al_hasan',
        memo: memo || 'Interest-free Islamic loan',
        returnDate: returnDate || null,
        islamicCompliant: true,
        interestFree: true,
        interestRate: 0,
      },
    });
  }

  /**
   * Create a stake transaction
   */
  static createStake({ from, amount, lockPeriod }) {
    return new Transaction({
      type: TX_TYPES.STAKE,
      from,
      to: 'STAKE_POOL',
      amount,
      data: {
        lockPeriod: lockPeriod || 30, // days
        stakedAt: Date.now(),
        expectedRewardRate: 0.05, // 5% annual
      },
    });
  }

  /**
   * Create an unstake transaction
   */
  static createUnstake({ from, amount }) {
    return new Transaction({
      type: TX_TYPES.UNSTAKE,
      from: 'STAKE_POOL',
      to: from,
      amount,
      data: {
        unstakedAt: Date.now(),
      },
    });
  }

  /**
   * Create a staking reward transaction
   */
  static createStakingReward({ to, amount, stakedAmount, period }) {
    return new Transaction({
      type: TX_TYPES.STAKING_REWARD,
      from: 'SYSTEM',
      to,
      amount,
      data: {
        type: 'staking_reward',
        stakedAmount,
        period,
        rewardRate: 0.05,
      },
    });
  }

  /**
   * Calculate founder royalty for a given amount
   */
  static calculateFounderRoyalty(amount) {
    return {
      royalty: +(amount * FOUNDER_ROYALTY_RATE).toFixed(8),
      net: +(amount * (1 - FOUNDER_ROYALTY_RATE)).toFixed(8),
      rate: FOUNDER_ROYALTY_RATE,
      founder: FOUNDER_ADDRESS,
    };
  }
}

module.exports = { Transaction, TX_TYPES, FOUNDER_ROYALTY_RATE, FOUNDER_ADDRESS };
