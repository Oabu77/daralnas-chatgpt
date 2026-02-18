# QuranChain-OS DNS Configuration Guide

**Purpose:** Instructions for updating DNS records to point to production server  
**Target IP:** 192.168.1.98  
**Primary Domain:** darcloud.host  

---

## 📋 QuranChain-OS DNS Configuration Guide

IMPORTANT: You must have control of your DNS provider to complete this step.

Production Server Details:
  IP Address: 192.168.1.98
  Hostname: omar-GL75-Leopard-10SDK
  Primary Domain: darcloud.host

════════════════════════════════════════════════════════════
REQUIRED DNS RECORDS
════════════════════════════════════════════════════════════

Create the following DNS records in your provider's dashboard:

1. ROOT DOMAIN
   Type: A
   Name: darcloud.host
   Value: 192.168.1.98
   TTL: 300 (5 minutes for faster propagation)

2. WILDCARD SUBDOMAIN (covers all subdomains)
   Type: A
   Name: *.darcloud.host
   Value: 192.168.1.98
   TTL: 300

3. OPTIONAL: Specific Subdomains (for clarity)
   Type: A
   Name: api.darcloud.host
   Value: 192.168.1.98
   TTL: 300

   Type: A
   Name: mesh.darcloud.host
   Value: 192.168.1.98
   TTL: 300

   Type: A
   Name: blockchain.darcloud.host
   Value: 192.168.1.98
   TTL: 300

   Type: A
   Name: gaming.darcloud.host
   Value: 192.168.1.98
   TTL: 300

════════════════════════════════════════════════════════════
VERIFICATION STEPS
════════════════════════════════════════════════════════════

After adding DNS records (wait 5-10 minutes for propagation):

1. Check DNS Resolution:
   nslookup darcloud.host
   nslookup mesh.darcloud.host
   nslookup api.darcloud.host

2. Test HTTP (redirects to HTTPS):
   curl -i http://darcloud.host/

3. Test HTTPS (self-signed certificate warning expected):
   curl -k https://darcloud.host/health
   curl -k https://api.darcloud.host/health
   curl -k https://mesh.darcloud.host/health

4. Verify Reverse Proxy is working:
   curl -k -H "Host: darcloud.host" https://192.168.1.98/health
   curl -k -H "Host: api.darcloud.host" https://192.168.1.98/api/health

════════════════════════════════════════════════════════════
PRODUCTION SSL CERTIFICATES (Next Step)
════════════════════════════════════════════════════════════

Once DNS is properly configured, generate real Let's Encrypt certificates:

  sudo certbot certonly --nginx \
    -d darcloud.host \
    -d '*.darcloud.host' \
    -m admin@darcloud.host \
    --agree-tos

Then restart Nginx:
  sudo systemctl restart nginx

════════════════════════════════════════════════════════════
CLOUDFLARE DNS SETUP (Recommended)
════════════════════════════════════════════════════════════

If using Cloudflare as DNS provider:

1. Add darcloud.host zone to Cloudflare
2. Create A records:
   - darcloud.host → 192.168.1.98 (Proxied)
   - *.darcloud.host → 192.168.1.98 (Proxied)

3. Cloudflare SSL/TLS Settings:
   - Go to SSL/TLS > Overview
   - Set to "Full (strict)"
   - Under Origin Rules, add:
     * Host: darcloud.host
     * Destination: https://192.168.1.98

4. Update nameservers to Cloudflare (at domain registrar)

════════════════════════════════════════════════════════════
COMMON DNS PROVIDERS
════════════════════════════════════════════════════════════

1. Namecheap
   - Login to account
   - Domain List → Manage
   - Advanced DNS tab
   - Add A records

2. GoDaddy
   - My Products → Domains
   - Manage DNS
   - Add Records
   
3. Google Domains
   - My Domains
   - Manage → DNS
   - Custom records

4. AWS Route 53
   - Hosted zones
   - Create A records

5. Cloudflare (Recommended for API access)
   - Dashboard → Add Site
   - Update nameservers

---

## ✅ Completion Checklist

- [ ] Created A record: darcloud.host → 192.168.1.98
- [ ] Created wildcard record: *.darcloud.host → 192.168.1.98
- [ ] Waited 5-10 minutes for DNS propagation
- [ ] Verified DNS: `nslookup darcloud.host` returns 192.168.1.98
- [ ] Tested HTTPS: `curl -k https://darcloud.host/health`
- [ ] Generated production certificates
- [ ] Restarted services with new certificates

---

**Status:** Ready to deploy after DNS records are created
