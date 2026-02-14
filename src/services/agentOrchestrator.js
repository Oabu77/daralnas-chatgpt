/**
 * Agent Orchestrator — AI Revenue Agent Management
 * =================================================
 * Manages lifecycle, routing, and monitoring for all AI revenue-generating agents.
 * Integrates with Stripe, DarCloud, QuranChain blockchain, and FungiMesh.
 *
 * Founder: Omar Mohammad Abunadi™
 */

const crypto = require('crypto');
const EventEmitter = require('events');

class Agent extends EventEmitter {
  constructor(config) {
    super();
    this.id = crypto.randomBytes(8).toString('hex');
    this.name = config.name;
    this.description = config.description || '';
    this.capabilities = config.capabilities || [];
    this.tools = config.tools || [];
    this.status = 'initialized';
    this.metrics = {
      requestsHandled: 0,
      revenue: 0,
      errors: 0,
      uptime: Date.now(),
    };
  }

  async process(data) {
    this.metrics.requestsHandled++;
    this.status = 'processing';
    try {
      // Route to capability handler
      const result = await this._executeCapability(data);
      this.status = 'idle';
      return result;
    } catch (err) {
      this.metrics.errors++;
      this.status = 'error';
      throw err;
    }
  }

  async _executeCapability(data) {
    // Default capability execution — subclasses/plugins can override
    return {
      agentId: this.id,
      agentName: this.name,
      action: data.action || 'default',
      result: 'processed',
      timestamp: new Date().toISOString(),
    };
  }

  async getStatus() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      capabilities: this.capabilities,
      tools: this.tools,
      metrics: {
        ...this.metrics,
        uptimeSeconds: Math.floor((Date.now() - this.metrics.uptime) / 1000),
      },
    };
  }
}

// Global agent registry
const agents = new Map();

/**
 * Create and register a new sub-agent
 */
async function runSubagent(config) {
  const agent = new Agent(config);
  agents.set(agent.name, agent);
  agent.status = 'running';
  console.log(`  🤖 Agent started: ${agent.name} (${agent.capabilities.length} capabilities, ${agent.tools.length} tools)`);
  return agent;
}

/**
 * Get a running agent by name
 */
function getAgent(name) {
  return agents.get(name);
}

/**
 * List all running agents
 */
function listAgents() {
  return Array.from(agents.values()).map(a => ({
    id: a.id,
    name: a.name,
    status: a.status,
    capabilities: a.capabilities.length,
    tools: a.tools.length,
    requests: a.metrics.requestsHandled,
  }));
}

/**
 * Graceful shutdown of all agents
 */
async function shutdownAll() {
  for (const [name, agent] of agents) {
    agent.status = 'stopped';
    agent.emit('shutdown');
  }
  agents.clear();
  console.log('  🤖 All agents shutdown');
}

module.exports = { runSubagent, getAgent, listAgents, shutdownAll, Agent };
