require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 添加解析JSON的中间件
app.use(express.json());

// 版本信息端点，用于前端检查缓存
app.get('/api/version', (req, res) => {
  res.json({
    version: '1.0.1', // 每次修改服务器时递增此版本号
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 添加配置API端点
app.get('/api/config', (req, res) => {
  // 返回配置信息，包括socket服务器地址
  res.json({
    socketUrl: process.env.SOCKET_URL || 'http://localhsot:3000',  // 这里配置您的socket服务器地址
    appName: '德州扑克游戏',
    version: '1.0.0'
  });
});

// 专门用于获取Socket连接地址的端点
app.get('/api/config/socket', (req, res) => {
  // 获取请求的主机地址，优先使用代理头信息
  const xForwardedHost = req.headers['x-forwarded-host'];
  const xForwardedProto = req.headers['x-forwarded-proto'];
  
  const host = xForwardedHost || req.headers.host || req.headers.origin || process.env.HOST || 'localhost';
  
  // 获取端口号，默认为服务器运行的端口
  const port = process.env.PORT || 3000;
  
  // 确定协议（HTTP或HTTPS）
  const protocol = xForwardedProto || (req.secure || (req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http');
  
  // 优先使用环境变量中的Socket URL
  const socketUrl = process.env.SOCKET_URL || `${protocol}://${host.split(':')[0]}:${port}`;
  
  console.log('Socket配置请求信息:', {
    headers: {
      host: req.headers.host,
      origin: req.headers.origin,
      referer: req.headers.referer,
      'x-forwarded-host': req.headers['x-forwarded-host'],
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'x-forwarded-for': req.headers['x-forwarded-for']
    },
    secure: req.secure,
    protocol: protocol,
    host: host,
    socketUrl: socketUrl
  });
  
  // 返回Socket配置信息
  res.json({
    socketUrl: socketUrl,
    requestInfo: {
      host: host,
      protocol: protocol,
      serverPort: port
    }
  });
});

// 如果在生产环境下，提供静态文件
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// 游戏房间
const rooms = {};

// 牌组定义
const createDeck = () => {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck = [];
  
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }
  
  return deck;
};

// 洗牌
const shuffleDeck = (deck) => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

// 发牌
const dealCards = (deck, count) => {
  return deck.splice(0, count);
};

// 计算牌型和大小
const evaluateHand = (playerCards, communityCards) => {
  // 组合所有牌
  const allCards = [...playerCards, ...communityCards];
  
  // 从所有可能的5张牌组合中找出最佳手牌
  const bestHand = findBestHand(allCards);
  
  return bestHand;
};

// 从所有可能的5张牌组合中找出最佳牌型
const findBestHand = (cards) => {
  // 获取所有可能的5张牌组合
  const combinations = getCombinations(cards, 5);
  let bestHand = null;
  
  // 评估每一种组合
  for (const combo of combinations) {
    const evaluated = evaluateCardCombo(combo);
    if (!bestHand || compareHands(evaluated, bestHand) > 0) {
      bestHand = evaluated;
    }
  }
  
  return bestHand;
};

// 生成所有可能的n张牌组合
const getCombinations = (cards, n) => {
  const combinations = [];
  
  const backtrack = (start, current) => {
    if (current.length === n) {
      combinations.push([...current]);
      return;
    }
    
    for (let i = start; i < cards.length; i++) {
      current.push(cards[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  };
  
  backtrack(0, []);
  return combinations;
};

// 评估一个5张牌的组合
const evaluateCardCombo = (cards) => {
  if (cards.length !== 5) {
    throw new Error('Must evaluate exactly 5 cards');
  }
  
  // 排序牌，按照点数降序排列
  const sorted = [...cards].sort((a, b) => {
    const valueA = getCardValue(a.value);
    const valueB = getCardValue(b.value);
    return valueB - valueA;
  });
  
  // 检查是否是同花
  const isFlush = sorted.every(card => card.suit === sorted[0].suit);
  
  // 检查是否是顺子
  let isStraight = true;
  for (let i = 1; i < sorted.length; i++) {
    const prevValue = getCardValue(sorted[i-1].value);
    const currValue = getCardValue(sorted[i].value);
    if (prevValue !== currValue + 1) {
      // 特殊处理A-5顺子
      if (i === 1 && sorted[0].value === 'A' && sorted[1].value === '5') {
        // 还需要检查剩余牌是否为5-4-3-2
        if (!(sorted[1].value === '5' && sorted[2].value === '4' && sorted[3].value === '3' && sorted[4].value === '2')) {
          isStraight = false;
        }
      } else {
        isStraight = false;
        break;
      }
    }
  }
  
  // A-5-4-3-2是最小的顺子
  const isA5432 = isStraight && sorted[0].value === 'A' && sorted[1].value === '5';
  
  // 计算每个点数出现的次数
  const valueCounts = {};
  for (const card of sorted) {
    valueCounts[card.value] = (valueCounts[card.value] || 0) + 1;
  }
  
  const counts = Object.values(valueCounts).sort((a, b) => b - a);
  
  // 确定牌型
  let rank, value;
  
  // 皇家同花顺
  if (isFlush && isStraight && sorted[0].value === 'A' && sorted[1].value === 'K') {
    rank = 'royal-flush';
    value = 900;
  }
  // 同花顺
  else if (isFlush && isStraight) {
    rank = 'straight-flush';
    value = 800;
    // 考虑A-5-4-3-2特殊情况
    if (isA5432) {
      value += getCardValue('5');
    } else {
      value += getCardValue(sorted[0].value);
    }
  }
  // 四条
  else if (counts[0] === 4) {
    rank = 'four-of-a-kind';
    value = 700;
    // 找出四条的点数
    for (const [cardValue, count] of Object.entries(valueCounts)) {
      if (count === 4) {
        value += getCardValue(cardValue);
        break;
      }
    }
  }
  // 葫芦（三条+对子）
  else if (counts[0] === 3 && counts[1] === 2) {
    rank = 'full-house';
    value = 600;
    // 三条的点数作为主值
    for (const [cardValue, count] of Object.entries(valueCounts)) {
      if (count === 3) {
        value += getCardValue(cardValue);
        break;
      }
    }
  }
  // 同花
  else if (isFlush) {
    rank = 'flush';
    value = 500 + getCardValue(sorted[0].value);
  }
  // 顺子
  else if (isStraight) {
    rank = 'straight';
    value = 400;
    // 考虑A-5-4-3-2特殊情况
    if (isA5432) {
      value += getCardValue('5');
    } else {
      value += getCardValue(sorted[0].value);
    }
  }
  // 三条
  else if (counts[0] === 3) {
    rank = 'three-of-a-kind';
    value = 300;
    // 找出三条的点数
    for (const [cardValue, count] of Object.entries(valueCounts)) {
      if (count === 3) {
        value += getCardValue(cardValue);
        break;
      }
    }
  }
  // 两对
  else if (counts[0] === 2 && counts[1] === 2) {
    rank = 'two-pair';
    value = 200;
    let pairValues = [];
    // 找出两对的点数
    for (const [cardValue, count] of Object.entries(valueCounts)) {
      if (count === 2) {
        pairValues.push(getCardValue(cardValue));
      }
    }
    pairValues.sort((a, b) => b - a);
    value += pairValues[0] * 14 + pairValues[1]; // 大对子权重更高
  }
  // 一对
  else if (counts[0] === 2) {
    rank = 'one-pair';
    value = 100;
    // 找出对子的点数
    for (const [cardValue, count] of Object.entries(valueCounts)) {
      if (count === 2) {
        value += getCardValue(cardValue);
        break;
      }
    }
  }
  // 高牌
  else {
    rank = 'high-card';
    value = getCardValue(sorted[0].value);
  }
  
  return {
    rank,
    value,
    cards: sorted
  };
};

// 比较两个手牌的大小
const compareHands = (hand1, hand2) => {
  // 首先比较牌型大小（handType值越大，牌型越强）
  if (hand1.value !== hand2.value) {
    return hand1.value - hand2.value;
  }
  
  // 如果主要牌型值相同，比较剩余的牌
  return compareRemainingCards(hand1.cards, hand2.cards);
};

// 比较剩余牌的大小
const compareRemainingCards = (cards1, cards2) => {
  for (let i = 0; i < cards1.length; i++) {
    const value1 = getCardValue(cards1[i].value);
    const value2 = getCardValue(cards2[i].value);
    if (value1 !== value2) {
      return value1 - value2;
    }
  }
  return 0; // 完全相同
};

// 获取牌的数值
const getCardValue = (value) => {
  const values = {
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13,
    'A': 14
  };
  return values[value] || 0;
};

// 游戏类
class PokerGame {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = {};
    this.gameState = 'waiting';
    this.dealerPosition = null; // 庄家位置
    this.smallBlindPosition = null; // 小盲位置
    this.bigBlindPosition = null; // 大盲位置
    this.currentPlayer = null; // 当前行动玩家
    this.deck = [];
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.smallBlind = 2;
    this.bigBlind = 4;
    this.winners = [];
    this.playerOrder = []; // 存储玩家的顺序
    this.actedPlayers = new Set(); // 记录已经行动过的玩家
    this.lastRaisePlayer = null; // 最后一个加注的玩家
    this.isNewBettingRound = true; // 是否是新的下注轮
    this.roomOwner = null; // 房主ID
    this.gameHistory = null; // 存储上一轮游戏历史
  }

  resetGame() {
    // 保存当前的游戏历史
    const currentHistory = this.gameHistory;
    
    this.gameState = 'waiting';
    this.deck = [];
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.winners = [];
    this.playerOrder = [];
    this.actedPlayers = new Set();
    this.lastRaisePlayer = null;
    this.isNewBettingRound = true;
    
    // 重置玩家状态
    Object.values(this.players).forEach(player => {
      player.hand = [];
      player.bet = 0;
      player.folded = false;
      player.handDescription = '';
    });
    
    // 恢复游戏历史
    this.gameHistory = currentHistory;
  }

  // 游戏是否可以开始
  canStartGame() {
    // 筛选出未断开连接且有足够筹码的玩家
    const activePlayers = Object.values(this.players).filter(player => 
      !player.disconnected && player.chips > 0 && !player.isSpectator
    );
    return activePlayers.length >= 2 && activePlayers.every(player => player.isReady);
  }

  // 开始游戏
  startGame() {
    if (this.gameState !== 'waiting' || !this.canStartGame()) {
      return false;
    }

    // 筛选已准备且未断开连接的玩家，且筹码大于0
    const activePlayers = Object.entries(this.players)
      .filter(([_, player]) => player.isReady && !player.disconnected && player.chips > 0 && !player.isSpectator)
      .map(([id]) => id);
    
    if (activePlayers.length < 2) {
      return false;
    }

    // 调用resetGame同时保留当前历史记录
    this.resetGame();
    
    this.playerOrder = [...activePlayers];
    
    // 如果是第一局游戏，随机选择庄家位置
    if (this.dealerPosition === null || !this.playerOrder.includes(this.dealerPosition)) {
      const randomIndex = Math.floor(Math.random() * this.playerOrder.length);
      this.dealerPosition = this.playerOrder[randomIndex];
    } else {
      // 移动庄家位置到下一个玩家
      const currentDealerIndex = this.playerOrder.indexOf(this.dealerPosition);
      const nextDealerIndex = (currentDealerIndex + 1) % this.playerOrder.length;
      this.dealerPosition = this.playerOrder[nextDealerIndex];
    }
    
    // 设置小盲和大盲位置
    const dealerIndex = this.playerOrder.indexOf(this.dealerPosition);
    this.smallBlindPosition = this.playerOrder[(dealerIndex + 1) % this.playerOrder.length];
    this.bigBlindPosition = this.playerOrder[(dealerIndex + 2) % this.playerOrder.length];
    
    // 初始化扑克牌
    this.initializeDeck();
    this.shuffleDeck();
    
    // 发牌
    this.dealHands();
    
    // 小盲和大盲下注
    this.players[this.smallBlindPosition].chips -= this.smallBlind;
    this.players[this.smallBlindPosition].bet = this.smallBlind;
    this.pot += this.smallBlind;
    
    this.players[this.bigBlindPosition].chips -= this.bigBlind;
    this.players[this.bigBlindPosition].bet = this.bigBlind;
    this.pot += this.bigBlind;
    this.currentBet = this.bigBlind;
    
    // 设置当前行动玩家为大盲注位置后的第一个玩家（UTG位置）
    const bigBlindIndex = this.playerOrder.indexOf(this.bigBlindPosition);
    this.currentPlayer = this.playerOrder[(bigBlindIndex + 1) % this.playerOrder.length];
    
    this.gameState = 'pre-flop';
    this.isNewBettingRound = true;
    
    // 广播更新的游戏状态，为每个玩家单独发送包含底牌的状态
    Object.keys(this.players).forEach(playerId => {
      const playerSocket = io.sockets.sockets.get(playerId);
      if (playerSocket) {
        playerSocket.emit('updateGameState', this.getGameStateForPlayer(playerId));
      }
    });
    
    return true;
  }

  // 处理玩家行动
  playerAction(playerId, action, amount = 0) {
    if (this.gameState === 'waiting' || this.gameState === 'showdown' || this.currentPlayer !== playerId) {
      return false;
    }
    
    const player = this.players[playerId];
    if (!player || player.folded) {
      return false;
    }
    
    switch (action) {
      case 'fold':
        player.folded = true;
        break;
        
      case 'check':
        // 只有当不需要跟注时才能看牌
        if (player.bet !== this.currentBet) {
          return false;
        }
        break;
        
      case 'call':
        const callAmount = this.currentBet - player.bet;
        if (callAmount > player.chips) {
          // 全下(All-in)
          this.pot += player.chips;
          player.bet += player.chips;
          player.chips = 0;
          player.isAllIn = true; // 标记玩家为全下状态
        } else {
        player.chips -= callAmount;
        player.bet = this.currentBet;
        this.pot += callAmount;
          // 检查是否在跟注后筹码为0，此时也应该标记为全下
          if (player.chips === 0) {
            player.isAllIn = true;
          }
        }
        break;
        
      case 'all-in': // 新增全下选项
        // 玩家押上所有筹码
        this.pot += player.chips;
        player.bet += player.chips;
        
        // 如果全下金额超过当前最大下注，更新当前下注金额
        if (player.bet > this.currentBet) {
          this.currentBet = player.bet;
          this.lastRaisePlayer = playerId;
          // 重置已行动玩家集合
          this.actedPlayers = new Set([playerId]);
        }
        
        player.chips = 0;
        player.isAllIn = true;
        break;
        
      case 'raise':
        if (amount < this.currentBet * 2 || amount > player.chips + player.bet) {
          return false;
        }
        
        const raiseAmount = amount - player.bet;
        player.chips -= raiseAmount;
        this.pot += raiseAmount;
        player.bet = amount;
        this.currentBet = amount;
        this.lastRaisePlayer = playerId;
        
        // 如果加注后筹码为0，标记为All-in
        if (player.chips === 0) {
          player.isAllIn = true;
        }
        
        // 当有人加注时，重置已行动玩家集合，只保留当前玩家
        this.actedPlayers = new Set([playerId]);
        break;
        
      case 'bet': // 添加单独的下注操作
        // 如果已经有人下注了，不允许使用bet
        if (this.currentBet > 0) {
          return false;
        }
        
        // 如果下注金额超过玩家拥有的筹码，按全下处理
        if (amount > player.chips) {
          amount = player.chips;
        }
        
        player.chips -= amount;
        this.pot += amount;
        player.bet = amount;
        this.currentBet = amount;
        this.lastRaisePlayer = playerId;
        
        // 如果下注后筹码为0，标记为All-in
        if (player.chips === 0) {
          player.isAllIn = true;
        }
        
        // 重置已行动玩家集合，只保留当前玩家
        this.actedPlayers = new Set([playerId]);
        break;
        
      default:
        return false;
    }
    
    // 通用检查：在任何行动后，如果玩家筹码为0，应标记为全下
    if (player.chips === 0 && !player.isAllIn) {
      player.isAllIn = true;
    }
    
    // 标记此玩家已经行动过
    this.actedPlayers.add(playerId);
    
    // 寻找下一个有效玩家
    this.moveToNextPlayer();
    
    // 检查这一轮的下注是否结束
    if (this.isBettingRoundComplete()) {
      this.advanceGameState();
    }
    
    // 为每个玩家发送包含其底牌的游戏状态
    Object.keys(this.players).forEach(pid => {
      if (!this.players[pid]) return; // 确保玩家存在
      const playerSocket = io.sockets.sockets.get(pid);
      if (playerSocket) {
        playerSocket.emit('updateGameState', this.getGameStateForPlayer(pid));
      }
    });
    return true;
  }

  // 移动到下一个玩家
  moveToNextPlayer() {
    // 筛选出有效玩家：未弃牌且不是观战者的玩家(包括All-in的玩家)
    const activePlayers = this.playerOrder.filter(id => {
      const player = this.players[id];
      // 添加对玩家存在性的检查
      if (!player) return false;
      return !player.folded && !player.isSpectator;
    });
    
    if (activePlayers.length <= 1) {
      // 只有一个玩家剩余，游戏结束
      this.gameState = 'showdown';
      this.determineWinner();
      return;
    }
    
    const currentIndex = this.playerOrder.indexOf(this.currentPlayer);
    let nextIndex = (currentIndex + 1) % this.playerOrder.length;
    let nextPlayer = this.playerOrder[nextIndex];
    
    // 找到下一个未弃牌、非观战者且未All-in的玩家
    while (
      !this.players[nextPlayer] || // 添加对玩家存在性的检查
      this.players[nextPlayer].folded || 
      this.players[nextPlayer].isSpectator ||
      (this.players[nextPlayer].isAllIn) // 跳过All-in的玩家，因为他们不能再行动
    ) {
      nextIndex = (nextIndex + 1) % this.playerOrder.length;
      nextPlayer = this.playerOrder[nextIndex];
      
      // 如果循环一圈后回到当前玩家，说明所有其他玩家都弃牌、观战或All-in了
      if (nextIndex === currentIndex) {
        // 检查是否所有未弃牌的活跃玩家都已经All-in
        const allPlayersAllInOrFolded = this.playerOrder.every(id => 
          !this.players[id] || // 添加对玩家存在性的检查
          this.players[id].folded || 
          this.players[id].isSpectator || 
          this.players[id].isAllIn
        );
        
        // 如果所有剩余玩家都All-in了，直接发完所有公共牌并结束游戏
        if (allPlayersAllInOrFolded) {
          // 如果还有公共牌需要发，一次性发完
          while (this.communityCards.length < 5 && this.deck.length >= 5 - this.communityCards.length) {
            this.communityCards.push(this.deck.pop());
          }
          
          // 进入摊牌阶段
          this.gameState = 'showdown';
          this.determineWinner();
          return;
        }
        
        break;
      }
    }
    
    this.currentPlayer = nextPlayer;
  }

  // 检查一轮下注是否结束
  isBettingRoundComplete() {
    // 筛选出未弃牌且非观战者的玩家(包括All-in的玩家)
    const activePlayers = this.playerOrder.filter(id => {
      const player = this.players[id];
      // 添加对玩家存在性的检查
      if (!player) return false;
      return !player.folded && !player.isSpectator;
    });
    
    if (activePlayers.length <= 1) {
      return true;
    }
    
    // 筛选出未All-in的活跃玩家
    const nonAllInActivePlayers = activePlayers.filter(id => {
      // 添加对玩家存在性的检查
      if (!this.players[id]) return false;
      return !this.players[id].isAllIn;
    });
    
    // 如果所有活跃玩家都All-in了，下注轮结束
    if (nonAllInActivePlayers.length === 0) {
      return true;
    }
    
    // 检查所有未All-in的活跃玩家是否都已行动
    const allActed = nonAllInActivePlayers.every(id => this.actedPlayers.has(id));
    
    // 检查所有未All-in的活跃玩家的下注是否相同
    const allBetsEqual = nonAllInActivePlayers.every(id => {
      const player = this.players[id];
      // 添加对玩家存在性的检查
      if (!player) return true; // 如果玩家不存在，视为满足条件
      return player.bet === this.currentBet || player.isAllIn; // All-in的玩家不需要跟注
    });
    
    return allActed && allBetsEqual;
  }

  // 进入下一个游戏状态
  advanceGameState() {
    const activePlayers = this.playerOrder.filter(id => {
      // 添加对玩家存在性的检查
      if (!this.players[id]) return false;
      return !this.players[id].folded && !this.players[id].isSpectator;
    });
    
    if (activePlayers.length <= 1) {
      // 只有一个玩家剩余，游戏结束
      this.gameState = 'showdown';
      this.determineWinner();
      
      // 延迟5秒后结束游戏，让玩家有时间看到结果
      setTimeout(() => {
        // 重置玩家准备状态
        Object.values(this.players).forEach(player => {
          if (player) player.isReady = false; // 添加对玩家存在性的检查
        });
        
        // 游戏结束后转为waiting状态
        this.gameState = 'waiting';
        
        // 通知所有玩家游戏状态更新
        Object.keys(this.players).forEach(playerId => {
          const playerSocket = io.sockets.sockets.get(playerId);
          if (playerSocket) {
            playerSocket.emit('updateGameState', this.getGameStateForPlayer(playerId));
          }
        });
      }, 5000); // 5秒延迟
      
      return;
    }
    
    // 检查是否所有未弃牌的玩家都All-in了
    const allPlayersAllIn = activePlayers.every(id => {
      // 添加对玩家存在性的检查
      if (!this.players[id]) return true; // 如果玩家不存在，视为满足条件
      return this.players[id].isAllIn;
    });
    
    // 如果所有玩家都All-in了，一次性发完所有公共牌
    if (allPlayersAllIn) {
      // 发完所有公共牌
      while (this.communityCards.length < 5 && this.deck.length >= 5 - this.communityCards.length) {
        this.communityCards.push(this.deck.pop());
      }
      
      // 进入摊牌阶段
      this.gameState = 'showdown';
      this.determineWinner();
      
      // 延迟5秒后结束游戏，让玩家有时间看到结果
      setTimeout(() => {
        // 重置玩家准备状态
        Object.values(this.players).forEach(player => {
          if (player) player.isReady = false; // 添加对玩家存在性的检查
        });
        
        // 游戏结束后转为waiting状态
        this.gameState = 'waiting';
        
        // 通知所有玩家游戏状态更新
        Object.keys(this.players).forEach(playerId => {
          const playerSocket = io.sockets.sockets.get(playerId);
          if (playerSocket) {
            playerSocket.emit('updateGameState', this.getGameStateForPlayer(playerId));
          }
        });
      }, 5000); // 5秒延迟
      
      return;
    }
    
    // 重置已行动玩家集合
    this.actedPlayers = new Set();
    this.isNewBettingRound = true;
    
    // 重置所有玩家的下注金额为0（但不增加他们的筹码，因为筹码已经进入底池）
    Object.values(this.players).forEach(player => {
      if (player) player.bet = 0; // 添加对玩家存在性的检查
    });
    this.currentBet = 0;
    
    switch (this.gameState) {
      case 'pre-flop':
        // 发3张公共牌
        this.communityCards.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
        this.gameState = 'flop';
        break;
        
      case 'flop':
        // 发第4张公共牌
        this.communityCards.push(this.deck.pop());
        this.gameState = 'turn';
        break;
        
      case 'turn':
        // 发第5张公共牌
        this.communityCards.push(this.deck.pop());
        this.gameState = 'river';
        break;
        
      case 'river':
        // 游戏结束，摊牌
        this.gameState = 'showdown';
        this.determineWinner();
        
        // 延迟5秒后结束游戏，让玩家有时间看到结果
        setTimeout(() => {
          // 重置玩家准备状态
          Object.values(this.players).forEach(player => {
            if (player) player.isReady = false; // 添加对玩家存在性的检查
          });
          
          // 游戏结束后转为waiting状态
          this.gameState = 'waiting';
          
          // 通知所有玩家游戏状态更新
          Object.keys(this.players).forEach(playerId => {
            const playerSocket = io.sockets.sockets.get(playerId);
            if (playerSocket) {
              playerSocket.emit('updateGameState', this.getGameStateForPlayer(playerId));
            }
          });
        }, 5000); // 5秒延迟
        
        return;
        
      default:
        return;
    }
    
    // 下一阶段中，第一个行动的玩家是庄家位置之后的第一个未弃牌、未全下且有筹码的玩家
    const dealerIndex = this.playerOrder.indexOf(this.dealerPosition);
    let nextPlayerIndex = (dealerIndex + 1) % this.playerOrder.length;
    
    // 寻找下一个合适的行动玩家
    while (
      this.players[this.playerOrder[nextPlayerIndex]].folded ||
      this.players[this.playerOrder[nextPlayerIndex]].isSpectator ||
      this.players[this.playerOrder[nextPlayerIndex]].isAllIn // 跳过已经All-in的玩家
    ) {
      nextPlayerIndex = (nextPlayerIndex + 1) % this.playerOrder.length;
      
      // 避免无限循环
      if (nextPlayerIndex === dealerIndex) {
        break;
      }
    }
    
    this.currentPlayer = this.playerOrder[nextPlayerIndex];
    
    // 为每个玩家发送各自的游戏状态
    Object.keys(this.players).forEach(playerId => {
      const playerSocket = io.sockets.sockets.get(playerId);
      if (playerSocket) {
        playerSocket.emit('updateGameState', this.getGameStateForPlayer(playerId));
      }
    });
  }

  // 玩家切换准备状态
  toggleReady(playerId) {
    if (!this.players[playerId]) {
      return false;
    }
    
    // 如果玩家筹码为0或是观战者，不允许准备
    if (this.players[playerId].chips <= 0 || this.players[playerId].isSpectator) {
      return false;
    }
    
    if (this.gameState !== 'waiting') {
      return false;
    }
    
    this.players[playerId].isReady = !this.players[playerId].isReady;
    
    // 检查是否所有玩家都已准备好，如果是，则开始游戏
    if (this.canStartGame()) {
      this.startGame();
    }
    
    // 为每个玩家发送包含其底牌的游戏状态
    Object.keys(this.players).forEach(pid => {
      const playerSocket = io.sockets.sockets.get(pid);
      if (playerSocket) {
        playerSocket.emit('updateGameState', this.getGameStateForPlayer(pid));
      }
    });
    return true;
  }

  // 初始化牌组
  initializeDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    this.deck = [];
    for (const suit of suits) {
      for (const value of values) {
        this.deck.push({ suit, value });
      }
    }
  }

  // 洗牌
  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  // 发牌
  dealHands() {
    // 重置所有玩家的手牌
    Object.values(this.players).forEach(player => {
      player.hand = [];
    });
    
    // 发第一张牌
    for (const playerId of this.playerOrder) {
      if (!this.players[playerId].folded) {
        this.players[playerId].hand.push(this.deck.pop());
      }
    }
    
    // 发第二张牌
    for (const playerId of this.playerOrder) {
      if (!this.players[playerId].folded) {
        this.players[playerId].hand.push(this.deck.pop());
      }
    }
  }

  // 获取游戏状态（供客户端使用）
  getGameState() {
    const players = {};
    
    // 为每个玩家创建一个浅拷贝，不包含敏感信息如其他玩家的牌
    Object.keys(this.players).forEach(playerId => {
      const player = { ...this.players[playerId] };
      players[playerId] = {
        id: player.id,
        name: player.name,
        chips: player.chips,
        bet: player.bet,
        folded: player.folded,
        disconnected: player.disconnected,
        isReady: player.isReady,
        handDescription: player.handDescription || '',
        isSpectator: player.isSpectator || false, // 观战状态
        isAllIn: player.isAllIn || false         // 全下状态
      };
    });
    
    return {
      roomId: this.roomId,
      gameState: this.gameState,
      players,
      dealerPosition: this.dealerPosition,
      smallBlindPosition: this.smallBlindPosition,
      bigBlindPosition: this.bigBlindPosition,
      currentPlayer: this.currentPlayer,
      communityCards: this.communityCards,
      pot: this.pot,
      currentBet: this.currentBet,
      winners: this.winners,
      roomOwner: this.roomOwner
    };
  }

  // 获取特定玩家的游戏状态（只显示该玩家自己的手牌）
  getGameStateForPlayer(playerId) {
    // 先获取基本游戏状态
    const gameState = this.getGameState();
    
    // 检查指定的玩家是否存在
    if (!this.players[playerId]) {
      return gameState;
    }
    
    // 创建玩家数据的深拷贝，避免修改原始数据
    const players = JSON.parse(JSON.stringify(gameState.players));
    
    // 遍历所有玩家
    Object.keys(players).forEach(id => {
      // 判断是否是观战者
      const isSpectator = this.players[id].isSpectator;
      
      if (id === playerId && !isSpectator) {
        // 当前玩家可以看到自己的手牌（如果不是观战者）
        players[id].cards = this.players[id].hand;
      } else if (this.gameState === 'showdown') {
        // 在摊牌阶段，可以看到所有未弃牌玩家的手牌
        if (!this.players[id].folded && !this.players[id].isSpectator) {
          players[id].cards = this.players[id].hand;
        } else {
          // 弃牌玩家和观战者的手牌保持隐藏
          players[id].cards = [];
        }
      } else {
        // 其他情况，隐藏玩家手牌
        players[id].cards = [];
      }
      
      // 添加手牌描述（如果存在且玩家未弃牌）
      if (this.players[id].handDescription && (!this.players[id].folded || this.gameState === 'showdown')) {
        players[id].handDescription = this.players[id].handDescription;
      }
    });
    
    // 返回定制的游戏状态，包含玩家信息
    return {
      ...gameState,
      players
    };
  }

  // 添加玩家
  addPlayer(playerId, playerName) {
    // 如果玩家已存在且只是断线重连
    if (this.players[playerId]) {
      this.players[playerId].disconnected = false;
      return true;
    }
    
    // 如果游戏已经开始，不能加入新玩家
    if (this.gameState !== 'waiting') {
      return false;
    }
    
    this.players[playerId] = {
      id: playerId,
      name: playerName,
      chips: 1000, // 初始筹码
      hand: [],
      bet: 0,
      folded: false,
      disconnected: false,
      isReady: false,
      isSpectator: false, // 观战状态标记
      isAllIn: false     // 全下状态标记
    };
    
    // 如果是第一个加入的玩家，设为房主
    if (Object.keys(this.players).length === 1) {
      this.roomOwner = playerId;
    }
    
    return true;
  }

  // 移除玩家
  removePlayer(playerId) {
    // 标记玩家为断线状态而不是立即移除
    if (this.players[playerId]) {
      this.players[playerId].disconnected = true;
      
      // 如果游戏正在进行且当前轮到该玩家，自动弃牌
      if (this.gameState !== 'waiting' && this.gameState !== 'showdown' && this.currentPlayer === playerId) {
        try {
          // 安全地调用playerAction，以防玩家已被删除
          this.playerAction(playerId, 'fold');
        } catch (error) {
          console.error('处理断开连接玩家的弃牌动作时出错:', error);
          // 如果出错，直接移动到下一个玩家
          try {
            this.moveToNextPlayer();
          } catch (moveError) {
            console.error('移动到下一个玩家时出错:', moveError);
            // 如果再次出错，可能需要重置游戏状态
            if (Object.keys(this.players).length < 2) {
              this.gameState = 'waiting';
            }
          }
        }
      }
      
      // 如果该玩家是房主，转移房主权限
      if (this.roomOwner === playerId) {
        const activePlayers = Object.keys(this.players).filter(id => 
          this.players[id] && !this.players[id].disconnected
        );
        if (activePlayers.length > 0) {
          this.roomOwner = activePlayers[0];
        } else {
          this.roomOwner = null;
        }
      }
      
      // 取消准备状态以防止游戏自动开始
      this.players[playerId].isReady = false;
      
      // 为每个玩家发送包含其底牌的游戏状态
      Object.keys(this.players).forEach(pid => {
        if (!this.players[pid]) return; // 确保玩家存在
        const playerSocket = io.sockets.sockets.get(pid);
        if (playerSocket) {
          playerSocket.emit('updateGameState', this.getGameStateForPlayer(pid));
        }
      });
      
      return true;
    }
    return false;
  }

  // 确定赢家
  determineWinner() {
    // 筛选出未弃牌的玩家(包括All-in的玩家)
    const activePlayers = Object.keys(this.players).filter(id => {
      // 确保玩家存在
      if (!this.players[id]) return false;
      return !this.players[id].folded && !this.players[id].isSpectator;
    });
    
    if (activePlayers.length === 0) {
      // 如果没有活跃玩家，直接返回
      this.winners = [];
      this.pot = 0;
      return;
    }
    
    // 记录当前底池
    const totalPot = this.pot;
    
    if (activePlayers.length === 1) {
      // 如果只有一个玩家未弃牌，他自动成为赢家
      const winnerId = activePlayers[0];
      // 再次确认玩家存在
      if (!this.players[winnerId]) {
        console.error(`获胜玩家 ${winnerId} 不存在`);
        this.winners = [];
        this.pot = 0;
        return;
      }
      this.winners = [{ 
        id: winnerId, 
        name: this.players[winnerId].name, 
        amount: totalPot, 
        hand: this.players[winnerId].hand || [],
        handType: '默认获胜'  // 添加牌型信息
      }];
      this.players[winnerId].chips += totalPot;
      this.players[winnerId].handDescription = '默认获胜';
    } else {
      // 多个玩家进入摊牌阶段，需要比较牌型
      const hands = [];
      
      for (const playerId of activePlayers) {
        // 确保玩家存在
        if (!this.players[playerId]) continue;
        
        const player = this.players[playerId];
        
        // 评估玩家的牌型
        const bestHand = evaluateHand(player.hand, this.communityCards);
        
        // 获取牌型的中文描述
        let handDescription = '';
        switch (bestHand.rank) {
          case 'royal-flush': handDescription = '皇家同花顺'; break;
          case 'straight-flush': handDescription = '同花顺'; break;
          case 'four-of-a-kind': handDescription = '四条'; break;
          case 'full-house': handDescription = '葫芦'; break;
          case 'flush': handDescription = '同花'; break;
          case 'straight': handDescription = '顺子'; break;
          case 'three-of-a-kind': handDescription = '三条'; break;
          case 'two-pair': handDescription = '两对'; break;
          case 'one-pair': handDescription = '一对'; break;
          case 'high-card': handDescription = '高牌'; break;
          default: handDescription = '未知牌型'; break;
        }
        
        hands.push({
          playerId,
          hand: player.hand,
          bestHand,
          handDescription
        });
        
        // 保存手牌描述用于显示
        player.handDescription = handDescription;
      }
      
      if (hands.length === 0) {
        // 如果没有有效的手牌，直接返回
        this.winners = [];
        this.pot = 0;
        return;
      }
      
      // 根据牌型排序确定赢家 - 确保正确比较牌型大小
      hands.sort((a, b) => {
        // 首先比较牌型等级
        if (a.bestHand.value !== b.bestHand.value) {
          return b.bestHand.value - a.bestHand.value; // 值越大牌型越强
        }
        
        // 如果牌型相同，比较剩余牌点数
        return compareHands(b.bestHand, a.bestHand);
      });
      
      // 找出所有拥有最高牌型的玩家（处理平局）
      const highestHand = hands[0].bestHand;
      const winners = hands.filter(h => compareHands(h.bestHand, highestHand) === 0);
      
      // 计算每个赢家应得的筹码
      const winAmount = Math.floor(totalPot / winners.length);
      this.winners = winners.map(w => {
        // 确保玩家存在
        if (!this.players[w.playerId]) {
          return {
            id: w.playerId,
            name: '已离开的玩家',
            amount: 0,
            handDescription: w.handDescription,
            hand: w.hand,
            handType: w.handDescription
          };
        }
        
        // 更新玩家筹码
        this.players[w.playerId].chips += winAmount;
        
        return {
          id: w.playerId,
          name: this.players[w.playerId].name,
          amount: winAmount,
          handDescription: w.handDescription,
          hand: w.hand,
          handType: w.handDescription  // 添加牌型信息
        };
      });
    }
    
    // 保存游戏历史记录（在重置底池前）
    this.saveGameHistory(totalPot);
    
    // 重置底池
    this.pot = 0;
    
    // 游戏结束后，将筹码为0的玩家标记为观战者
    Object.values(this.players).forEach(player => {
      if (!player) return; // 确保玩家存在
      if (player.chips <= 0) {
        player.isSpectator = true;
      }
      // 重置All-in状态
      player.isAllIn = false;
    });
    
    // 为每个玩家发送包含其底牌的游戏状态
    Object.keys(this.players).forEach(playerId => {
      if (!this.players[playerId]) return; // 确保玩家存在
      const playerSocket = io.sockets.sockets.get(playerId);
      if (playerSocket) {
        playerSocket.emit('updateGameState', this.getGameStateForPlayer(playerId));
      }
    });
  }
  
  // 保存游戏历史记录
  saveGameHistory(totalPot) {
    console.log('保存游戏历史记录...');
    // 创建包含所有玩家手牌、公共牌和赢家信息的历史记录
    const playerHands = {};
    
    Object.keys(this.players).forEach(playerId => {
      if (!this.players[playerId]) return; // 确保玩家存在
      
      const player = this.players[playerId];
      playerHands[playerId] = {
        id: playerId,
        name: player.name,
        hand: player.hand || [], // 玩家手牌
        folded: player.folded,   // 是否弃牌
        handDescription: player.handDescription || '', // 牌型描述
        isSpectator: player.isSpectator || false // 是否是观战者
      };
    });
    
    this.gameHistory = {
      timestamp: new Date().toISOString(),
      communityCards: [...this.communityCards], // 公共牌
      playerHands,  // 所有玩家的手牌
      winners: [...this.winners], // 赢家信息
      pot: totalPot, // 使用传入的底池金额
      dealerPosition: this.dealerPosition, // 庄家位置
      smallBlindPosition: this.smallBlindPosition, // 小盲位置
      bigBlindPosition: this.bigBlindPosition // 大盲位置
    };
    
    console.log('游戏历史已保存:', 
                '社区牌数量:', this.gameHistory.communityCards.length,
                '玩家数量:', Object.keys(this.gameHistory.playerHands).length,
                '获胜者数量:', this.gameHistory.winners.length,
                '总底池:', totalPot);
  }
  
  // 获取游戏历史
  getGameHistory() {
    console.log('获取游戏历史记录, 历史记录存在:', !!this.gameHistory);
    if (this.gameHistory) {
      console.log('历史记录详情:',
                 '社区牌数量:', this.gameHistory.communityCards.length,
                 '玩家数量:', Object.keys(this.gameHistory.playerHands).length,
                 '获胜者数量:', this.gameHistory.winners.length);
    }
    return this.gameHistory;
  }

  // 评估手牌
  evaluateHand(cards) {
    // 转换牌面值为数字表示，方便比较
    const valueMap = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
      '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
    
    // 将牌按点数排序
    const sortedCards = [...cards].sort((a, b) => valueMap[b.value] - valueMap[a.value]);
    
    // 提取牌的花色和点数
    const suits = sortedCards.map(card => card.suit);
    const values = sortedCards.map(card => valueMap[card.value]);
    
    // 检查是否同花
    const isFlush = suits.filter((suit, i, arr) => arr.indexOf(suit) === i).length === 1;
    
    // 检查是否顺子
    let isStraight = false;
    let straightHighCard = 0;
    
    // 处理A-5-4-3-2特殊顺子
    const uniqueValues = [...new Set(values)].sort((a, b) => a - b);
    if (uniqueValues.includes(14) && uniqueValues.includes(5) && uniqueValues.includes(4) && 
        uniqueValues.includes(3) && uniqueValues.includes(2)) {
      isStraight = true;
      straightHighCard = 5; // A在这个顺子中视为1
    } else {
      // 常规顺子检查
      for (let i = 0; i <= uniqueValues.length - 5; i++) {
        // 检查是否有5个连续的牌
        if (uniqueValues[i+4] - uniqueValues[i] === 4) {
          isStraight = true;
          straightHighCard = uniqueValues[i+4];
          break;
        }
      }
    }
    
    // 计数每个点数出现的次数
    const valueCounts = {};
    values.forEach(value => {
      valueCounts[value] = (valueCounts[value] || 0) + 1;
    });
    
    // 按出现次数分组
    const pairs = [];
    const trips = [];
    const quads = [];
    
    for (const [value, count] of Object.entries(valueCounts)) {
      if (count === 2) pairs.push(parseInt(value));
      if (count === 3) trips.push(parseInt(value));
      if (count === 4) quads.push(parseInt(value));
    }
    
    // 按点数大小排序
    pairs.sort((a, b) => b - a);
    trips.sort((a, b) => b - a);
    quads.sort((a, b) => b - a);
    
    // 计算高牌
    const highCards = [...new Set(values)].sort((a, b) => b - a);
    
    // 评估牌型
    let handType = 0; // 默认为高牌
    let handRank = [];
    let description = '';
    const valueNameMap = {
      2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
      9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A'
    };
    
    // 同花顺
    if (isFlush && isStraight) {
      handType = 9;
      handRank = [straightHighCard];
      description = '同花顺';
    }
    // 四条
    else if (quads.length > 0) {
      handType = 8;
      handRank = [quads[0], ...highCards.filter(c => c !== quads[0])];
      description = `四条${valueNameMap[quads[0]]}`;
    }
    // 葫芦（三条+一对）
    else if (trips.length > 0 && pairs.length > 0) {
      handType = 7;
      handRank = [trips[0], pairs[0]];
      description = `葫芦：${valueNameMap[trips[0]]}三条和${valueNameMap[pairs[0]]}对`;
    }
    // 同花
    else if (isFlush) {
      handType = 6;
      handRank = highCards.slice(0, 5);
      description = '同花';
    }
    // 顺子
    else if (isStraight) {
      handType = 5;
      handRank = [straightHighCard];
      description = '顺子';
    }
    // 三条
    else if (trips.length > 0) {
      handType = 4;
      handRank = [trips[0], ...highCards.filter(c => c !== trips[0])];
      description = `三条${valueNameMap[trips[0]]}`;
    }
    // 两对
    else if (pairs.length >= 2) {
      handType = 3;
      handRank = [pairs[0], pairs[1], ...highCards.filter(c => !pairs.includes(c))];
      description = `两对：${valueNameMap[pairs[0]]}和${valueNameMap[pairs[1]]}`;
    }
    // 一对
    else if (pairs.length === 1) {
      handType = 2;
      handRank = [pairs[0], ...highCards.filter(c => c !== pairs[0])];
      description = `一对${valueNameMap[pairs[0]]}`;
    }
    // 高牌
    else {
      handType = 1;
      handRank = highCards;
      description = `高牌${valueNameMap[highCards[0]]}`;
    }
    
    return { handType, handRank, description };
  }

  // 将游戏状态发送给所有玩家
  sendGameStateToPlayers() {
    Object.keys(this.players).forEach(playerId => {
      const playerSocket = this.players[playerId].socket;
      if (playerSocket) {
        // 发送玩家特定的游戏状态（只包含该玩家自己的手牌）
        playerSocket.emit('updateGameState', this.getGameStateForPlayer(playerId));
      }
    });
  }
}

// WebSocket连接处理
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // 获取可用房间列表
  socket.on('get-rooms', (callback) => {
    const roomList = Object.keys(rooms).map(roomId => {
      const room = rooms[roomId];
      return {
        roomId: roomId,
        playerCount: Object.keys(room.players).length,
        gameState: room.gameState,
        roomOwner: room.roomOwner ? room.players[room.roomOwner]?.name : null
      };
    });
    
    callback({ success: true, rooms: roomList });
  });
  
  // 获取游戏历史记录
  socket.on('get-game-history', ({ roomId }, callback) => {
    console.log('收到get-game-history事件，房间ID:', roomId);
    
    if (!rooms[roomId]) {
      console.log('房间不存在:', roomId);
      callback({ success: false, message: '房间不存在' });
      return;
    }
    
    try {
      console.log(`检查房间 ${roomId} 的游戏历史记录...`);
      
      // 打印整个房间状态的关键信息
      console.log(`房间状态:`, {
        roomId: rooms[roomId].roomId,
        gameState: rooms[roomId].gameState,
        playerCount: Object.keys(rooms[roomId].players).length,
        potAmount: rooms[roomId].pot,
        historyExists: !!rooms[roomId].gameHistory
      });
      
      const history = rooms[roomId].getGameHistory();
      if (!history) {
        console.log('房间存在但无游戏历史:', roomId);
        callback({ success: false, message: '暂无游戏历史记录' });
        return;
      }
      
      console.log('返回游戏历史:', {
        timestamp: history.timestamp,
        communityCardsCount: history.communityCards?.length || 0,
        playerHandsCount: Object.keys(history.playerHands || {}).length || 0,
        winnersCount: history.winners?.length || 0,
        pot: history.pot
      });
      
      callback({ 
        success: true, 
        history
      });
    } catch (error) {
      console.error('获取游戏历史时出错:', error);
      console.error(error.stack); // 打印完整的错误堆栈
      callback({ 
        success: false, 
        message: '获取游戏历史时出错：' + error.message
      });
    }
  });
  
  // 简单的ping测试处理
  socket.on('ping', (data, callback) => {
    console.log('收到ping请求，Socket ID:', socket.id);
    callback({ 
      success: true, 
      message: 'pong', 
      socketId: socket.id,
      time: new Date().toISOString(),
      serverInfo: {
        port: PORT,
        roomCount: Object.keys(rooms).length,
        socketConnectionCount: io.sockets.sockets.size
      }
    });
  });
  
  // 创建房间
  socket.on('create-room', ({ playerName }, callback) => {
    const roomId = uuidv4().substring(0, 6);
    rooms[roomId] = new PokerGame(roomId);
    
    socket.join(roomId);
    const player = rooms[roomId].addPlayer(socket.id, playerName);
    
    callback({ 
      success: true, 
      roomId, 
      playerId: socket.id,
      player
    });
    
    // 为每个玩家发送包含其底牌的游戏状态
    Object.keys(rooms[roomId].players).forEach(playerId => {
      const playerSocket = io.sockets.sockets.get(playerId);
      if (playerSocket) {
        playerSocket.emit('updateGameState', rooms[roomId].getGameStateForPlayer(playerId));
      }
    });
  });
  
  // 加入房间
  socket.on('join-room', ({ roomId, playerName }, callback) => {
    if (!rooms[roomId]) {
      callback({ success: false, message: '房间不存在' });
      return;
    }
    
    // 如果游戏已经开始，玩家可以加入但只能观战
    const joinAsSpectator = rooms[roomId].gameState !== 'waiting';
    
    socket.join(roomId);
    const success = rooms[roomId].addPlayer(socket.id, playerName);
    
    if (!success) {
      callback({ success: false, message: '无法加入房间' });
      return;
    }
    
    // 如果是作为观战者加入的，设置观战状态
    if (joinAsSpectator) {
      rooms[roomId].players[socket.id].isSpectator = true;
    }
    
    callback({ 
      success: true, 
      roomId, 
      playerId: socket.id,
      isSpectator: joinAsSpectator
    });
    
    // 为每个玩家发送包含其底牌的游戏状态
    Object.keys(rooms[roomId].players).forEach(playerId => {
      const playerSocket = io.sockets.sockets.get(playerId);
      if (playerSocket) {
        playerSocket.emit('updateGameState', rooms[roomId].getGameStateForPlayer(playerId));
      }
    });
  });
  
  // 准备/取消准备
  socket.on('toggle-ready', ({ roomId }, callback) => {
    console.log('收到toggle-ready事件，玩家ID:', socket.id, '房间ID:', roomId);
    
    if (!rooms[roomId] || !rooms[roomId].players[socket.id]) {
      console.log('房间或玩家不存在');
      callback({ success: false, message: '房间或玩家不存在' });
      return;
    }
    
    // 记录玩家当前准备状态
    const currentReadyStatus = rooms[roomId].players[socket.id].isReady;
    console.log('当前准备状态:', currentReadyStatus);
    
    // 执行toggleReady操作
    const result = rooms[roomId].toggleReady(socket.id);
    console.log('toggleReady执行结果:', result);
    console.log('新准备状态:', rooms[roomId].players[socket.id].isReady);
    
    // 通知客户端操作成功
    callback({ success: true });
    
    // 为每个玩家发送包含其底牌的游戏状态
    Object.keys(rooms[roomId].players).forEach(playerId => {
      const playerSocket = io.sockets.sockets.get(playerId);
      if (playerSocket) {
        playerSocket.emit('updateGameState', rooms[roomId].getGameStateForPlayer(playerId));
      }
    });
  });
  
  // 玩家行动
  socket.on('player-action', ({ roomId, action, amount }, callback) => {
    if (!rooms[roomId] || !rooms[roomId].players[socket.id]) {
      callback({ success: false, message: '房间或玩家不存在' });
      return;
    }
    
    const success = rooms[roomId].playerAction(socket.id, action, amount);
    
    callback({ success });
    
    // 为每个玩家发送包含其底牌的游戏状态
    Object.keys(rooms[roomId].players).forEach(playerId => {
      const playerSocket = io.sockets.sockets.get(playerId);
      if (playerSocket) {
        playerSocket.emit('updateGameState', rooms[roomId].getGameStateForPlayer(playerId));
      }
    });
  });
  
  // 离开房间
  socket.on('leave-room', ({ roomId }, callback) => {
    console.log(`玩家 ${socket.id} 正在离开房间 ${roomId}`);
    
    if (rooms[roomId] && rooms[roomId].players[socket.id]) {
      const player = rooms[roomId].players[socket.id];
      const isCurrentPlayer = rooms[roomId].currentPlayer === socket.id;
      const gameInProgress = rooms[roomId].gameState !== 'waiting' && rooms[roomId].gameState !== 'showdown';
      
      // 立即从玩家列表中删除该玩家
      delete rooms[roomId].players[socket.id];
      
      // 如果玩家是房主，转移房主权限
      if (rooms[roomId].roomOwner === socket.id) {
        const remainingPlayers = Object.keys(rooms[roomId].players).filter(id => 
          !rooms[roomId].players[id].disconnected
        );
        
        if (remainingPlayers.length > 0) {
          rooms[roomId].roomOwner = remainingPlayers[0];
        } else {
          rooms[roomId].roomOwner = null;
        }
      }
      
      // 如果当前玩家是行动玩家且游戏正在进行中，移至下一位
      if (isCurrentPlayer && gameInProgress) {
        // 安全地调用moveToNextPlayer方法，确保已经从玩家列表中移除了玩家
        try {
          rooms[roomId].moveToNextPlayer();
        } catch (error) {
          console.error('移动到下一个玩家时出错:', error);
          // 如果出错，可能需要重置游戏状态
          if (Object.keys(rooms[roomId].players).length < 2) {
            rooms[roomId].gameState = 'waiting';
            // 重置所有玩家的准备状态
            Object.values(rooms[roomId].players).forEach(p => {
              if (p) p.isReady = false;
            });
          }
        }
      }
      
      socket.leave(roomId);
      
      // 如果房间空了，删除房间
      if (Object.keys(rooms[roomId].players).length === 0) {
        console.log(`房间 ${roomId} 为空，正在删除`);
        delete rooms[roomId];
      } else {
        console.log(`玩家 ${socket.id} 已离开，向其他玩家发送更新`);
        // 为每个玩家发送包含其底牌的游戏状态
        Object.keys(rooms[roomId].players).forEach(playerId => {
          const playerSocket = io.sockets.sockets.get(playerId);
          if (playerSocket) {
            playerSocket.emit('updateGameState', rooms[roomId].getGameStateForPlayer(playerId));
          }
        });
      }
      
      callback({ success: true });
    } else {
      console.log(`玩家 ${socket.id} 离开失败，房间 ${roomId} 或玩家不存在`);
      callback({ success: false, message: '房间或玩家不存在' });
    }
  });
  
  // 断开连接
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // 从所有房间中移除玩家
    for (const roomId in rooms) {
      try {
        if (rooms[roomId] && rooms[roomId].players[socket.id]) {
          // 安全地调用removePlayer
          try {
        rooms[roomId].removePlayer(socket.id);
          } catch (error) {
            console.error(`从房间 ${roomId} 移除玩家 ${socket.id} 时出错:`, error);
            // 如果removePlayer失败，手动从玩家列表中删除
            delete rooms[roomId].players[socket.id];
          }
          
          // 如果游戏正在进行但人数不足，重置为等待状态
          if (rooms[roomId].gameState !== 'waiting' && Object.keys(rooms[roomId].players).length < 2) {
            rooms[roomId].gameState = 'waiting';
            // 重置所有玩家的准备状态
            for (const playerId in rooms[roomId].players) {
              if (rooms[roomId].players[playerId]) {
                rooms[roomId].players[playerId].isReady = false;
              }
            }
          }
        
        // 如果房间空了，删除房间
        if (Object.keys(rooms[roomId].players).length === 0) {
          delete rooms[roomId];
        } else {
            try {
              // 同时发送room-update和updateGameState事件以兼容旧版本客户端
          io.to(roomId).emit('room-update', rooms[roomId].getGameState());
              
              // 为每个玩家发送包含其底牌的游戏状态
              Object.keys(rooms[roomId].players).forEach(playerId => {
                if (!rooms[roomId].players[playerId]) return; // 确保玩家存在
                const playerSocket = io.sockets.sockets.get(playerId);
                if (playerSocket) {
                  playerSocket.emit('updateGameState', rooms[roomId].getGameStateForPlayer(playerId));
                }
              });
            } catch (error) {
              console.error(`发送游戏状态更新时出错:`, error);
              // 出错时发送简化的游戏状态
              io.to(roomId).emit('updateGameState', {
                roomId: roomId,
                gameState: rooms[roomId].gameState,
                players: Object.fromEntries(
                  Object.entries(rooms[roomId].players).map(([id, player]) => [id, { 
                    id, 
                    name: player ? player.name : '已断开连接', 
                    disconnected: true 
                  }])
                )
              });
            }
          }
        }
      } catch (error) {
        console.error(`处理玩家 ${socket.id} 断开连接时出错:`, error);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 