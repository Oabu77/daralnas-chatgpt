/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * QuranChain Block
 * ================
 * Core block structure for the QuranChain Mainnet.
 * Each block contains transactions (verse authentications, data hashes, transfers)
 * and is cryptographically chained to the previous block.
 *
 * Founder: Omar Mohammad Abunadi™
 */

const crypto = require('crypto');

class Block {
  constructor({ index, timestamp, transactions, previousHash, nonce = 0, difficulty = 4, miner = null }) {
    this.index = index;
    this.timestamp = timestamp || Date.now();
    this.transactions = transactions || [];
    this.previousHash = previousHash || '0'.repeat(64);
    this.nonce = nonce;
    this.difficulty = difficulty;
    this.miner = miner;
    this.merkleRoot = this.calculateMerkleRoot();
    this.hash = this.calculateHash();
  }

  calculateHash() {
    const data = JSON.stringify({
      index: this.index,
      timestamp: this.timestamp,
      transactions: this.transactions,
      previousHash: this.previousHash,
      nonce: this.nonce,
      merkleRoot: this.merkleRoot,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  calculateMerkleRoot() {
    if (!this.transactions || this.transactions.length === 0) {
      return crypto.createHash('sha256').update('empty').digest('hex');
    }

    let hashes = this.transactions.map(tx =>
      crypto.createHash('sha256').update(JSON.stringify(tx)).digest('hex')
    );

    while (hashes.length > 1) {
      const newHashes = [];
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = hashes[i + 1] || left;
        newHashes.push(
          crypto.createHash('sha256').update(left + right).digest('hex')
        );
      }
      hashes = newHashes;
    }

    return hashes[0];
  }

  /**
   * Mine the block - Proof of Work
   * Find a nonce such that the hash starts with `difficulty` zeros
   */
  mine(difficulty) {
    const target = '0'.repeat(difficulty || this.difficulty);
    const startTime = Date.now();

    while (this.hash.substring(0, target.length) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }

    const elapsed = Date.now() - startTime;
    return { hash: this.hash, nonce: this.nonce, timeMs: elapsed };
  }

  /**
   * Validate block integrity
   */
  isValid() {
    if (this.hash !== this.calculateHash()) return false;
    if (this.merkleRoot !== this.calculateMerkleRoot()) return false;
    const target = '0'.repeat(this.difficulty);
    if (this.hash.substring(0, target.length) !== target) return false;
    return true;
  }

  toJSON() {
    return {
      index: this.index,
      timestamp: this.timestamp,
      transactions: this.transactions,
      previousHash: this.previousHash,
      hash: this.hash,
      nonce: this.nonce,
      difficulty: this.difficulty,
      merkleRoot: this.merkleRoot,
      miner: this.miner,
      txCount: this.transactions.length,
    };
  }

  static fromJSON(json) {
    const block = new Block({
      index: json.index,
      timestamp: json.timestamp,
      transactions: json.transactions,
      previousHash: json.previousHash,
      nonce: json.nonce,
      difficulty: json.difficulty,
      miner: json.miner,
    });
    block.hash = json.hash;
    block.merkleRoot = json.merkleRoot;
    return block;
  }
}

module.exports = Block;
