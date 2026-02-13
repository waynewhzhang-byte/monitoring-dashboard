/**
 * 调用 getBVDetails 接口并验证拓扑数据是否可解析
 *
 * 用法: npx tsx scripts/call-getBVDetails.ts
 * 会加载 .env.local 中的 OPMANAGER_BASE_URL、OPMANAGER_API_KEY
 */

import path from 'path';
import dotenv from 'dotenv';

// 先加载 .env.local，再使用 process.env
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import axios from 'axios';
import https from 'https';

const BV_NAME = process.env.BV_NAME || process.argv[2] || '新的业务视图';

function main() {
  const baseURL = (process.env.OPMANAGER_BASE_URL || '').replace(/\/$/, '');
  const apiKey = process.env.OPMANAGER_API_KEY || '';

  if (!baseURL || !apiKey) {
    console.error('缺少环境变量: 请在 .env.local 中配置 OPMANAGER_BASE_URL 和 OPMANAGER_API_KEY');
    process.exit(1);
  }

  const url = `${baseURL}/api/json/businessview/getBVDetails`;
  console.log('请求 URL:', url);
  console.log('业务视图名 (bvName):', BV_NAME);
  console.log('');

  const httpsAgent = new https.Agent({ rejectUnauthorized: false });

  axios
    .get(url, {
      params: { apiKey, bvName: BV_NAME },
      timeout: 30000,
      httpsAgent,
      headers: { Accept: 'application/json' },
    })
    .then((res) => {
      const data = res.data;
      console.log('HTTP 状态:', res.status, res.statusText);
      console.log('响应顶层字段:', Object.keys(data).join(', '));
      console.log('');

      // 兼容不同命名：OPM 可能返回 deviceProperties / linkProperties 或其它大小写
      const deviceProps =
        data.deviceProperties ?? data.DeviceProperties ?? data.device_properties ?? [];
      const linkProps =
        data.linkProperties ?? data.LinkProperties ?? data.link_properties ?? [];
      const mapProps = data.mapProperties ?? data.MapProperties ?? data.map_properties ?? null;

      const devices = Array.isArray(deviceProps) ? deviceProps : [];
      const links = Array.isArray(linkProps) ? linkProps : [];

      console.log('--- 拓扑解析结果 ---');
      console.log('节点数 (deviceProperties):', devices.length);
      console.log('边数 (linkProperties):', links.length);
      if (mapProps && typeof mapProps === 'object') {
        console.log('地图信息 (mapProperties):', JSON.stringify(mapProps, null, 2).slice(0, 200) + '...');
      }
      console.log('');

      if (devices.length > 0) {
        const first = devices[0];
        console.log('首个节点样例:', {
          objName: first.objName ?? first.name,
          label: first.label ?? first.displayName,
          type: first.type,
          ipAddress: first.ipAddress ?? first.IpAddress,
          x: first.x,
          y: first.y,
          status: first.status,
        });
      }
      if (links.length > 0) {
        const first = links[0];
        console.log('首条边样例:', {
          source: first.source,
          dest: first.dest,
          name: first.name,
          ifName: first.ifName ?? first.intfDisplayName,
          status: first.status,
        });
      }

      const canParse = devices.length >= 0 && links.length >= 0;
      console.log('');
      console.log(canParse ? '✅ 拓扑数据可正常解析' : '⚠️ 未解析到节点/边，请检查 OPM 返回结构');
    })
    .catch((err: any) => {
      console.error('请求失败:', err.message);
      if (err.response) {
        console.error('HTTP 状态:', err.response.status, err.response.statusText);
        console.error('响应体:', JSON.stringify(err.response.data, null, 2).slice(0, 800));
      }
      process.exit(1);
    });
}

main();
