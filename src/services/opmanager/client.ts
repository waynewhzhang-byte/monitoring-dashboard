/**
 * OpManagerClient 仅限服务端使用（API 路由、采集器等）。
 * 请勿在 Client Component 中 import，避免泄露 API Key。
 */
import axios, { AxiosInstance } from 'axios';
import https from 'https';
import {
  OpManagerDevice,
  OpManagerAlarm,
  OpManagerInterface,
  OpManagerListDevicesRawResponse,
  OpManagerGetInterfacesRawResponse,
  OpManagerRawDevice,
} from './types';
import { getMockDataStore } from '@/services/mock/opmanager-mock-data';
import { env } from '@/lib/env';

/** 上次 getInterfaces 调用完成时间（用于限流，避免 OpManager URL_ROLLING_THROTTLES_LIMIT_EXCEEDED） */
let lastGetInterfacesTime = 0;

export class OpManagerClient {
  private client: AxiosInstance;
  private readonly useMock: boolean;

  constructor() {
    // Only use mock when explicitly enabled via env.
    // 真实环境测试开发：避免因为 dev / apiKey 缺失等条件误判为 mock
    // 在服务端环境中，env 会被 zod 验证；本文件通过运行时 window 检测保证仅服务端使用
    const useMockData =
      typeof env.USE_MOCK_DATA !== 'undefined' ? env.USE_MOCK_DATA : false;
    const apiKey =
      typeof env.OPMANAGER_API_KEY !== 'undefined'
        ? env.OPMANAGER_API_KEY
        : '';

    this.useMock = useMockData === true;

    // Log mock mode status (only in server-side)
    if (typeof window === 'undefined') {
      console.log(
        `🔧 OpManagerClient initialized - Mock Mode: ${
          this.useMock ? '✅ ENABLED' : '❌ DISABLED'
        }`
      );
      if (this.useMock) {
        console.log('   Using Mock Data Store instead of real OpManager API');
      } else {
        console.log(
          `   Connecting to OpManager at: ${
            typeof env.OPMANAGER_BASE_URL !== 'undefined'
              ? env.OPMANAGER_BASE_URL
              : 'http://localhost:8061'
          }`
        );
      }
    }

    // Configure HTTPS agent to accept self-signed certificates
    // This is needed for OpManager instances with self-signed SSL certificates
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false, // Accept self-signed certificates
    });

    const baseURL = (
      typeof env.OPMANAGER_BASE_URL !== 'undefined'
        ? env.OPMANAGER_BASE_URL
        : 'http://localhost:8061'
    ).replace(/\/$/, '');
    this.client = axios.create({
      baseURL,
      timeout:
        typeof env.OPMANAGER_TIMEOUT !== 'undefined'
          ? env.OPMANAGER_TIMEOUT
          : 60000, // 默认60秒，适应生产环境
      httpsAgent: httpsAgent, // Use custom HTTPS agent for self-signed certificates
    });

    // Add API Key to Headers
    this.client.interceptors.request.use((config) => {
      if (apiKey) {
        config.headers['apiKey'] = apiKey;
        config.params = { ...config.params, apiKey: apiKey };
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const { logger } = require('@/lib/logger');
        const isTimeout =
          error.code === 'ECONNABORTED' ||
          error.message?.includes('timeout');
        const errorDetails = {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          timeout: error.config?.timeout,
          isTimeout,
        };

        // 超时错误使用warn级别，其他错误使用error级别
        if (isTimeout) {
          logger.warn(
            `OpManager API Timeout [${error.config?.url}]:`,
            errorDetails
          );
        } else {
          logger.error(
            `OpManager API Error [${error.config?.url}]:`,
            errorDetails
          );
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get All Devices (Inventory) - Returns devices array
   * For pagination support, use getDevicesPage() instead
   */
  async getDevices(options?: {
    category?: string;
    type?: string;
    vendorName?: string;
    severity?: string;
    deviceName?: string;
    page?: number;
    rows?: number;
    sortByColumn?: string;
    sortByType?: 'asc' | 'desc';
  }): Promise<OpManagerDevice[]> {
    const result = await this.getDevicesPage(options);
    return result.devices;
  }

  /**
   * Get Devices with Pagination Info
   * Returns both devices array and pagination metadata (total, records, page)
   */
  async getDevicesPage(options?: {
    category?: string;
    type?: string;
    vendorName?: string;
    severity?: string;
    deviceName?: string;
    page?: number;
    rows?: number;
    sortByColumn?: string;
    sortByType?: 'asc' | 'desc';
  }): Promise<{
    devices: OpManagerDevice[];
    total?: number;
    records?: number;
    page?: number;
  }> {
    if (this.useMock) {
      const store = getMockDataStore();
      const mockResponse = store.getDevices({
        category: options?.category,
        page: options?.page,
        rows: options?.rows,
      });
      const devices: OpManagerDevice[] = mockResponse.rows.map((row) => ({
        name: row.deviceName,
        displayName: row.displayName,
        type: row.type,
        ipAddress: row.ipaddress,
        status: row.statusStr,
        machinename: row.deviceName,
        category: row.category,
        vendorName: row.vendorName,
        isManaged: 'true',
        availability: 100,
        tags: row.tags,
      }));
      return {
        devices,
        total: mockResponse.total || devices.length,
        records: mockResponse.records || devices.length,
        page: options?.page || 1,
      };
    }

    try {
      const response = await this.client.get<OpManagerListDevicesRawResponse>(
        '/api/json/v2/device/listDevices',
        {
          params: {
            category: options?.category,
            type: options?.type,
            vendorName: options?.vendorName,
            severity: options?.severity,
            deviceName: options?.deviceName,
            page: options?.page || 1,
            rows: options?.rows || 50,
            sortByColumn: options?.sortByColumn,
            sortByType: options?.sortByType,
          },
        }
      );

      const data = response.data;
      let rawDevices: OpManagerRawDevice[] = [];
      if (data && data.rows) {
        rawDevices = data.rows;
      } else if (data && Array.isArray(data)) {
        rawDevices = data as unknown as OpManagerRawDevice[];
      } else {
        return {
          devices: [],
          total: 0,
          records: 0,
          page: options?.page || 1,
        };
      }

      // Normalize field names: OpManager API may return different casing (ipaddress, Category, Type)
      // Map to consistent format for downstream code
      const normalizedDevices: OpManagerDevice[] = rawDevices.map((dev) => ({
        ...(dev as unknown as OpManagerDevice),
        ipAddress: dev.ipAddress || dev.ipaddress || 'unknown',
        name: dev.name || dev.deviceName || '',
        displayName:
          dev.displayName ??
          dev.DisplayName ??
          dev.name ??
          dev.deviceName ??
          '',
        type: dev.type ?? dev.Type ?? '',
        category: dev.category ?? dev.Category ?? '',
        vendorName: dev.vendorName ?? dev.VendorName ?? dev.vendor ?? '',
        status: (dev as any).statusStr || (dev as any).status || 'UNKNOWN',
        machinename: dev.deviceName || dev.name || '',
        isManaged: 'true',
      }));

      return {
        devices: normalizedDevices,
        total: data.total,
        records: data.records,
        page: data.page,
      };
    } catch (error) {
      const { logger } = require('@/lib/logger');
      logger.error('Failed to fetch devices from OpManager', { error });
      return {
        devices: [],
        total: 0,
        records: 0,
        page: options?.page || 1,
      };
    }
  }

  /**
   * Get Device Interfaces
   */
  async getInterfaces(options?: {
    deviceName?: string;
    deviceIpAddress?: string; // IP address of the device (e.g., "1.1.1.45")
    page?: number;
    rows?: number;
  }): Promise<OpManagerInterface[]> {
    if (this.useMock) {
      const store = getMockDataStore();
      const mockResponse = store.getInterfaces({
        deviceName: options?.deviceName,
        page: options?.page,
        rows: options?.rows,
      });
      return mockResponse.rows.map((row) => ({
        name: row.interfaceName,
        displayName: row.interfaceDisplayName || row.interfaceName,
        status: row.statusStr,
        inTraffic: row.inTraffic,
        outTraffic: row.outTraffic,
        inSpeed: row.inSpeed,
        outSpeed: row.outSpeed,
        ifIndex: row.id,
        ipAddress: row.ipAddress,
        macAddress: (row as any).macAddress, // Should exist on raw mock data if added
        deviceName: row.deviceName,
      }));
    }

    // getInterfaces API: GET /api/json/device/getInterfaces?name={deviceName}
    // 直接使用数据库中存储的设备名称（已包含企业版后缀，如果适用）
    // listDevices 返回的 deviceName 被直接存储到 Device.name/opmanagerId，无需额外处理
    const baseName = (
      options?.deviceName ||
      options?.deviceIpAddress ||
      ''
    ).trim();
    if (!baseName) {
      console.error('getInterfaces: deviceName or deviceIpAddress is required');
      return [];
    }

    const deviceName = (options?.deviceName || '').trim();
    const deviceIp = (options?.deviceIpAddress || '').trim();

    // 构建候选列表：设备名称 + IP 地址（作为备选）
    const candidates: string[] = [baseName];
    if (deviceName && deviceName !== baseName) candidates.push(deviceName);
    if (deviceIp && deviceIp !== baseName) candidates.push(deviceIp);
    const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));

    const delayMs =
      typeof env.OPMANAGER_GETINTERFACES_DELAY_MS !== 'undefined'
        ? env.OPMANAGER_GETINTERFACES_DELAY_MS
        : 30000;

    for (const nameParam of uniqueCandidates) {
      try {
        // 限流：与上次 getInterfaces 调用间隔至少 delayMs，避免 OpManager URL_ROLLING_THROTTLES_LIMIT_EXCEEDED
        const now = Date.now();
        if (
          lastGetInterfacesTime > 0 &&
          now - lastGetInterfacesTime < delayMs
        ) {
          const wait = delayMs - (now - lastGetInterfacesTime);
          await new Promise((r) => setTimeout(r, wait));
        }

        console.log(
          `📡 [getInterfaces] Calling API: /api/json/device/getInterfaces?name=${nameParam}`
        );
        const response = await this.client.get<OpManagerGetInterfacesRawResponse>(
          '/api/json/device/getInterfaces',
          {
            params: { name: nameParam },
          }
        );
        lastGetInterfacesTime = Date.now();

        const data = response.data;
        // Some OpManager builds return { error: ... } (still 200). Treat as failure and try next.
        if (data && typeof data === 'object' && 'error' in data) {
          console.warn(
            `⚠️ [getInterfaces] OpManager returned error for name=${nameParam}:`,
            data.error
          );
          continue;
        }

        const interfaceCount = Array.isArray(data?.interfaces)
          ? data.interfaces.length
          : 0;
        console.log(
          `✅ [getInterfaces] name=${nameParam} -> Interfaces Count: ${interfaceCount}`
        );

        // Debug: Log if there might be more interfaces (check response structure)
        if (data && typeof data === 'object') {
          const responseKeys = Object.keys(data);
          if (
            responseKeys.includes('total') ||
            responseKeys.includes('records') ||
            responseKeys.includes('page')
          ) {
            console.warn(`⚠️ [getInterfaces] Response may have pagination metadata:`, {
              keys: responseKeys,
              total: data.total || data.records,
              page: data.page,
              returnedCount: interfaceCount,
            });
          }
        }

        if (data && data.interfaces && Array.isArray(data.interfaces)) {
          // Map getInterfaces API format to consistent format
          // Reference: https://www.manageengine.com/network-monitoring/help/rest-api-opmanager.html#getInterfaces
          return data.interfaces.map((iface: any) => ({
            // Basic identification
            name: iface.name || '',
            displayName:
              iface.displayName || iface.trimmedDispName || iface.name || '',

            // Status information
            status: iface.statusStr || iface.statusString || '',
            statusStr: iface.statusStr || iface.statusString || '',
            statusNum: iface.statusNum || iface.status || '',
            ifAdminStatus: iface.ifAdminStatus || '',
            ifOperStatus: iface.ifOperStatus || '',

            // Traffic data (may contain "NA" for unavailable interfaces)
            inTraffic: iface.inTraffic || '0',
            outTraffic: iface.outTraffic || '0',
            inSpeed: iface.inSpeed || '0',
            outSpeed: iface.outSpeed || '0',
            inUtil: iface.inUtil || '0',
            outUtil: iface.outUtil || '0',

            // Interface identification
            ifIndex:
              iface.ifIndex ||
              (iface.ifIndexNum !== undefined
                ? iface.ifIndexNum.toString()
                : ''),
            ifIndexNum:
              iface.ifIndexNum !== undefined
                ? iface.ifIndexNum
                : iface.ifIndex
                ? parseInt(iface.ifIndex, 10)
                : undefined,
            moid: iface.moid || '',
            id:
              iface.moid ||
              iface.ifIndex ||
              (iface.ifIndexNum !== undefined
                ? iface.ifIndexNum.toString()
                : ''),
            interfaceId:
              iface.moid ||
              iface.ifIndex ||
              (iface.ifIndexNum !== undefined
                ? iface.ifIndexNum.toString()
                : ''),

            // Network information
            ipAddress: iface.ipAddress || '',
            macAddress: iface.macAddress || '',
            mtu: iface.mtu ? parseInt(iface.mtu, 10) : undefined,

            // Interface type
            ifType: iface.ifType || iface.type || '',
            type: iface.type || iface.ifType || 'ETHERNET',

            // Error information
            errors: iface.errors || '0',

            // Additional fields
            isSuppressed: iface.isSuppressed || false,
            isSubInterface:
              iface.isSubInterface === 'true' || iface.isSubInterface === true,
            nfEnabled: iface.nfEnabled === 'true' || iface.nfEnabled === true,
            pollingStatus: iface.pollingStatus || '0',
            imagePath: iface.imagePath || '',
            bgColor: iface.bgColor || '',
            RouterPortType: iface.RouterPortType || '',
            'connected-device': iface['connected-device'] || '',
            suppressedMessage: iface.suppressedMessage || '',

            // Device information (best-effort)
            deviceName:
              options?.deviceName || options?.deviceIpAddress || nameParam,
          }));
        }
      } catch (error: any) {
        lastGetInterfacesTime = Date.now(); // 失败也计入限流，避免连续重试加剧限流
        console.error(`❌ [getInterfaces] Failed for name=${nameParam}:`, {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          params: error.config?.params,
        });
      }
    }

    return [];
  }

  /**
   * Get Active Alarms
   */
  async getAlarms(): Promise<OpManagerAlarm[]> {
    if (this.useMock) {
      const store = getMockDataStore();
      const mockAlarms = store.getAlarms({ alertType: 'ActiveAlarms' });
      return mockAlarms.map((a) => ({
        id: a.id,
        severity: a.status,
        name: a.name,
        message: a.message,
        modTime: a.modTime,
        category: a.category,
        entity: a.entity,
      }));
    }

    try {
      const response = await this.client.get('/api/json/alarm/listAlarms', {
        params: {
          // Note: Real OpManager API may not require alertType parameter
          // Try without it first, or use empty params
        },
      });

      const data = response.data;

      // Real OpManager API returns array directly or in data.rows or data.result
      let rawAlarms: any[] = [];
      if (Array.isArray(data)) {
        rawAlarms = data;
      } else if (Array.isArray(data?.rows)) {
        rawAlarms = data.rows;
      } else if (Array.isArray(data?.result)) {
        rawAlarms = data.result;
      } else if (Array.isArray(data?.data)) {
        rawAlarms = data.data;
      } else {
        console.warn(
          '⚠️ [getAlarms] Unexpected response format. Expected array or object with rows/result/data array.'
        );
        console.warn(
          '   Response structure:',
          JSON.stringify(data, null, 2).substring(0, 500)
        );
        return [];
      }

      // Log success (only in development or when explicitly enabled)
      if (
        process.env.NODE_ENV === 'development' ||
        process.env.DEBUG_ALARM_SYNC === 'true'
      ) {
        console.log(`✅ [getAlarms] Parsed ${rawAlarms.length} alarms from API response`);
      }

      // Map real API response fields to OpManagerAlarm interface
      // Real API fields: alarmId, deviceName, numericSeverity, severityString, modTime, message, category, entity
      // Expected fields: id, name, severity, modTime, message, category, entity
      return rawAlarms.map((raw: any) => ({
        id: raw.alarmId || raw.id || '', // Use alarmId from real API
        severity:
          raw.numericSeverity?.toString() ||
          raw.severityString ||
          raw.severity ||
          'UNKNOWN', // Use numericSeverity or severityString
        name: raw.deviceName || raw.name || '', // Use deviceName from real API
        message: raw.message || '',
        modTime:
          raw.modTime || raw.modTimeLong
            ? new Date(raw.modTimeLong || raw.modTime).toISOString()
            : new Date().toISOString(), // Convert modTimeLong to ISO string
        category: raw.category || '',
        entity: raw.entity || '',
      }));
    } catch (error: any) {
      console.error(
        '❌ [getAlarms] Failed to fetch alarms from OpManager:',
        error.message
      );
      console.error('   Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });
      return [];
    }
  }

  /**
   * Get Device Snapshot/Metrics
   */
  /**
   * Get device summary (performance metrics and status)
   * @param options Device identifier options (name or IP)
   */
  async getDeviceSummary(
    options:
      | string
      | {
          deviceName?: string;
          deviceIpAddress?: string;
        }
  ): Promise<Record<string, unknown> | null> {
    // 兼容旧的字符串参数
    let deviceName: string | undefined;
    let deviceIp: string | undefined;

    if (typeof options === 'string') {
      deviceName = options;
    } else {
      deviceName = options.deviceName;
      deviceIp = options.deviceIpAddress;
    }

    if (this.useMock) {
      const store = getMockDataStore();
      return store.getDeviceSnapshot(
        deviceName || deviceIp || ''
      ) as unknown as Record<string, unknown>;
    }

    // 直接使用数据库中存储的设备名称（已包含企业版后缀，如果适用）
    // listDevices 返回的 deviceName 被直接存储到 Device.name/opmanagerId，无需额外处理
    const baseName = (deviceName || deviceIp || '').trim();

    if (!baseName) {
      console.error('getDeviceSummary: deviceName or deviceIpAddress is required');
      return null;
    }

    // 构建候选列表：设备名称 + IP 地址（作为备选）
    const candidates: string[] = [baseName];
    if (deviceName && deviceName !== baseName) candidates.push(deviceName);
    if (deviceIp && deviceIp !== baseName) candidates.push(deviceIp);
    const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));

    // 尝试所有候选名称
    for (const nameParam of uniqueCandidates) {
      try {
        console.log(
          `📊 [getDeviceSummary] Calling API: /api/json/device/getDeviceSummary?name=${nameParam}`
        );
        const response = await this.client.get<Record<string, unknown>>(
          '/api/json/device/getDeviceSummary',
          {
            params: { name: nameParam },
          }
        );
        // 成功则返回
        if (
          response.data &&
          typeof response.data === 'object' &&
          !('error' in response.data)
        ) {
          console.log(`✅ [getDeviceSummary] name=${nameParam} -> Success`);
          return response.data;
        }
        console.warn(
          `⚠️ [getDeviceSummary] OpManager returned error for name=${nameParam}`
        );
      } catch (error) {
        // 如果还有其他候选，继续尝试
        if (nameParam === candidates[candidates.length - 1]) {
          // 最后一个候选也失败了
          console.error('❌ [getDeviceSummary] All candidates failed for device');
          return null;
        }
        // 继续下一个候选
        continue;
      }
    }
    return null;
  }

  /**
   * Get specific graph data
   */
  async getGraphData(
    deviceName: string,
    graphName: string
  ): Promise<Record<string, unknown> | null> {
    if (this.useMock) return null;

    try {
      const response = await this.client.get<Record<string, unknown>>(
        '/api/json/device/getGraphData',
        {
          params: {
            name: deviceName,
            graphName: graphName,
            period: 'LastHour',
          },
        }
      );
      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get Dashboard Widget Data
   */
  async getWidgetData(
    dashboardName: string,
    widgetID: string
  ): Promise<Record<string, unknown> | null> {
    if (this.useMock) {
      return {
        result: [
          { name: 'core-router-01', value: 85 },
          { name: 'access-switch-02', value: 72 },
        ],
      };
    }

    try {
      const response = await this.client.get<Record<string, unknown>>(
        '/api/json/dashboard/getWidgetData',
        {
          params: {
            dashboardName,
            widgetID,
            period: 1,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error(
        `Failed to fetch widget ${widgetID} from dashboard ${dashboardName}:`,
        error
      );
      return null;
    }
  }

  /**
   * Get Business View List
   * Returns all available business views in OpManager
   */
  async getBusinessView(): Promise<Record<string, unknown> | null> {
    if (this.useMock) {
      return {
        BusinessView: {
          Details: [
            {
              name: 'Default View_bv',
              displayName: 'Default View',
              total: '10',
              error: '0',
              alarms: '0',
              status: '5',
            },
          ],
        },
      };
    }

    try {
      const response = await this.client.get<Record<string, unknown>>(
        '/api/json/businessview/getBusinessView'
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch Business View list:', error);
      return null;
    }
  }

  /**
   * Get Business View Details（业务视图网络拓扑数据）
   * 真实 OPM API: GET {baseURL}/api/json/businessview/getBVDetails?apiKey=xxx&bvName=xxx
   * 例如: https://ithelp.whrank.com:44443/api/json/businessview/getBVDetails?apiKey=...&bvName=新的业务视图
   */
  async getBVDetails(bvName: string): Promise<Record<string, unknown> | null> {
    if (this.useMock) {
      const store = getMockDataStore();
      return store.getBusinessViewTopology(bvName) as unknown as Record<string, unknown>;
    }

    try {
      const response = await this.client.get<Record<string, unknown>>(
        '/api/json/businessview/getBVDetails',
        {
          params: { bvName }, // axios 会按 UTF-8 编码 bvName（如中文）
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch Business View ${bvName}:`, error);
      return null;
    }
  }

  /**
   * 获取业务视图设备性能
   * OpManager API: GET /api/json/businessview/getBusinessDetailsView?bvName=xxx&startPoint=0&viewLength=50
   * bvName 需与 OpManager 中业务视图名称完全一致（含大小写，如 test2）。
   */
  async getBusinessDetailsView(
    bvName: string,
    startPoint: number = 0,
    viewLength: number = 50
  ): Promise<Record<string, unknown> | null> {
    if (this.useMock) {
      const store = getMockDataStore();
      return store.getBusinessViewDevices(bvName, startPoint, viewLength) as unknown as Record<string, unknown>;
    }

    try {
      const response = await this.client.get<Record<string, unknown>>(
        '/api/json/businessview/getBusinessDetailsView',
        {
          params: {
            bvName,
            startPoint,
            viewLength,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch Business View Details for ${bvName}:`, error);
      return null;
    }
  }
}

export const opClient = new OpManagerClient();
