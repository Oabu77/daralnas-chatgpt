# Quick Reference: Port Manifest Commands

This is a quick reference for the exact commands requested to audit the DarCloud Linux host infrastructure.

## Commands to Run on DarCloud Host

Execute these commands **on the DarCloud Linux host** (not in this repository):

### 1. Get the Port Manifest

```bash
sudo ss -tulpen
```

If the output is very long, capture in chunks:

```bash
sudo ss -tulpen | sed -n '1,200p'
sudo ss -tulpen | sed -n '200,400p'
sudo ss -tulpen | sed -n '400,600p'
```

### 2. Grab UDP Listeners

**Important for calls/TURN/RTP/WireGuard**

```bash
sudo ss -ulpen
```

### 3. Confirm Process Ownership

```bash
sudo ss -tulpenH | awk '{print $5,$7}' | sed 's/users:(("//; s/".*//' | sort -u
```

---

## What to Do With the Output

Once you have the output:

1. **Copy** each command's output
2. **Paste** into [INFRASTRUCTURE_AUDIT.md](./INFRASTRUCTURE_AUDIT.md) in the appropriate sections:
   - Section 1: Port Manifest - TCP Listeners
   - Section 1: Port Manifest - UDP Listeners  
   - Section 1: Port Manifest - Process-to-Port Mapping

3. **Review** the output to identify:
   - ✅ Every port → owning process → purpose
   - ✅ Which ports are UDP (voice/TURN/RTP/WireGuard) vs TCP
   - ✅ Which services are listening on which ports

4. **Fill in** the service port allocation table in Section 2 of INFRASTRUCTURE_AUDIT.md

---

## Expected Information

After pasting the output, the infrastructure team will provide:

- ✅ Complete port → process → purpose mapping
- ✅ TCP vs UDP port classification
- ✅ Hostname map:
  - `meshtalk.internal`
  - `darcloud.internal`
  - `server.internal`
  - `oliveexpress.internal`
  - `bots.internal`
- ✅ The exact `~/.cloudflared/config.yml` ingress block
- ✅ Redundancy bridges/tunnels plan (primary + secondary, failover)

---

## Automated Data Collection

Alternatively, use the provided script to gather all information at once:

```bash
# Make script executable (if not already)
chmod +x scripts/gather-infrastructure-info.sh

# Run with sudo (required for complete port information)
sudo ./scripts/gather-infrastructure-info.sh
```

This will create a timestamped file `infrastructure-audit-YYYYMMDD-HHMMSS.txt` with all the data.

**Review the output file** before sharing, as it may contain sensitive information like public IPs that should be redacted.

---

## Next Steps After Data Collection

1. ✅ Run the commands above on the DarCloud host
2. ✅ Paste output into INFRASTRUCTURE_AUDIT.md
3. ✅ Get the `~/.cloudflared/config.yml` ingress block
4. ✅ Paste cloudflared config into INFRASTRUCTURE_AUDIT.md Section 4
5. ✅ Fill in hostname resolution details (Section 3)
6. ✅ Document redundancy setup (Section 5)
7. ✅ Complete security audit checklist (Section 8)
8. ✅ Test all internal hostnames resolve correctly
9. ✅ Test failover scenarios
10. ✅ Update this documentation with final configuration

---

## Security Note

**Before sharing output:**
- Review for sensitive data (public IPs, API keys, credentials)
- Redact as needed (you can keep ports + process names)
- Ensure no secrets are in the output

**Port numbers and process names are safe to share** for infrastructure documentation.

---

See [INFRASTRUCTURE_AUDIT.md](./INFRASTRUCTURE_AUDIT.md) for the complete documentation template.
