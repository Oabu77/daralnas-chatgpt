# QuranChain Ecosystem Blueprint

This document delivers the requested sovereign ecosystem specification in the required order. All code samples use the mandated stack (TypeScript/NestJS, React, Flutter, PostgreSQL, Redis, WebSockets/WebRTC, S3-compatible storage, libsodium, Docker/Kubernetes). Per the latest direction, the blockchain/ledger layer and the quantum-logic AI components are considered complete and should not be altered; the blueprint below reflects the established implementation without introducing new changes to those domains.

**Stability commitments**
- Ledger (QuranChain) and quantum-logic AI components are frozen; no protocol or data model changes are introduced here.
- All guidance below focuses on integration, deployment, or surrounding platform features without modifying those completed pillars.

**Install & bootstrap (developer runbook)**
- **Prereqs**: Node.js 20.x, pnpm 8.x, Docker, Docker Compose, OpenSSL (for local mTLS certs), and Python 3.10+ (for any supporting scripts).
- **Install deps**: `pnpm install` (JS/TS toolchain) and `pip install -r requirements.txt` (supporting Python tooling if used).
- **Environment**: copy `.env.example` → `.env` and fill service secrets (PostgreSQL/Redis URLs, S3/MinIO keys, JWT signing keys). Generate local Ed25519 keypairs via `openssl genpkey -algorithm Ed25519 -out config/dev-master.key`.
- **Local stack**: `docker compose up -d postgres redis minio nats` (or the provided `docker-compose` profile). Seed initial schemas with `pnpm db:migrate` per service.
- **Dev servers**: run service workers with `pnpm turbo run dev --filter=identity-svc...` (or individual `pnpm start:dev` commands), then start the API gateway and clients; keep ledger/quantum modules untouched.

## 1. System Architecture
- **Platforms**: MeshTalk OS (comms), Dar Al-Nas (community/governance), QuranChain (integrity ledger), Fungi Network (decentralized infra), QuranChain Pay (payments).
- **Core services** (NestJS microservices with gRPC/HTTP + WebSocket gateways):
  - `identity-svc` (QCID issuance, device binding, guardians, role service)
  - `messaging-svc` (1:1/group/channel messaging, WebSocket gateway, WebRTC signaling)
  - `governance-svc` (communities, polls, audit trails)
  - `ledger-svc` (append-only ledger, Merkle proofs, anchoring hooks)
  - `fungi-svc` (libp2p node supervisor, replication, reputation)
  - `payments-svc` (wallets, P2P transfers, community treasuries)
  - `api-gateway` (REST/GraphQL, auth proxy, BFF for web/Flutter)
- **Shared infra**: PostgreSQL (per service schemas, logical replication for read replicas), Redis (sessions, rate limits, presence), MinIO/S3 (blobs, call recordings), NATS/Redis Streams (events), Jaeger/OTel, Prometheus/Grafana, Loki.
- **Protocols**: WebSockets for realtime messaging/presence, WebRTC for calls; libsodium for cryptography; libp2p for Fungi mesh; optional smart contracts for anchoring/treasuries.
- **Networking**: Zero-trust (mTLS between services), sidecars for OPA policy enforcement; ingress via Kubernetes NGINX/Contour; WAF/CDN in front.

## 2. Unified Identity (QCID)
- **Key material**: device-bound Ed25519 keypair (libsodium); optional hardware-keystore binding on mobile.
- **Multi-device**: per-device signing keys linked to a master QCID; session tokens short-lived (JWT signed by identity-svc) with refresh tokens rotated server-side; device list maintained with approval events.
- **Roles**: member, moderator, scholar, council, observer; roles scoped per community; RBAC enforced by OPA sidecar + service-level guards.
- **Recovery guardians**: configurable quorum (e.g., 2 of 3) guardian public keys; recovery request emits on-chain/off-chain event; guardians co-sign new master key.
- **Enrollment flow**: Web/Flutter invokes `POST /qcid/register` (public key + device attest), identity-svc returns QCID + signed device token; optional jurisdiction gating hook.

## 3. Database Schemas (PostgreSQL)
```sql
-- identity-svc
CREATE TABLE qcid_accounts (
  id UUID PRIMARY KEY,
  master_pubkey BYTEA NOT NULL,
  recovery_quorum SMALLINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE qcid_devices (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES qcid_accounts(id),
  device_pubkey BYTEA NOT NULL,
  label TEXT,
  approved_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);
CREATE TABLE guardian_links (
  account_id UUID REFERENCES qcid_accounts(id),
  guardian_pubkey BYTEA NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(account_id, guardian_pubkey)
);
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE
);
CREATE TABLE community_roles (
  community_id UUID,
  account_id UUID,
  role_id INT REFERENCES roles(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(community_id, account_id, role_id)
);

-- messaging-svc
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  type TEXT CHECK (type IN ('direct','group','channel')),
  title TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE conversation_members (
  conversation_id UUID REFERENCES conversations(id),
  account_id UUID,
  role TEXT CHECK (role IN ('member','admin','owner')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(conversation_id, account_id)
);
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  sender_id UUID,
  cipher_text BYTEA NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ,
  metadata JSONB
);

-- governance-svc
CREATE TABLE communities (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE proposals (
  id UUID PRIMARY KEY,
  community_id UUID REFERENCES communities(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT CHECK (status IN ('draft','review','voting','passed','rejected','executed')),
  created_by UUID,
  review_ends_at TIMESTAMPTZ,
  vote_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE votes (
  proposal_id UUID REFERENCES proposals(id),
  voter_id UUID,
  choice TEXT CHECK (choice IN ('yes','no','abstain')),
  weight NUMERIC NOT NULL,
  cast_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(proposal_id, voter_id)
);
CREATE TABLE audits (
  id UUID PRIMARY KEY,
  subject TEXT,
  event JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ledger-svc
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY,
  content_hash BYTEA NOT NULL,
  previous_hash BYTEA,
  author_qcid UUID NOT NULL,
  merkle_root BYTEA NOT NULL,
  signatures JSONB NOT NULL,
  metadata JSONB,
  anchored_tx TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON ledger_entries (content_hash);

-- payments-svc
CREATE TABLE wallets (
  id UUID PRIMARY KEY,
  owner_qcid UUID NOT NULL,
  balance NUMERIC(20,8) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE transfers (
  id UUID PRIMARY KEY,
  from_wallet UUID REFERENCES wallets(id),
  to_wallet UUID REFERENCES wallets(id),
  amount NUMERIC(20,8) NOT NULL,
  tags TEXT[],
  status TEXT CHECK (status IN ('pending','completed','failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE treasuries (
  id UUID PRIMARY KEY,
  community_id UUID REFERENCES communities(id),
  wallet_id UUID REFERENCES wallets(id),
  policy JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 4. Backend Services (code excerpts)
```ts
// identity-svc/src/qcid.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { QcidService } from './qcid.service';
import { RegisterDto } from './dto/register.dto';

@Controller('qcid')
export class QcidController {
  constructor(private readonly service: QcidService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.service.registerDevice(dto);
  }
}

// identity-svc/src/qcid.service.ts
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import sodium from 'libsodium-wrappers';
import { Repository } from 'typeorm';
import { QcidAccount } from './entities/account.entity';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class QcidService {
  constructor(private accounts: Repository<QcidAccount>) {}

  async registerDevice(dto: RegisterDto) {
    await sodium.ready;
    const account = this.accounts.create({
      id: randomUUID(),
      masterPubkey: Buffer.from(dto.masterPubkey, 'base64'),
      recoveryQuorum: dto.recoveryQuorum ?? 2,
    });
    await this.accounts.save(account);
    const token = await this.issueDeviceToken(account.id, dto.devicePubkey);
    return { qcid: account.id, token };
  }

  private async issueDeviceToken(accountId: string, devicePubkey: string) {
    // sign JWT scoped to device; omitted for brevity
    return `token-${accountId}-${devicePubkey}`;
  }
}

// messaging-svc/src/gateway.ts
import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { MessagingService } from './messaging.service';

@WebSocketGateway({ cors: true })
export class MessagingGateway {
  constructor(private service: MessagingService) {}

  @SubscribeMessage('send_message')
  async handleSend(@MessageBody() payload: { conversationId: string; ciphertext: string; sender: string }) {
    await this.service.persistMessage(payload);
    return { status: 'ok' };
  }
}
```

## 5. Client Apps
- **Flutter**: Riverpod + WebSocket channel; device keypair stored in secure storage; WebRTC via flutter_webrtc.
```dart
// lib/qcid_client.dart
import 'package:cryptography/cryptography.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

class QcidClient {
  final storage = const FlutterSecureStorage();
  final algorithm = Ed25519();

  Future<void> initDevice() async {
    final keyPair = await algorithm.newKeyPair();
    final pub = await keyPair.extractPublicKey();
    await storage.write(key: 'device_pub', value: base64.encode(pub.bytes));
  }

  WebSocketChannel connectMessaging(String token) {
    return WebSocketChannel.connect(Uri.parse('wss://api.quranchain.org/ws?token=$token'));
  }
}
```
- **React (web)**: Next.js + React Query; WebRTC via simple-peer; uses BFF for QCID/session tokens.
```tsx
// apps/web/src/hooks/useMessaging.ts
import { useEffect } from 'react';
import ReconnectingWebSocket from 'reconnecting-websocket';

export function useMessaging(token: string, onMessage: (m: any) => void) {
  useEffect(() => {
    const ws = new ReconnectingWebSocket(`wss://api.quranchain.org/ws?token=${token}`);
    ws.onmessage = (ev) => onMessage(JSON.parse(ev.data));
    return () => ws.close();
  }, [token, onMessage]);
}
```

## 6. Security Model
- **Identity**: Ed25519 keys, mandatory TLS, optional E2EE for chats; guardians for recovery; per-community RBAC via OPA.
- **Services**: mTLS between services; JWT validation at gateway; Redis-based rate limits; abuse heuristics on messaging (size, frequency).
- **Data**: Ledger is append-only; messages encrypted client-side (optional); KMS for server-side secrets; S3 bucket policies least privilege.
- **Monitoring**: OTel traces, Prometheus metrics, alerting on auth failures, ledger anchoring gaps, guardian recovery events.
- **Compliance hooks**: jurisdiction gating, audit exports (NDJSON), GDPR delete requests handled by tombstoning while preserving ledger integrity.

## 7. Deployment (Docker + K8s)
```dockerfile
# services/identity-svc/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
CMD ["node", "dist/main.js"]
```
```yaml
# k8s/identity-svc.yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: identity-svc }
spec:
  replicas: 3
  selector: { matchLabels: { app: identity-svc } }
  template:
    metadata: { labels: { app: identity-svc } }
    spec:
      containers:
        - name: identity
          image: ghcr.io/quranchain/identity:latest
          env:
            - name: DATABASE_URL
              valueFrom: { secretKeyRef: { name: identity-secrets, key: db_url } }
            - name: REDIS_URL
              valueFrom: { secretKeyRef: { name: identity-secrets, key: redis_url } }
          ports: [{ containerPort: 3000 }]
---
apiVersion: v1
kind: Service
metadata: { name: identity-svc }
spec:
  selector: { app: identity-svc }
  ports:
    - name: http
      port: 80
      targetPort: 3000
```
- Charts include Redis HA, Postgres operator, MinIO, NATS; ingress with TLS; HorizontalPodAutoscaler for messaging, gateway, identity.

## 8. Scaling Plan
- **Short term**: autoscale messaging gateway on CPU + connection count; Redis cluster for pub/sub; partition conversations by hash.
- **Medium term**: read replicas for Postgres (governance/ledger), CQRS for ledger proofs, S3 lifecycle for cold storage.
- **Long term**: regional K8s clusters with federation; Fungi libp2p mesh for edge nodes; ledger anchoring to public chains; sharded wallets service; multi-region OPA bundles.
