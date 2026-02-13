// Script to identify and kill any ghost collector processes
// These are Node.js processes that might be running old versions of the scheduler
// with automatic device/interface sync enabled

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ProcessInfo {
    pid: string;
    commandLine: string;
}

async function findCollectorProcesses(): Promise<ProcessInfo[]> {
    const processes: ProcessInfo[] = [];
    
    try {
        // Windows: Use wmic to get process info
        if (process.platform === 'win32') {
            const { stdout } = await execAsync(
                'wmic process where "name=\'node.exe\'" get commandline,processid /format:csv'
            );
            
            const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('Node'));
            for (const line of lines) {
                const parts = line.split(',');
                if (parts.length >= 3) {
                    const commandLine = parts[parts.length - 2]?.trim();
                    const pid = parts[parts.length - 1]?.trim();
                    
                    if (commandLine && pid && commandLine.includes('collector')) {
                        processes.push({ pid, commandLine });
                    }
                }
            }
        } else {
            // Unix/Linux/Mac: Use ps
            const { stdout } = await execAsync('ps aux | grep -E "collector|start.ts" | grep -v grep');
            const lines = stdout.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 2) {
                    const pid = parts[1];
                    const commandLine = parts.slice(10).join(' ');
                    if (commandLine.includes('collector') || commandLine.includes('start.ts')) {
                        processes.push({ pid, commandLine });
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error finding processes:', error);
    }
    
    return processes;
}

async function killProcess(pid: string): Promise<boolean> {
    try {
        if (process.platform === 'win32') {
            await execAsync(`taskkill /F /PID ${pid}`);
        } else {
            await execAsync(`kill -9 ${pid}`);
        }
        return true;
    } catch (error) {
        console.error(`Failed to kill process ${pid}:`, error);
        return false;
    }
}

async function main() {
    console.log('🔍 Searching for ghost collector processes...\n');
    
    const processes = await findCollectorProcesses();
    
    if (processes.length === 0) {
        console.log('✅ No collector processes found. System is clean!');
        return;
    }
    
    console.log(`⚠️  Found ${processes.length} potential ghost collector process(es):\n`);
    
    processes.forEach((proc, index) => {
        console.log(`${index + 1}. PID: ${proc.pid}`);
        console.log(`   Command: ${proc.commandLine}\n`);
    });
    
    console.log('⚠️  WARNING: These processes may be running old versions of the scheduler');
    console.log('   with automatic device/interface sync enabled.\n');
    
    // Ask for confirmation before killing
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('Do you want to kill these processes? (yes/no): ', async (answer: string) => {
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
            console.log('\n🔄 Killing processes...\n');
            
            let killed = 0;
            for (const proc of processes) {
                const success = await killProcess(proc.pid);
                if (success) {
                    console.log(`✅ Killed process ${proc.pid}`);
                    killed++;
                } else {
                    console.log(`❌ Failed to kill process ${proc.pid}`);
                }
            }
            
            console.log(`\n✅ Successfully killed ${killed}/${processes.length} process(es).`);
        } else {
            console.log('\n❌ Operation cancelled. Processes left running.');
        }
        
        rl.close();
    });
}

main().catch(console.error);
