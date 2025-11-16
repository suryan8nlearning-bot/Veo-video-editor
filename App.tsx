import React, { Suspense, lazy } from 'react';
import { GithubIcon } from './components/Icons';
import { VideoProcessorSkeleton } from './components/VideoProcessorSkeleton';

const VideoProcessorLazy = lazy(() => import('./components/VideoProcessor'));

const App: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-2 sm:p-4 lg:p-8 font-sans">
            <header className="w-full max-w-7xl flex justify-between items-center mb-6">
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                    Veo AI Video Editor
                </h1>
                <a href="https://github.com/google/generative-ai-docs/tree/main/site/en/gemini-api/docs/veo" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                    <GithubIcon className="w-8 h-8" />
                </a>
            </header>
            
            <main className="w-full max-w-7xl flex-grow flex flex-col">
                <Suspense fallback={<VideoProcessorSkeleton />}>
                    <VideoProcessorLazy />
                </Suspense>
            </main>
        </div>
    );
};

export default App;
