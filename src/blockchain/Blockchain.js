/**
 * QuranChain Blockchain — Mainnet
 * ================================
 * The QuranChain is a nomadic, decentralized blockchain designed for:
 *  1. Quran verse authentication & immutable preservation
 *  2. Data integrity verification
 *  3. QRC (QuranChain Coin) transactions
 *  4. Decentralized storage anchoring (IPFS CIDs)
 *
 * Nomadic Design:
 *  - Runs from any node, any location, any device
 *  - Self-contained state with file-based persistence
 *  - P2P sync via WebSocket mesh network
 *  - No central authority — consensus by longest valid chain
 *
 * Consensus: Proof of Work (SHA-256 with adjustable difficulty)
 * Block Time Target: 30 seconds
 * Block Reward: 50 QRC (halving every 210,000 blocks)
 * Max Supply: 21,000,000 QRC
 * Difficulty Adjustment: Every 100 blocks
 *
 * Founder & Genesis Miner: Omar Mohammad Abunadi™
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const Block = require('./Block');
const { Transaction, TX_TYPES, FOUNDER_ROYALTY_RATE, FOUNDER_ADDRESS } = require('./Transaction');

// === CHAIN CONSTANTS ===
const CHAIN_ID = 'quranchain-mainnet-v1';
const GENESIS_TIMESTAMP = 1739491200000; // Feb 14 2025 00:00:00 UTC — Founding Date
const BLOCK_REWARD = 50;
const HALVING_INTERVAL = 210000;
const MAX_SUPPLY = 21000000;
const TARGET_BLOCK_TIME = 30000; // 30 seconds
const DIFFICULTY_ADJUSTMENT_INTERVAL = 100;
const INITIAL_DIFFICULTY = 4;
const MAX_TX_PER_BLOCK = 1000;
const MIN_TX_FEE = 0.001;

class Blockchain extends EventEmitter {
  constructor(options = {}) {
    super();
    this.chainId = CHAIN_ID;
    this.dataDir = options.dataDir || path.join(__dirname, '../../data/blockchain');
    this.chain = [];
    this.pendingTransactions = [];
    this.balances = {};
    this.stakes = {};
    this.verseHashes = new Map(); // surah:ayah → blockIndex
    this.dataHashes = new Map(); // hash → blockIndex
    this.difficulty = INITIAL_DIFFICULTY;
    this.mining = false;
    this.nodeId = options.nodeId || crypto.randomUUID();
    this.founder = 'Omar_Mohammad_Abunadi';

    // Ensure data directory
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Load or create genesis
    this._loadChain();
  }

  // === GENESIS ===

  _createGenesisBlock() {
    const genesisTx = new Transaction({
      type: TX_TYPES.GENESIS,
      from: 'SYSTEM',
      to: this.founder,
      amount: BLOCK_REWARD,
      data: {
        message: 'بسم الله الرحمن الرحيم — In the name of Allah, the Most Gracious, the Most Merciful',
        founder: 'Omar Mohammad Abunadi™',
        chain: 'QuranChain Mainnet',
        purpose: 'Immutable preservation and authentication of the Holy Quran through decentralized blockchain technology',
        launched: new Date(GENESIS_TIMESTAMP).toISOString(),
        verse: {
          surah: 1,
          ayah: 1,
          arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
          translation: 'In the name of Allah, the Most Gracious, the Most Merciful',
        },
      },
    });

    // Authenticate Al-Fatiha (7 verses) in genesis
    const alFatiha = [
      { ayah: 1, arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', text: 'In the name of Allah, the Most Gracious, the Most Merciful' },
      { ayah: 2, arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', text: 'All praise is due to Allah, Lord of all the worlds' },
      { ayah: 3, arabic: 'الرَّحْمَٰنِ الرَّحِيمِ', text: 'The Most Gracious, the Most Merciful' },
      { ayah: 4, arabic: 'مَالِكِ يَوْمِ الدِّينِ', text: 'Master of the Day of Judgment' },
      { ayah: 5, arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', text: 'You alone we worship, and You alone we ask for help' },
      { ayah: 6, arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', text: 'Guide us along the Straight Path' },
      { ayah: 7, arabic: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ', text: 'The path of those You have blessed—not those You are displeased with, or those who are astray' },
    ];

    const verseTxs = alFatiha.map(v =>
      Transaction.createVerseAuth({
        surah: 1,
        ayah: v.ayah,
        text: v.text,
        arabicText: v.arabic,
        authenticator: this.founder,
      })
    );

    const genesisBlock = new Block({
      index: 0,
      timestamp: GENESIS_TIMESTAMP,
      transactions: [genesisTx, ...verseTxs].map(tx => tx.toJSON()),
      previousHash: '0'.repeat(64),
      difficulty: INITIAL_DIFFICULTY,
      miner: this.founder,
    });

    // Mine genesis with low difficulty
    genesisBlock.mine(2);

    return genesisBlock;
  }

  // === CHAIN MANAGEMENT ===

  _loadChain() {
    const chainFile = path.join(this.dataDir, 'chain.json');
    if (fs.existsSync(chainFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(chainFile, 'utf8'));
        this.chain = data.blocks.map(b => Block.fromJSON(b));
        this.difficulty = data.difficulty || INITIAL_DIFFICULTY;
        this._rebuildState();
        console.log(`  ⛓️  QuranChain loaded: ${this.chain.length} blocks, difficulty ${this.difficulty}`);
      } catch (err) {
        console.error('  ⚠️  Failed to load chain, creating genesis:', err.message);
        this._initGenesis();
      }
    } else {
      this._initGenesis();
    }
  }

  _initGenesis() {
    console.log('  ⛓️  Creating QuranChain genesis block...');
    const genesis = this._createGenesisBlock();
    this.chain = [genesis];
    this.difficulty = INITIAL_DIFFICULTY;
    this._rebuildState();
    this._saveChain();
    console.log(`  ⛓️  Genesis block mined: ${genesis.hash.substring(0, 16)}...`);
    console.log(`  ⛓️  Al-Fatiha (7 verses) authenticated on-chain`);
    console.log(`  ⛓️  Founder reward: ${BLOCK_REWARD} QRC → ${this.founder}`);
  }

  _saveChain() {
    const chainFile = path.join(this.dataDir, 'chain.json');
    const data = {
      chainId: this.chainId,
      version: '1.0.0',
      difficulty: this.difficulty,
      blocks: this.chain.map(b => b.toJSON()),
      savedAt: Date.now(),
      nodeId: this.nodeId,
    };
    fs.writeFileSync(chainFile, JSON.stringify(data, null, 2));
  }

  /**
   * Rebuild balances, stakes, and hash indexes from chain
   */
  _rebuildState() {
    this.balances = {};
    this.stakes = {};
    this.verseHashes.clear();
    this.dataHashes.clear();

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        // Process balances
        if (tx.type === TX_TYPES.GENESIS || tx.type === TX_TYPES.REWARD) {
          this.balances[tx.to] = (this.balances[tx.to] || 0) + tx.amount;
        } else if (tx.type === TX_TYPES.TRANSFER || tx.type === TX_TYPES.HALAL_PAYMENT || tx.type === TX_TYPES.ISLAMIC_LOAN) {
          this.balances[tx.from] = (this.balances[tx.from] || 0) - tx.amount;
          this.balances[tx.to] = (this.balances[tx.to] || 0) + tx.amount;
        } else if (tx.type === TX_TYPES.ZAKAT || tx.type === TX_TYPES.SADAQAH || tx.type === TX_TYPES.WAQF) {
          this.balances[tx.from] = (this.balances[tx.from] || 0) - tx.amount;
          this.balances[tx.to] = (this.balances[tx.to] || 0) + tx.amount;
        } else if (tx.type === TX_TYPES.STAKE) {
          this.balances[tx.from] = (this.balances[tx.from] || 0) - tx.amount;
          this.stakes[tx.from] = (this.stakes[tx.from] || 0) + tx.amount;
        } else if (tx.type === TX_TYPES.UNSTAKE) {
          this.stakes[tx.to] = (this.stakes[tx.to] || 0) - tx.amount;
          this.balances[tx.to] = (this.balances[tx.to] || 0) + tx.amount;
        } else if (tx.type === TX_TYPES.STAKING_REWARD) {
          this.balances[tx.to] = (this.balances[tx.to] || 0) + tx.amount;
        }

        // Index verse authentications
        if (tx.type === TX_TYPES.VERSE_AUTH && tx.data) {
          const key = `${tx.data.surah}:${tx.data.ayah}`;
          this.verseHashes.set(key, block.index);
        }

        // Index data hashes
        if (tx.type === TX_TYPES.DATA_HASH && tx.data) {
          this.dataHashes.set(tx.data.dataHash, block.index);
        }
      }
    }
  }

  // === MINING ===

  getBlockReward(blockIndex) {
    const halvings = Math.floor(blockIndex / HALVING_INTERVAL);
    if (halvings >= 64) return 0;
    return BLOCK_REWARD / Math.pow(2, halvings);
  }

  getTotalSupply() {
    return Object.values(this.balances).reduce((sum, b) => sum + Math.max(0, b), 0) +
           Object.values(this.stakes).reduce((sum, s) => sum + s, 0);
  }

  adjustDifficulty() {
    if (this.chain.length < DIFFICULTY_ADJUSTMENT_INTERVAL + 1) return this.difficulty;

    const lastBlock = this.chain[this.chain.length - 1];
    const compareBlock = this.chain[this.chain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
    const timeTaken = lastBlock.timestamp - compareBlock.timestamp;
    const expectedTime = TARGET_BLOCK_TIME * DIFFICULTY_ADJUSTMENT_INTERVAL;

    if (timeTaken < expectedTime / 2) {
      this.difficulty = Math.min(this.difficulty + 1, 32);
    } else if (timeTaken > expectedTime * 2) {
      this.difficulty = Math.max(this.difficulty - 1, 1);
    }

    return this.difficulty;
  }

  /**
   * Mine the next block
   */
  async mineBlock(minerAddress) {
    if (this.mining) throw new Error('Already mining');
    this.mining = true;

    try {
      // Adjust difficulty
      if (this.chain.length % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && this.chain.length > 0) {
        this.adjustDifficulty();
      }

      // Select transactions from pool
      const txsToMine = this.pendingTransactions.splice(0, MAX_TX_PER_BLOCK);

      // Distribute staking rewards before mining
      this.distributeStakingRewards();
      // Move any staking rewards into this batch
      const stakingRewards = this.pendingTransactions.splice(0, 100);
      txsToMine.push(...stakingRewards);

      // Add mining reward
      const reward = this.getBlockReward(this.chain.length);
      if (reward > 0) {
        const rewardTx = Transaction.createReward({ miner: minerAddress, amount: reward });
        txsToMine.push(rewardTx.toJSON());
      }

      const lastBlock = this.chain[this.chain.length - 1];
      const newBlock = new Block({
        index: this.chain.length,
        timestamp: Date.now(),
        transactions: txsToMine,
        previousHash: lastBlock.hash,
        difficulty: this.difficulty,
        miner: minerAddress,
      });

      // Mine (Proof of Work)
      const result = newBlock.mine(this.difficulty);

      // Add to chain
      this.chain.push(newBlock);
      this._rebuildState();
      this._saveChain();

      this.emit('block', newBlock.toJSON());

      return {
        block: newBlock.toJSON(),
        reward,
        miningTime: result.timeMs,
        chainLength: this.chain.length,
      };
    } finally {
      this.mining = false;
    }
  }

  // === TRANSACTIONS ===

  addTransaction(tx) {
    if (!tx.type || !TX_TYPES[tx.type]) throw new Error('Invalid transaction type');

    // Validate transfer balance
    if (tx.type === TX_TYPES.TRANSFER) {
      const balance = this.getBalance(tx.from);
      if (balance < tx.amount) throw new Error(`Insufficient balance: ${balance} < ${tx.amount}`);
    }

    // Check for duplicate verse auth
    if (tx.type === TX_TYPES.VERSE_AUTH && tx.data) {
      const key = `${tx.data.surah}:${tx.data.ayah}`;
      if (this.verseHashes.has(key)) {
        throw new Error(`Verse ${key} already authenticated in block ${this.verseHashes.get(key)}`);
      }
    }

    this.pendingTransactions.push(tx);
    this.emit('transaction', tx);
    return tx;
  }

  /**
   * Authenticate a Quran verse on-chain
   */
  authenticateVerse({ surah, ayah, text, arabicText, translation, authenticator }) {
    const tx = Transaction.createVerseAuth({ surah, ayah, text, arabicText, translation, authenticator });
    return this.addTransaction(tx.toJSON());
  }

  /**
   * Store a data hash on-chain
   */
  storeDataHash({ dataHash, description, source }) {
    const tx = Transaction.createDataHash({ dataHash, description, source });
    return this.addTransaction(tx.toJSON());
  }

  /**
   * Transfer QRC 
   */
  transfer({ from, to, amount, memo }) {
    const tx = Transaction.createTransfer({ from, to, amount, memo });
    return this.addTransaction(tx.toJSON());
  }

  // === ISLAMIC FINANCE TRANSACTIONS ===

  /**
   * Zakat payment (obligatory 2.5% charity)
   */
  zakat({ from, to, amount, memo }) {
    if (this.getBalance(from) < amount) throw new Error('Insufficient balance for Zakat');
    const tx = Transaction.createZakat({ from, to, amount, memo });
    return this.addTransaction(tx.toJSON());
  }

  /**
   * Sadaqah (voluntary charity)
   */
  sadaqah({ from, to, amount, memo }) {
    if (this.getBalance(from) < amount) throw new Error('Insufficient balance for Sadaqah');
    const tx = Transaction.createSadaqah({ from, to, amount, memo });
    return this.addTransaction(tx.toJSON());
  }

  /**
   * Halal payment with founder royalty routing
   */
  halalPayment({ from, to, amount, description, invoiceId }) {
    if (this.getBalance(from) < amount) throw new Error('Insufficient balance for Halal payment');
    const royalty = Transaction.calculateFounderRoyalty(amount);
    // Main payment (70%)
    const paymentTx = Transaction.createHalalPayment({ from, to, amount: royalty.net, description, invoiceId });
    this.addTransaction(paymentTx.toJSON());
    // Founder royalty (30%)
    if (royalty.royalty > 0) {
      const royaltyTx = Transaction.createTransfer({ from, to: this.founder, amount: royalty.royalty, memo: `Founder royalty (${(FOUNDER_ROYALTY_RATE * 100)}%) on halal payment` });
      this.addTransaction(royaltyTx.toJSON());
    }
    return { payment: paymentTx.toJSON(), royalty: royalty };
  }

  /**
   * Waqf (Islamic endowment — irrevocable)
   */
  waqf({ from, amount, purpose, beneficiary }) {
    if (this.getBalance(from) < amount) throw new Error('Insufficient balance for Waqf');
    const tx = Transaction.createWaqf({ from, amount, purpose, beneficiary });
    return this.addTransaction(tx.toJSON());
  }

  /**
   * Interest-free Islamic loan (Qard al-Hasan)
   */
  islamicLoan({ from, to, amount, returnDate, memo }) {
    if (this.getBalance(from) < amount) throw new Error('Insufficient balance for loan');
    const tx = Transaction.createIslamicLoan({ from, to, amount, returnDate, memo });
    return this.addTransaction(tx.toJSON());
  }

  // === STAKING ===

  /**
   * Stake QRC for network validation rewards
   * @param {string} from - Address staking
   * @param {number} amount - Amount to stake (min 10 QRC)
   * @param {number} lockPeriod - Lock period in days (default 30)
   */
  stake({ from, amount, lockPeriod }) {
    if (amount < 10) throw new Error('Minimum stake is 10 QRC');
    if (this.getBalance(from) < amount) throw new Error('Insufficient balance for staking');
    const tx = Transaction.createStake({ from, amount, lockPeriod });
    return this.addTransaction(tx.toJSON());
  }

  /**
   * Unstake QRC — return staked coins to balance
   * @param {string} from - Address unstaking
   * @param {number} amount - Amount to unstake
   */
  unstake({ from, amount }) {
    const staked = this.getStake(from);
    if (staked < amount) throw new Error(`Insufficient stake: ${staked} < ${amount}`);
    const tx = Transaction.createUnstake({ from, amount });
    return this.addTransaction(tx.toJSON());
  }

  /**
   * Distribute staking rewards to all stakers
   * Called during mining — 5% annual rate, prorated per block (~30s)
   * @returns {Array} Array of staking reward TXs added
   */
  distributeStakingRewards() {
    const ANNUAL_RATE = 0.05; // 5% annual
    const BLOCKS_PER_YEAR = (365 * 24 * 3600) / 30; // ~1,051,200 blocks/year
    const PER_BLOCK_RATE = ANNUAL_RATE / BLOCKS_PER_YEAR;
    const rewards = [];

    for (const [address, stakedAmount] of Object.entries(this.stakes)) {
      if (stakedAmount <= 0) continue;
      const reward = +(stakedAmount * PER_BLOCK_RATE).toFixed(8);
      if (reward < 0.00000001) continue; // dust threshold

      const rewardTx = Transaction.createStakingReward({
        to: address,
        amount: reward,
        stakedAmount,
        period: '1 block',
      });
      this.pendingTransactions.push(rewardTx.toJSON());
      rewards.push(rewardTx.toJSON());
    }
    return rewards;
  }

  /**
   * Get all stakers and their stakes
   */
  getStakers() {
    return Object.entries(this.stakes)
      .filter(([, amount]) => amount > 0)
      .map(([address, amount]) => ({ address, staked: amount, balance: this.getBalance(address) }))
      .sort((a, b) => b.staked - a.staked);
  }

  // === QUERIES ===

  getBalance(address) {
    return this.balances[address] || 0;
  }

  getStake(address) {
    return this.stakes[address] || 0;
  }

  getHistory(address) {
    const history = [];
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.from === address || tx.to === address) {
          history.push({ ...tx, blockIndex: block.index, blockHash: block.hash });
        }
      }
    }
    return history;
  }

  getBlock(index) {
    return this.chain[index]?.toJSON() || null;
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1]?.toJSON() || null;
  }

  getTransaction(txId) {
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.id === txId) return { ...tx, blockIndex: block.index, blockHash: block.hash };
      }
    }
    return null;
  }

  getVerseAuth(surah, ayah) {
    const key = `${surah}:${ayah}`;
    const blockIndex = this.verseHashes.get(key);
    if (blockIndex === undefined) return null;

    const block = this.chain[blockIndex];
    const tx = block.transactions.find(t =>
      t.type === TX_TYPES.VERSE_AUTH && t.data?.surah === surah && t.data?.ayah === ayah
    );

    return {
      authenticated: true,
      blockIndex,
      blockHash: block.hash,
      timestamp: block.timestamp,
      transaction: tx,
    };
  }

  verifyDataHash(hash) {
    const blockIndex = this.dataHashes.get(hash);
    if (blockIndex === undefined) return { verified: false };

    const block = this.chain[blockIndex];
    return {
      verified: true,
      blockIndex,
      blockHash: block.hash,
      timestamp: block.timestamp,
    };
  }

  getAddressHistory(address) {
    const history = [];
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.from === address || tx.to === address) {
          history.push({ ...tx, blockIndex: block.index, blockHash: block.hash });
        }
      }
    }
    return history;
  }

  // === VALIDATION ===

  isChainValid(chain = this.chain) {
    for (let i = 1; i < chain.length; i++) {
      const current = chain[i];
      const previous = chain[i - 1];

      if (!current.isValid()) return { valid: false, error: `Block ${i} invalid hash`, blockIndex: i };
      if (current.previousHash !== previous.hash) return { valid: false, error: `Block ${i} broken link`, blockIndex: i };
      if (current.index !== i) return { valid: false, error: `Block ${i} wrong index`, blockIndex: i };
    }
    return { valid: true, blocks: chain.length };
  }

  /**
   * Replace chain if a longer valid chain is received (consensus)
   */
  replaceChain(newBlocks) {
    const newChain = newBlocks.map(b => Block.fromJSON(b));
    const validation = this.isChainValid(newChain);

    if (!validation.valid) return { replaced: false, error: validation.error };
    if (newChain.length <= this.chain.length) return { replaced: false, error: 'Chain not longer' };

    this.chain = newChain;
    this._rebuildState();
    this._saveChain();
    this.emit('chainReplaced', { length: this.chain.length });

    return { replaced: true, newLength: this.chain.length };
  }

  // === STATS ===

  getStats() {
    const latestBlock = this.getLatestBlock();
    return {
      chainId: this.chainId,
      blocks: this.chain.length,
      difficulty: this.difficulty,
      latestHash: latestBlock?.hash?.substring(0, 16) + '...',
      pendingTx: this.pendingTransactions.length,
      totalSupply: this.getTotalSupply(),
      maxSupply: MAX_SUPPLY,
      blockReward: this.getBlockReward(this.chain.length),
      halvingIn: HALVING_INTERVAL - (this.chain.length % HALVING_INTERVAL),
      authenticatedVerses: this.verseHashes.size,
      dataHashes: this.dataHashes.size,
      addresses: Object.keys(this.balances).length,
      nodeId: this.nodeId.substring(0, 8),
      mining: this.mining,
      genesisTimestamp: GENESIS_TIMESTAMP,
      founder: this.founder,
      targetBlockTime: TARGET_BLOCK_TIME / 1000 + 's',
    };
  }
}

module.exports = { Blockchain, CHAIN_ID, BLOCK_REWARD, MAX_SUPPLY, TX_TYPES };
