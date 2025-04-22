import React from 'react';
import styled from 'styled-components';
import Card from './Card';

// 样式
const TableContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: rgba(18, 48, 69, 0.9);
  border-radius: 150px;
  width: 500px;
  height: 250px;
  padding: 30px;
  margin: 20px;
  position: relative;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.7), inset 0 0 30px rgba(0, 0, 0, 0.5);
  border: 15px solid #0f2438;
`;

const CommunityCards = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 50px;
`;

const PotInfo = styled.div`
  position: absolute;
  top: 25px;
  font-size: 1.2rem;
  font-weight: bold;
  color: white;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 5px 15px;
  border-radius: 20px;
`;

const GameStateInfo = styled.div`
  position: absolute;
  top: -15px;
  font-size: 1rem;
  font-weight: bold;
  color: white;
  background-color: rgba(33, 150, 243, 0.8);
  padding: 5px 15px;
  border-radius: 20px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
`;

const WinnerInfo = styled.div`
  position: absolute;
  bottom: 30px;
  font-size: 1.1rem;
  font-weight: bold;
  color: gold;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 8px 15px;
  border-radius: 20px;
  text-align: center;
  white-space: nowrap;
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  animation: pulse 1.5s infinite;
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
`;

const WinnerCard = styled.div`
  position: absolute;
  bottom: 80px;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px 15px;
  border-radius: 10px;
  border: 1px solid gold;
  font-size: 0.9rem;
  max-width: 80%;
  
  & > div {
    margin: 5px 0;
  }
  
  & > div strong {
    color: gold;
    margin-right: 5px;
  }
`;

const PositionInfo = styled.div`
  position: absolute;
  top: 70px;
  font-size: 0.9rem;
  color: white;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 5px 10px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 300px;
`;

const PositionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

const PositionBadge = styled.span`
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  text-align: center;
  font-size: 0.8rem;
  font-weight: bold;
  line-height: 20px;
  color: black;
  background-color: ${props => {
    if (props.type === 'dealer') return 'gold';
    if (props.type === 'small') return '#ff9800';
    if (props.type === 'big') return '#ff5722';
    if (props.type === 'utg') return '#4caf50';
    return 'white';
  }};
`;

const PositionName = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
`;

const Table = ({ communityCards, pot, gameState, winners, countdown, players, dealerPosition, smallBlindPosition, bigBlindPosition, currentPlayer }) => {
  const showWinnerInfo = gameState === 'showdown' && winners && winners.length > 0;
  const showPositions = gameState !== 'waiting' && gameState !== 'showdown';
  
  // 获取游戏状态的中文显示
  const getGameStateText = () => {
    switch(gameState) {
      case 'waiting': return '等待开始';
      case 'pre-flop': return '翻牌前';
      case 'flop': return '翻牌圈';
      case 'turn': return '转牌圈';
      case 'river': return '河牌圈';
      case 'showdown': return '摊牌';
      default: return gameState;
    }
  };
  
  // 构建获胜信息显示
  const getWinnerText = () => {
    if (!winners || winners.length === 0) return '';
    
    if (winners.length === 1) {
      const winner = winners[0];
      return `${winner.name} 获胜 (赢得 ${winner.amount} 筹码)`;
    } else {
      return `平局! ${winners.map(w => w.name).join(', ')} 平分底池`;
    }
  };
  
  // 显示获胜者的牌型详情
  const renderWinnerDetails = () => {
    if (!winners || winners.length === 0) return null;
    
    return (
      <WinnerCard>
        {winners.map((winner, index) => (
          <div key={index}>
            <strong>{winner.name}:</strong> 
            {winner.handType || winner.handDescription || ''}
          </div>
        ))}
      </WinnerCard>
    );
  };
  
  // 获取UTG位置（大盲注后的第一个玩家）
  const getUTGPosition = () => {
    if (!players || !bigBlindPosition) return null;
    
    // 获取所有玩家ID
    const playerIds = Object.keys(players);
    if (playerIds.length < 3) return null;
    
    // 找到大盲注位置的索引
    const bigBlindIndex = playerIds.indexOf(bigBlindPosition);
    if (bigBlindIndex === -1) return null;
    
    // 计算UTG位置（大盲后的下一位）
    const utgIndex = (bigBlindIndex + 1) % playerIds.length;
    return playerIds[utgIndex];
  };
  
  // 获取UTG位置玩家ID
  const utgPosition = getUTGPosition();
  
  return (
    <TableContainer>
      <GameStateInfo>{getGameStateText()}</GameStateInfo>
      <PotInfo>底池: {pot}</PotInfo>
      
      {showPositions && (
        <PositionInfo>
          {dealerPosition && players && players[dealerPosition] && (
            <PositionItem>
              <PositionBadge type="dealer">D</PositionBadge>
              <PositionName>庄家: {players[dealerPosition].name}</PositionName>
            </PositionItem>
          )}
          
          {smallBlindPosition && players && players[smallBlindPosition] && (
            <PositionItem>
              <PositionBadge type="small">S</PositionBadge>
              <PositionName>小盲: {players[smallBlindPosition].name}</PositionName>
            </PositionItem>
          )}
          
          {bigBlindPosition && players && players[bigBlindPosition] && (
            <PositionItem>
              <PositionBadge type="big">B</PositionBadge>
              <PositionName>大盲: {players[bigBlindPosition].name}</PositionName>
            </PositionItem>
          )}
          
          {utgPosition && players && players[utgPosition] && (
            <PositionItem>
              <PositionBadge type="utg">U</PositionBadge>
              <PositionName>枪手: {players[utgPosition].name}</PositionName>
            </PositionItem>
          )}
        </PositionInfo>
      )}
      
      <CommunityCards>
        {communityCards.length > 0 ? (
          communityCards.map((card, index) => (
            <Card key={index} card={card} hidden={false} />
          ))
        ) : (
          Array(5).fill(null).map((_, index) => (
            <Card key={index} hidden={true} empty={true} />
          ))
        )}
      </CommunityCards>
      
      {showWinnerInfo && (
        <>
          <WinnerInfo>
            {getWinnerText()}
          </WinnerInfo>
          {renderWinnerDetails()}
        </>
      )}
    </TableContainer>
  );
};

export default Table; 