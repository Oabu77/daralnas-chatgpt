const Web3 = require('web3');
const winston = require('winston');

let web3;

try {
  const infuraUrl = `https://${process.env.ETHEREUM_NETWORK}.infura.io/v3/${process.env.INFURA_PROJECT_ID}`;
  web3 = new Web3(new Web3.providers.HttpProvider(infuraUrl));
  winston.info('Web3 connected to Ethereum network');
} catch (error) {
  winston.error('Web3 connection error:', error);
}

const getWeb3 = () => web3;

const hashData = async (data) => {
  return web3.utils.sha3(JSON.stringify(data));
};

const verifyHash = async (data, hash) => {
  const computedHash = await hashData(data);
  return computedHash === hash;
};

module.exports = {
  getWeb3,
  hashData,
  verifyHash,
};