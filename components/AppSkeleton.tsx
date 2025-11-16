import React from 'react';
import { VideoProcessorSkeleton } from './VideoProcessorSkeleton';

export const AppSkeleton: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-2 sm:p-4 lg:p-8 font-sans">
            <header className="w-full max-w-7xl flex justify-between items-center mb-6 animate-pulse">
                <div className="h-8 sm:h-10 w-48 sm:w-64 bg-gray-700/50 rounded-md"></div>
                <div className="w-8 h-8 bg-gray-700/50 rounded-full"></div>
            </header>
            <main className="w-full max-w-7xl flex-grow">
                <VideoProcessorSkeleton />
            </main>
        </div>
    );
};