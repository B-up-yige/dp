import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import Player from './Player';
import Table from './Table';
import ControlPanel from './ControlPanel';
import GameHistoryModal from './GameHistory';

// 样式
const RoomContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  position: relative;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  margin-bottom: 20px;
`;

const RoomInfo = styled.div`
  font-size: 1.2rem;
  color: #00d0ff;
`;

const HeaderButtons = styled.div`
  display: flex;
  gap: 10px;
`;

const ExitButton = styled.button`
  background-color: rgba(244, 67, 54, 0.8);
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
  
  &:hover {
    background-color: #d32f2f;
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const RulesButton = styled.button`
  background-color: rgba(33, 150, 243, 0.8);
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
  
  &:hover {
    background-color: #1976d2;
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
`;

const ModalContent = styled.div`
  background-color: #1a1a2e;
  color: #fff;
  padding: 30px;
  border-radius: 10px;
  max-width: 80%;
  max-height: 80%;
  overflow-y: auto;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  
  &:hover {
    color: #d32f2f;
  }
`;

const RulesTitle = styled.h2`
  color: #00d0ff;
  margin-bottom: 20px;
  text-align: center;
`;

const RulesSection = styled.div`
  margin-bottom: 30px;
`;

const SectionTitle = styled.h3`
  color: #00d0ff;
  margin-bottom: 10px;
  border-bottom: 1px solid #00d0ff;
  padding-bottom: 5px;
`;

const CardRankTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
  
  th, td {
    border: 1px solid #333;
    padding: 8px;
    text-align: left;
  }
  
  th {
    background-color: rgba(0, 208, 255, 0.2);
  }
  
  tr:nth-child(odd) {
    background-color: rgba(255, 255, 255, 0.05);
  }
`;

const RulesExample = styled.div`
  background-color: rgba(0, 0, 0, 0.3);
  padding: 10px;
  border-radius: 5px;
  margin: 10px 0;
  border-left: 3px solid #00d0ff;
`;

const PlayersContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 20px;
  flex: 1;
`;

const PlayersTop = styled.div`
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 10px;
`;

const PlayersSides = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
`;

const PlayersBottom = styled.div`
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-top: 10px;
`;

// 添加一个底部空间
const BottomSpace = styled.div`
  height: 150px;
  width: 100%;
`;

// 修改控制面板容器
const ControlPanelContainer = styled.div`
  width: 100%;
  position: fixed;
  bottom: 20px;
  left: 0;
  right: 0;
  margin-top: auto;
  z-index: 10;
  display: flex;
  justify-content: center;
  pointer-events: none;
  
  & > * {
    pointer-events: auto;
  }
`;

const HistoryButton = styled.button`
  background-color: rgba(41, 128, 185, 0.8);
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
  
  &:hover {
    background-color: #2980b9;
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { 
    gameState, 
    player, 
    leaveRoom, 
    connected,
    socket
  } = useGame();
  const [showRules, setShowRules] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // 如果未连接或玩家信息丢失，重定向到主页
  useEffect(() => {
    if (!connected) {
      navigate('/');
    }
  }, [connected, navigate]);
  
  // 处理离开房间
  const handleLeave = () => {
    leaveRoom(() => {
      navigate('/');
    });
  };
  
  if (!gameState || !player) {
    return (
      <RoomContainer>
        <div style={{ textAlign: 'center', margin: '50px 0', color: 'white' }}>
          正在连接游戏...
        </div>
      </RoomContainer>
    );
  }
  
  const { 
    players, 
    communityCards, 
    pot, 
    currentPlayer, 
    dealer, 
    smallBlind, 
    bigBlind,
    countdown
  } = gameState;
  
  // 将玩家数据转换为数组，方便布局
  const playersArray = Object.values(players);
  
  // 安排玩家位置
  const getPlayerPositions = () => {
    // 根据玩家数量返回不同的位置数组
    const maxPlayers = 9; // 最大支持9个玩家
    const positions = Array(maxPlayers).fill(null);
    const playerCount = playersArray.length;
    
    // 确保当前玩家总是在底部中间
    const currentPlayerIndex = playersArray.findIndex(p => p.id === player.id);
    if (currentPlayerIndex !== -1) {
      positions[4] = playersArray[currentPlayerIndex];
      
      // 其他玩家按顺时针分配位置
      let positionIndex = 5;
      for (let i = 1; i < playerCount; i++) {
        const playerIndex = (currentPlayerIndex + i) % playerCount;
        // 如果位置超出边界，则回到0
        if (positionIndex >= maxPlayers) {
          positionIndex = 0;
        }
        positions[positionIndex] = playersArray[playerIndex];
        positionIndex++;
      }
    }
    
    return positions;
  };
  
  const playerPositions = getPlayerPositions();
  // 当前用户的ID
  const currentUserId = player.id;
  
  const handleLeaveRoom = () => {
    if (socket && roomId) {
      socket.emit('leave-room', { roomId }, (response) => {
        if (response.success) {
          navigate('/');
        }
      });
    }
  };

  const handleShowHistory = () => {
    setShowHistory(true);
  };

  const handleCloseHistory = () => {
    setShowHistory(false);
  };
  
  return (
    <RoomContainer>
      {showRules && (
        <Modal onClick={() => setShowRules(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <CloseButton onClick={() => setShowRules(false)}>×</CloseButton>
            <RulesTitle>德州扑克规则详解</RulesTitle>
            
            <RulesSection>
              <SectionTitle>游戏概述</SectionTitle>
              <p>德州扑克(Texas Hold'em)是世界上最流行的扑克游戏。每个玩家会获得两张底牌(hole cards)，并与其他玩家共用五张公共牌(community cards)，组成最佳的五张牌牌型。</p>
              <p>游戏以轮流行动为特点，每一轮下注都会给玩家提供多种策略选择。德州扑克融合了运气和技巧，简单易学但需要长时间才能精通。</p>
            </RulesSection>
            
            <RulesSection>
              <SectionTitle>游戏目标</SectionTitle>
              <p>赢得其他玩家下注的筹码，通过以下方式之一：</p>
              <ul>
                <li>用自己的底牌和公共牌组成最好的五张牌组合，赢得牌局</li>
                <li>让其他所有玩家弃牌，成为唯一剩余的玩家</li>
              </ul>
            </RulesSection>
            
            <RulesSection>
              <SectionTitle>牌局流程</SectionTitle>
              <p><strong>每局游戏分为四个下注轮和一个摊牌阶段：</strong></p>
              <ol>
                <li><strong>盲注与发牌：</strong>
                  <ul>
                    <li>每局开始前确定庄家(Dealer/Button)位置，用D标记</li>
                    <li>庄家左侧第一位玩家下小盲注(Small Blind)，通常是大盲注的一半</li>
                    <li>小盲左侧玩家下大盲注(Big Blind)</li>
                    <li>每位玩家获得两张面朝下的底牌(Hole Cards)</li>
                  </ul>
                </li>
                <li><strong>前翻牌圈(Pre-Flop)：</strong>
                  <ul>
                    <li>第一轮下注从大盲注左侧的玩家开始（即"枪手"位置/UTG）</li>
                    <li>玩家可以选择跟注(Call)大盲注，加注(Raise)或弃牌(Fold)</li>
                    <li>行动顺序为顺时针方向</li>
                    <li>轮到大盲注玩家时，如果没有加注，他可以选择看牌(Check)</li>
                    <li>当所有玩家下注相等或弃牌后，进入下一阶段</li>
                  </ul>
                </li>
                <li><strong>翻牌(Flop)：</strong>
                  <ul>
                    <li>发三张公共牌</li>
                    <li>第二轮下注从庄家左侧第一位未弃牌的玩家开始</li>
                    <li>玩家可以选择看牌(Check)、下注(Bet)、跟注(Call)、加注(Raise)或弃牌(Fold)</li>
                  </ul>
                </li>
                <li><strong>转牌(Turn)：</strong>
                  <ul>
                    <li>发第四张公共牌</li>
                    <li>第三轮下注，下注规则与翻牌圈相同</li>
                    <li>在此阶段，下注和加注的金额通常会提高</li>
                  </ul>
                </li>
                <li><strong>河牌(River)：</strong>
                  <ul>
                    <li>发第五张公共牌</li>
                    <li>最后一轮下注，规则与前面相同</li>
                  </ul>
                </li>
                <li><strong>摊牌(Showdown)：</strong>
                  <ul>
                    <li>如果最后一轮下注后仍有多名玩家，进入摊牌阶段</li>
                    <li>玩家需要亮出底牌，最后一个下注或加注的玩家首先亮牌</li>
                    <li>如果没有下注，则庄家左侧第一位玩家首先亮牌，然后顺时针方向继续</li>
                    <li>每位玩家用自己的两张底牌和五张公共牌中选择五张牌组成最佳牌型</li>
                    <li>牌型最大的玩家赢得底池</li>
                    <li>如果多名玩家牌型相同，则平分底池</li>
                  </ul>
                </li>
              </ol>
            </RulesSection>
            
            <RulesSection>
              <SectionTitle>下注规则</SectionTitle>
              <ul>
                <li><strong>看牌(Check)：</strong>
                  <ul>
                    <li>当没有人下注时，玩家可以选择不下注而将行动权传给下一位玩家</li>
                    <li>这表示玩家暂时不想下注，但保留继续参与牌局的权利</li>
                  </ul>
                </li>
                <li><strong>下注(Bet)：</strong>
                  <ul>
                    <li>当没有人下注时，玩家可以选择下注一定数量的筹码</li>
                    <li>在翻牌圈、转牌圈和河牌圈，第一个行动的玩家可以选择下注</li>
                  </ul>
                </li>
                <li><strong>跟注(Call)：</strong>
                  <ul>
                    <li>跟上前一位玩家的下注或加注金额</li>
                    <li>这允许玩家继续参与牌局</li>
                  </ul>
                </li>
                <li><strong>加注(Raise)：</strong>
                  <ul>
                    <li>将当前下注金额提高</li>
                    <li>加注必须至少是前一位玩家下注或加注金额的两倍</li>
                    <li>加注会迫使其他玩家必须跟注、加注或弃牌</li>
                  </ul>
                </li>
                <li><strong>弃牌(Fold)：</strong>
                  <ul>
                    <li>放弃当前手牌，退出本局游戏</li>
                    <li>弃牌意味着放弃之前投入到底池的所有筹码</li>
                  </ul>
                </li>
                <li><strong>全押(All-In)：</strong>
                  <ul>
                    <li>将所有筹码押上</li>
                    <li>当玩家全押后，他们可以继续参与当前牌局直到结束</li>
                    <li>如果全押金额不足以跟注，将创建一个边池(Side Pot)</li>
                    <li>全押玩家只能赢取主池和他参与的边池部分</li>
                  </ul>
                </li>
              </ul>
            </RulesSection>
            
            <RulesSection>
              <SectionTitle>位置与策略</SectionTitle>
              <p>位置在德州扑克中极为重要，影响玩家的策略和决策。</p>
              <ul>
                <li><strong>早位(Early Position)：</strong>庄家右侧到枪手位置的玩家，信息较少，策略更为谨慎</li>
                <li><strong>中位(Middle Position)：</strong>早位与晚位之间的玩家，策略相对灵活</li>
                <li><strong>晚位(Late Position)：</strong>靠近庄家左右的位置，拥有更多信息，可以采取更激进的策略</li>
                <li><strong>庄家(Button)：</strong>除开牌前，在每轮下注中最后行动，信息优势最大</li>
              </ul>
              <p><strong>主要位置名称（从早到晚）：</strong></p>
              <ul>
                <li><strong>UTG (Under the Gun)：</strong>大盲注后第一个行动的位置，又称"枪手"</li>
                <li><strong>MP (Middle Position)：</strong>UTG后的中间位置</li>
                <li><strong>CO (Cut Off)：</strong>庄家前一位，倒数第二个行动</li>
                <li><strong>BTN (Button)：</strong>庄家位置，最后行动</li>
                <li><strong>SB (Small Blind)：</strong>小盲注位置，翻牌后第一个行动</li>
                <li><strong>BB (Big Blind)：</strong>大盲注位置，翻牌前最后行动</li>
              </ul>
            </RulesSection>
            
            <RulesSection>
              <SectionTitle>牌型大小（从高到低）</SectionTitle>
              <CardRankTable>
                <thead>
                  <tr>
                    <th>牌型</th>
                    <th>中文名称</th>
                    <th>说明</th>
                    <th>例子</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Royal Flush</td>
                    <td>皇家同花顺</td>
                    <td>同一花色的A、K、Q、J、10</td>
                    <td>黑桃A、K、Q、J、10</td>
                  </tr>
                  <tr>
                    <td>Straight Flush</td>
                    <td>同花顺</td>
                    <td>同一花色的连续五张牌</td>
                    <td>红桃9、8、7、6、5</td>
                  </tr>
                  <tr>
                    <td>Four of a Kind</td>
                    <td>四条/铁支</td>
                    <td>四张相同点数的牌</td>
                    <td>四个K加上任意一张牌</td>
                  </tr>
                  <tr>
                    <td>Full House</td>
                    <td>葫芦/满堂红</td>
                    <td>三张相同点数的牌加一对</td>
                    <td>三个9加上一对4</td>
                  </tr>
                  <tr>
                    <td>Flush</td>
                    <td>同花</td>
                    <td>五张相同花色的牌</td>
                    <td>五张梅花</td>
                  </tr>
                  <tr>
                    <td>Straight</td>
                    <td>顺子</td>
                    <td>五张连续点数的牌</td>
                    <td>8、7、6、5、4（不同花色）</td>
                  </tr>
                  <tr>
                    <td>Three of a Kind</td>
                    <td>三条</td>
                    <td>三张相同点数的牌</td>
                    <td>三个Q加上任意两张不同的牌</td>
                  </tr>
                  <tr>
                    <td>Two Pair</td>
                    <td>两对</td>
                    <td>两个不同的对子</td>
                    <td>一对A和一对7加上任意一张牌</td>
                  </tr>
                  <tr>
                    <td>One Pair</td>
                    <td>一对</td>
                    <td>一个对子</td>
                    <td>一对10加上任意三张不同的牌</td>
                  </tr>
                  <tr>
                    <td>High Card</td>
                    <td>高牌</td>
                    <td>不符合以上任何牌型</td>
                    <td>如A、J、9、5、3（不同花色且不连续）</td>
                  </tr>
                </tbody>
              </CardRankTable>
              <p>当玩家牌型相同时，比较牌型内部的大小：</p>
              <ul>
                <li>对于同等牌型，点数大的获胜（如四条A大于四条K）</li>
                <li>如果主要牌型相同，比较踢脚牌（如A-A-A-K-Q大于A-A-A-J-10）</li>
                <li>同花比较时，先看最大的牌，然后依次比较（A-Q-9-5-3大于A-J-10-9-8）</li>
                <li>在顺子中，以最高牌决定大小（A-K-Q-J-10大于K-Q-J-10-9）</li>
                <li>特殊情况：A-5-4-3-2是最小的顺子，仅大于高牌</li>
              </ul>
            </RulesSection>
            
            <RulesSection>
              <SectionTitle>盲注结构与底池</SectionTitle>
              <ul>
                <li><strong>盲注(Blinds)：</strong>强制下注，确保每手牌都有筹码可赢</li>
                <li><strong>小盲注(Small Blind)：</strong>通常是大盲注的一半</li>
                <li><strong>大盲注(Big Blind)：</strong>基本下注单位，决定游戏的最小投注标准</li>
                <li><strong>底池(Pot)：</strong>所有玩家下注的筹码总和</li>
                <li><strong>边池(Side Pot)：</strong>当一名或多名玩家全押(All-in)但筹码不足以匹配其他玩家下注时形成</li>
              </ul>
            </RulesSection>
            
            <RulesSection>
              <SectionTitle>特殊规则</SectionTitle>
              <ul>
                <li><strong>平局(Split Pot)：</strong>如果两名或以上玩家拥有完全相同的最佳牌型，底池将平均分配。</li>
                <li><strong>底牌(Hole Cards)：</strong>每位玩家的底牌只有自己可以看到，除非到了摊牌阶段。</li>
                <li><strong>最佳五张牌：</strong>最终比较的是每位玩家用自己的底牌和公共牌组成的最佳五张牌，而不一定要用到所有底牌。</li>
                <li><strong>摊牌顺序：</strong>在摊牌阶段，最后一个下注或加注的玩家首先亮牌，然后按顺时针方向继续。</li>
                <li><strong>弃牌保护：</strong>玩家可以选择在弃牌时不公开自己的手牌，以保持策略隐秘性。</li>
              </ul>
              <RulesExample>
                <p><strong>例子：</strong>玩家A有底牌A♠K♣，玩家B有底牌J♥J♦。公共牌是A♥Q♠10♦5♣2♦。</p>
                <p>玩家A的最佳组合是：一对A (A♠A♥ + K♣Q♠10♦)</p>
                <p>玩家B的最佳组合是：一对J (J♥J♦ + A♥Q♠10♦)</p>
                <p>玩家A获胜，因为一对A大于一对J。</p>
              </RulesExample>
            </RulesSection>
            
            <RulesSection>
              <SectionTitle>策略提示</SectionTitle>
              <ul>
                <li><strong>位置意识：</strong>注意位置的重要性，后位玩家拥有更多信息</li>
                <li><strong>起手牌选择：</strong>初学者应该在前期只玩强牌，如高对、AK、AQ等</li>
                <li><strong>读牌能力：</strong>观察对手下注模式，寻找规律和弱点</li>
                <li><strong>筹码管理：</strong>谨慎管理你的筹码，不要在弱牌上投入过多</li>
                <li><strong>战略弃牌：</strong>有时候弃牌是最好的选择，不要因为已经投入筹码而不舍得放弃</li>
                <li><strong>耐心等待：</strong>保持耐心，等待好牌和好时机</li>
                <li><strong>情绪控制：</strong>控制情绪波动，不让短期结果影响决策</li>
                <li><strong>底池赔率：</strong>学会计算底池赔率，做出合理决策</li>
              </ul>
            </RulesSection>
            
            <RulesSection>
              <SectionTitle>专业术语</SectionTitle>
              <ul>
                <li><strong>踢脚牌(Kicker)：</strong>在相同牌型下，用于比较大小的额外牌</li>
                <li><strong>口袋对(Pocket Pair)：</strong>起手两张相同点数的牌</li>
                <li><strong>翻前(Pre-flop)：</strong>指翻牌前的阶段</li>
                <li><strong>翻后(Post-flop)：</strong>指翻牌后的阶段</li>
                <li><strong>底池控制(Pot Control)：</strong>通过控制下注大小来保持较小底池的策略</li>
                <li><strong>慢打(Slow Play)：</strong>拿强牌装弱，诱使对手下注的策略</li>
                <li><strong>诈唬(Bluff)：</strong>用弱牌假装有强牌，迫使对手弃牌的策略</li>
                <li><strong>半诈唬(Semi-Bluff)：</strong>使用有改善潜力的牌进行的诈唬</li>
                <li><strong>牌面(Board)：</strong>指公共牌区域</li>
                <li><strong>牌力(Hand Strength)：</strong>牌型的相对强度</li>
              </ul>
            </RulesSection>
          </ModalContent>
        </Modal>
      )}
      
      <Header>
        <RoomInfo>
          房间ID: {roomId}
          {gameState.roomOwner && gameState.players[gameState.roomOwner] && 
            ` | 房主: ${gameState.players[gameState.roomOwner].name}`}
        </RoomInfo>
        <HeaderButtons>
          <RulesButton onClick={() => setShowRules(true)}>游戏规则</RulesButton>
          <HistoryButton onClick={handleShowHistory}>查看上局</HistoryButton>
          <ExitButton onClick={handleLeave}>退出房间</ExitButton>
        </HeaderButtons>
      </Header>
      
      <PlayersContainer>
        <PlayersTop>
          {playerPositions.slice(0, 3).map((player, index) => (
            <Player 
              key={player ? player.id : `empty-${index}`}
              player={player}
              isCurrentPlayer={player && player.id === currentPlayer}
              isCurrentUser={player && player.id === currentUserId}
              isDealer={player && player.id === dealer}
              isSmallBlind={player && player.id === smallBlind}
              isBigBlind={player && player.id === bigBlind}
              gameState={gameState.gameState}
            />
          ))}
        </PlayersTop>
        
        <PlayersSides>
          <div>
            {playerPositions.slice(7, 9).map((player, index) => (
              <Player 
                key={player ? player.id : `empty-left-${index}`}
                player={player}
                isCurrentPlayer={player && player.id === currentPlayer}
                isCurrentUser={player && player.id === currentUserId}
                isDealer={player && player.id === dealer}
                isSmallBlind={player && player.id === smallBlind}
                isBigBlind={player && player.id === bigBlind}
                gameState={gameState.gameState}
              />
            ))}
          </div>
          
          <Table 
            communityCards={communityCards} 
            pot={pot} 
            gameState={gameState.gameState}
            winners={gameState.winners}
            countdown={countdown}
            players={players}
            dealerPosition={dealer}
            smallBlindPosition={smallBlind}
            bigBlindPosition={bigBlind}
            currentPlayer={currentPlayer}
          />
          
          <div>
            {playerPositions.slice(3, 4).map((player, index) => (
              <Player 
                key={player ? player.id : `empty-right-${index}`}
                player={player}
                isCurrentPlayer={player && player.id === currentPlayer}
                isCurrentUser={player && player.id === currentUserId}
                isDealer={player && player.id === dealer}
                isSmallBlind={player && player.id === smallBlind}
                isBigBlind={player && player.id === bigBlind}
                gameState={gameState.gameState}
              />
            ))}
          </div>
        </PlayersSides>
        
        <PlayersBottom>
          {playerPositions.slice(4, 7).map((player, index) => (
            <Player 
              key={player ? player.id : `empty-bottom-${index}`}
              player={player}
              isCurrentPlayer={player && player.id === currentPlayer}
              isCurrentUser={player && player.id === currentUserId}
              isDealer={player && player.id === dealer}
              isSmallBlind={player && player.id === smallBlind}
              isBigBlind={player && player.id === bigBlind}
              gameState={gameState.gameState}
            />
          ))}
        </PlayersBottom>
      </PlayersContainer>
      
      <BottomSpace />
      
      <ControlPanelContainer>
        <ControlPanel />
      </ControlPanelContainer>
      
      <GameHistoryModal 
        isOpen={showHistory} 
        onClose={handleCloseHistory} 
        roomId={roomId} 
      />
    </RoomContainer>
  );
};

export default RoomPage; 