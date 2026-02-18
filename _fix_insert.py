#!/usr/bin/env python3
import sys

filepath = '/home/omar/Desktop/QuranChain-OS/src/blockchain-server.js'

with open(filepath, 'r', encoding='utf-8', errors='surrogateescape') as f:
    content = f.read()

# Find the MASTER DASHBOARD comment block
marker = 'MASTER DASHBOARD'
idx = content.find(marker)
if idx == -1:
    print("ERROR: Could not find MASTER DASHBOARD marker")
    sys.exit(1)

# Find the start of the separator line before MASTER DASHBOARD
# Look for "\n// " before the marker
search_area = content[:idx]
# Find the ═══ line (the one right before MASTER DASHBOARD line)
master_line_start = content.rfind('\n', 0, idx)  # start of MASTER DASHBOARD line
separator_line_start = content.rfind('\n', 0, master_line_start)  # start of ═══ line before it

# But we also need to go back one more line before that - there should be a blank line
blank_line_start = content.rfind('\n', 0, separator_line_start)

print(f"Insert point at character offset {separator_line_start}")
print(f"Context before insert: ...{repr(content[separator_line_start-10:separator_line_start+5])}")

new_routes = """
// Ocean full dashboard (all metrics, tiers, flow, security)
app.get('/api/ocean/dashboard', (req, res) => {
  try {
    res.json({
      founder: 'Omar Mohammad Abunadi\u2122',
      platform: 'DarCloud\u2122 Data Ocean',
      description: 'Always-moving ocean of data \u2014 quantum-encrypted, flowing freely across Fungi Mesh, secured by QuranChain, ONLY retrievable by authorized nodes',
      ...dataOcean.getOceanDashboard(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Quantum-secured data retrieval (requires auth token from quantum engine)
app.post('/api/ocean/secure-retrieve', async (req, res) => {
  try {
    const { objectId, nodeId, authToken } = req.body;
    if (!objectId || !nodeId) return res.status(400).json({ error: 'objectId and nodeId required' });
    const authResult = quantumEngine.verifyAuthToken(nodeId, authToken);
    if (!authResult.valid) {
      return res.status(403).json({
        error: 'UNAUTHORIZED \u2014 Node not authenticated via quantum channel',
        reason: authResult.reason || 'Invalid or expired quantum auth token',
        hint: 'POST /api/quantum/authenticate first to get a valid token',
      });
    }
    const data = await dataOcean.retrieveData(objectId, { nodeId, authToken });
    res.json({ success: true, ...data });
  } catch (error) {
    const status = error.message.includes('UNAUTHORIZED') ? 403 : error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});
"""

# Insert between the `});` closing and the ═══ comment block
# separator_line_start points to the \n before "// ═══..."
new_content = content[:separator_line_start] + new_routes + content[separator_line_start:]

with open(filepath, 'w', encoding='utf-8', errors='surrogateescape') as f:
    f.write(new_content)

print("SUCCESS: Inserted two new route handlers")
print(f"File size: {len(content)} -> {len(new_content)}")
