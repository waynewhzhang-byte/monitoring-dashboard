import axios, { AxiosInstance } from 'axios';
import { OpManagerDevice, OpManagerAlarm, OpManagerInterface } from './types';

// Mock data for development when API is not reachable
const MOCK_DEVICES: OpManagerDevice[] = [
    {
        name: "core-router-01",
        displayName: "Core Router",
        type: "Router",
        ipAddress: "192.168.1.1",
        status: "Clear",
        machinename: "core-router-01",
        category: "Network",
        vendorName: "Cisco",
        isManaged: "true",
        cpuUtilization: 15,
        memoryUtilization: 32,
        availability: 100
    },
    {
        name: "access-switch-01",
        displayName: "Access Switch",
        type: "Switch",
        ipAddress: "192.168.1.10",
        status: "Attention",
        machinename: "access-switch-01",
        category: "Network",
        vendorName: "Cisco",
        isManaged: "true",
        cpuUtilization: 45,
        memoryUtilization: 60,
        availability: 99.9
    }
];

export class OpManagerClient {
    private client: AxiosInstance;
    private readonly useMock: boolean;

    constructor() {
        this.useMock = process.env.NODE_ENV === 'development' && !process.env.OPMANAGER_API_KEY;

        this.client = axios.create({
            baseURL: process.env.OPMANAGER_BASE_URL,
            timeout: Number(process.env.OPMANAGER_TIMEOUT) || 10000,
            params: {
                apiKey: process.env.OPMANAGER_API_KEY
            }
        });

        // Interceptor to handle errors or switch to mock
        this.client.interceptors.response.use(
            response => response,
            error => {
                if (this.useMock) {
                    console.warn('⚠️ OpManager API failed, using Mock data');
                    return Promise.resolve({ data: {} });
                }
                return Promise.reject(error);
            }
        );
    }

    async getDevices(): Promise<OpManagerDevice[]> {
        if (this.useMock) {
            return MOCK_DEVICES;
        }
        try {
            const response = await this.client.get('/api/json/v2/device/listDevices');
            // OpManager V2 API can return { devices: [...] } or { rows: [...] }
            // @ts-ignore
            return response.data.devices || response.data.rows || [];
        } catch (error) {
            console.error('Failed to fetch devices:', error);
            return [];
        }
    }

    async getAlarms(): Promise<OpManagerAlarm[]> {
        if (this.useMock) {
            return [{
                id: "101",
                severity: "Critical",
                name: "core-router-01",
                message: "High CPU Usage",
                modTime: new Date().toISOString(),
                category: "Performance",
                entity: "CPU"
            }];
        }
        try {
            const response = await this.client.get('/api/json/alarm/listAlarms');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch alarms:', error);
            return [];
        }
    }

    async getDeviceSummary(deviceName: string): Promise<any> {
        if (this.useMock) {
            return null;
        }
        try {
            const response = await this.client.get('/api/json/device/getDeviceSummary', {
                params: { name: deviceName }
            });
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch device summary for ${deviceName}:`, error);
            return null;
        }
    }
}

export const opClient = new OpManagerClient();
