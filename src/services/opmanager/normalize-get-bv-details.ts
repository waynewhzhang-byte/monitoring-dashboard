/**
 * OpManager getBVDetails 在不同版本/网关下可能返回：
 * - 顶层 deviceProperties / linkProperties
 * - 大小写变体 DeviceProperties、link_properties
 * - 嵌套在 getBVDetails、result、data、BusinessView 等字段内
 *
 * 采集与同步逻辑只消费「展平后」结构，故在此统一归一化。
 */

export type NormalizedBVDetails = {
  deviceProperties: unknown[];
  linkProperties: unknown[];
  mapProperties?: unknown;
};

const NEST_KEYS = [
  'getBVDetails',
  'GetBVDetails',
  'result',
  'data',
  'BusinessView',
  'response',
  'value',
  'payload',
] as const;

function arraysFromLayer(obj: Record<string, unknown>): {
  deviceProperties: unknown[];
  linkProperties: unknown[];
  mapProperties?: unknown;
} {
  const dpRaw =
    obj.deviceProperties ??
    obj.DeviceProperties ??
    obj.device_properties ??
    obj.devices;
  const lpRaw =
    obj.linkProperties ??
    obj.LinkProperties ??
    obj.link_properties ??
    obj.links;
  const mapProps =
    obj.mapProperties ?? obj.MapProperties ?? obj.map_properties ?? undefined;

  return {
    deviceProperties: Array.isArray(dpRaw) ? dpRaw : [],
    linkProperties: Array.isArray(lpRaw) ? lpRaw : [],
    mapProperties: mapProps,
  };
}

/**
 * 从任意嵌套 JSON 中提取 deviceProperties / linkProperties。
 * 若始终找不到数组字段，返回空数组（便于调用方继续 upsert 空拓扑而非误判为「无响应」）。
 */
export function normalizeGetBVDetailsPayload(
  raw: Record<string, unknown> | null | undefined
): NormalizedBVDetails | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const queue: Record<string, unknown>[] = [raw];
  const seen = new Set<object>();

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (seen.has(cur)) {
      continue;
    }
    seen.add(cur);

    const { deviceProperties: dp, linkProperties: lp, mapProperties } =
      arraysFromLayer(cur);
    if (dp.length > 0 || lp.length > 0) {
      return { deviceProperties: dp, linkProperties: lp, mapProperties };
    }

    for (const k of NEST_KEYS) {
      const inner = cur[k];
      if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
        queue.push(inner as Record<string, unknown>);
      }
    }

    for (const v of Object.values(cur)) {
      if (!v || typeof v !== 'object' || Array.isArray(v)) {
        continue;
      }
      const o = v as Record<string, unknown>;
      if (
        'deviceProperties' in o ||
        'DeviceProperties' in o ||
        'device_properties' in o ||
        'linkProperties' in o ||
        'LinkProperties' in o ||
        'link_properties' in o
      ) {
        queue.push(o);
      }
    }
  }

  const fallback = arraysFromLayer(raw);
  return {
    deviceProperties: fallback.deviceProperties,
    linkProperties: fallback.linkProperties,
    mapProperties: fallback.mapProperties,
  };
}
