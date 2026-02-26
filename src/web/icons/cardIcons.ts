/** Icon mappings for component cards — Iconify icon IDs */

/** Domain "suit" icons (like poker ♠♣♥♦) */
export const domainIcons: Record<string, string> = {
  compute: 'lucide:cpu',
  data: 'lucide:database',
  network: 'lucide:network',
  defense: 'lucide:shield',
  platform: 'lucide:gauge',
};

/** Domain suit colors */
export const domainColors: Record<string, string> = {
  compute: '#3b82f6',
  data: '#22c55e',
  network: '#f59e0b',
  defense: '#ef4444',
  platform: '#a855f7',
};

/** Brand / tech logo per card ID */
export const cardIcons: Record<string, string> = {
  // ── Compute ──
  cmp_ec2: 'logos:aws-ec2',
  cmp_lambda: 'logos:aws-lambda',
  cmp_k8s_pod: 'devicon:kubernetes',
  cmp_worker: 'lucide:users',
  cmp_cron: 'lucide:timer',
  cmp_auto_scaler: 'lucide:scaling',
  cmp_ecs: 'logos:aws-ecs',
  cmp_batch: 'logos:aws-batch',
  cmp_edge_function: 'lucide:cloud-lightning',
  cmp_gpu: 'lucide:cpu',
  cmp_step_functions: 'lucide:git-branch',
  cmp_microservice: 'mdi:docker',

  // ── Data ──
  cmp_postgresql: 'devicon:postgresql',
  cmp_mysql: 'devicon:mysql',
  cmp_mongodb: 'devicon:mongodb',
  cmp_dynamodb: 'logos:aws-dynamodb',
  cmp_aurora: 'logos:aws-aurora',
  cmp_redis: 'devicon:redis',
  cmp_memcached: 'lucide:zap',
  cmp_s3: 'logos:aws-s3',
  cmp_elasticsearch: 'devicon:elasticsearch',
  cmp_timescaledb: 'lucide:clock',
  cmp_kafka: 'logos:kafka-icon',
  cmp_rabbitmq: 'devicon:rabbitmq',
  cmp_sqs: 'logos:aws-sqs',
  cmp_data_warehouse: 'lucide:warehouse',
  cmp_graph_db: 'lucide:share-2',

  // ── Network ──
  cmp_nginx: 'devicon:nginx',
  cmp_kong: 'lucide:door-open',
  cmp_alb: 'logos:aws-elb',
  cmp_cloudfront: 'logos:aws-cloudfront',
  cmp_geodns: 'lucide:globe',
  cmp_rate_limiter: 'lucide:gauge',
  cmp_waf: 'logos:aws-waf',
  cmp_websocket: 'lucide:plug',
  cmp_istio: 'devicon:istio',
  cmp_global_accelerator: 'lucide:rocket',

  // ── Defense ──
  cmp_multi_az: 'lucide:server',
  cmp_circuit_breaker: 'lucide:zap-off',
  cmp_health_check: 'lucide:heart-pulse',
  cmp_failover: 'lucide:repeat',
  cmp_backup: 'lucide:database-backup',
  cmp_dlq: 'lucide:mail-x',
  cmp_idempotency: 'lucide:key',
  cmp_consistency_checker: 'lucide:check-check',
  cmp_dr: 'lucide:shield-check',
  cmp_blue_green: 'lucide:git-compare',
  cmp_chaos_monkey: 'lucide:bug',
  cmp_canary: 'lucide:bird',

  // ── Platform ──
  cmp_prometheus: 'devicon:prometheus',
  cmp_datadog: 'logos:datadog-icon',
  cmp_grafana: 'devicon:grafana',
  cmp_elk: 'devicon:elasticsearch',
  cmp_feature_flag: 'lucide:flag',
  cmp_config_center: 'lucide:settings',
  cmp_vault: 'devicon:vault',
  cmp_audit_log: 'lucide:file-text',
  cmp_encryption: 'lucide:lock',
  cmp_argocd: 'devicon:argocd',
  cmp_terraform: 'devicon:terraform',
};

/**
 * Build an Iconify REST API URL for an icon SVG.
 * Format: https://api.iconify.design/{prefix}/{name}.svg?height={size}
 */
export function getCardIconUrl(iconId: string, size = 48): string {
  const lastColon = iconId.lastIndexOf(':');
  if (lastColon === -1) return '';
  const prefix = iconId.slice(0, lastColon);
  const name = iconId.slice(lastColon + 1);
  return `https://api.iconify.design/${prefix}/${name}.svg?height=${size}`;
}
