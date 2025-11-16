import React from 'react';
import { Clip } from './VideoProcessor';
import { CopyIcon } from './Icons';

interface SegmentListProps {
    clips: Clip[];
    selectedClipId: string | null;
    onClipSelected: (clipId: string) => void;
    onCopyPrevious: (clipId: string) => void;
}

export const SegmentList: React.FC<SegmentListProps> = ({ clips, selectedClipId, onClipSelected, onCopyPrevious }) => {
    return (
        <div className="bg-gray-800 p-2 rounded-lg shadow-lg flex-grow flex flex-col min-h-0">
            <h3 className="text-lg font-semibold mb-2 px-2 text-gray-100 flex-shrink-0">Segments</h3>
            <div className="flex-grow overflow-y-auto space-y-1 pr-1 min-h-0">
                {clips.map((clip, index) => {
                    const isSelected = clip.id === selectedClipId;
                    return (
                        <div
                            key={clip.id}
                            onClick={() => onClipSelected(clip.id)}
                            className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                                isSelected ? 'bg-purple-600/50' : 'bg-gray-700/50 hover:bg-gray-700'
                            }`}
                        >
                            <div className="flex flex-col text-sm">
                                <span className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                    Segment {index + 1}
                                </span>
                                <span className={`text-xs ${isSelected ? 'text-purple-200' : 'text-gray-400'}`}>
                                    {clip.timelineStart.toFixed(1)}s - {(clip.timelineStart + clip.duration).toFixed(1)}s
                                </span>
                            </div>
                            {index > 0 && (
                               <button 
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    onCopyPrevious(clip.id);
                                 }}
                                 title="Copy prompt from previous segment"
                                 className="p-1 rounded-md text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
                               >
                                    <CopyIcon className="w-5 h-5"/>
                               </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};