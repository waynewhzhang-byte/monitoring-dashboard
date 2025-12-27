import { useEffect, useState } from 'react';
import { io as ClientIO, Socket } from 'socket.io-client';

export const useSocket = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!socket) {
            const socketInstance = ClientIO(process.env.NEXT_PUBLIC_APP_URL || '', {
                path: '/api/socket/io',
                addTrailingSlash: false,
            });

            socketInstance.on('connect', () => {
                console.log('Socket connected client-side');
                setIsConnected(true);
                socketInstance.emit('subscribe:alarms');
            });

            socketInstance.on('disconnect', () => {
                console.log('Socket disconnected');
                setIsConnected(false);
            });

            setSocket(socketInstance);
        }
    }, [socket]);

    return socket;
};
