import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import Card from './Card';

const HistoryContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const HistoryContent = styled.div`
  background: #2c3e50;
  border-radius: 10px;
  padding: 20px;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  color: white;
  width: 90%;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 20px;
  color: #3498db;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  
  &:hover {
    background: #c0392b;
  }
`;

const Section = styled.div`
  margin-bottom: 20px;
  border-bottom: 1px solid #34495e;
  padding-bottom: 15px;
`;

const SectionTitle = styled.h3`
  color: #f1c40f;
  margin-bottom: 10px;
`;

const PlayerInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 15px;
  padding: 10px;
  background: ${props => props.isWinner ? 'rgba(46, 204, 113, 0.2)' : 'rgba(52, 73, 94, 0.5)'};
  border-radius: 5px;
  border-left: 5px solid ${props => props.isWinner ? '#2ecc71' : '#7f8c8d'};
`;

const PlayerName = styled.div`
  font-weight: bold;
  flex: 1;
  margin-right: 10px;
  display: flex;
  align-items: center;
`;

const PlayerHand = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
`;

const HandDescription = styled.div`
  margin-left: 15px;
  color: #3498db;
  font-style: italic;
`;

const CardContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 10px 0;
  justify-content: center;
`;

const NoHistory = styled.div`
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
  font-size: 18px;
`;

const DebugInfo = styled.pre`
  background: rgba(0, 0, 0, 0.3);
  padding: 10px;
  border-radius: 5px;
  font-size: 12px;
  overflow: auto;
  max-height: 200px;
  margin-top: 20px;
`;

const GameHistoryModal = ({ isOpen, onClose, roomId }) => {
  const { socket } = useGame();
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    if (isOpen && roomId && socket) {
      setLoading(true);
      setError(null);
      setHistory(null);
      
      console.log('正在请求游戏历史，房间ID:', roomId, '使用Socket:', socket.id);
      
      // 确认socket连接状态
      console.log('Socket连接状态:', socket.connected);
      
      socket.emit('get-game-history', { roomId }, (response) => {
        console.log('获取游戏历史响应:', response);
        setLoading(false);
        
        if (response.success && response.history) {
          console.log('历史数据详情:', {
            时间戳: response.history.timestamp,
            底池: response.history.pot,
            公共牌: response.history.communityCards?.length || 0,
            玩家数: Object.keys(response.history.playerHands || {}).length,
            获胜者: response.history.winners?.length || 0
          });
          
          if (
            !response.history.communityCards || 
            response.history.communityCards.length === 0 || 
            !response.history.playerHands ||
            Object.keys(response.history.playerHands).length === 0
          ) {
            console.warn('历史记录数据不完整');
            setError('历史记录数据不完整，可能是服务器还未记录上一轮游戏');
            return;
          }
          
          setHistory(response.history);
        } else {
          console.error('获取历史失败或无历史数据:', response.message);
          setError(response.message || '无法获取游戏历史');
        }
      });
    }
  }, [isOpen, roomId, socket]);

  // 诊断测试
  const testConnection = () => {
    if (socket) {
      console.log('测试Socket连接，当前Socket ID:', socket.id);
      console.log('连接状态:', socket.connected);
      console.log('房间ID:', roomId);
      
      // 增加一个简单的ping测试
      socket.emit('ping', {}, (pongResponse) => {
        console.log('服务器响应ping:', pongResponse);
      });
      
      // 直接发送一个测试事件
      socket.emit('get-game-history', { roomId }, (response) => {
        console.log('测试获取历史记录原始响应:', response);
        alert('请查看浏览器控制台以获取详细信息！');
      });
    } else {
      console.error('Socket不存在!');
      alert('Socket连接不存在，请刷新页面重试');
    }
  };

  const refreshHistory = () => {
    if (isOpen && roomId && socket) {
      setLoading(true);
      setError(null);
      
      console.log('手动刷新游戏历史...');
      
      socket.emit('get-game-history', { roomId }, (response) => {
        console.log('刷新历史响应:', response);
        setLoading(false);
        if (response.success && response.history) {
          console.log('获取到的历史数据:', response.history);
          setHistory(response.history);
        } else {
          setError(response.message || '无法获取游戏历史');
        }
      });
    }
  };

  if (!isOpen) return null;

  const isWinner = (playerId) => {
    if (!history || !history.winners) return false;
    return history.winners.some(winner => winner.id === playerId);
  };
  
  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
  };

  return (
    <HistoryContainer>
      <HistoryContent>
        <Title>上局游戏历史记录</Title>
        
        <CloseButton onClick={onClose}>×</CloseButton>
        
        {loading && <div>正在加载历史记录...</div>}
        
        {!loading && !error && !history && (
          <NoHistory>
            没有可用的游戏历史记录
            <div style={{ marginTop: '20px' }}>
              <button onClick={refreshHistory}>重新加载</button>
              <button 
                onClick={testConnection} 
                style={{ marginLeft: '10px', background: '#e67e22' }}
              >
                测试连接
              </button>
            </div>
          </NoHistory>
        )}
        
        {error && (
          <NoHistory>
            {error}
            <div style={{ marginTop: '20px' }}>
              <button onClick={refreshHistory}>重新加载</button>
              <button 
                onClick={testConnection} 
                style={{ marginLeft: '10px', background: '#e67e22' }}
              >
                测试连接
              </button>
              <button 
                onClick={toggleDebugMode} 
                style={{ marginLeft: '10px' }}
              >
                {debugMode ? '隐藏调试信息' : '显示调试信息'}
              </button>
            </div>
            {debugMode && (
              <DebugInfo>
                socket存在: {socket ? '是' : '否'}<br/>
                socket ID: {socket?.id}<br/>
                socket已连接: {socket?.connected ? '是' : '否'}<br/>
                房间ID: {roomId}<br/>
                服务器可能需要在一局游戏结束后才会生成历史记录
              </DebugInfo>
            )}
          </NoHistory>
        )}
        
        {history && (
          <>
            <Section>
              <SectionTitle>公共牌</SectionTitle>
              {Array.isArray(history.communityCards) && history.communityCards.length > 0 ? (
                <CardContainer>
                  {history.communityCards.map((card, index) => (
                    <Card key={index} suit={card.suit} value={card.value} scale={1.2} />
                  ))}
                </CardContainer>
              ) : (
                <div>没有公共牌</div>
              )}
            </Section>
            
            <Section>
              <SectionTitle>玩家手牌</SectionTitle>
              {history.playerHands && Object.values(history.playerHands).length > 0 ? (
                Object.values(history.playerHands).map(player => (
                  <PlayerInfo key={player.id} isWinner={isWinner(player.id)}>
                    <PlayerName>
                      {player.name} 
                      {isWinner(player.id) && ' (获胜者)'}
                      {player.folded && ' (弃牌)'}
                      {player.isSpectator && ' (观战)'}
                    </PlayerName>
                    <PlayerHand>
                      {!player.isSpectator && !player.folded && player.hand && Array.isArray(player.hand) && player.hand.map((card, index) => (
                        <Card key={index} suit={card.suit} value={card.value} />
                      ))}
                      {player.handDescription && (
                        <HandDescription>{player.handDescription}</HandDescription>
                      )}
                    </PlayerHand>
                  </PlayerInfo>
                ))
              ) : (
                <div>没有玩家手牌数据</div>
              )}
            </Section>
            
            <Section>
              <SectionTitle>游戏信息</SectionTitle>
              <div>游戏时间: {history.timestamp ? new Date(history.timestamp).toLocaleString() : '未知'}</div>
              <div>底池: {history.pot || 0}</div>
              {history.winners && history.winners.length > 0 && (
                <div>
                  获胜者: {history.winners.map(w => w.name).join(', ')}
                  {history.winners.length > 0 && history.winners[0].amount && 
                   ` (赢得 ${history.winners[0].amount} 筹码)`}
                </div>
              )}
            </Section>
            
            <div>
              <button onClick={refreshHistory}>刷新历史</button>
              <button 
                onClick={toggleDebugMode}
                style={{ marginLeft: '10px' }}
              >
                {debugMode ? '隐藏调试信息' : '显示调试信息'}
              </button>
            </div>
            
            {debugMode && (
              <DebugInfo>
                {JSON.stringify(history, null, 2)}
              </DebugInfo>
            )}
          </>
        )}
      </HistoryContent>
    </HistoryContainer>
  );
};

export default GameHistoryModal; 