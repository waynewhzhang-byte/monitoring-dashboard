import { Server as NetServer } from 'http';
import { NextApiRequest } from 'next';
import { Server as ServerIO } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis } from '@/lib/redis';
import { env } from '@/lib/env';
import { NextApiResponseServerIO } from '@/types/next';

export const config = {
    api: {
        bodyParser: false,
    },
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
    if (!res.socket.server.io) {
        console.log('* Initializing Socket.io Server');

        const httpServer: NetServer = res.socket.server as any;
        const io = new ServerIO(httpServer, {
            path: '/api/socket/io',
            addTrailingSlash: false,
        });

        // Redis Adapter
        if (env.REDIS_URL) {
            const pubClient = redis.duplicate();
            const subClient = redis.duplicate();
            io.adapter(createAdapter(pubClient, subClient));

            // Listen for broadcaster events from collectors
            const eventSub = redis.duplicate();
            eventSub.subscribe('events');
            eventSub.on('message', (channel, message) => {
                if (channel === 'events') {
                    try {
                        const { room, event, data } = JSON.parse(message);
                        if (room) {
                            io.to(room).emit(event, data);
                        } else {
                            io.emit(event, data);
                        }
                    } catch (e) {
                        console.error('Failed to forward event:', e);
                    }
                }
            });
        }

        io.on('connection', (socket) => {
            console.log('Socket connected:', socket.id);

            socket.on('subscribe:devices', (ids: string[]) => {
                ids.forEach(id => socket.join(`device:${id}`));
            });

            socket.on('subscribe:alarms', () => {
                socket.join('alarms');
            });

            socket.on('disconnect', () => {
                // console.log('Socket disconnected:', socket.id);
            });
        });

        res.socket.server.io = io;
    }
    res.end();
};

export default ioHandler;
