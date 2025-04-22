import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';

// 样式
const ControlContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 600px;
  background-color: rgba(24, 39, 51, 0.9);
  border-radius: 15px;
  padding: 15px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
  margin: 20px auto;
  border: 1px solid rgba(0, 208, 255, 0.3);
  z-index: 100;
  position: relative;
`;

const ButtonsRow = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
`;

const ActionButton = styled.button`
  padding: 10px 20px;
  border-radius: 5px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  min-width: 100px;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const FoldButton = styled(ActionButton)`
  background-color: #f44336;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #d32f2f;
  }
`;

const CheckButton = styled(ActionButton)`
  background-color: #2196f3;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #1976d2;
  }
`;

const CallButton = styled(ActionButton)`
  background-color: #ff9800;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #f57c00;
  }
`;

const RaiseButton = styled(ActionButton)`
  background-color: #4caf50;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #388e3c;
  }
`;

const ReadyButton = styled(ActionButton)`
  background-color: ${props => props.isReady ? '#f44336' : '#4caf50'};
  color: white;
  width: 180px;
  
  &:hover:not(:disabled) {
    background-color: ${props => props.isReady ? '#d32f2f' : '#388e3c'};
  }
`;

const BetSliderContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 10px;
`;

const SliderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
`;

const Slider = styled.input`
  flex: 1;
  height: 5px;
  -webkit-appearance: none;
  background: #ddd;
  outline: none;
  border-radius: 5px;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #00d0ff;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  }
  
  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #00d0ff;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
    border: none;
  }
`;

const BetAmount = styled.div`
  font-size: 1.1rem;
  font-weight: bold;
  color: white;
  width: 80px;
  text-align: center;
`;

const RaiseInput = styled.input`
  width: 80px;
  padding: 8px;
  border-radius: 5px;
  border: 1px solid #ddd;
  font-size: 1rem;
  text-align: center;
`;

const GameInfo = styled.div`
  text-align: center;
  margin-bottom: 15px;
  color: #00d0ff;
  font-weight: bold;
  font-size: 1.1rem;
`;

const CountdownTimer = styled.div`
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(255, 152, 0, 0.9);
  color: white;
  font-weight: bold;
  font-size: 1rem;
  padding: 5px 15px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  animation: pulse 1s infinite;
  z-index: 200;
  
  @keyframes pulse {
    0% { transform: translateX(-50%) scale(1); }
    50% { transform: translateX(-50%) scale(1.05); }
    100% { transform: translateX(-50%) scale(1); }
  }
`;

const AllInButton = styled(ActionButton)`
  background-color: #d32f2f;
  color: white;
  font-weight: bold;
  
  &:hover:not(:disabled) {
    background-color: #b71c1c;
  }
`;

// 获取游戏状态对应的文本
const getGameStateText = (gameState) => {
  switch (gameState) {
    case 'waiting':
      return '等待玩家准备';
    case 'pre-flop':
      return '翻牌前';
    case 'flop':
      return '翻牌圈';
    case 'turn':
      return '转牌圈';
    case 'river':
      return '河牌圈';
    case 'showdown':
      return '摊牌';
    default:
      return gameState;
  }
};

const ControlPanel = () => {
  const { 
    gameState: gameData, 
    player, 
    playerAction, 
    toggleReady 
  } = useGame();
  
  const [raiseAmount, setRaiseAmount] = useState(0);
  
  // 将 useEffect 移到任何条件返回之前
  useEffect(() => {
    if (gameData && player) {
      const currentBet = gameData.currentBet || 0;
      // 计算最小加注金额（当前下注的两倍）
      const minRaise = currentBet * 2;
      
      // 如果加注额未设置且当前有下注，设置初始加注额
      if (currentBet > 0 && raiseAmount === 0 && minRaise > 0) {
        setRaiseAmount(minRaise);
      }
    }
  }, [gameData, player, raiseAmount]);
  
  if (!gameData || !player) {
    return null;
  }
  
  const {
    gameState,
    currentPlayer,
    currentBet,
    pot,
    players,
    countdown,
    winners
  } = gameData;
  
  // 确保使用socket.id作为玩家ID
  const playerId = player.id;
  console.log('当前玩家ID:', playerId);
  console.log('玩家列表:', players);
  
  // 检查玩家ID在玩家列表中是否存在
  if (!players[playerId]) {
    console.error('错误: 玩家ID不存在于玩家列表中', playerId, players);
    return <div>加载中...</div>;
  }
  
  const currentPlayerData = players[currentPlayer];
  const playerData = players[playerId];
  const isCurrentTurn = currentPlayer === playerId;
  const isWaiting = gameState === 'waiting';
  const showCountdown = countdown && countdown > 0;
  
  // 计算最小和最大加注金额
  const minRaise = currentBet * 2;
  const maxRaise = playerData ? playerData.chips + (playerData.bet || 0) : 0;
  
  // 更新加注滑块
  const handleSliderChange = (e) => {
    setRaiseAmount(parseInt(e.target.value, 10));
  };
  
  // 处理玩家行动
  const handleAction = (action) => {
    if (action === 'raise') {
      playerAction(action, raiseAmount);
    } else {
      playerAction(action);
    }
  };
  
  // 当游戏状态是等待时，显示准备按钮
  if (isWaiting) {
    return (
      <ControlContainer>
        {showCountdown && (
          <CountdownTimer>
            {countdown} 秒后开始
          </CountdownTimer>
        )}
        <GameInfo>
          房间ID: {gameData.roomId} | 玩家: {Object.keys(players).length}人
          {gameData.roomOwner && gameData.players[gameData.roomOwner] && 
            ` | 房主: ${gameData.players[gameData.roomOwner].name}`}
        </GameInfo>
        <ButtonsRow>
          <ReadyButton
            isReady={playerData && playerData.isReady}
            onClick={() => {
              console.log('点击准备按钮');
              console.log('玩家ID:', playerId);
              console.log('当前准备状态:', playerData && playerData.isReady);
              toggleReady();
            }}
          >
            {playerData && playerData.isReady ? '取消准备' : '准备'}
          </ReadyButton>
        </ButtonsRow>
      </ControlContainer>
    );
  }
  
  // 游戏结束时的显示
  if (gameState === 'showdown') {
    return (
      <ControlContainer>
        {showCountdown && (
          <CountdownTimer>
            {countdown} 秒后开始
          </CountdownTimer>
        )}
        <GameInfo>
          {getGameStateText(gameState)} | 底池: {pot}
          {winners && winners.length > 0 && (
            <div>
              获胜者: {winners.map(w => `${w.name} (${w.handDescription || ''})`).join(', ')}
            </div>
          )}
        </GameInfo>
        <ButtonsRow>
          <ReadyButton
            isReady={playerData && playerData.isReady}
            onClick={() => {
              console.log('点击准备下一局按钮');
              console.log('玩家ID:', playerId);
              console.log('当前准备状态:', playerData && playerData.isReady);
              toggleReady();
            }}
          >
            {playerData && playerData.isReady ? '取消准备' : '准备下一局'}
          </ReadyButton>
        </ButtonsRow>
      </ControlContainer>
    );
  }
  
  // 当前玩家是否需要跟注
  const playerBet = playerData.bet || 0;
  const needsToCall = currentBet > playerBet;
  const callAmount = currentBet - playerBet;
  const notEnoughToCall = needsToCall && callAmount > playerData.chips;
  
  return (
    <ControlContainer>
      <GameInfo>
        {getGameStateText(gameState)} | 底池: {pot}
        {currentPlayerData && ` | 当前行动: ${currentPlayerData.name}`}
      </GameInfo>
      
      <ButtonsRow>
        <FoldButton 
          onClick={() => handleAction('fold')}
          disabled={!isCurrentTurn || playerData.folded}
        >
          弃牌
        </FoldButton>
        
        {needsToCall ? (
          <>
            <CallButton 
              onClick={() => handleAction('call')}
              disabled={!isCurrentTurn || playerData.folded || notEnoughToCall}
            >
              {`跟注 ${callAmount}`}
            </CallButton>
            
            {notEnoughToCall && (
              <AllInButton
                onClick={() => handleAction('all-in')}
                disabled={!isCurrentTurn || playerData.folded || playerData.chips <= 0}
              >
                全下 ({playerData.chips})
              </AllInButton>
            )}
          </>
        ) : (
          <CheckButton 
            onClick={() => handleAction('check')}
            disabled={!isCurrentTurn || playerData.folded}
          >
            看牌
          </CheckButton>
        )}
        
        <RaiseButton 
          onClick={() => handleAction('raise')}
          disabled={!isCurrentTurn || playerData.folded || maxRaise < minRaise}
        >
          加注
        </RaiseButton>
        
        {/* 添加全下按钮，总是可见 */}
        <AllInButton
          onClick={() => handleAction('all-in')}
          disabled={!isCurrentTurn || playerData.folded || playerData.chips <= 0}
        >
          全下 ({playerData.chips})
        </AllInButton>
      </ButtonsRow>
      
      {isCurrentTurn && !playerData.folded && maxRaise >= minRaise && (
        <BetSliderContainer>
          <SliderRow>
            <BetAmount>{minRaise}</BetAmount>
            <Slider 
              type="range"
              min={minRaise}
              max={maxRaise}
              value={raiseAmount}
              onChange={handleSliderChange}
              disabled={!isCurrentTurn || playerData.folded}
            />
            <RaiseInput 
              type="number"
              min={minRaise}
              max={maxRaise}
              value={raiseAmount}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (value >= minRaise && value <= maxRaise) {
                  setRaiseAmount(value);
                }
              }}
              disabled={!isCurrentTurn || playerData.folded}
            />
          </SliderRow>
        </BetSliderContainer>
      )}
    </ControlContainer>
  );
};

export default ControlPanel; 