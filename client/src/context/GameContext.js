import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getSocketUrl } from '../socketConfig';

// 创建上下文
const GameContext = createContext();

// 使用上下文的自定义钩子
export const useGame = () => useContext(GameContext);

// 上下文提供者组件
export const GameProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [player, setPlayer] = useState(null);
  const [room, setRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);
  const [roomsList, setRoomsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // 初始化Socket连接
  useEffect(() => {
    const initSocket = async () => {
      try {
        setLoading(true);
        console.log('开始初始化Socket连接...');
        
        // 从API获取Socket服务器地址
        const serverUrl = await getSocketUrl();
        
        console.log('准备连接到Socket服务器:', serverUrl);
        
        const newSocket = io(serverUrl, {
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          transports: ['websocket'],
          forceNew: true // 强制创建新连接
        });

        console.log('Socket实例创建完成，等待连接事件...');

        newSocket.on('connect', () => {
          console.log('成功连接到Socket服务器，ID:', newSocket.id);
          setConnected(true);
          setError(null);
          setLoading(false);
        });

        newSocket.on('connect_error', (err) => {
          console.error('Connection error:', err);
          setConnected(false);
          setError('无法连接到服务器，请稍后再试');
          setLoading(false);
        });

        newSocket.on('updateGameState', (gameState) => {
          console.log('Game state updated:', gameState);
          
          // 更新玩家ID，确保与socket.id同步
          if (gameState && player && gameState.players && gameState.players[newSocket.id]) {
            if (player.id !== newSocket.id) {
              console.log('更新玩家ID:', player.id, '->', newSocket.id);
              setPlayer({
                ...player,
                id: newSocket.id
              });
            }
          }
          
          setGameState(gameState);
        });

        newSocket.on('disconnect', (reason) => {
          console.log('Disconnected from server:', reason);
          setConnected(false);
        });

        newSocket.on('reconnect', (attemptNumber) => {
          console.log('Reconnected to server after', attemptNumber, 'attempts');
          setConnected(true);
        });

        newSocket.on('reconnect_attempt', (attemptNumber) => {
          console.log('Attempting to reconnect:', attemptNumber);
        });

        setSocket(newSocket);

        return () => {
          console.log('组件卸载，断开Socket连接');
          newSocket.disconnect();
        };
      } catch (error) {
        console.error('初始化Socket时出错:', error);
        setError(`初始化Socket连接失败: ${error.message}`);
        setLoading(false);
      }
    };

    initSocket();
  }, []);

  // 获取可用房间列表
  const getRoomsList = useCallback((callback) => {
    if (!socket || !connected) {
      setError('未连接到服务器');
      return;
    }
    
    socket.emit('get-rooms', (response) => {
      if (response.success) {
        setRoomsList(response.rooms);
        if (callback) callback(response);
      } else {
        setError(response.message || '获取房间列表失败');
      }
    });
  }, [socket, connected]);

  // 创建房间
  const createRoom = useCallback((playerName, callback) => {
    if (!socket || !connected) {
      setError('未连接到服务器');
      return;
    }

    socket.emit('create-room', { playerName }, (response) => {
      console.log('创建房间响应:', response);
      if (response.success) {
        setPlayer({
          id: response.playerId,
          name: playerName
        });
        setRoom(response.roomId);
        if (callback) callback(response);
      } else {
        setError(response.message || '创建房间失败');
      }
    });
  }, [socket, connected]);

  // 加入房间
  const joinRoom = useCallback((roomId, playerName, callback) => {
    if (!socket || !connected) {
      setError('未连接到服务器');
      return;
    }

    socket.emit('join-room', { roomId, playerName }, (response) => {
      console.log('加入房间响应:', response);
      if (response.success) {
        setPlayer({
          id: response.playerId,
          name: playerName
        });
        setRoom(response.roomId);
        if (callback) callback(response);
      } else {
        setError(response.message || '加入房间失败');
      }
    });
  }, [socket, connected]);

  // 切换准备状态
  const toggleReady = useCallback(() => {
    if (!socket || !connected) {
      setError('未连接到服务器');
      return;
    }
    
    if (!room) {
      setError('未加入房间');
      return;
    }
    
    if (!player || !player.id) {
      console.error('玩家信息不完整', player);
      setError('玩家信息不完整');
      return;
    }

    console.log('发送toggle-ready事件，房间ID:', room, '玩家ID:', player.id);
    socket.emit('toggle-ready', { roomId: room }, (response) => {
      console.log('收到toggle-ready响应:', response);
      if (!response.success) {
        console.error('准备状态切换失败:', response.message);
        setError(response.message || '操作失败');
      }
    });
  }, [socket, connected, room, player]);

  // 玩家行动
  const playerAction = useCallback((action, amount = 0) => {
    if (!socket || !connected || !room || !gameState) {
      setError('未连接到游戏');
      return;
    }

    socket.emit('player-action', { roomId: room, action, amount }, (response) => {
      if (!response.success) {
        setError(response.message || '操作失败');
      }
    });
  }, [socket, connected, room, gameState]);

  // 离开房间
  const leaveRoom = useCallback((callback) => {
    if (!socket || !connected || !room) {
      setPlayer(null);
      setRoom(null);
      setGameState(null);
      if (callback) callback();
      return;
    }

    socket.emit('leave-room', { roomId: room }, (response) => {
      setPlayer(null);
      setRoom(null);
      setGameState(null);
      if (callback) callback(response);
    });
  }, [socket, connected, room]);

  // 暴露上下文值
  const value = {
    connected,
    player,
    room,
    gameState,
    error,
    roomsList,
    getRoomsList,
    createRoom,
    joinRoom,
    toggleReady,
    playerAction,
    leaveRoom,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}; 