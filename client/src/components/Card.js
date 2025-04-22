import React from 'react';
import styled from 'styled-components';

// 花色和点数的显示样式
const CardContainer = styled.div`
  width: ${props => (props.scale || 1) * 60}px;
  height: ${props => (props.scale || 1) * 84}px;
  border-radius: 5px;
  background-color: ${props => props.hidden ? '#16213e' : '#fff'};
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 5px;
  position: relative;
  font-weight: bold;
  transition: transform 0.2s;
  border: 1px solid ${props => props.hidden ? '#00d0ff' : '#ddd'};
  
  &:hover {
    transform: translateY(-5px);
  }
`;

const CardBack = styled.div`
  width: 100%;
  height: 100%;
  background-image: repeating-linear-gradient(
    45deg,
    #00d0ff 0px,
    #00d0ff 2px,
    #16213e 2px,
    #16213e 4px
  );
  border-radius: 3px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const CardLogo = styled.div`
  font-size: 20px;
  font-weight: bold;
`;

const TopCorner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  color: ${props => (props.suit === 'hearts' || props.suit === 'diamonds') ? '#e74c3c' : '#2c3e50'};
  font-size: ${props => (props.scale || 1) * 14}px;
  line-height: 1;
`;

const BottomCorner = styled(TopCorner)`
  align-items: flex-end;
  transform: rotate(180deg);
`;

const SuitSymbol = styled.div`
  font-size: ${props => (props.scale || 1) * 16}px;
`;

const CenterSymbol = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: ${props => (props.suit === 'hearts' || props.suit === 'diamonds') ? '#e74c3c' : '#2c3e50'};
  font-size: ${props => (props.scale || 1) * 30}px;
`;

// 扑克牌组件
const Card = ({ suit, value, card, scale, hidden = false }) => {
  // 支持两种传参方式: 直接传suit和value，或者传一个card对象
  let cardSuit = suit;
  let cardValue = value;
  
  // 如果传入了card对象，优先使用它
  if (card) {
    cardSuit = card.suit;
    cardValue = card.value;
  }
  
  // 如果是隐藏状态或没有牌信息，显示牌背
  if (hidden || (!cardSuit && !cardValue)) {
    return (
      <CardContainer hidden={true} scale={scale}>
        <CardBack>
          <CardLogo>🃏</CardLogo>
        </CardBack>
      </CardContainer>
    );
  }
  
  // 转换花色为符号
  const getSuitSymbol = (suit) => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '';
    }
  };

  // 获取显示的值
  const getDisplayValue = (value) => {
    switch (value) {
      case 'A': return 'A';
      case 'K': return 'K';
      case 'Q': return 'Q';
      case 'J': return 'J';
      default: return value;
    }
  };

  const suitSymbol = getSuitSymbol(cardSuit);
  const displayValue = getDisplayValue(cardValue);

  return (
    <CardContainer scale={scale} suit={cardSuit}>
      <TopCorner suit={cardSuit} scale={scale}>
        {displayValue}
        <SuitSymbol scale={scale}>{suitSymbol}</SuitSymbol>
      </TopCorner>
      
      <CenterSymbol suit={cardSuit} scale={scale}>
        {suitSymbol}
      </CenterSymbol>
      
      <BottomCorner suit={cardSuit} scale={scale}>
        {displayValue}
        <SuitSymbol scale={scale}>{suitSymbol}</SuitSymbol>
      </BottomCorner>
    </CardContainer>
  );
};

export default Card; 