import React from 'react';

export const VideoProcessorSkeleton: React.FC = () => {
    return (
        <div className="flex flex-col h-full flex-grow animate-pulse space-y-4 min-h-0">
            {/* Main Content Area Skeleton */}
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
                {/* Left Column: Video Player Skeleton */}
                <div className="lg:col-span-2 w-full bg-gray-800 rounded-lg"></div>
                
                {/* Right Column: Editor & Segments Skeleton */}
                <div className="flex flex-col gap-4 min-h-0">
                     {/* AI Editor Skeleton */}
                    <div className="bg-gray-800 p-4 rounded-lg space-y-4">
                        <div className="h-6 w-1/2 bg-gray-700 rounded-md"></div>
                        <div className="flex gap-2">
                            <div className="w-24 h-24 bg-gray-700 rounded-md flex-shrink-0"></div>
                            <div className="w-full h-24 bg-gray-700 rounded-md"></div>
                        </div>
                        <div className="h-10 w-full bg-gray-700 rounded-lg"></div>
                    </div>
                     {/* Segment List Skeleton */}
                    <div className="bg-gray-800 p-4 rounded-lg flex-grow space-y-2 flex flex-col">
                        <div className="h-6 w-3/4 bg-gray-700 rounded-md mb-2"></div>
                        <div className="flex-grow space-y-2">
                            <div className="h-8 w-full bg-gray-700/50 rounded-md"></div>
                            <div className="h-8 w-full bg-gray-700/50 rounded-md"></div>
                            <div className="h-8 w-full bg-gray-700/50 rounded-md"></div>
                            <div className="h-8 w-full bg-gray-700/50 rounded-md"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline Skeleton */}
            <div className="bg-gray-800 p-2 rounded-lg h-[275px] flex-shrink-0 flex flex-col">
                 <div className="flex justify-between items-center px-2 mb-2">
                    <div className="h-6 w-32 bg-gray-700 rounded-md"></div>
                    <div className="flex gap-4">
                        <div className="h-8 w-24 bg-gray-700 rounded-lg"></div>
                        <div className="h-8 w-24 bg-gray-700 rounded-lg"></div>
                    </div>
                 </div>
                <div className="w-full flex-grow bg-gray-900 rounded-md flex">
                    <div className="w-24 flex-shrink-0 border-r border-gray-700/50 pr-2 space-y-2 py-2">
                        <div className="h-full bg-gray-800 rounded-md"></div>
                    </div>
                    <div className="w-full pl-2 py-2">
                        <div className="h-6 w-full bg-gray-700/50 rounded-md mb-2"></div>
                        <div className="h-full bg-gray-700/20 rounded-lg flex space-x-2 p-1">
                            <div className="h-full w-1/3 bg-gray-700 rounded-md"></div>
                            <div className="h-full w-1/3 bg-gray-700 rounded-md"></div>
                            <div className="h-full w-1/3 bg-gray-700 rounded-md"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};