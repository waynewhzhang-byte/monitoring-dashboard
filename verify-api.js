const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function verify() {
    console.log('🔍 Starting API Verification...');

    // 1. Devices
    try {
        const devices = await axios.get(`${BASE_URL}/devices`);
        console.log(`✅ GET /devices: Found ${devices.data.data.length} devices`);

        if (devices.data.data.length > 0) {
            const id = devices.data.data[0].id;
            const detail = await axios.get(`${BASE_URL}/devices/${id}`);
            console.log(`✅ GET /devices/:id: Fetched detail for ${detail.data.name}`);

            // 3. Metrics History
            const metrics = await axios.get(`${BASE_URL}/metrics/history?deviceId=${id}&range=1h`);
            console.log(`✅ GET /metrics/history: Found ${metrics.data.length} data points`);
        }
    } catch (e) {
        console.error('❌ Device API Failed:', e.message);
    }

    // 2. Alarms
    try {
        const alarms = await axios.get(`${BASE_URL}/alarms`);
        console.log(`✅ GET /alarms: Found ${alarms.data.data.length} alarms`);
    } catch (e) {
        console.error('❌ Alarm API Failed:', e.message);
    }

    // 4. Topology
    try {
        const topology = await axios.get(`${BASE_URL}/topology`);
        console.log(`✅ GET /topology: Found ${topology.data.nodes.length} nodes and ${topology.data.edges.length} edges`);
    } catch (e) {
        console.error('❌ Topology API Failed:', e.message);
    }
}

// Wait for server to start roughly
setTimeout(verify, 5000);
