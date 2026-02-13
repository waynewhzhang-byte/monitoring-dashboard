import { publish } from '@/lib/redis';
import { BroadcastEvent } from '@/types/broadcast';

// Re-export for backward compatibility
export { BroadcastEvent };

export class Broadcaster {
    /**
     * Broadcasts a message to a specific room or globally via Redis Pub/Sub.
     * The Socket.io server (Redis Adapter) will pick this up and emit to connected clients.
     * 
     * Note: The socket.io-redis-adapter protocol is specific. 
     * Simple Redis publish might not work directly if we want to emit to specific rooms handled by Adapter.
     * However, for simplicity in this custom setup:
     * We will publish to a custom channel 'broadcast' that our io.ts listens to, OR
     * we rely on the fact that if we simply want to emit, we might need a separate mechanism 
     * if we are not part of the socket.io cluster.
     * 
     * CORRECT APPROACH: Using `socket.io-emitter` (or `@socket.io/redis-emitter`) is best for external processes.
     * BUT, `redis.publish` to a known channel that `io.ts` explicitly subscribes to is cleaner for dependencies.
     * 
     * Let's use the explicit channel approach which we implemented in `io.ts`?
     * No, `io.ts` used `createAdapter`.
     * 
     * Let's install `@socket.io/redis-emitter` to easily emit events from this external process.
     */
    async emit(room: string, event: string, data: any) {
        // For now, we'll just use a raw Redis publish to a channel we defined? 
        // Actually, let's keep it simple: publish to 'monitoring:events' 
        // and let the API server subscribe to it and forward.
        // 
        // However, `io.ts` currently DOES NOT have custom subscription logic aside from the Adapter.
        // 
        // Let's implement a simple pattern:
        // Channel: `socket.io#/#${room}#` is how adapter works but it's internal.
        //
        // Alternative: We publish to 'events', and `io.ts` listens to 'events'.

        await publish('events', { room, event, data });
    }
}

export const broadcaster = new Broadcaster();
