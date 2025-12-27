process.env.OPMANAGER_BASE_URL = "http://124.71.204.145:8060";
process.env.OPMANAGER_API_KEY = "d1fb36f09d460e2319bb953b543e317a";

import { opClient } from '../src/services/opmanager/client';

async function main() {
    const devices = await opClient.getDevices();
    console.log('Total devices:', devices.length);
    if (devices.length > 0) {
        console.log('\nFirst device raw data:');
        console.log(JSON.stringify(devices[0], null, 2));
    }
}

main();
