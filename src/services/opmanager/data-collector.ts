/**
 * OpManager 数据采集服务
 * 统一的数据采集接口，整合三个主要 API：
 * 1. listDevices - 获取设备基本信息
 * 2. getBusinessDetailsView - 获取设备性能信息
 * 3. listInterfaces - 获取设备接口信息
 */

import axios, { AxiosInstance } from 'axios';
import https from 'https';
import {
  OpManagerListDevicesResponse,
  OpManagerBusinessDetailsViewResponse,
  OpManagerListInterfacesResponse,
  OpManagerGetInterfacesResponse,
  DeviceInfo,
  DevicePerformance,
  DeviceInterface,
  Device,
  DeviceCategory,
  DeviceStatus,
} from '@/types/opmanager';
import {
  mapDeviceRawToInfo,
  mapBusinessViewDeviceToPerformance,
  mapInterfaceRawToInterface,
  mapGetInterfacesRawToInterface,
  mergeDeviceData,
  performanceArrayToMap,
  interfacesArrayToMap,
} from './data-mapper';

/**
 * OpManager 数据采集客户端
 */
export class OpManagerDataCollector {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;

    // Configure HTTPS agent to accept self-signed certificates
    // This is needed for OpManager instances with self-signed SSL certificates
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false, // Accept self-signed certificates
    });

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        apiKey: apiKey,
      },
      httpsAgent: httpsAgent, // Use custom HTTPS agent for self-signed certificates
      proxy: false, // 与 OpManagerClient 一致：不走 HTTP(S)_PROXY，避免本机 7890 代理未启动时报错
    });

    // 添加响应拦截器用于错误处理
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        // 自动重试逻辑可以在这里实现
        return Promise.reject(error);
      }
    );
  }

  // ==================== 1. 设备基本信息采集 ====================

  /**
   * 获取设备列表（支持分页和过滤）
   */
  async listDevices(options: {
    category?: DeviceCategory | string;
    type?: string;
    vendorName?: string;
    severity?: DeviceStatus | string;
    deviceName?: string;
    page?: number;
    rows?: number;
    sortByColumn?: string;
    sortByType?: 'asc' | 'desc';
  } = {}): Promise<OpManagerListDevicesResponse> {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.client.get('/api/json/v2/device/listDevices', {
          params: {
            category: options.category,
            type: options.type,
            vendorName: options.vendorName,
            severity:
              typeof options.severity === 'number'
                ? String(options.severity)
                : options.severity,
            deviceName: options.deviceName,
            page: options.page || 1,
            rows: options.rows || 50,
            sortByColumn: options.sortByColumn,
            sortByType: options.sortByType,
          },
        });

        return response.data;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          // 指数退避重试
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          const { logger } = await import('@/lib/logger');
          logger.warn(`Retrying listDevices (attempt ${attempt + 1}/${maxRetries})`);
        }
      }
    }

    // 所有重试都失败
    const { logger } = await import('@/lib/logger');
    const { ExternalAPIError } = await import('@/lib/errors');
    logger.error('Failed to fetch devices after retries', { error: lastError });
    throw new ExternalAPIError('Failed to fetch devices from OpManager', 'OpManager');
  }

  /**
   * 获取所有设备（自动分页）
   */
  async getAllDevices(category?: DeviceCategory | string): Promise<DeviceInfo[]> {
    const allDevices: DeviceInfo[] = [];
    let page = 1;
    const rows = 50;
    let hasMore = true;

    while (hasMore) {
      const response = await this.listDevices({
        category,
        page,
        rows,
      });

      if (response.rows && response.rows.length > 0) {
        const devices = response.rows.map(mapDeviceRawToInfo);
        allDevices.push(...devices);

        const totalRecords = response.records || 0;
        hasMore = allDevices.length < totalRecords;
        page++;
      } else {
        hasMore = false;
      }
    }

    return allDevices;
  }

  /**
   * 获取设备基本信息（统一接口）
   * @param category 设备类别（可选）
   * @param filters 过滤条件（可选）
   */
  async getDeviceInfo(
    category?: DeviceCategory | string,
    filters?: {
      type?: string;
      vendorName?: string;
      severity?: DeviceStatus;
      deviceName?: string;
    }
  ): Promise<DeviceInfo[]> {
    if (filters) {
      // 使用过滤条件获取设备
      const allDevices: DeviceInfo[] = [];
      let page = 1;
      const rows = 50;
      let hasMore = true;

      while (hasMore) {
        const response = await this.listDevices({
          category,
          type: filters.type,
          vendorName: filters.vendorName,
          severity: filters.severity,
          deviceName: filters.deviceName,
          page,
          rows,
        });

        if (response.rows && response.rows.length > 0) {
          const devices = response.rows.map(mapDeviceRawToInfo);
          allDevices.push(...devices);

          const totalRecords = response.records || 0;
          hasMore = allDevices.length < totalRecords;
          page++;
        } else {
          hasMore = false;
        }
      }

      return allDevices;
    } else {
      // 直接获取所有设备
      return this.getAllDevices(category);
    }
  }

  // ==================== 2. 设备性能信息采集 ====================

  /**
   * 获取业务视图中的设备性能信息
   */
  async getBusinessDetailsView(
    bvName: string,
    startPoint: number = 0,
    viewLength: number = 50
  ): Promise<OpManagerBusinessDetailsViewResponse> {
    const response = await this.client.get(
      '/api/json/businessview/getBusinessDetailsView',
      {
        params: {
          apiKey: this.apiKey,
          bvName,
          startPoint,
          viewLength,
        },
      }
    );

    return response.data;
  }

  /**
   * 获取业务视图中所有设备的性能信息（自动分页）
   */
  async getAllBusinessViewDevices(
    bvName: string
  ): Promise<Array<{ name: string; performance: DevicePerformance }>> {
    const allDevices: Array<{ name: string; performance: DevicePerformance }> = [];
    let startPoint = 0;
    const viewLength = 50;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getBusinessDetailsView(bvName, startPoint, viewLength);

      if (
        response.BusinessDetailsView.Details &&
        response.BusinessDetailsView.Details.length > 0
      ) {
        const devices = response.BusinessDetailsView.Details.map((raw) => ({
          name: raw.name,
          performance: mapBusinessViewDeviceToPerformance(raw),
        }));
        allDevices.push(...devices);
        startPoint += viewLength;

        const totalRecords = parseInt(
          response.BusinessDetailsView.TotalRecords || '0',
          10
        );
        hasMore = allDevices.length < totalRecords;
      } else {
        hasMore = false;
      }
    }

    return allDevices;
  }

  /**
   * 获取设备性能信息（统一接口）
   * @param bvName 业务视图名称
   */
  async getDevicePerformance(
    bvName: string
  ): Promise<Map<string, DevicePerformance>> {
    const devices = await this.getAllBusinessViewDevices(bvName);
    return performanceArrayToMap(devices);
  }

  // ==================== 3. 设备接口信息采集 ====================

  /**
   * 获取指定设备的所有接口（推荐方法）
   * 使用 getInterfaces API - 专门设计用于获取单个设备的接口
   * API: GET /api/json/device/getInterfaces?name=设备名称
   * 限流: 20 请求/分钟
   * 
   * @param deviceName 设备名称（Managed Entity name 或 deviceName）
   * @returns 接口列表
   */
  async getInterfaces(deviceName: string): Promise<OpManagerGetInterfacesResponse> {
    try {
      const response = await this.client.get('/api/json/device/getInterfaces', {
        params: {
          name: deviceName,
        },
      });

      return response.data;
    } catch (error: any) {
      const { logger } = await import('@/lib/logger');
      logger.error(`Failed to fetch interfaces for device ${deviceName} using getInterfaces API`, {
        error: error.message,
        status: error.response?.status,
      });
      throw error;
    }
  }

  /**
   * 获取接口列表（使用 listInterfaces API）
   * 注意：listInterfaces 不支持 deviceName 参数，需要使用 displayName 在 filters 中
   * API: GET /api/json/device/listInterfaces
   * 限流: 500 请求/分钟
   */
  async listInterfaces(options: {
    displayName?: string; // 使用 displayName 而不是 deviceName
    severity?: DeviceStatus | string;
    operStatus?: string;
    adminStatus?: string;
    statusNum?: number;
    page?: number;
    rows?: number;
    filters?: string; // JSON 字符串格式的过滤器
  } = {}): Promise<OpManagerListInterfacesResponse> {
    const params: Record<string, any> = {
      isFluidic: true,
      page: options.page || 1,
      rows: options.rows || 100,
    };

    // 添加 severity 过滤
    if (options.severity !== undefined) {
      params.severity =
        typeof options.severity === 'number'
          ? String(options.severity)
          : options.severity;
    }

    // 添加自定义过滤器
    if (options.filters) {
      params.filters = options.filters;
    } else if (options.displayName || options.operStatus || options.adminStatus || options.statusNum) {
      // 构建过滤器
      const filterRules: any[] = [];

      // ✅ 使用 displayName 而不是 deviceName（根据官方文档）
      if (options.displayName) {
        filterRules.push({
          field: 'displayName',
          op: 'eq',
          data: options.displayName,
        });
      }

      if (options.operStatus) {
        filterRules.push({
          field: 'operStatus',
          op: 'eq',
          data: options.operStatus,
        });
      }

      if (options.adminStatus) {
        filterRules.push({
          field: 'adminStatus',
          op: 'eq',
          data: options.adminStatus,
        });
      }

      if (options.statusNum !== undefined) {
        filterRules.push({
          field: 'statusNum',
          op: 'eq',
          data: String(options.statusNum),
        });
      }

      if (filterRules.length > 0) {
        params.filters = JSON.stringify({
          groupOp: 'AND',
          rules: filterRules,
        });
      }
    }

    const response = await this.client.get('/api/json/device/listInterfaces', {
      params,
    });

    return response.data;
  }

  /**
   * 获取所有接口（自动分页）
   * 注意：如果提供了 deviceName，建议使用 getInterfaces API 而不是此方法
   */
  async getAllInterfaces(options?: {
    displayName?: string; // 使用 displayName 而不是 deviceName
    severity?: DeviceStatus;
    operStatus?: string;
  }): Promise<DeviceInterface[]> {
    const allInterfaces: DeviceInterface[] = [];
    let page = 1;
    const rows = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await this.listInterfaces({
        displayName: options?.displayName,
        severity: options?.severity,
        operStatus: options?.operStatus,
        page,
        rows,
      });

      if (response.rows && response.rows.length > 0) {
        const interfaces = response.rows.map(mapInterfaceRawToInterface);
        allInterfaces.push(...interfaces);

        const totalRecords = parseInt(response.records || '0', 10);
        hasMore = allInterfaces.length < totalRecords;
        page++;
      } else {
        hasMore = false;
      }
    }

    return allInterfaces;
  }

  /**
   * 获取指定设备的接口列表（推荐方法）
   * 优先使用 getInterfaces API，如果失败则降级到 listInterfaces + displayName
   */
  async getDeviceInterfaces(deviceName: string): Promise<DeviceInterface[]> {
    try {
      // ✅ 优先使用 getInterfaces API（推荐方法）
      const response = await this.getInterfaces(deviceName);
      
      if (response.interfaces && Array.isArray(response.interfaces)) {
        // 需要获取设备的 displayName（用于映射）
        let deviceDisplayName: string | undefined;
        try {
          const devices = await this.getDeviceInfo(undefined, { deviceName });
          if (devices.length > 0) {
            deviceDisplayName = devices[0].displayName;
          }
        } catch (error) {
          // 如果获取 displayName 失败，继续使用 deviceName
        }

        return response.interfaces.map((raw) =>
          mapGetInterfacesRawToInterface(raw, deviceName, deviceDisplayName)
        );
      }
      
      return [];
    } catch (error: any) {
      // 降级方案：使用 listInterfaces + displayName filter
      const { logger } = await import('@/lib/logger');
      logger.warn(
        `getInterfaces API failed for device ${deviceName}, falling back to listInterfaces`,
        { error: error.message }
      );

      try {
        // 先获取设备的 displayName
        const devices = await this.getDeviceInfo(undefined, { deviceName });
        if (devices.length === 0) {
          return [];
        }

        const displayName = devices[0].displayName;
        return this.getAllInterfaces({ displayName });
      } catch (fallbackError: any) {
        logger.error(
          `Failed to fetch interfaces using fallback method for device ${deviceName}`,
          { error: fallbackError.message }
        );
        return [];
      }
    }
  }

  /**
   * 获取设备接口信息（统一接口）
   * @param deviceName 设备名称（可选，不提供则获取所有设备的接口）
   */
  async getDeviceInterfacesInfo(
    deviceName?: string
  ): Promise<Map<string, DeviceInterface[]>> {
    // 如果提供了 deviceName，使用 getDeviceInterfaces 方法
    if (deviceName) {
      const interfaces = await this.getDeviceInterfaces(deviceName);
      return interfacesArrayToMap(interfaces);
    }
    // 否则获取所有接口
    const interfaces = await this.getAllInterfaces();
    return interfacesArrayToMap(interfaces);
  }

  // ==================== 4. 综合数据采集 ====================

  /**
   * 获取完整的设备数据（基本信息 + 性能信息 + 接口信息）
   * @param category 设备类别（可选）
   * @param bvName 业务视图名称（可选，用于获取性能信息）
   * @param includeInterfaces 是否包含接口信息（默认 true）
   */
  async getCompleteDeviceData(options: {
    category?: DeviceCategory | string;
    bvName?: string;
    includeInterfaces?: boolean;
    deviceFilters?: {
      type?: string;
      vendorName?: string;
      severity?: DeviceStatus;
      deviceName?: string;
    };
  }): Promise<Device[]> {
    const { category, bvName, includeInterfaces = true, deviceFilters } = options;

    // 1. 获取设备基本信息
    const devices = await this.getDeviceInfo(category, deviceFilters);

    // 2. 获取性能信息（如果提供了业务视图名称）
    let performances = new Map<string, DevicePerformance>();
    if (bvName) {
      performances = await this.getDevicePerformance(bvName);
    }

    // 3. 获取接口信息（如果需要）
    let interfaces = new Map<string, DeviceInterface[]>();
    if (includeInterfaces) {
      interfaces = await this.getDeviceInterfacesInfo();
    }

    // 4. 合并数据
    return mergeDeviceData(devices, performances, interfaces);
  }

  /**
   * 获取指定设备的完整数据
   * @param deviceName 设备名称
   * @param bvName 业务视图名称（可选，用于获取性能信息）
   */
  async getDeviceCompleteData(
    deviceName: string,
    bvName?: string
  ): Promise<Device | null> {
    // 1. 获取设备基本信息
    const devices = await this.getDeviceInfo(undefined, { deviceName });
    if (devices.length === 0) {
      return null;
    }

    const deviceInfo = devices[0];

    // 2. 获取性能信息（如果提供了业务视图名称）
    let performance: DevicePerformance | undefined;
    if (bvName) {
      const performances = await this.getDevicePerformance(bvName);
      performance = performances.get(deviceName);
    }

    // 3. 获取接口信息
    const deviceInterfaces = await this.getDeviceInterfaces(deviceName);

    // 4. 合并数据
    const deviceWithPerformance = performance
      ? { ...deviceInfo, performance }
      : deviceInfo;

    return {
      info: deviceWithPerformance,
      performance,
      interfaces: deviceInterfaces,
    };
  }
}
