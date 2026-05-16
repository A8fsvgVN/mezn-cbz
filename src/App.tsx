import { useEffect, useState, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { useSwipeable } from 'react-swipeable';
import { useComicReader } from './hooks/useComicReader';
import clsx from 'clsx';

function App() {
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const url = params.get('url');
    if (url) setTargetUrl(url);
  }, []);

  const { loading, error, currentPage, pages, goNext, goPrev, jumpTo } = useComicReader(targetUrl);
  
  const [showControls, setShowControls] = useState(false);
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('rtl'); 
  
  const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null);
  const total = pages.length;
  const currentUrl = pages[currentPage]?.url;

  useEffect(() => {
    if (transformComponentRef.current) transformComponentRef.current.resetTransform();
  }, [currentPage]);

  const onLeftAction = () => direction === 'ltr' ? goPrev() : goNext();
  const onRightAction = () => direction === 'ltr' ? goNext() : goPrev();

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => onRightAction(),
    onSwipedRight: () => onLeftAction(),
    preventScrollOnSwipe: true,
    trackMouse: false
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      switch(e.key) {
        case 'ArrowRight': case ' ': goNext(); break;
        case 'ArrowLeft': goPrev(); break;
        case 'm': setShowControls(p => !p); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]); 

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
    else document.exitFullscreen().catch(()=>{});
  };

  if (!targetUrl) return (
    <div className="flex items-center justify-center h-screen w-full bg-black text-gray-400 p-4">
        在 URL 加上 ?url=CBZ链接
    </div>
  );

  if (loading) return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-black text-white">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-sm">加载中...</div>
      </div>
  );
  
  if (error) return <div className="flex items-center justify-center h-screen bg-black text-red-500">{error}</div>;

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden select-none" {...swipeHandlers}>
      <TransformWrapper
        ref={transformComponentRef}
        initialScale={1} minScale={1} maxScale={4} centerOnInit={true}
      >
        <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
          {currentUrl && <img src={currentUrl} alt={`P${currentPage}`} className="max-w-full max-h-full object-contain" />}
        </TransformComponent>
      </TransformWrapper>

      {/* 左右点击区 */}
      <div className="absolute inset-0 flex z-10 pointer-events-none">
        <div className="w-[30%] h-full cursor-pointer pointer-events-auto" onClick={onLeftAction} />
        <div className="w-[40%] h-full cursor-pointer pointer-events-auto" onClick={() => setShowControls(!showControls)} />
        <div className="w-[30%] h-full cursor-pointer pointer-events-auto" onClick={onRightAction} />
      </div>

      {/* 底部控制栏 */}
      <div className={clsx("absolute bottom-0 w-full bg-gray-900/90 text-white z-20 flex flex-col backdrop-blur transition-transform duration-300 pb-safe", showControls ? "translate-y-0" : "translate-y-full")}>
        <div className="p-4 flex flex-col gap-3">
            <input 
                type="range" min="0" max={Math.max(0, total - 1)} value={currentPage} 
                onChange={(e) => jumpTo(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between items-center text-sm gap-2">
                <span>{currentPage + 1} / {total || '?'}</span>
                <div className="flex gap-2">
                    <button onClick={() => setDirection(d => d === 'ltr' ? 'rtl' : 'ltr')} className="px-3 py-1 bg-gray-800 rounded">
                        {direction === 'rtl' ? '日漫' : '普通'}
                    </button>
                    <button onClick={toggleFullscreen} className="px-3 py-1 bg-blue-600 rounded">全屏</button>
                </div>
            </div>
        </div>
      </div>
      
      {/* 顶部指示器 */}
      <div className={clsx("absolute top-4 right-4 bg-black/50 px-2 py-1 rounded text-xs text-white/50 pointer-events-none transition-opacity", showControls ? "opacity-0" : "opacity-100")}>
          {currentPage + 1} / {total || '?'}
      </div>
    </div>
  );
}

export default App;
