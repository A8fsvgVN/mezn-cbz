import { useState, useEffect, useCallback, useRef } from 'react';
import { Unzip, UnzipInflate } from 'fflate';

export interface PageInfo {
    name: string;
    url: string;
}

export const getNormalizedUrl = (url: string) => {
    if (url.startsWith('blob:')) {
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
            return `local-${decodeURIComponent(url.substring(hashIndex + 1))}`;
        }
        return 'local-file';
    }

    try {
        const u = new URL(url);
        const disposition = u.searchParams.get('response-content-disposition');
        if (disposition) {
            const match = disposition.match(/filename\*=UTF-8''([^&;]+)/) || disposition.match(/filename="?([^";]+)"?/);
            if (match && match[1]) {
                return `net-file-${decodeURIComponent(match[1])}`;
            }
        }

        [
            'token', 'sign', 'e', 'auth', 'expires', 'Signature', 
            'X-Amz-Date', 'X-Amz-Signature', 'X-Amz-Credential', 'X-Amz-Algorithm', 'X-Amz-Expires', 
            't', 'u', 'oi', 'ot'
        ].forEach(p => u.searchParams.delete(p));
        
        return u.toString(); 
    } catch {
        return url.split('?')[0];
    }
};

export const useComicReader = (targetUrl: string | null) => {
  const [pages, setPages] = useState<PageInfo[]>([]); 
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chapterInfo, setChapterInfo] = useState<any>(null);
  const [isDone, setIsDone] = useState<boolean>(false);
  
  const urlCache = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!targetUrl) return;

    let isCancelled = false;

    const historyKey = `mezn-cbz-${getNormalizedUrl(targetUrl)}`;
    const savedPage = parseInt(localStorage.getItem(historyKey) || '0', 10);
    setCurrentPage(savedPage); 

    const load = async () => {
      setLoading(true);
      setError(null);
      setPages([]);
      setIsDone(false);
      
      urlCache.current.forEach(url => URL.revokeObjectURL(url));
      urlCache.current.clear();

      try {
        let res;
        if (targetUrl.startsWith('blob:')) {
            res = await fetch(targetUrl);
        } else {
            const proxyUrl = `/proxy?url=${encodeURIComponent(targetUrl)}`;
            res = await fetch(proxyUrl);
        }

        if (!res.ok || !res.body) throw new Error(`请求失败: HTTP ${res.status}`);

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
            throw new Error('获取失败：返回了一个网页，而不是 CBZ');
        }

        const reader = res.body.getReader();
        const unzip = new Unzip();
        unzip.register(UnzipInflate);

        unzip.onfile = (file) => {
          if (file.name.startsWith('__MACOSX')) return;

          const chunks: Uint8Array[] = [];
          
          file.ondata = (err, data, final) => {
            if (err) return;
            chunks.push(data);
            
            if (final && !isCancelled) {
              const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
              const fileData = new Uint8Array(totalLength);
              let offset = 0;
              for (const chunk of chunks) {
                fileData.set(chunk, offset);
                offset += chunk.length;
              }

              if (file.name.match(/\.(jpg|jpeg|png|webp|avif|jxl)$/i)) {
                const blob = new Blob([fileData]);
                const url = URL.createObjectURL(blob);
                urlCache.current.add(url);
                
                setPages(prev => {
                  const newPages = [...prev, { name: file.name, url }];
                  return newPages.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
                });
                
                setLoading(false);
              }

              if (file.name.toLowerCase().endsWith('info.json')) {
                try {
                  const text = new TextDecoder().decode(fileData);
                  setChapterInfo(JSON.parse(text));
                } catch (e) {}
              }
            }
          };
          file.start();
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done || isCancelled) {
            unzip.push(new Uint8Array(0), true);
            setIsDone(true);
            break;
          }
          if (value) unzip.push(value);
        }

      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || '加载失败');
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isCancelled = true;
      urlCache.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, [targetUrl]);

  const goNext = useCallback(() => setCurrentPage(p => Math.min(p + 1, pages.length > 0 ? pages.length - 1 : 0)), [pages.length]);
  const goPrev = useCallback(() => setCurrentPage(p => Math.max(p - 1, 0)), []);
  const jumpTo = useCallback((p: number) => setCurrentPage(Math.max(0, p)), []);

  return { loading, error, currentPage, pages, goNext, goPrev, jumpTo, chapterInfo, isDone };
};