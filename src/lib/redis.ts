import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
    redis: Redis | undefined;
};

export const redis = globalForRedis.redis ?? new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
            return true;
        }
        return false;
    },
});

if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = redis;
}

// 工具方法
export async function getCache<T>(key: string): Promise<T | null> {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
}

export async function setCache<T>(key: string, value: T, ttl: number = 60): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value));
}

export async function deleteCache(key: string): Promise<void> {
    await redis.del(key);
}

// 发布订阅
export async function publish(channel: string, message: any): Promise<void> {
    await redis.publish(channel, JSON.stringify(message));
}

export function subscribe(channel: string, handler: (message: any) => void): Redis {
    const subscriber = redis.duplicate();
    subscriber.subscribe(channel);
    subscriber.on('message', (ch, msg) => {
        if (ch === channel) {
            try {
                handler(JSON.parse(msg));
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        }
    });
    return subscriber;
}

export function getRedisClient(): Redis {
    return redis;
}
