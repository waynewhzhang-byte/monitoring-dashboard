export interface OpManagerDevice {
    name: string;
    displayName: string;
    type: string;
    ipAddress: string;
    status: string; // "Attention" | "Trouble" | "Critical" | "Clear"
    machinename: string;
    category: string;
    vendorName?: string;
    modelName?: string;
    serviceTags?: string;
    isManaged: string; // "true" | "false"
    osName?: string;
    sysDescription?: string;
    location?: string;
    contact?: string;
    cpuUtilization?: number;
    memoryUtilization?: number;
    diskUtilization?: number;
    responseTime?: number;
    packetLoss?: number;
    availability?: number;
    tags?: string | string[]; // Device tags (can be string or array)
}

export interface OpManagerAlarm {
    id: string;
    severity: string; // "Critical" | "Major" | "Minor" | "Warning" | "Clear"
    name: string; // Device Name
    message: string;
    modTime: string; // Timestamp
    category: string;
    entity: string; // Source entity
}

export interface OpManagerInterface {
    ifIndex: number; // Interface Index
    name: string;
    displayName: string;
    status: string;
    inTraffic: number; // bps
    outTraffic: number; // bps
    ifSpeed: number; // Speed in bps
    macAddress?: string;
    ipAddress?: string;
    netmask?: string;
}

export interface OpManagerResponse<T> {
    result: T;
}
