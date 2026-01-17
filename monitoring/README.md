# Monitoring Stack for DarCloud

This directory contains the configuration for the monitoring stack used to track system health, performance, and availability.

## Components

### Prometheus
- **Port**: 9090 (localhost only)
- **Purpose**: Metrics collection and storage
- **Retention**: 15 days
- **Data**: Stored in Docker volume `prometheus-data`

### Grafana
- **Port**: 3000 (localhost only)
- **Purpose**: Visualization and dashboards
- **Default credentials**: admin / admin (change on first login)
- **Data**: Stored in Docker volume `grafana-data`

### Node Exporter
- **Port**: 9100 (localhost only)
- **Purpose**: System metrics (CPU, memory, disk, network)

### cAdvisor
- **Port**: 8080 (localhost only)
- **Purpose**: Docker container metrics

## Quick Start

### 1. Deploy Monitoring Stack

```bash
# Navigate to the repository
cd /opt/daralnas/apps/daralnas-chatgpt/monitoring

# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services are running
docker-compose -f docker-compose.monitoring.yml ps

# Check logs
docker-compose -f docker-compose.monitoring.yml logs -f
```

### 2. Access Dashboards

**Prometheus**: http://localhost:9090
- View metrics
- Check targets: http://localhost:9090/targets
- Query metrics using PromQL

**Grafana**: http://localhost:3000
- Default login: admin / admin
- Change password on first login
- Prometheus datasource is pre-configured

### 3. Configure Grafana Dashboards

Recommended dashboards to import:

1. **Node Exporter Full** - ID: 1860
   - System metrics (CPU, memory, disk, network)
   
2. **Docker Container & Host Metrics** - ID: 10619
   - Docker container performance
   
3. **Prometheus Stats** - ID: 2
   - Prometheus internal metrics

To import:
1. Go to Grafana → Dashboards → Import
2. Enter dashboard ID
3. Select Prometheus datasource
4. Click Import

## Configuration

### Prometheus Configuration

Edit `prometheus/prometheus.yml` to add new scrape targets:

```yaml
scrape_configs:
  - job_name: 'my-service'
    static_configs:
      - targets: ['host.docker.internal:8080']
        labels:
          service: 'my-service'
```

After editing, reload Prometheus:

```bash
# Reload configuration without restart
docker exec prometheus kill -HUP 1

# Or restart the container
docker-compose -f docker-compose.monitoring.yml restart prometheus
```

### Grafana Configuration

Grafana is configured via provisioning files in `grafana/provisioning/`:

- `datasources/` - Pre-configured datasources
- `dashboards/` - Dashboard provisioning (to be added)

### Environment Variables

Configure via `.env` file or export before starting:

```bash
# Grafana admin password (change this!)
export GRAFANA_ADMIN_PASSWORD="your-secure-password"

# Prometheus retention period
export PROMETHEUS_RETENTION="15d"

# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d
```

## Monitoring Targets

### Current Targets

| Service | Endpoint | Metrics Path |
|---------|----------|--------------|
| Prometheus | localhost:9090 | /metrics |
| Node Exporter | node-exporter:9100 | /metrics |
| cAdvisor | cadvisor:8080 | /metrics |
| QC Agent | host.docker.internal:7444 | /metrics |
| Telegram Bot | host.docker.internal:8000 | /metrics |

### Adding New Targets

1. Ensure your service exposes metrics at `/metrics` endpoint
2. Add to `prometheus/prometheus.yml` under `scrape_configs`
3. Reload Prometheus configuration
4. Verify target in Prometheus UI

## Alerting (Future)

To enable alerting:

1. Create alert rules in `prometheus/alerts/`
2. Deploy Alertmanager
3. Configure notification channels (Email, Slack, PagerDuty, etc.)

Example alert rule:

```yaml
groups:
  - name: system
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 80% for 5 minutes"
```

## Maintenance

### Backup Grafana Dashboards

```bash
# Export all dashboards
docker exec grafana grafana-cli admin export-dashboard > dashboards-backup.json

# Or backup the entire data volume
docker run --rm -v grafana-data:/data -v $(pwd):/backup alpine tar czf /backup/grafana-backup.tar.gz /data
```

### Clean Up Old Data

```bash
# Prometheus automatically manages retention based on --storage.tsdb.retention.time

# To manually clean up Docker volumes (WARNING: deletes all data)
docker-compose -f docker-compose.monitoring.yml down -v
```

### Update Monitoring Stack

```bash
# Pull latest images
docker-compose -f docker-compose.monitoring.yml pull

# Recreate containers with new images
docker-compose -f docker-compose.monitoring.yml up -d
```

## Troubleshooting

### Prometheus Not Scraping Targets

1. Check Prometheus logs:
   ```bash
   docker logs prometheus
   ```

2. Verify targets in Prometheus UI:
   http://localhost:9090/targets

3. Check network connectivity:
   ```bash
   docker exec prometheus wget -O- http://host.docker.internal:7444/health
   ```

### Grafana Not Showing Data

1. Verify Prometheus datasource:
   - Grafana → Configuration → Data Sources → Prometheus
   - Click "Test" button

2. Check time range in dashboard (top right)

3. Verify data exists in Prometheus:
   http://localhost:9090/graph

### High Memory Usage

Prometheus can use significant memory with long retention periods:

1. Reduce retention time in docker-compose.monitoring.yml
2. Limit memory in Docker Compose:
   ```yaml
   prometheus:
     deploy:
       resources:
         limits:
           memory: 2G
   ```

### Cannot Access Grafana

1. Check if service is running:
   ```bash
   docker ps | grep grafana
   ```

2. Check logs:
   ```bash
   docker logs grafana
   ```

3. Verify port mapping:
   ```bash
   docker port grafana
   ```

## Security

### Network Security

All services bind to `127.0.0.1` by default (localhost only). To expose externally:

1. **Use Cloudflare Tunnel** (recommended):
   ```bash
   cloudflared tunnel --url http://127.0.0.1:3000
   ```

2. **Use Reverse Proxy** (nginx/caddy):
   - Configure SSL/TLS
   - Add authentication
   - Rate limiting

### Authentication

- **Grafana**: Username/password authentication enabled
- **Prometheus**: No built-in auth (use reverse proxy)

### Best Practices

1. Change default Grafana password immediately
2. Don't expose Prometheus/Grafana ports directly to internet
3. Use strong passwords for Grafana admin
4. Regular backups of Grafana dashboards
5. Monitor monitoring system health
6. Set up alerts for critical metrics

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Node Exporter](https://github.com/prometheus/node_exporter)
- [cAdvisor](https://github.com/google/cadvisor)

## Support

For issues or questions:
- Check documentation: `CHATGPT_DEPLOYMENT_AGENT.md`
- Review logs: `docker-compose logs -f`
- Contact: ops@daralnas.com
