import { Counter, Gauge, Summary } from 'prom-client';
import { AdapterConfig } from '../model';

interface MetricsInfo {
  total: Counter;
  lastDuration: Gauge;
  avgLatency: Summary;
  createdAt: number;
}

const labelNames = ['context_name', 'path'];

class RunTimeMetrics {

  public envMetrics: MetricsInfo;

  constructor() {
    this.initMetrics();
  }

  public triggerMetrics(conf: AdapterConfig, timestamp: number, cost: number) {
    this.envMetrics.total.labels(conf.name, conf.location).inc(1, timestamp);
    this.envMetrics.lastDuration.labels(conf.name, conf.location).set(cost, timestamp);
    this.envMetrics.avgLatency.labels(conf.name, conf.location).observe(cost);
  }

  private initMetrics() {
    this.envMetrics = {} as MetricsInfo;
    this.envMetrics.total = new Counter({
      name: 'total_req',
      help: 'total request number',
      labelNames
    });
    this.envMetrics.lastDuration = new Gauge({
      name: 'last_duration',
      help: 'the last duration or response time of last request',
      labelNames
    });
    this.envMetrics.avgLatency = new Summary({
      name: 'avg_latency',
      help: 'average latency of processing incoming requests',
      percentiles: [0.01, 0.1, 0.5, 0.9, 0.99],
      maxAgeSeconds: 600,
      labelNames
    });
    this.envMetrics.createdAt = Date.now();
  }
}

export const ContextMetrics = new RunTimeMetrics();