import React, { useState, useEffect, useCallback, useRef } from 'react';

type ModalType = 'about' | 'howto' | 'privacy' | 'terms' | null;

const GRID_SIZE = 4;
const CELL_GAP = 6;

// 파스텔톤 색상 매핑
const TILE_COLORS: { [key: number]: { bg: string; text: string } } = {
  0: { bg: 'transparent', text: 'transparent' },
  2: { bg: '#FFB6C1', text: '#7A2838' },
  4: { bg: '#87CEEB', text: '#1E4D6B' },
  8: { bg: '#DDA0DD', text: '#5B2C5B' },
  16: { bg: '#FFE066', text: '#6B5B00' },
  32: { bg: '#FFB366', text: '#7A4400' },
  64: { bg: '#77DD77', text: '#2D5A2D' },
  128: { bg: '#B19CD9', text: '#3D2E5C' },
  256: { bg: '#6BC5D2', text: '#1F4A50' },
  512: { bg: '#F0A0B0', text: '#6B3040' },
  1024: { bg: '#FF8888', text: '#5A1A1A' },
  2048: { bg: '#FFD700', text: '#5A4800' },
};

interface Tile {
  id: string;
  value: number;
  row: number;
  col: number;
  isNew?: boolean;
  isMerged?: boolean;
}

const App: React.FC = () => {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [cellSize, setCellSize] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const tileIdCounter = useRef(0);

  // 셀 사이즈 계산
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth - 16;
        const size = (containerWidth - CELL_GAP * (GRID_SIZE - 1)) / GRID_SIZE;
        setCellSize(size);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 새 타일 ID 생성
  const generateId = () => {
    tileIdCounter.current += 1;
    return `tile-${tileIdCounter.current}`;
  };

  // 타일 배열을 그리드로 변환
  const tilesToGrid = (tileList: Tile[]): number[][] => {
    const grid: number[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    tileList.forEach(tile => {
      if (tile.row >= 0 && tile.row < GRID_SIZE && tile.col >= 0 && tile.col < GRID_SIZE) {
        grid[tile.row][tile.col] = tile.value;
      }
    });
    return grid;
  };

  // 빈 셀 찾기
  const getEmptyCells = (tileList: Tile[]): { row: number; col: number }[] => {
    const grid = tilesToGrid(tileList);
    const empty: { row: number; col: number }[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (grid[i][j] === 0) {
          empty.push({ row: i, col: j });
        }
      }
    }
    return empty;
  };

  // 랜덤 타일 추가
  const addRandomTile = (tileList: Tile[]): Tile[] => {
    const empty = getEmptyCells(tileList);
    if (empty.length === 0) return tileList;
    
    const { row, col } = empty[Math.floor(Math.random() * empty.length)];
    const newTile: Tile = {
      id: generateId(),
      value: Math.random() < 0.9 ? 2 : 4,
      row,
      col,
      isNew: true,
    };
    
    return [...tileList, newTile];
  };

  // 게임 초기화
  const initGame = useCallback(() => {
    tileIdCounter.current = 0;
    let newTiles: Tile[] = [];
    newTiles = addRandomTile(newTiles);
    newTiles = addRandomTile(newTiles);
    setTiles(newTiles);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setIsAnimating(false);
  }, []);

  // 최고 점수 로드
  useEffect(() => {
    const saved = localStorage.getItem('kitsch-2048-best');
    if (saved) setBestScore(parseInt(saved));
    initGame();
  }, [initGame]);

  // 이동 가능 여부 체크
  const canMove = (tileList: Tile[]): boolean => {
    const grid = tilesToGrid(tileList);
    
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (grid[i][j] === 0) return true;
      }
    }
    
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (j < GRID_SIZE - 1 && grid[i][j] === grid[i][j + 1]) return true;
        if (i < GRID_SIZE - 1 && grid[i][j] === grid[i + 1][j]) return true;
      }
    }
    
    return false;
  };

  // 이동 처리
  const move = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameOver || isAnimating) return;

    const currentTiles = tiles.map(t => ({ ...t, isNew: false, isMerged: false }));
    
    let newTiles: Tile[] = [];
    let totalPoints = 0;
    let moved = false;

    const isHorizontal = direction === 'left' || direction === 'right';
    const reverse = direction === 'right' || direction === 'down';

    for (let i = 0; i < GRID_SIZE; i++) {
      // 해당 줄/열의 타일들 가져오기
      let line = currentTiles.filter(t => isHorizontal ? t.row === i : t.col === i);
      
      if (line.length === 0) continue;

      // 정렬
      line.sort((a, b) => {
        const aPos = isHorizontal ? a.col : a.row;
        const bPos = isHorizontal ? b.col : b.row;
        return reverse ? bPos - aPos : aPos - bPos;
      });

      // 이동 및 합치기
      let pos = reverse ? GRID_SIZE - 1 : 0;
      const step = reverse ? -1 : 1;
      const processedLine: Tile[] = [];

      for (let j = 0; j < line.length; j++) {
        const tile = { ...line[j] };
        const nextTile = line[j + 1];

        const oldRow = tile.row;
        const oldCol = tile.col;

        if (nextTile && tile.value === nextTile.value) {
          // 합치기
          const mergedTile: Tile = {
            id: generateId(),
            value: tile.value * 2,
            row: isHorizontal ? i : pos,
            col: isHorizontal ? pos : i,
            isMerged: true,
          };
          
          processedLine.push(mergedTile);
          totalPoints += tile.value * 2;
          j++; // 다음 타일 스킵
          
          if (oldRow !== mergedTile.row || oldCol !== mergedTile.col) moved = true;
        } else {
          // 이동만
          tile.row = isHorizontal ? i : pos;
          tile.col = isHorizontal ? pos : i;
          processedLine.push(tile);
          
          if (oldRow !== tile.row || oldCol !== tile.col) moved = true;
        }
        
        pos += step;
      }

      newTiles.push(...processedLine);
    }

    if (!moved) return;

    setIsAnimating(true);
    setTiles(newTiles);

    // 애니메이션 후 새 타일 추가
    setTimeout(() => {
      let finalTiles = addRandomTile(newTiles);

      if (finalTiles.some(t => t.value === 2048) && !won) {
        setWon(true);
      }

      setTiles(finalTiles);
      setScore(prev => {
        const newScore = prev + totalPoints;
        if (newScore > bestScore) {
          setBestScore(newScore);
          localStorage.setItem('kitsch-2048-best', newScore.toString());
        }
        return newScore;
      });

      if (!canMove(finalTiles)) {
        setGameOver(true);
      }

      if ('vibrate' in navigator && totalPoints > 0) {
        navigator.vibrate(30);
      }

      // 바로 애니메이션 해제
      setTiles(prev => prev.map(t => ({ ...t, isNew: false, isMerged: false })));
      setIsAnimating(false);
    }, 150);

  }, [tiles, gameOver, isAnimating, bestScore, won]);

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

  // 터치 이벤트
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

  // 타일 위치 계산
  const getTilePosition = (row: number, col: number) => {
    return {
      top: row * (cellSize + CELL_GAP),
      left: col * (cellSize + CELL_GAP),
    };
  };

  // 타일 스타일
  const getTileStyle = (tile: Tile) => {
    const colors = TILE_COLORS[tile.value] || TILE_COLORS[2048];
    const pos = getTilePosition(tile.row, tile.col);

    return {
      position: 'absolute' as const,
      width: cellSize,
      height: cellSize,
      top: pos.top,
      left: pos.left,
      backgroundColor: colors.bg,
      color: colors.text,
      fontSize: tile.value >= 1024 ? '1.1rem' : tile.value >= 128 ? '1.4rem' : '1.75rem',
      transition: 'top 0.12s ease-out, left 0.12s ease-out, transform 0.15s ease-out',
      transform: tile.isNew ? 'scale(0)' : tile.isMerged ? 'scale(1.1)' : 'scale(1)',
      animation: tile.isNew ? 'popIn 0.15s ease-out 0.1s forwards' : undefined,
      zIndex: tile.isMerged ? 10 : 1,
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
          <h1 className="text-3xl font-black text-pink-400">
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
        ref={containerRef}
        className="relative rounded-2xl p-2 shadow-xl"
        style={{ 
          width: '90vw', 
          maxWidth: '340px',
          backgroundColor: '#CDC1B4',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 배경 셀 */}
        <div 
          className="grid"
          style={{ 
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gap: CELL_GAP,
            aspectRatio: '1',
          }}
        >
          {Array(GRID_SIZE * GRID_SIZE).fill(0).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg"
              style={{ backgroundColor: '#EDE7E3' }}
            />
          ))}
        </div>

        {/* 타일들 */}
        <div 
          className="absolute inset-2"
          style={{ aspectRatio: '1' }}
        >
          {tiles.map(tile => (
            <div
              key={tile.id}
              className="rounded-lg flex items-center justify-center font-black"
              style={getTileStyle(tile)}
            >
              {tile.value}
            </div>
          ))}
        </div>

        {/* 게임 오버 */}
        {gameOver && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center">
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
          <div className="absolute inset-0 bg-yellow-100/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center">
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
                  <p><strong>스와이프</strong>해서 모든 타일을 한 방향으로 밀어요.</p>
                  <p><strong>같은 숫자</strong>가 부딪히면 합쳐져요!</p>
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
