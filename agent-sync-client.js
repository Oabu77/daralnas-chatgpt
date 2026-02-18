/**
 * 🔄 Agent Sync Client — Node.js/JS helper for bots to sync with the hub.
 * © QuranChain™ | DarCloud™ | Omar Mohammad Abunadi™
 *
 * Usage:
 *   const { SyncClient } = require('./agent-sync-client');
 *   const sync = new SyncClient('bot_earners', 'Bot Earners', 'bot', 9001);
 *   sync.start();
 *
 *   const taskId = await sync.taskStart('Processing subscriptions');
 *   await sync.log('Handling 225 worker clones...');
 *   await sync.taskComplete(taskId, 'Processed 1,234 subscriptions');
 */

const http = require('http');

const SYNC_HUB_HOST = process.env.SYNC_HUB_HOST || 'localhost';
const SYNC_HUB_PORT = parseInt(process.env.SYNC_HUB_PORT || '9100');
const HEARTBEAT_INTERVAL = parseInt(process.env.SYNC_HEARTBEAT_INTERVAL || '30') * 1000;

class SyncClient {
    constructor(agentId, name, type = 'bot', port = null, capabilities = []) {
        this.agentId = agentId;
        this.name = name || agentId;
        this.type = type;
        this.port = port;
        this.capabilities = capabilities;
        this.status = 'idle';
        this.currentTask = null;
        this.progress = 0;
        this.metadata = {};
        this._heartbeatInterval = null;
    }

    /** Start auto-heartbeats. Call once when your bot starts. */
    start() {
        this._sendHeartbeat();
        this._heartbeatInterval = setInterval(() => {
            this._sendHeartbeat();
        }, HEARTBEAT_INTERVAL);
        console.log(`🔄 Sync client started for '${this.name}' → ${SYNC_HUB_HOST}:${SYNC_HUB_PORT}`);
    }

    /** Stop heartbeats and mark offline. */
    stop() {
        if (this._heartbeatInterval) {
            clearInterval(this._heartbeatInterval);
            this._heartbeatInterval = null;
        }
        this.status = 'offline';
        this._sendHeartbeat();
    }

    /** Report starting a new task. Returns task_id. */
    async taskStart(description, metadata = {}) {
        const taskId = Math.random().toString(36).substring(2, 14);
        this.status = 'busy';
        this.currentTask = description;
        this.progress = 0;

        const res = await this._post('/api/sync/task/start', {
            agent_id: this.agentId,
            task_id: taskId,
            description,
            metadata,
        });
        return res?.task_id || taskId;
    }

    /** Report task completion. */
    async taskComplete(taskId, result = 'success', description = '') {
        this.status = 'idle';
        this.currentTask = null;
        this.progress = 0;

        return this._post('/api/sync/task/complete', {
            agent_id: this.agentId,
            task_id: taskId,
            result,
            description,
        });
    }

    /** Report task failure. */
    async taskFail(taskId, error = 'Unknown error', description = '') {
        this.status = 'idle';
        this.currentTask = null;
        this.progress = 0;

        return this._post('/api/sync/task/fail', {
            agent_id: this.agentId,
            task_id: taskId,
            error,
            description,
        });
    }

    /** Update task progress (0-100). */
    updateProgress(taskId, progress, description = null) {
        this.progress = progress;
        if (description) this.currentTask = description;
    }

    /** Send a log entry to the hub. */
    async log(message, level = 'info', taskId = null) {
        return this._post('/api/sync/log', {
            agent_id: this.agentId,
            message,
            level,
            task_id: taskId,
        });
    }

    /** Send a broadcast to all agents. */
    async broadcast(message, priority = 'normal') {
        return this._post('/api/sync/broadcast', {
            from: this.name,
            message,
            priority,
        });
    }

    /** Set metadata key-value pair. */
    setMetadata(key, value) {
        this.metadata[key] = value;
    }

    // ─── Internal ────────────────────────────────────────────

    _sendHeartbeat() {
        const payload = {
            agent_id: this.agentId,
            name: this.name,
            type: this.type,
            status: this.status,
            host: require('os').hostname(),
            port: this.port,
            capabilities: this.capabilities,
            working_on: this.currentTask,
            progress: this.progress,
            metadata: this.metadata,
        };
        this._post('/api/sync/heartbeat', payload).catch(() => {});
    }

    _post(endpoint, data) {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify(data);
            const options = {
                hostname: SYNC_HUB_HOST,
                port: SYNC_HUB_PORT,
                path: endpoint,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                },
                timeout: 3000,
            };

            const req = http.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => responseData += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(responseData));
                    } catch {
                        resolve({});
                    }
                });
            });

            req.on('error', () => resolve({}));
            req.on('timeout', () => { req.destroy(); resolve({}); });
            req.write(body);
            req.end();
        });
    }
}

module.exports = { SyncClient };
