
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { opClient } from '../src/services/opmanager/client';

async function main() {
    const devices = await opClient.getDevices({ rows: 5 });
    if (!devices || devices.length === 0) {
        console.log('No devices found');
        return;
    }

    const dev = devices[0];
    console.log('Device Summary from OpManager:');
    console.log(JSON.stringify(dev, null, 2));

    // Also try to get device summary details if available
    try {
        // OpManagerClient has getDeviceSummary? Let's check or just try.
        if ((opClient as any).getDeviceSummary) {
            const details = await (opClient as any).getDeviceSummary(dev.name);
            console.log('\nDevice Details from OpManager:');
            console.log(JSON.stringify(details, null, 2));
        } else {
            console.log('\nopClient.getDeviceSummary not found, skipping details.');
        }
    } catch (e) {
        console.log('\nCould not get device details');
    }
}

main().catch(console.error);
