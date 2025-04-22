import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import styled from 'styled-components';

// 导入页面组件
import HomePage from './components/HomePage';
import RoomPage from './components/RoomPage';
import { useGame } from './context/GameContext';

// 样式
const AppContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background-color: #121212;
  color: #ffffff;
`;

const ErrorBanner = styled.div`
  background-color: rgba(255, 0, 0, 0.7);
  color: white;
  padding: 10px;
  text-align: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  animation: fadeOut 3s forwards;

  @keyframes fadeOut {
    0% { opacity: 1; }
    90% { opacity: 1; }
    100% { opacity: 0; }
  }
`;

function App() {
  const { error } = useGame();

  return (
    <Router>
      <AppContainer>
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:roomId" element={<RoomPage />} />
        </Routes>
      </AppContainer>
    </Router>
  );
}

export default App; 