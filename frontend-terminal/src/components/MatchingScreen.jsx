import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { useWebSocket } from '@/hooks/useWebSocket';
import '../styles/MatchingScreen.css';

export const MatchingScreen = () => {
  const { userId, setSession, setAppState, queueStats, setQueueStats } =
    useAppStore();
  const { emit, on, off } = useWebSocket();
  const [waitTime, setWaitTime] = useState(0);

  useEffect(() => {
    // 发送进入信号
    emit('enter', {
      userId,
      language: 'en',
      country: 'Unknown',
    });

    // 监听配对成功
    const handleMatched = (data) => {
      const { sessionId, opponentLanguage, role } = data;
      setSession(sessionId, opponentLanguage, role);
      setAppState('drawing');
    };

    // 监听队列更新
    const handleQueueUpdated = (stats) => {
      setQueueStats(stats);
    };

    on('matched', handleMatched);
    on('queueUpdated', handleQueueUpdated);

    // 计时器
    const timer = setInterval(() => {
      setWaitTime((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      off('matched', handleMatched);
      off('queueUpdated', handleQueueUpdated);
    };
  }, [emit, on, off, userId, setSession, setAppState, setQueueStats]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="matching-screen">
      <div className="matching-content">
        <h1>🔍 寻找你的艺术伙伴</h1>
        <p className="subtitle">Finding your creative partner...</p>

        <div className="animation-container">
          <div className="spinner"></div>
          <div className="spinner-overlay"></div>
        </div>

        <div className="waiting-stats">
          <p className="wait-time">⏱️ 已等待: {formatTime(waitTime)}</p>
          <p className="queue-info">
            ⏳ 队列中: {queueStats?.waitingCount || 0} 人
          </p>
        </div>

        <div className="tips">
          <p>💡 与来自世界各地的旅客配对</p>
          <p>🌍 共享不同文化视角的创意</p>
          <p>⏰ 通常在 30 秒内配对成功</p>
        </div>

        <p className="cancel-notice">点击屏幕任何地方可取消</p>
      </div>
    </div>
  );
};

export default MatchingScreen;
