#!/usr/bin/env node
/**
 * AI Bot Manager
 * Creates and executes commands for local bots and agents.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const http = require('http');

const { runSubagent, getAgent } = require('./src/services/agentOrchestrator');

const app = express();
app.use(express.json());

const COMMANDS_PATH = path.join(__dirname, 'bot-commands.json');
const LOG_DIR = path.join(__dirname, 'logs/production');
const LOG_FILE = path.join(LOG_DIR, 'ai-bot-manager.log');

const ALLOWED_SCRIPTS = {
  'email-campaign': { script: 'email-campaign.js', args: ['--campaign'] },
  'social-generate': { script: 'social-media-generator.js', args: ['--generate'] },
  'affiliate-create': { script: 'affiliate-program.js', args: ['--create-affiliate'] },
  'partner-generate': { script: 'partner-outreach.js', args: ['--generate'] },
  'start-marketing-bots': { script: 'start-marketing-bots.sh', args: [] },
  'stop-marketing-bots': { script: 'stop-marketing-bots.sh', args: [] }
};

function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(message);
}

function loadCommands() {
  if (!fs.existsSync(COMMANDS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(COMMANDS_PATH, 'utf8'));
  } catch (err) {
    log(`Failed to load commands: ${err.message}`);
    return {};
  }
}

function saveCommands(commands) {
  fs.writeFileSync(COMMANDS_PATH, JSON.stringify(commands, null, 2));
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', (err) => reject(err));
  });
}

async function executeScriptCommand(command) {
  const spec = ALLOWED_SCRIPTS[command.action];
  if (!spec) {
    throw new Error(`Action not allowed: ${command.action}`);
  }

  const scriptPath = path.join(__dirname, spec.script);
  const args = [...spec.args];
  if (command.payload && Array.isArray(command.payload.args)) {
    args.push(...command.payload.args);
  }

  return new Promise((resolve) => {
    execFile(spec.script.endsWith('.sh') ? 'bash' : 'node', [scriptPath, ...args], { cwd: __dirname }, (err, stdout, stderr) => {
      if (stdout) log(stdout.trim());
      if (stderr) log(stderr.trim());
      if (err) log(`Script error: ${err.message}`);
      resolve({ ok: !err });
    });
  });
}

async function executeHttpCommand(command) {
  const url = command.payload?.url;
  if (!url || !url.startsWith('http://localhost')) {
    throw new Error('Only localhost HTTP commands are allowed.');
  }
  const result = await httpGet(url);
  return { ok: result.status >= 200 && result.status < 300, result };
}

async function executeAgentCommand(command) {
  const type = command.payload?.type;
  if (type === 'spawn') {
    const agent = await runSubagent(command.payload.config || {});
    return { ok: true, agent: await agent.getStatus() };
  }

  if (type === 'action') {
    const agentName = command.payload?.name;
    const action = command.payload?.action;
    const agent = getAgent(agentName);
    if (!agent) throw new Error(`Agent not found: ${agentName}`);
    const result = await agent.process({ action, payload: command.payload?.data });
    return { ok: true, result };
  }

  throw new Error('Unsupported agent command type.');
}

async function executeCommand(command) {
  log(`Executing command: ${command.name} (${command.type})`);
  if (command.type === 'script') {
    return executeScriptCommand(command);
  }
  if (command.type === 'http') {
    return executeHttpCommand(command);
  }
  if (command.type === 'agent') {
    return executeAgentCommand(command);
  }
  throw new Error(`Unsupported command type: ${command.type}`);
}

app.get('/commands', (req, res) => {
  const commands = loadCommands();
  res.json({ commands });
});

app.post('/commands', (req, res) => {
  const commands = loadCommands();
  const { name, description, type, action, payload } = req.body || {};

  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' });
  }

  commands[name] = {
    name,
    description: description || '',
    type,
    action: action || '',
    payload: payload || {},
    createdAt: new Date().toISOString()
  };

  saveCommands(commands);
  res.json({ ok: true, command: commands[name] });
});

app.post('/commands/:name/execute', async (req, res) => {
  const commands = loadCommands();
  const command = commands[req.params.name];
  if (!command) return res.status(404).json({ error: 'command not found' });

  try {
    const result = await executeCommand(command);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

ensureLogDir();

const PORT = process.env.AI_BOT_MANAGER_PORT || 9010;
app.listen(PORT, () => {
  log(`AI Bot Manager listening on port ${PORT}`);
  log('Endpoints: GET /commands, POST /commands, POST /commands/:name/execute');
});
