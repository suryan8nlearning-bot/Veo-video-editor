import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Clip, Track } from './VideoProcessor';

interface TimelineProps {
    tracks: Track[];
    duration: number;
    playheadPosition: number;
    selectedClipId: string | null;
    onTimeUpdate: (time: number) => void;
    onClipSelected: (clipId: string) => void;
    onClipResize: (clipId: string, handle: 'start' | 'end', deltaTime: number) => void;
}

const RULER_HEIGHT_PX = 30;
const TRACK_HEADER_WIDTH_PX = 100;
const PIXELS_PER_SECOND = 60; // Controls the zoom level of the timeline content

const TimeRuler: React.FC<{ duration: number, timelineWidth: number }> = React.memo(({ duration, timelineWidth }) => {
    const intervals = [1, 5, 10, 30, 60];
    let interval = intervals[0];
    // Find an interval that results in a reasonable number of markers
    for (const i of intervals) {
        if (i * PIXELS_PER_SECOND > 50) { // Ensure markers aren't too close
            interval = i;
            break;
        }
    }
    
    const markers = [];
    for (let time = 0; time <= duration; time += interval) {
        markers.push(time);
    }

    return (
        <div className="relative w-full border-b border-gray-700" style={{ height: `${RULER_HEIGHT_PX}px` }}>
            {markers.map(time => {
                const leftPosition = time * PIXELS_PER_SECOND;
                const isMajor = time % (interval * 2) === 0;
                return (
                    <div key={`marker-${time}`} className="absolute h-full" style={{ left: `${leftPosition}px` }}>
                        <div className={`w-px ${isMajor ? 'h-3' : 'h-2'} bg-gray-500`}></div>
                        {isMajor && <span className="text-xs text-gray-400 absolute top-3 -translate-x-1/2">{time.toFixed(0)}s</span>}
                    </div>
                );
            })}
        </div>
    );
});

const TimelineGrid: React.FC<{ duration: number, timelineWidth: number }> = React.memo(({ duration, timelineWidth }) => {
     if (duration <= 0) return null;
     const seconds = Math.floor(duration);
     const markers = Array.from({length: seconds}, (_, i) => i + 1);
     
     return(
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {markers.map(sec => {
                const left = sec * PIXELS_PER_SECOND;
                if(left > timelineWidth) return null;
                return <div key={`grid-${sec}`} className="absolute top-0 bottom-0 w-px bg-gray-600/50" style={{left: `${left}px`}}></div>
            })}
        </div>
     );
});


const TimelineClip: React.FC<{
    clip: Clip;
    pixelsPerSecond: number;
    isSelected: boolean;
    onClipSelected: (clipId: string) => void;
    onResizeMouseDown: (e: React.MouseEvent, clipId: string, handle: 'start' | 'end') => void;
}> = React.memo(({ clip, pixelsPerSecond, isSelected, onClipSelected, onResizeMouseDown }) => {
    const clipWidth = clip.duration * pixelsPerSecond;
    const clipStart = clip.timelineStart * pixelsPerSecond;
    const isGenerated = clip.type === 'generated';
    const canResize = clip.type === 'original';
    const thumbnailWidth = 80; // Fixed width for each thumbnail

    return (
        <div
            className={`absolute h-full p-1 group`}
            style={{ width: `${clipWidth}px`, left: `${clipStart}px` }}
            onClick={(e) => {
                e.stopPropagation();
                onClipSelected(clip.id);
            }}
        >
            <div
                className={`w-full h-full rounded-md overflow-hidden border-2 transition-all shadow-md bg-gray-900
                    ${isSelected ? 'border-yellow-400 shadow-yellow-500/20' : 'border-transparent'}
                    ${isGenerated ? 'border-purple-500/50' : ''}
                `}
            >
                <div className="w-full h-full flex overflow-hidden">
                    {clip.thumbnails.map((thumb, i) => (
                        <img
                            key={`${clip.id}-thumb-${i}`}
                            src={thumb}
                            alt={`Clip thumbnail ${i}`}
                            className="h-full object-cover"
                            draggable="false"
                            style={{ minWidth: `${thumbnailWidth}px`, width: `${thumbnailWidth}px` }}
                        />
                    ))}
                </div>
            </div>
            {isSelected && canResize && (
                <>
                    <div
                        className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-10 bg-yellow-400 rounded-l-sm cursor-ew-resize z-20 hover:bg-yellow-300"
                        onMouseDown={(e) => onResizeMouseDown(e, clip.id, 'start')}
                    />
                    <div
                        className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-10 bg-yellow-400 rounded-r-sm cursor-ew-resize z-20 hover:bg-yellow-300"
                        onMouseDown={(e) => onResizeMouseDown(e, clip.id, 'end')}
                    />
                </>
            )}
        </div>
    );
});


export const Timeline: React.FC<TimelineProps> = ({ tracks, duration, playheadPosition, selectedClipId, onTimeUpdate, onClipSelected, onClipResize }) => {
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [resizeState, setResizeState] = useState<{
        clipId: string;
        handle: 'start' | 'end';
        lastX: number;
    } | null>(null);

    const timelineWidth = duration * PIXELS_PER_SECOND;

    const handleTimeUpdateFromMouseEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
        if (!timelineContainerRef.current) return;
        const rect = timelineContainerRef.current.getBoundingClientRect();
        const scrollLeft = timelineContainerRef.current.parentElement?.scrollLeft || 0;
        const relativeX = e.clientX - rect.left + scrollLeft;
        const newTime = Math.max(0, Math.min(duration, relativeX / PIXELS_PER_SECOND));
        onTimeUpdate(newTime);
    }, [duration, onTimeUpdate]);
    
    const handleScrubMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // Prevent scrub if clicking on a clip or resize handle
        if ((e.target as HTMLElement).closest('.group')) {
            return;
        }
        setIsScrubbing(true);
        handleTimeUpdateFromMouseEvent(e);
    };

    const handleResizeMouseDown = (e: React.MouseEvent, clipId: string, handle: 'start' | 'end') => {
        e.stopPropagation();
        setResizeState({ clipId, handle, lastX: e.clientX });
    };

    const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
        if (isScrubbing) {
            handleTimeUpdateFromMouseEvent(e);
        }
        if (resizeState) {
            const dx = e.clientX - resizeState.lastX;
            const deltaTime = dx / PIXELS_PER_SECOND;
            if (Math.abs(deltaTime) > 0.01) {
              onClipResize(resizeState.clipId, resizeState.handle, deltaTime);
              setResizeState(prev => prev ? { ...prev, lastX: e.clientX } : null);
            }
        }
    }, [isScrubbing, resizeState, handleTimeUpdateFromMouseEvent, onClipResize]);

    const handleGlobalMouseUp = useCallback(() => {
        setIsScrubbing(false);
        setResizeState(null);
    }, []);

    useEffect(() => {
        if(isScrubbing || resizeState) {
            document.body.style.cursor = isScrubbing ? 'grabbing' : 'ew-resize';
            document.body.style.userSelect = 'none';
        } else {
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        }
    }, [isScrubbing, resizeState]);

    useEffect(() => {
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [handleGlobalMouseMove, handleGlobalMouseUp]);
    
    const playheadPositionPx = playheadPosition * PIXELS_PER_SECOND;

    return (
        <div className="w-full flex-grow flex flex-col min-h-[200px] bg-gray-900 rounded-md overflow-x-auto timeline-scrollbar">
            <div className="flex w-full sticky top-0 z-20 bg-gray-800">
                <div className="flex-shrink-0 border-r border-gray-700" style={{ width: `${TRACK_HEADER_WIDTH_PX}px` }}>
                    <div style={{ height: `${RULER_HEIGHT_PX}px` }}></div>
                </div>
                <div className="relative flex-grow" onMouseDown={handleScrubMouseDown}>
                    <TimeRuler duration={duration} timelineWidth={timelineWidth}/>
                </div>
            </div>
            <div ref={timelineContainerRef} className="flex relative flex-grow" style={{ width: `${timelineWidth + TRACK_HEADER_WIDTH_PX}px` }}>
                {/* Track Headers */}
                <div className="flex flex-col flex-shrink-0 border-r border-gray-700 sticky left-0 z-10 bg-gray-800" style={{ width: `${TRACK_HEADER_WIDTH_PX}px` }}>
                    {tracks.map(track => (
                        <div key={track.id} className="h-24 border-t border-gray-700 flex items-center justify-center font-semibold text-sm text-gray-300">
                            {track.type === 'video' ? 'Video 1' : 'Audio 1'}
                        </div>
                    ))}
                </div>

                {/* Timeline Content */}
                <div className="relative flex flex-col flex-grow cursor-grab" style={{ width: `${timelineWidth}px`}}>
                    <TimelineGrid duration={duration} timelineWidth={timelineWidth} />
                    {tracks.map(track => (
                        <div key={track.id} className="relative w-full h-24 bg-gray-700/20 border-t border-gray-700">
                            {track.clips.map((clip) => (
                                <TimelineClip 
                                    key={clip.id}
                                    clip={clip}
                                    pixelsPerSecond={PIXELS_PER_SECOND}
                                    isSelected={clip.id === selectedClipId}
                                    onClipSelected={onClipSelected}
                                    onResizeMouseDown={handleResizeMouseDown}
                                />
                            ))}
                        </div>
                    ))}
                    
                    {/* Playhead */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500/90 shadow-lg z-30"
                        style={{ left: `${playheadPositionPx}px`, pointerEvents: 'none' }}
                    >
                        <div 
                            className="absolute -top-px -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full border-2 border-white" 
                            style={{ boxShadow: '0 0 10px rgba(255, 82, 82, 0.7)' }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
