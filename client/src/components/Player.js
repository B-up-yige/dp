import React from 'react';
import styled from 'styled-components';
import Card from './Card';

// 样式
const PlayerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  margin: 20px;
  width: 140px;
`;

const PlayerInfo = styled.div`
  background-color: ${props => props.isActive ? 'rgba(0, 208, 255, 0.3)' : 'rgba(24, 39, 51, 0.8)'};
  border: 2px solid ${props => 
    props.isDealer ? 'gold' : 
    props.isSmallBlind ? '#ff9800' : 
    props.isBigBlind ? '#ff5722' :
    props.isActive ? '#00d0ff' : 
    'rgba(255, 255, 255, 0.1)'
  };
  border-radius: 10px;
  padding: 10px;
  width: 100%;
  text-align: center;
  margin-bottom: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  transition: all 0.3s;
`;

const PlayerName = styled.div`
  font-weight: bold;
  font-size: 1rem;
  margin-bottom: 5px;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
`;

const PlayerChips = styled.div`
  font-size: 0.9rem;
  color: ${props => props.isLow ? '#ff5722' : '#4caf50'};
`;

const PlayerBet = styled.div`
  position: absolute;
  top: -20px;
  background-color: rgba(255, 215, 0, 0.8);
  color: black;
  padding: 2px 8px;
  border-radius: 15px;
  font-weight: bold;
  font-size: 0.8rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  display: ${props => props.bet > 0 ? 'block' : 'none'};
`;

const PlayerCards = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 5px;
  margin-bottom: ${props => props.isCurrentUser ? '30px' : '5px'};
  transform: scale(0.8);
  z-index: 2;
`;

const StatusBadge = styled.div`
  position: absolute;
  bottom: -20px;
  padding: 2px 8px;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: bold;
  background-color: ${props => {
    if (props.folded) return 'rgba(244, 67, 54, 0.7)';
    if (props.isReady) return 'rgba(76, 175, 80, 0.7)';
    return 'rgba(255, 152, 0, 0.7)';
  }};
  color: white;
`;

const HandDescription = styled.div`
  position: absolute;
  bottom: -45px;
  padding: 2px 8px;
  border-radius: 15px;
  font-size: 0.8rem;
  white-space: nowrap;
  background-color: rgba(0, 0, 0, 0.7);
  color: gold;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RoleBadge = styled.div`
  position: absolute;
  top: 5px;
  right: 5px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.7rem;
  font-weight: bold;
  background-color: ${props => {
    if (props.isDealer) return 'gold';
    if (props.isSmallBlind) return '#ff9800';
    if (props.isBigBlind) return '#ff5722';
    return 'transparent';
  }};
  color: ${props => (props.isDealer || props.isSmallBlind || props.isBigBlind) ? 'black' : 'transparent'};
`;

const PlayerStatus = styled.div`
  position: absolute;
  bottom: -20px;
  padding: 2px 8px;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: bold;
  background-color: ${props => {
    if (props.isAllIn) return 'rgba(244, 67, 54, 0.7)';
    return 'transparent';
  }};
  color: white;
`;

const Player = ({ 
  player, 
  isCurrentPlayer, 
  isCurrentUser, 
  isDealer,
  isSmallBlind,
  isBigBlind,
  gameState
}) => {
  if (!player) return null;
  
  const { name, chips, bet, folded, isReady, handDescription, isSpectator, isAllIn } = player;
  const cards = player.cards || []; // 确保使用cards属性，如果不存在则使用空数组
  const isActive = isCurrentPlayer && gameState !== 'waiting' && gameState !== 'showdown';
  
  // 修改显示牌的逻辑，在摊牌阶段显示所有未弃牌玩家的牌，观战者不显示手牌
  const showCards = (isCurrentUser || (gameState === 'showdown' && !folded)) && cards && cards.length > 0;
  const showHandDescription = gameState === 'showdown' && handDescription && !folded;
  
  return (
    <PlayerContainer>
      <PlayerBet bet={bet}>{bet}</PlayerBet>
      
      <PlayerInfo 
        isActive={isActive}
        isDealer={isDealer}
        isSmallBlind={isSmallBlind}
        isBigBlind={isBigBlind}
      >
        <RoleBadge 
          isDealer={isDealer}
          isSmallBlind={isSmallBlind}
          isBigBlind={isBigBlind}
        >
          {isDealer ? 'D' : isSmallBlind ? 'S' : isBigBlind ? 'B' : ''}
        </RoleBadge>
        
        <PlayerName>{name}{isCurrentUser ? ' (您)' : ''}</PlayerName>
        <PlayerChips isLow={chips < 200}>💰 {chips}</PlayerChips>
        {isAllIn && <PlayerStatus isAllIn>全押</PlayerStatus>}
      </PlayerInfo>
      
      {!isSpectator ? (
        <PlayerCards isCurrentUser={isCurrentUser}>
          {cards && cards.length === 2 ? (
            <>
              <Card card={showCards ? cards[0] : null} hidden={!showCards} />
              <Card card={showCards ? cards[1] : null} hidden={!showCards} />
            </>
          ) : (
            <>
              <Card hidden={true} />
              <Card hidden={true} />
            </>
          )}
        </PlayerCards>
      ) : null}
      
      <StatusBadge 
        folded={folded}
        isReady={isReady}
        isSpectator={isSpectator}
      >
        {folded ? '弃牌' : 
         isSpectator ? '观战' :
         gameState === 'waiting' ? (isReady ? '已准备' : '未准备') : ''}
      </StatusBadge>
      
      {showHandDescription && (
        <HandDescription>
          {handDescription}
        </HandDescription>
      )}
    </PlayerContainer>
  );
};

export default Player; 