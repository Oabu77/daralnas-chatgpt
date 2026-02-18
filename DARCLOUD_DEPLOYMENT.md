# 🚀 DarCloud.host Deployment Guide

**Status**: ✅ READY TO DEPLOY  
**Date**: February 18, 2026  
**Domain**: darcloud.host

---

## 🌟 What's Configured

### ✅ **Custom Domain Setup**
- **Primary**: darcloud.host
- **WWW**: www.darcloud.host
- **API**: api.darcloud.host

### ✅ **Workers AI Integration**
- **Binding**: AI (automatic)
- **Text Generation**: Llama 3.1, Mistral, Phi-2
- **Embeddings**: BGE models
- **Image Generation**: Stable Diffusion XL
- **Endpoints**: `/ai/generate`, `/ai/embeddings`, `/ai/image`

### ✅ **Cloudflare Pages**
- **Directory**: `./public`
- **Contains**: Dashboard, Assistant, Agent interfaces
- **Deploy**: `npm run deploy:pages`

### ✅ **Additional Services**
- **KV Storage**: For caching and state
- **Vectorize**: For AI embeddings and semantic search
- **D1 Database**: 28+ tables already migrated
- **Assets**: Static files served automatically

---

## 🚀 Quick Deployment

### **Option 1: Full Automated Deployment**
```bash
npm run deploy:darcloud
```

This will:
1. ✅ Generate TypeScript types
2. ✅ Apply database migrations
3. ✅ Deploy Worker to Cloudflare
4. ✅ Deploy Pages
5. ✅ Show setup instructions

### **Option 2: Step-by-Step**
```bash
# 1. Generate types
npm run cf-typegen

# 2. Apply migrations
npm run predeploy

# 3. Deploy Worker
npm run deploy

# 4. Deploy Pages
npm run deploy:pages

# 5. Setup domain
npm run setup:domain
```

---

## 🌐 Domain Configuration

### **Automatic Setup (Recommended)**
```bash
npm run setup:domain
```

### **Manual Setup via Cloudflare Dashboard**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Workers & Pages → `daralnas-chatgpt`
3. Settings → Domains & Routes
4. Add Custom Domain:
   - `darcloud.host`
   - `www.darcloud.host`
   - `api.darcloud.host`

### **DNS Configuration**
Add these CNAME records in Cloudflare DNS:

| Type  | Name | Target                                | Proxy  |
|-------|------|---------------------------------------|--------|
| CNAME | @    | daralnas-chatgpt.workers.dev         | ✅ On  |
| CNAME | www  | daralnas-chatgpt.workers.dev         | ✅ On  |
| CNAME | api  | daralnas-chatgpt.workers.dev         | ✅ On  |

---

## 🤖 Workers AI Endpoints

### **Text Generation**
```bash
curl -X POST https://darcloud.host/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain DarCloud platform in 3 sentences",
    "model": "@cf/meta/llama-3.1-8b-instruct",
    "max_tokens": 256
  }'
```

### **Text Embeddings**
```bash
curl -X POST https://darcloud.host/ai/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "text": "DarCloud is a halal cloud platform",
    "model": "@cf/baai/bge-base-en-v1.5"
  }'
```

### **Image Generation**
```bash
curl -X POST https://darcloud.host/ai/image \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A futuristic cloud infrastructure with Islamic architecture",
    "model": "@cf/stabilityai/stable-diffusion-xl-base-1.0"
  }'
```

### **List Available Models**
```bash
curl https://darcloud.host/ai/models
```

### **AI Health Check**
```bash
curl https://darcloud.host/ai/health
```

---

## 📄 Cloudflare Pages

### **Deploy Pages**
```bash
npm run deploy:pages
```

### **Pages Content**
- **Dashboard**: `/dashboard.html`
- **AI Assistant**: `/assistant.html`
- **Fungi Mesh**: `/fungi.html`
- **QuranChain**: `/quranchain.html`
- **MeshTalk**: `/meshtalk.html`
- **OliveExpress**: `/oliveexpress.html`
- **Network**: `/network.html`
- **Revenue**: `/revenue.html`

### **Access**
- Production: `https://darcloud.host/dashboard.html`
- Pages: `https://darcloud-pages.pages.dev`

---

## 🔧 Additional Resources

### **Create KV Namespace** (Optional)
```bash
wrangler kv:namespace create KV
# Update ID in wrangler.jsonc
```

### **Create Vectorize Index** (For AI Embeddings)
```bash
wrangler vectorize create darcloud-vectors \
  --dimensions=768 \
  --metric=cosine
```

### **Check Deployment Status**
```bash
# Worker status
curl https://darcloud.host/fungi/sentinel/health

# AI status
curl https://darcloud.host/ai/health

# List all endpoints
curl https://darcloud.host/
```

---

## 📊 API Endpoints Summary

### **Core Services**
- `GET /` - OpenAPI documentation
- `GET /fungi/sentinel/health` - Health check
- `GET /fungi/sentinel/status` - Infrastructure status

### **Workers AI** (NEW!)
- `POST /ai/generate` - Text generation
- `POST /ai/embeddings` - Text embeddings
- `POST /ai/image` - Image generation
- `GET /ai/models` - List models
- `GET /ai/health` - AI health check

### **OliveExpress™ Logistics**
- `GET /oliveexpress/ports` - List ports
- `POST /oliveexpress/shipments` - Create shipment
- `GET /oliveexpress/corridors` - List corridors

### **Network Management**
- `POST /network/devices` - Register device
- `GET /network/devices` - List devices

### **Mobile Assistant**
- `POST /assistant/chat` - Chat with AI
- `GET /assistant` - PWA interface

### **AI Agents**
- `POST /agents/iran-relief-agent` - Humanitarian ops

---

## 🧪 Testing After Deployment

```bash
# Test Worker
curl https://darcloud.host/fungi/sentinel/health

# Test AI
curl https://darcloud.host/ai/health

# Test API docs
curl https://darcloud.host/ | head -50

# Test Pages
curl https://darcloud.host/dashboard.html | grep -i "darcloud"
```

---

## 🎯 Deployment Checklist

- [x] Workers AI configured in wrangler.jsonc
- [x] AI endpoints created
- [x] Custom domain routes configured
- [x] Pages deployment configured
- [x] TypeScript types generated
- [x] Deployment scripts created
- [ ] Run deployment: `npm run deploy:darcloud`
- [ ] Setup domain: `npm run setup:domain`
- [ ] Verify endpoints
- [ ] Test AI features
- [ ] Monitor logs

---

## 📞 Access URLs

After deployment:

- **Production API**: https://darcloud.host
- **API Endpoint**: https://api.darcloud.host
- **WWW**: https://www.darcloud.host
- **Workers URL**: https://daralnas-chatgpt.oabu77.workers.dev
- **Pages**: https://darcloud-pages.pages.dev
- **API Docs**: https://darcloud.host/

---

## 🚨 Troubleshooting

### Domain not working?
```bash
# Check DNS propagation
dig darcloud.host
nslookup darcloud.host

# Check Cloudflare routing
wrangler tail
```

### AI not responding?
```bash
# Check AI binding
curl https://darcloud.host/ai/health

# Check logs
wrangler tail --format=pretty
```

### Pages not deploying?
```bash
# Deploy manually
wrangler pages deploy public --project-name=darcloud-pages

# Check Pages dashboard
open https://dash.cloudflare.com/pages
```

---

**Ready to deploy! Run: `npm run deploy:darcloud`** 🚀
