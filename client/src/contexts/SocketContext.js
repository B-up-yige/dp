import React, { createContext, useContext } from 'react';
import { useGame } from '../context/GameContext';

// 创建Socket上下文
const SocketContext = createContext();

// 提供Socket上下文的自定义钩子
export const useSocket = () => useContext(SocketContext);

// Socket上下文提供者组件，包装GameContext
export const SocketProvider = ({ children }) => {
  // 从GameContext获取socket和playerId
  const { socket, player } = useGame();
  const playerId = player?.id;
  
  // 提供的上下文值
  const value = {
    socket,
    playerId
  };
  
  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 