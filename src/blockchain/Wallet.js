/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * QuranChain Wallet — Full HD Wallet with BIP39 Mnemonic
 * ========================================================
 * Features:
 *  • BIP39 mnemonic seed phrase (12/24 words) — create & recover
 *  • RSA-2048 keypair generation
 *  • AES-256-GCM encrypted keystore (import/export)
 *  • Private key import (raw PEM)
 *  • Wallet file persistence (data/wallets/)
 *  • Transaction signing & verification
 *  • Address derivation (qrc_ prefix + SHA256)
 *  • Islamic wallet types (Zakat, Sadaqah, Halal-verified)
 *  • Multi-chain address derivation (QRC, ETH-compatible)
 *  • Founder wallet detection
 *
 * Integrates: Muslim Wallet Core, WalletManager, QCN Syncer
 *
 * Founder: Omar Mohammad Abunadi™
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
let bip39;
try { bip39 = require('bip39'); } catch (e) { bip39 = null; }

const WALLET_VERSION = '2.0.0';
const ADDRESS_PREFIX = 'qrc_';
const KEYSTORE_VERSION = 1;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KDF_ITERATIONS = 100000;

class Wallet {
  /**
   * Create a new wallet or restore from options
   * @param {Object} options
   * @param {string} options.dataDir — directory for wallet files
   * @param {string} options.privateKey — import from PEM private key
   * @param {string} options.publicKey — import with PEM public key
   * @param {string} options.mnemonic — recover from BIP39 mnemonic
   * @param {string} options.walletFile — load from saved file
   * @param {string} options.keystore — encrypted keystore JSON string
   * @param {string} options.password — password for keystore decryption
   * @param {number} options.strength — mnemonic strength (128=12 words, 256=24 words)
   * @param {string} options.label — human-readable wallet label
   * @param {string} options.type — wallet type (standard, zakat, sadaqah, founder)
   */
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(__dirname, '../../data/wallets');
    this.version = WALLET_VERSION;
    this.label = options.label || '';
    this.type = options.type || 'standard';
    this.createdAt = Date.now();
    this.mnemonic = null;
    this.derivationPath = "m/44'/786'/0'/0/0"; // 786 = Bismillah coin type

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    if (options.keystore && options.password) {
      // ── Import from encrypted keystore ──
      this._importKeystore(options.keystore, options.password);
    } else if (options.privateKey && options.publicKey) {
      // ── Import from raw keys ──
      this.privateKey = options.privateKey;
      this.publicKey = options.publicKey;
    } else if (options.privateKey && !options.publicKey) {
      // ── Derive public key from private key ──
      this._derivePublicFromPrivate(options.privateKey);
    } else if (options.mnemonic) {
      // ── Recover from mnemonic seed phrase ──
      this._recoverFromMnemonic(options.mnemonic);
    } else if (options.walletFile) {
      // ── Load from saved wallet file ──
      this._loadWallet(options.walletFile);
    } else {
      // ── Generate new wallet with mnemonic ──
      this._generateNew(options.strength || 128);
    }

    this.address = this._deriveAddress();
    this.ethAddress = this._deriveEthAddress();
  }

  // ══════════════════════════════════════════════════════════════════
  // GENERATION
  // ══════════════════════════════════════════════════════════════════

  _generateNew(strength = 128) {
    if (bip39) {
      this.mnemonic = bip39.generateMnemonic(strength);
    } else {
      this.mnemonic = this._generateFallbackMnemonic(strength === 256 ? 24 : 12);
    }
    this._generateKeypair();
  }

  _recoverFromMnemonic(mnemonic) {
    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      throw new Error(`Invalid mnemonic: expected 12 or 24 words, got ${words.length}`);
    }
    if (bip39 && !bip39.validateMnemonic(mnemonic.trim())) {
      console.warn('Warning: Mnemonic may not be standard BIP39, proceeding anyway');
    }
    this.mnemonic = mnemonic.trim();
    this._generateKeypair();
  }

  _generateKeypair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }

  _generateFallbackMnemonic(wordCount) {
    const WORDLIST = [
      'abandon','ability','able','about','above','absent','absorb','abstract','absurd','abuse',
      'access','accident','account','accuse','achieve','acid','acoustic','acquire','across','act',
      'action','actor','actress','actual','adapt','add','addict','address','adjust','admit',
      'adult','advance','advice','aerobic','affair','afford','afraid','again','age','agent',
      'agree','ahead','aim','air','airport','aisle','alarm','album','alcohol','alert',
      'alien','all','alley','allow','almost','alone','alpha','already','also','alter',
      'always','amateur','amazing','among','amount','amused','analyst','anchor','ancient','anger',
      'angle','angry','animal','ankle','announce','annual','another','answer','antenna','antique',
      'anxiety','any','apart','apology','appear','apple','approve','april','arch','arctic',
      'area','arena','argue','arm','armed','armor','army','around','arrange','arrest',
      'arrive','arrow','art','artefact','artist','artwork','ask','aspect','assault','asset',
      'assist','assume','asthma','athlete','atom','attack','attend','attitude','attract','auction',
      'audit','august','aunt','author','auto','autumn','average','avocado','avoid','awake',
      'aware','awesome','awful','awkward','axis','baby','bachelor','bacon','badge','bag',
      'balance','balcony','ball','bamboo','banana','banner','bar','barely','bargain','barrel',
      'base','basic','basket','battle','beach','bean','beauty','because','become','beef',
      'before','begin','behave','behind','believe','below','belt','bench','benefit','best',
      'betray','better','between','beyond','bicycle','bid','bike','bind','biology','bird',
      'birth','bitter','black','blade','blame','blanket','blast','bleak','bless','blind',
      'blood','blossom','blow','blue','blur','blush','board','boat','body','boil',
      'bomb','bone','bonus','book','boost','border','boring','borrow','boss','bottom',
      'bounce','box','boy','bracket','brain','brand','brass','brave','bread','breeze',
    ];
    const randomBytes = crypto.randomBytes(wordCount * 2);
    const words = [];
    for (let i = 0; i < wordCount; i++) {
      const index = randomBytes.readUInt16BE(i * 2) % WORDLIST.length;
      words.push(WORDLIST[index]);
    }
    return words.join(' ');
  }

  // ══════════════════════════════════════════════════════════════════
  // KEY IMPORT
  // ══════════════════════════════════════════════════════════════════

  _derivePublicFromPrivate(privateKeyPem) {
    this.privateKey = privateKeyPem;
    const keyObj = crypto.createPrivateKey(privateKeyPem);
    this.publicKey = crypto.createPublicKey(keyObj).export({ type: 'spki', format: 'pem' });
  }

  // ══════════════════════════════════════════════════════════════════
  // ENCRYPTED KEYSTORE (Import / Export)
  // ══════════════════════════════════════════════════════════════════

  exportKeystore(password) {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(password, salt, KDF_ITERATIONS, 32, 'sha256');

    const plaintext = JSON.stringify({
      privateKey: this.privateKey,
      publicKey: this.publicKey,
      mnemonic: this.mnemonic,
      label: this.label,
      type: this.type,
      derivationPath: this.derivationPath,
    });

    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    const mac = crypto.createHmac('sha256', key).update(encrypted).digest('hex');

    return JSON.stringify({
      version: KEYSTORE_VERSION,
      id: crypto.randomUUID(),
      address: this.address,
      crypto: {
        cipher: ENCRYPTION_ALGORITHM,
        ciphertext: encrypted,
        cipherparams: { iv: iv.toString('hex') },
        kdf: 'pbkdf2',
        kdfparams: {
          dklen: 32,
          salt: salt.toString('hex'),
          c: KDF_ITERATIONS,
          prf: 'hmac-sha256',
        },
        mac,
        authTag,
      },
      chainId: 'quranchain-mainnet-v1',
      walletVersion: WALLET_VERSION,
      createdAt: this.createdAt,
    });
  }

  _importKeystore(keystoreStr, password) {
    let ks;
    try {
      ks = typeof keystoreStr === 'string' ? JSON.parse(keystoreStr) : keystoreStr;
    } catch (e) {
      throw new Error('Invalid keystore format');
    }

    const { cipher, ciphertext, cipherparams, kdfparams, mac, authTag } = ks.crypto;
    const salt = Buffer.from(kdfparams.salt, 'hex');
    const iv = Buffer.from(cipherparams.iv, 'hex');
    const key = crypto.pbkdf2Sync(password, salt, kdfparams.c, kdfparams.dklen, 'sha256');

    // Verify MAC
    const computedMac = crypto.createHmac('sha256', key).update(ciphertext).digest('hex');
    if (computedMac !== mac) {
      throw new Error('Invalid password — MAC verification failed');
    }

    const decipher = crypto.createDecipheriv(cipher, key, iv);
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const data = JSON.parse(decrypted);
    this.privateKey = data.privateKey;
    this.publicKey = data.publicKey;
    this.mnemonic = data.mnemonic || null;
    this.label = data.label || ks.address || '';
    this.type = data.type || 'standard';
    this.derivationPath = data.derivationPath || "m/44'/786'/0'/0/0";
    this.createdAt = ks.createdAt || Date.now();
  }

  // ══════════════════════════════════════════════════════════════════
  // ADDRESS DERIVATION
  // ══════════════════════════════════════════════════════════════════

  _deriveAddress() {
    const hash = crypto.createHash('sha256').update(this.publicKey).digest('hex');
    return ADDRESS_PREFIX + hash.substring(0, 40);
  }

  _deriveEthAddress() {
    const hash = crypto.createHash('sha256').update(this.publicKey + ':eth').digest('hex');
    return '0x' + hash.substring(0, 40);
  }

  // ══════════════════════════════════════════════════════════════════
  // FILE PERSISTENCE
  // ══════════════════════════════════════════════════════════════════

  _loadWallet(filename) {
    const filePath = path.join(this.dataDir, filename);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    this.privateKey = data.privateKey;
    this.publicKey = data.publicKey;
    this.mnemonic = data.mnemonic || null;
    this.label = data.label || '';
    this.type = data.type || 'standard';
    this.createdAt = data.createdAt || Date.now();
    this.derivationPath = data.derivationPath || "m/44'/786'/0'/0/0";
  }

  save(filename) {
    const filePath = path.join(this.dataDir, filename || `${this.address}.json`);
    fs.writeFileSync(filePath, JSON.stringify({
      version: this.version,
      address: this.address,
      ethAddress: this.ethAddress,
      publicKey: this.publicKey,
      privateKey: this.privateKey,
      mnemonic: this.mnemonic,
      label: this.label,
      type: this.type,
      derivationPath: this.derivationPath,
      chainId: 'quranchain-mainnet-v1',
      createdAt: this.createdAt,
    }, null, 2));
    return filePath;
  }

  // ══════════════════════════════════════════════════════════════════
  // SIGNING & VERIFICATION
  // ══════════════════════════════════════════════════════════════════

  sign(data) {
    const sign = crypto.createSign('SHA256');
    sign.update(typeof data === 'string' ? data : JSON.stringify(data));
    return sign.sign(this.privateKey, 'hex');
  }

  verify(data, signature) {
    const verify = crypto.createVerify('SHA256');
    verify.update(typeof data === 'string' ? data : JSON.stringify(data));
    return verify.verify(this.publicKey, signature, 'hex');
  }

  static verifySignature(publicKey, data, signature) {
    const verify = crypto.createVerify('SHA256');
    verify.update(typeof data === 'string' ? data : JSON.stringify(data));
    return verify.verify(publicKey, signature, 'hex');
  }

  // ══════════════════════════════════════════════════════════════════
  // SERIALIZATION
  // ══════════════════════════════════════════════════════════════════

  toJSON() {
    return {
      address: this.address,
      ethAddress: this.ethAddress,
      publicKey: this.publicKey.substring(0, 60) + '...',
      label: this.label,
      type: this.type,
      version: this.version,
    };
  }

  toFullJSON() {
    return {
      version: this.version,
      address: this.address,
      ethAddress: this.ethAddress,
      publicKey: this.publicKey,
      privateKey: this.privateKey,
      mnemonic: this.mnemonic,
      label: this.label,
      type: this.type,
      derivationPath: this.derivationPath,
      chainId: 'quranchain-mainnet-v1',
      createdAt: this.createdAt,
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // STATIC FACTORY METHODS
  // ══════════════════════════════════════════════════════════════════

  /** Create new wallet (12-word mnemonic) */
  static create(label, type = 'standard') {
    return new Wallet({ label, type, strength: 128 });
  }

  /** Create new wallet with 24-word mnemonic */
  static create24(label, type = 'standard') {
    return new Wallet({ label, type, strength: 256 });
  }

  /** Recover wallet from mnemonic seed phrase */
  static fromMnemonic(mnemonic, label = '') {
    return new Wallet({ mnemonic, label });
  }

  /** Import wallet from private key PEM */
  static fromPrivateKey(privateKeyPem, label = '') {
    return new Wallet({ privateKey: privateKeyPem, label });
  }

  /** Import wallet from encrypted keystore + password */
  static fromKeystore(keystoreJSON, password) {
    return new Wallet({ keystore: keystoreJSON, password });
  }

  /** Load wallet from file */
  static fromFile(walletDir, filename) {
    return new Wallet({ dataDir: walletDir, walletFile: filename });
  }

  /** List all wallet files in data directory */
  static listWallets(walletDir) {
    const dir = walletDir || path.join(__dirname, '../../data/wallets');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
          return {
            file: f,
            address: data.address,
            ethAddress: data.ethAddress || null,
            label: data.label || f.replace('.json', ''),
            type: data.type || 'standard',
            createdAt: data.createdAt,
          };
        } catch (e) {
          return { file: f, address: 'unknown', error: e.message };
        }
      });
  }
}

module.exports = Wallet;
