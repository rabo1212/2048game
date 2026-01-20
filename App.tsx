import React, { useState, useEffect, useCallback } from 'react';

type ModalType = 'about' | 'howto' | 'privacy' | 'terms' | null;

const GRID_SIZE = 4;

// 파스텔톤 색상 매핑
const TILE_COLORS: { [key: number]: { bg: string; text: string } } = {
  0: { bg: '#EDE7E3', text: 'transparent' },
  2: { bg: '#FFB6C1', text: '#7A2838' },      // 핑크
  4: { bg: '#87CEEB', text: '#1E4D6B' },      // 하늘
  8: { bg: '#DDA0DD', text: '#5B2C5B' },      // 보라
  16: { bg: '#FFE066', text: '#6B5B00' },     // 노랑
  32: { bg: '#FFB366', text: '#7A4400' },     // 오렌지
  64: { bg: '#77DD77', text: '#2D5A2D' },     // 초록
  128: { bg: '#B19CD9', text: '#3D2E5C' },    // 라벤더
  256: { bg: '#6BC5D2', text: '#1F4A50' },    // 청록
  512: { bg: '#F0A0B0', text: '#6B3040' },    // 로즈
  1024: { bg: '#FF8888', text: '#5A1A1A' },   // 코랄
  2048: { bg: '#FFD700', text: '#5A4800' },   // 골드
};

const App: React.FC = () => {
  const [grid, setGrid] = useState<number[][]>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // 빈 그리드 생성
  const createEmptyGrid = (): number[][] => {
    return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
  };

  // 랜덤 빈 셀에 타일 추가
  const addRandomTile = (currentGrid: number[][]): number[][] => {
    const newGrid = currentGrid.map(row => [...row]);
    const emptyCells: { row: number; col: number }[] = [];
    
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (newGrid[i][j] === 0) {
          emptyCells.push({ row: i, col: j });
        }
      }
    }
    
    if (emptyCells.length > 0) {
      const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      newGrid[row][col] = Math.random() < 0.9 ? 2 : 4;
    }
    
    return newGrid;
  };

  // 게임 초기화
  const initGame = useCallback(() => {
    let newGrid = createEmptyGrid();
    newGrid = addRandomTile(newGrid);
    newGrid = addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
    setGameOver(false);
    setWon(false);
  }, []);

  // 최고 점수 로드
  useEffect(() => {
    const saved = localStorage.getItem('kitsch-2048-best');
    if (saved) setBestScore(parseInt(saved));
    initGame();
  }, [initGame]);

  // 이동 가능 여부 체크
  const canMove = (currentGrid: number[][]): boolean => {
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (currentGrid[i][j] === 0) return true;
        if (j < GRID_SIZE - 1 && currentGrid[i][j] === currentGrid[i][j + 1]) return true;
        if (i < GRID_SIZE - 1 && currentGrid[i][j] === currentGrid[i + 1][j]) return true;
      }
    }
    return false;
  };

  // 그리드 이동
  const move = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameOver) return;

    let newGrid = grid.map(row => [...row]);
    let totalScore = 0;
    let moved = false;

    // 한 줄 왼쪽으로 밀기
    const slideLeft = (row: number[]): { newRow: number[]; points: number } => {
      let arr = row.filter(val => val !== 0);
      let points = 0;
      
      for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] === arr[i + 1]) {
          arr[i] *= 2;
          points += arr[i];
          arr.splice(i + 1, 1);
        }
      }
      
      while (arr.length < GRID_SIZE) {
        arr.push(0);
      }
      
      return { newRow: arr, points };
    };

    if (direction === 'left') {
      for (let i = 0; i < GRID_SIZE; i++) {
        const original = [...newGrid[i]];
        const { newRow, points } = slideLeft(newGrid[i]);
        newGrid[i] = newRow;
        totalScore += points;
        if (original.join(',') !== newRow.join(',')) moved = true;
      }
    } 
    else if (direction === 'right') {
      for (let i = 0; i < GRID_SIZE; i++) {
        const original = [...newGrid[i]];
        const reversed = [...newGrid[i]].reverse();
        const { newRow, points } = slideLeft(reversed);
        newGrid[i] = newRow.reverse();
        totalScore += points;
        if (original.join(',') !== newGrid[i].join(',')) moved = true;
      }
    } 
    else if (direction === 'up') {
      for (let col = 0; col < GRID_SIZE; col++) {
        const column = [];
        for (let row = 0; row < GRID_SIZE; row++) {
          column.push(newGrid[row][col]);
        }
        const original = [...column];
        const { newRow, points } = slideLeft(column);
        totalScore += points;
        for (let row = 0; row < GRID_SIZE; row++) {
          newGrid[row][col] = newRow[row];
        }
        if (original.join(',') !== newRow.join(',')) moved = true;
      }
    } 
    else if (direction === 'down') {
      for (let col = 0; col < GRID_SIZE; col++) {
        const column = [];
        for (let row = 0; row < GRID_SIZE; row++) {
          column.push(newGrid[row][col]);
        }
        const original = [...column];
        const reversed = [...column].reverse();
        const { newRow, points } = slideLeft(reversed);
        const finalCol = newRow.reverse();
        totalScore += points;
        for (let row = 0; row < GRID_SIZE; row++) {
          newGrid[row][col] = finalCol[row];
        }
        if (original.join(',') !== finalCol.join(',')) moved = true;
      }
    }

    if (moved) {
      newGrid = addRandomTile(newGrid);
      setGrid(newGrid);
      setScore(prev => {
        const newScore = prev + totalScore;
        if (newScore > bestScore) {
          setBestScore(newScore);
          localStorage.setItem('kitsch-2048-best', newScore.toString());
        }
        return newScore;
      });

      if (!canMove(newGrid)) {
        setGameOver(true);
      }

      if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
    }
  }, [grid, gameOver, bestScore]);

  // 키보드 이벤트
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const direction = e.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';
        move(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  // 터치/스와이프 상태
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStart.x;
    const deltaY = touchEndY - touchStart.y;
    const minSwipe = 30;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipe) {
        move(deltaX > 0 ? 'right' : 'left');
      }
    } else {
      if (Math.abs(deltaY) > minSwipe) {
        move(deltaY > 0 ? 'down' : 'up');
      }
    }
    
    setTouchStart(null);
  };

  // 타일 스타일 가져오기
  const getTileStyle = (value: number) => {
    const colors = TILE_COLORS[value] || TILE_COLORS[2048];
    
    return {
      backgroundColor: colors.bg,
      color: colors.text,
      fontSize: value >= 1024 ? '1.1rem' : value >= 128 ? '1.4rem' : '1.75rem',
      border: value === 0 ? 'none' : '3px solid rgba(0,0,0,0.1)',
      boxShadow: value > 0 ? '0 4px 8px rgba(0,0,0,0.15)' : 'none',
    };
  };

  return (
    <div 
      className="fixed inset-0 flex flex-col items-center bg-gradient-to-b from-amber-50 to-pink-50 overflow-hidden select-none"
      style={{ touchAction: 'none' }}
    >
      {/* 상단 광고 */}
      <div className="w-full max-w-[340px] pt-2 px-2">
        <div className="w-full h-[50px] bg-white/40 border-2 border-dashed border-pink-200 rounded-xl flex items-center justify-center text-[8px] text-pink-300 font-bold tracking-widest uppercase">
          Advertisement
        </div>
      </div>

      {/* 헤더 */}
      <div className="w-full max-w-[320px] py-3 px-1">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-3xl font-black text-pink-400" style={{ fontFamily: 'system-ui' }}>
            2048
          </h1>
          <div className="flex gap-2">
            <div className="bg-white/80 rounded-2xl px-3 py-1.5 border-2 border-pink-200 shadow-sm">
              <p className="text-[8px] font-bold text-pink-400 uppercase">Score</p>
              <p className="text-lg font-black text-pink-500 leading-none">{score}</p>
            </div>
            <div className="bg-white/80 rounded-2xl px-3 py-1.5 border-2 border-purple-200 shadow-sm">
              <p className="text-[8px] font-bold text-purple-400 uppercase">Best</p>
              <p className="text-lg font-black text-purple-500 leading-none">{bestScore}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-pink-400">
            👆 스와이프해서 숫자를 합쳐요!
          </p>
          <button
            onClick={initGame}
            className="bg-pink-400 hover:bg-pink-500 text-white font-bold py-1.5 px-4 rounded-xl text-sm shadow-md active:scale-95 transition-transform"
          >
            New
          </button>
        </div>
      </div>

      {/* 게임 그리드 */}
      <div 
        className="relative rounded-2xl p-2 shadow-xl"
        style={{ 
          width: '90vw', 
          maxWidth: '340px',
          backgroundColor: '#CDC1B4',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="grid gap-1.5"
          style={{ 
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            aspectRatio: '1',
          }}
        >
          {grid.map((row, i) =>
            row.map((value, j) => (
              <div
                key={`${i}-${j}`}
                className="aspect-square rounded-lg flex items-center justify-center font-black"
                style={getTileStyle(value)}
              >
                {value > 0 && value}
              </div>
            ))
          )}
        </div>

        {/* 게임 오버 */}
        {gameOver && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center">
            <h2 className="text-2xl font-black text-pink-500 mb-2">Game Over!</h2>
            <p className="text-lg font-bold text-purple-500 mb-4">Score: {score}</p>
            <button
              onClick={initGame}
              className="bg-pink-400 hover:bg-pink-500 text-white font-black py-2 px-6 rounded-full text-lg shadow-lg active:scale-95 transition-transform"
            >
              Try Again 🎀
            </button>
          </div>
        )}

        {/* 승리 */}
        {won && !gameOver && (
          <div className="absolute inset-0 bg-yellow-100/90 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center">
            <h2 className="text-2xl font-black text-yellow-600 mb-2">🎉 You Win!</h2>
            <p className="text-lg font-bold text-yellow-700 mb-4">2048 달성!</p>
            <div className="flex gap-2">
              <button
                onClick={() => setWon(false)}
                className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-2 px-4 rounded-full shadow-lg active:scale-95 transition-transform"
              >
                Continue
              </button>
              <button
                onClick={initGame}
                className="bg-pink-400 hover:bg-pink-500 text-white font-bold py-2 px-4 rounded-full shadow-lg active:scale-95 transition-transform"
              >
                New Game
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 하단 광고 */}
      <div className="w-full max-w-[340px] py-3 px-2">
        <div className="w-full h-[50px] bg-white/40 border-2 border-dashed border-pink-200 rounded-xl flex items-center justify-center text-[8px] text-pink-300 font-bold tracking-widest uppercase">
          Advertisement
        </div>
      </div>

      {/* 푸터 */}
      <div className="w-full max-w-[320px] pb-2 text-center">
        <div className="flex justify-center gap-1 mb-2 flex-wrap">
          {[2, 4, 8, 16, 32, 64].map(n => (
            <div
              key={n}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: TILE_COLORS[n].bg, color: TILE_COLORS[n].text }}
            >
              {n}
            </div>
          ))}
          <span className="text-pink-400 font-bold self-center ml-1">→ 2048!</span>
        </div>
        <div className="flex justify-center gap-3 text-[8px] font-bold text-pink-300 uppercase">
          <button onClick={() => setActiveModal('about')} className="hover:text-pink-500">About</button>
          <button onClick={() => setActiveModal('howto')} className="hover:text-pink-500">How to Play</button>
          <button onClick={() => setActiveModal('privacy')} className="hover:text-pink-500">Privacy</button>
          <button onClick={() => setActiveModal('terms')} className="hover:text-pink-500">Terms</button>
        </div>
      </div>

      {/* 모달 */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md" onClick={() => setActiveModal(null)}>
          <div className="bg-white rounded-3xl max-w-sm w-full max-h-[75vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-pink-100 bg-pink-50">
              <h3 className="text-base font-bold text-pink-600">
                {activeModal === 'about' && '🎀 게임 소개'}
                {activeModal === 'howto' && '🎮 게임 방법'}
                {activeModal === 'privacy' && '🔒 개인정보처리방침'}
                {activeModal === 'terms' && '📜 이용약관'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-xl text-pink-400">×</button>
            </div>
            <div className="p-5 overflow-y-auto text-sm text-gray-600 leading-relaxed space-y-3">
              {activeModal === 'about' && (
                <>
                  <p><strong>파스텔 2048</strong>은 클래식 2048 게임의 귀여운 버전이에요!</p>
                  <p>같은 숫자를 합쳐서 2048을 만들어보세요 🎀</p>
                  <p className="text-xs text-gray-400">© 2024 Pastel 2048</p>
                </>
              )}
              {activeModal === 'howto' && (
                <>
                  <p><strong>스와이프</strong>해서 타일을 이동시키세요.</p>
                  <p><strong>같은 숫자</strong>가 만나면 합쳐져요!</p>
                  <p>2 + 2 = 4, 4 + 4 = 8 ... → 2048!</p>
                  <p>더 이상 움직일 수 없으면 게임 오버!</p>
                </>
              )}
              {activeModal === 'privacy' && (
                <p>본 서비스는 개인정보를 수집하지 않습니다. 최고 점수는 브라우저에만 저장됩니다. 문의: rnu301@gmail.com</p>
              )}
              {activeModal === 'terms' && (
                <p>본 서비스는 무료로 제공되며 광고가 포함될 수 있습니다. 정상적인 운영을 방해하는 행위를 금합니다.</p>
              )}
            </div>
            <div className="px-5 py-3 bg-pink-50">
              <button onClick={() => setActiveModal(null)} className="w-full py-2.5 bg-pink-400 text-white font-bold rounded-xl active:bg-pink-500">닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
