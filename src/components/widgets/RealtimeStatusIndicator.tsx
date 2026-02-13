import React from 'react';
import { motion } from 'framer-motion';

interface RealtimeStatusIndicatorProps {
    isConnected: boolean;
    className?: string;
}

/**
 * 实时连接状态指示器
 * 显示 Socket.io 连接状态
 */
export const RealtimeStatusIndicator: React.FC<RealtimeStatusIndicatorProps> = ({
    isConnected,
    className = ''
}) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative flex items-center">
                {/* 脉冲动画 */}
                {isConnected && (
                    <motion.div
                        className="absolute w-3 h-3 bg-emerald-500 rounded-full"
                        animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 0, 0.5],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                )}

                {/* 状态点 */}
                <div
                    className={`relative w-2 h-2 rounded-full ${
                        isConnected
                            ? 'bg-emerald-500'
                            : 'bg-slate-500'
                    }`}
                />
            </div>

            {/* 状态文本 */}
            <span className={`text-xs font-medium ${
                isConnected
                    ? 'text-emerald-400'
                    : 'text-slate-500'
            }`}>
                {isConnected ? '实时更新' : '连接中...'}
            </span>
        </div>
    );
};
