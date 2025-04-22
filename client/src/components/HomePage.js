import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';

// 样式
const HomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
`;

const Logo = styled.h1`
  font-size: 3rem;
  color: #00d0ff;
  margin-bottom: 40px;
  text-align: center;
  text-shadow: 0 0 10px rgba(0, 208, 255, 0.5);
`;

const Card = styled.div`
  background-color: rgba(24, 39, 51, 0.85);
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  width: 100%;
  max-width: 500px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const Title = styled.h2`
  color: #00d0ff;
  margin-bottom: 20px;
  font-size: 1.5rem;
  text-align: center;
`;

const Input = styled.input`
  padding: 12px 15px;
  margin-bottom: 15px;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(0, 0, 0, 0.3);
  color: white;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s;
  
  &:focus {
    border-color: #00d0ff;
    box-shadow: 0 0 0 2px rgba(0, 208, 255, 0.2);
  }
`;

const Button = styled.button`
  padding: 12px 15px;
  border-radius: 5px;
  background-color: #00d0ff;
  color: #0a0a23;
  font-size: 1rem;
  font-weight: bold;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 10px;
  
  &:hover {
    background-color: #00a6cc;
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 20px;
  width: 100%;
`;

const Tab = styled.button`
  flex: 1;
  padding: 12px;
  background-color: ${props => props.active ? 'rgba(0, 208, 255, 0.1)' : 'transparent'};
  color: ${props => props.active ? '#00d0ff' : '#aaa'};
  border: none;
  border-bottom: 2px solid ${props => props.active ? '#00d0ff' : 'transparent'};
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s;
  
  &:hover {
    color: #00d0ff;
  }
`;

const RoomsList = styled.div`
  width: 100%;
  margin-top: 20px;
`;

const RoomItem = styled.div`
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 5px;
  padding: 15px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s;
  
  &:hover {
    background-color: rgba(0, 208, 255, 0.1);
    border-color: rgba(0, 208, 255, 0.3);
  }
`;

const RoomInfo = styled.div`
  color: white;
`;

const RoomName = styled.div`
  font-weight: bold;
  font-size: 1.1rem;
  color: #00d0ff;
`;

const RoomDetails = styled.div`
  font-size: 0.9rem;
  color: #aaa;
  margin-top: 5px;
`;

const JoinRoomButton = styled(Button)`
  margin-top: 0;
  padding: 8px 15px;
  font-size: 0.9rem;
`;

const RefreshButton = styled(Button)`
  background-color: transparent;
  color: #00d0ff;
  border: 1px solid #00d0ff;
  margin-top: 10px;
  
  &:hover {
    background-color: rgba(0, 208, 255, 0.1);
  }
`;

const HomePage = () => {
  const [tab, setTab] = useState('create');
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();
  const { createRoom, joinRoom, getRoomsList, roomsList } = useGame();

  // 获取房间列表
  useEffect(() => {
    if (tab === 'list') {
      getRoomsList();
    }
  }, [tab, getRoomsList]);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      alert('请输入玩家名称');
      return;
    }
    
    createRoom(playerName, (response) => {
      if (response.success) {
        navigate(`/room/${response.roomId}`);
      }
    });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      alert('请输入玩家名称');
      return;
    }
    
    if (!roomId.trim()) {
      alert('请输入房间ID');
      return;
    }
    
    joinRoom(roomId, playerName, (response) => {
      if (response.success) {
        navigate(`/room/${response.roomId}`);
      }
    });
  };
  
  const handleJoinRoomFromList = (roomId) => {
    if (!playerName.trim()) {
      alert('请先输入玩家名称');
      return;
    }
    
    joinRoom(roomId, playerName, (response) => {
      if (response.success) {
        navigate(`/room/${response.roomId}`);
      }
    });
  };
  
  const refreshRoomsList = () => {
    getRoomsList();
  };

  return (
    <HomeContainer>
      <Logo>🃏 德州扑克</Logo>
      
      <Card>
        <TabContainer>
          <Tab 
            active={tab === 'create'} 
            onClick={() => setTab('create')}
          >
            创建新房间
          </Tab>
          <Tab 
            active={tab === 'join'} 
            onClick={() => setTab('join')}
          >
            加入房间
          </Tab>
          <Tab 
            active={tab === 'list'} 
            onClick={() => setTab('list')}
          >
            房间列表
          </Tab>
        </TabContainer>
        
        {tab === 'create' ? (
          <>
            <Title>创建新游戏</Title>
            <Form onSubmit={handleCreateRoom}>
              <Input
                type="text"
                placeholder="输入您的玩家名称"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                required
              />
              <Button type="submit">创建房间</Button>
            </Form>
          </>
        ) : tab === 'join' ? (
          <>
            <Title>加入游戏</Title>
            <Form onSubmit={handleJoinRoom}>
              <Input
                type="text"
                placeholder="输入您的玩家名称"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                required
              />
              <Input
                type="text"
                placeholder="输入房间ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                maxLength={10}
                required
              />
              <Button type="submit">加入房间</Button>
            </Form>
          </>
        ) : (
          <>
            <Title>可用房间列表</Title>
            <Input
              type="text"
              placeholder="输入您的玩家名称"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              required
            />
            <RoomsList>
              {roomsList.length > 0 ? (
                roomsList.map((room) => (
                  <RoomItem key={room.roomId}>
                    <RoomInfo>
                      <RoomName>房间ID: {room.roomId}</RoomName>
                      <RoomDetails>
                        玩家数: {room.playerCount} | 状态: {room.gameState === 'waiting' ? '等待中' : '游戏中'}
                        {room.roomOwner && ` | 房主: ${room.roomOwner}`}
                      </RoomDetails>
                    </RoomInfo>
                    <JoinRoomButton 
                      onClick={() => handleJoinRoomFromList(room.roomId)}
                      disabled={room.gameState !== 'waiting'}
                    >
                      加入
                    </JoinRoomButton>
                  </RoomItem>
                ))
              ) : (
                <div style={{ color: '#aaa', textAlign: 'center', padding: '20px 0' }}>
                  暂无可用房间
                </div>
              )}
            </RoomsList>
            <RefreshButton onClick={refreshRoomsList}>
              刷新房间列表
            </RefreshButton>
          </>
        )}
      </Card>
    </HomeContainer>
  );
};

export default HomePage; 