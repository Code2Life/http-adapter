import { Counter, Gauge, Summary } from 'prom-client';
import { ApplicationConfig, RouteConfig } from '../storage/model';

interface MetricsInfo {
  total: Counter;
  lastDuration: Gauge;
  avgLatency: Summary;
  createdAt: number;
}

const labelNames = ['application', 'route', 'path'];

class RunTimeMetrics {

  public envMetrics: MetricsInfo;

  constructor() {
    this.initMetrics();
  }

  public triggerMetrics(conf: ApplicationConfig, route: RouteConfig, timestamp: number, cost: number) {
    this.envMetrics.total.labels(conf.name, route.name, route.location).inc(1, timestamp);
    this.envMetrics.lastDuration.labels(conf.name, route.name, route.location).set(cost, timestamp);
    this.envMetrics.avgLatency.labels(conf.name, route.name, route.location).observe(cost);
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