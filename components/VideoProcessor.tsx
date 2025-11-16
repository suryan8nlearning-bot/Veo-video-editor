import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import { Timeline } from './Timeline';
import { UploadIcon, ScissorsIcon, XIcon, PlusIcon } from './Icons';
import { extractFrameAtTime, fileToBase64, extractFramesFromVideo } from '../utils/helpers';
import { SegmentList } from './SegmentList';

const loadingMessages = [
    "Warming up the AI director...",
    "Rendering pixel masterpieces...",
    "Teaching polygons to dance...",
    "Consulting with the digital muse...",
    "This can take a few minutes, time for a coffee?",
    "The AI is dreaming up your video...",
    "Almost there, adding the final touches...",
];

export interface Clip {
  id: string;
  type: 'original' | 'generated';
  sourceFile: File;
  startTime: number;
  endTime: number;
  duration: number;
  prompt: string;
  promptImage: File | null;
  promptImagePreview: string | null;
  thumbnails: string[];
  generatedVideoUrl?: string;
  trackId: string;
  timelineStart: number; // Position on the main timeline
}

export interface Track {
    id: string;
    type: 'video' | 'audio';
    clips: Clip[];
}

const MIN_CLIP_DURATION = 0.2;
const DEFAULT_SEGMENT_DURATION = 10; // 10 seconds

const VideoProcessor: React.FC = () => {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [playheadPosition, setPlayheadPosition] = useState<number>(0);
    const [totalDuration, setTotalDuration] = useState<number>(0);
    const [addAsNewClip, setAddAsNewClip] = useState<boolean>(false);
    const [generatedPreview, setGeneratedPreview] = useState<{ url: string; file: File; thumbnails: string[]; duration: number } | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
    const [error, setError] = useState<string | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const selectedClip = useMemo(() => {
        for (const track of tracks) {
            const clip = track.clips.find(c => c.id === selectedClipId);
            if (clip) return clip;
        }
        return null;
    }, [tracks, selectedClipId]);
    
    const videoTrack = useMemo(() => tracks.find(t => t.type === 'video'), [tracks]);

    useEffect(() => {
        const newTotalDuration = tracks.reduce((max, track) => {
            const trackDuration = track.clips.reduce((timelineEnd, clip) => Math.max(timelineEnd, clip.timelineStart + clip.duration), 0);
            return Math.max(max, trackDuration);
        }, 0);
        setTotalDuration(newTotalDuration);
    }, [tracks]);

    useEffect(() => {
        if (videoRef.current) {
            const videoElement = videoRef.current;
            if (generatedPreview) {
                videoElement.src = generatedPreview.url;
                videoElement.currentTime = 0;
                videoElement.play().catch(e => console.error("Autoplay was prevented", e));
            } else if (selectedClip) {
                const sourceUrl = selectedClip.generatedVideoUrl || URL.createObjectURL(selectedClip.sourceFile);
                if (videoElement.src !== sourceUrl) {
                    videoElement.src = sourceUrl;
                }
                const targetTime = selectedClip.type === 'original' ? selectedClip.startTime : 0;
                if (Math.abs(videoElement.currentTime - targetTime) > 0.1) {
                    videoElement.currentTime = targetTime;
                }
            } else if (tracks.length > 0 && tracks[0].clips.length > 0) {
                 const firstClip = tracks[0].clips[0];
                 const sourceUrl = firstClip.generatedVideoUrl || URL.createObjectURL(firstClip.sourceFile);
                 if (videoElement.src !== sourceUrl) videoElement.src = sourceUrl;
            } else {
                videoElement.pause();
                videoElement.src = '';
            }
        }
    }, [selectedClip, generatedPreview, tracks]);
    
    const createClipFromFile = async (file: File, trackId: string, startTime: number, duration: number, timelineStart: number): Promise<Clip> => {
        const thumbnails = await extractFramesFromVideo(file, 5, startTime);
        return {
            id: crypto.randomUUID(),
            type: 'original',
            sourceFile: file,
            startTime,
            endTime: startTime + duration,
            duration,
            thumbnails,
            trackId,
            timelineStart,
            prompt: '',
            promptImage: null,
            promptImagePreview: null,
        };
    };

    const handleAddMedia = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !file.type.startsWith('video/')) {
            setError("Please upload a valid video file.");
            return;
        }

        setIsLoading(true);
        setLoadingMessage("Segmenting video...");

        try {
            const tempVideo = document.createElement('video');
            const videoUrl = URL.createObjectURL(file);
            tempVideo.src = videoUrl;
            
            tempVideo.onloadedmetadata = async () => {
                const totalVideoDuration = tempVideo.duration;
                URL.revokeObjectURL(videoUrl);

                let videoTrack = tracks.find(t => t.type === 'video');
                if (!videoTrack) {
                    const newVideoTrack: Track = { id: 'video1', type: 'video', clips: [] };
                    const audioTrack: Track = { id: 'audio1', type: 'audio', clips: [] };
                    setTracks([newVideoTrack, audioTrack]);
                    videoTrack = newVideoTrack;
                }

                const initialTimelineStart = videoTrack.clips.reduce((sum, clip) => sum + clip.duration, 0);
                const newClips: Clip[] = [];
                let currentTime = 0;
                let timelineCursor = initialTimelineStart;

                while(currentTime < totalVideoDuration) {
                    const remainingDuration = totalVideoDuration - currentTime;
                    const clipDuration = Math.min(remainingDuration, DEFAULT_SEGMENT_DURATION);
                    if(clipDuration < MIN_CLIP_DURATION) break;

                    const newClip = await createClipFromFile(file, videoTrack.id, currentTime, clipDuration, timelineCursor);
                    newClips.push(newClip);
                    currentTime += clipDuration;
                    timelineCursor += clipDuration;
                }
                
                setTracks(currentTracks => {
                    return currentTracks.map(track => {
                        if (track.id === videoTrack!.id) {
                            return { ...track, clips: [...track.clips, ...newClips] };
                        }
                        return track;
                    });
                });

                if (!selectedClipId) {
                    setSelectedClipId(newClips[0]?.id);
                }
                setIsLoading(false);
            };

            tempVideo.onerror = () => {
                setError("Could not process video file.");
                setIsLoading(false);
                URL.revokeObjectURL(videoUrl);
            }

        } catch(e) {
            setError("Could not process video file.");
            setIsLoading(false);
        }
    };

    const handleSplitClip = async () => {
        if (!selectedClipId || !selectedClip) return;
        
        const splitTimeInClip = playheadPosition - selectedClip.timelineStart;
        
        if (splitTimeInClip < MIN_CLIP_DURATION || selectedClip.duration - splitTimeInClip < MIN_CLIP_DURATION) {
            setError(`Cannot split clip, minimum segment duration is ${MIN_CLIP_DURATION}s.`);
            return;
        }
        
        setIsLoading(true);
        setLoadingMessage("Splitting clip...");

        try {
            const newThumbnails = await extractFramesFromVideo(selectedClip.sourceFile, 5, selectedClip.startTime + splitTimeInClip);

            const clip1: Clip = {
                ...selectedClip,
                id: crypto.randomUUID(),
                endTime: selectedClip.startTime + splitTimeInClip,
                duration: splitTimeInClip,
            };

            const clip2: Clip = {
                ...selectedClip,
                id: crypto.randomUUID(),
                startTime: selectedClip.startTime + splitTimeInClip,
                duration: selectedClip.duration - splitTimeInClip,
                thumbnails: newThumbnails,
                timelineStart: selectedClip.timelineStart + splitTimeInClip,
            };

            setTracks(currentTracks => {
                return currentTracks.map(track => {
                    if (track.id === selectedClip.trackId) {
                        const clipIndex = track.clips.findIndex(c => c.id === selectedClipId);
                        if (clipIndex === -1) return track;
                        const newClips = [...track.clips];
                        newClips.splice(clipIndex, 1, clip1, clip2);
                        // Update timeline starts for subsequent clips
                        for (let i = clipIndex + 2; i < newClips.length; i++) {
                            newClips[i].timelineStart = newClips[i-1].timelineStart + newClips[i-1].duration;
                        }
                        return { ...track, clips: newClips };
                    }
                    return track;
                });
            });
            setSelectedClipId(clip1.id);

        } catch (e) {
            setError("Failed to split clip.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClipResize = useCallback((clipId: string, handle: 'start' | 'end', deltaTime: number) => {
        setTracks(currentTracks => {
             const newTracks = currentTracks.map(track => ({
                ...track,
                clips: track.clips.map(clip => ({ ...clip }))
            }));
            
            let targetClip: Clip | null = null;
            let targetTrack: Track | null = null;
            let targetClipIndex = -1;

            for (const track of newTracks) {
                const clipIndex = track.clips.findIndex(c => c.id === clipId);
                if (clipIndex !== -1) {
                    targetClip = track.clips[clipIndex];
                    targetTrack = track;
                    targetClipIndex = clipIndex;
                    break;
                }
            }

            if (!targetClip || !targetTrack || targetClipIndex === -1 || targetClip.type === 'generated') return currentTracks;

            let actualDelta = 0;
            if (handle === 'end') {
                const newDuration = Math.max(MIN_CLIP_DURATION, targetClip.duration + deltaTime);
                actualDelta = newDuration - targetClip.duration;
                targetClip.duration = newDuration;
                targetClip.endTime += actualDelta;
            } else if (handle === 'start') {
                const newDuration = Math.max(MIN_CLIP_DURATION, targetClip.duration - deltaTime);
                actualDelta = (targetClip.duration - newDuration) * -1;
                targetClip.duration = newDuration;
                targetClip.startTime -= actualDelta;
                targetClip.timelineStart -= actualDelta;
            }
            
            for(let i = targetClipIndex + 1; i < targetTrack.clips.length; i++) {
                 targetTrack.clips[i].timelineStart += actualDelta;
            }

            return newTracks;
        });
    }, []);

    const updateSelectedClip = (updates: Partial<Clip>) => {
        if (!selectedClipId) return;
        setTracks(currentTracks => currentTracks.map(track => ({
            ...track,
            clips: track.clips.map(clip => 
                clip.id === selectedClipId ? { ...clip, ...updates } : clip
            )
        })));
    };

    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateSelectedClip({ prompt: e.target.value });
    };

    const handleImageFileChange = async (file: File | null) => {
        if (selectedClip?.promptImagePreview) {
            URL.revokeObjectURL(selectedClip.promptImagePreview);
        }
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            updateSelectedClip({ promptImage: file, promptImagePreview: previewUrl });
        } else {
            updateSelectedClip({ promptImage: null, promptImagePreview: null });
            if (imageInputRef.current) imageInputRef.current.value = '';
        }
    };

    const handleCopyPrevious = (clipId: string) => {
        const videoTrack = tracks.find(t => t.type === 'video');
        if (!videoTrack) return;

        const clipIndex = videoTrack.clips.findIndex(c => c.id === clipId);
        if (clipIndex < 1) return;

        const prevClip = videoTrack.clips[clipIndex - 1];
        setTracks(currentTracks => currentTracks.map(track => {
            if (track.id !== videoTrack.id) return track;
            return {
                ...track,
                clips: track.clips.map(clip => {
                    if (clip.id === clipId) {
                        return {
                            ...clip,
                            prompt: prevClip.prompt,
                            promptImage: prevClip.promptImage,
                            promptImagePreview: prevClip.promptImagePreview,
                        };
                    }
                    return clip;
                })
            };
        }));
    };
    
    const handleGeneratePreview = async () => {
        if (!selectedClip || !selectedClip.prompt) {
            setError("Please select a clip and provide a prompt.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedPreview(null);
        
        let messageInterval = setInterval(() => {
            setLoadingMessage(prev => {
                const currentIndex = loadingMessages.indexOf(prev);
                return loadingMessages[(currentIndex + 1) % loadingMessages.length];
            });
        }, 4000);

        try {
            let imageBase64Data: string;
            let imageMimeType: string = 'image/jpeg';
            let thumbnail: string;

            if (selectedClip.promptImage) {
                const base64String = await fileToBase64(selectedClip.promptImage);
                imageBase64Data = base64String.split(',')[1];
                imageMimeType = selectedClip.promptImage.type;
            } else {
                thumbnail = await extractFrameAtTime(selectedClip.sourceFile, selectedClip.startTime);
                imageBase64Data = thumbnail.split(',')[1];
            }
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            let operation: GenerateVideosOperation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: selectedClip.prompt,
                image: { imageBytes: imageBase64Data, mimeType: imageMimeType },
                config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' },
            });

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
                const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
                const videoBlob = await response.blob();
                
                const newFile = new File([videoBlob], "generated.mp4", { type: "video/mp4" });
                const newUrl = URL.createObjectURL(newFile);
                
                const tempVideo = document.createElement('video');
                tempVideo.src = newUrl;
                tempVideo.onloadedmetadata = async () => {
                     const thumbnails = await extractFramesFromVideo(newFile, 5);
                     setGeneratedPreview({
                        url: newUrl,
                        file: newFile,
                        thumbnails: thumbnails,
                        duration: tempVideo.duration,
                    });
                     URL.revokeObjectURL(tempVideo.src);
                };
            } else {
                throw new Error("Video generation did not return a valid link.");
            }
        } catch (err: any) {
            console.error("Video generation failed.", err);
             if (err.message?.includes("Requested entity was not found")) {
                setError("Video generation failed due to an authentication or configuration error. Please check the backend API key and project settings.");
            } else {
                setError(`An error occurred during video generation: ${err.message}`);
            }
        } finally {
            setIsLoading(false);
            clearInterval(messageInterval);
        }
    };
    
    const handleApplyPreview = () => {
        if (!generatedPreview || !selectedClipId || !selectedClip) return;

        // Fix: Trim the last 0.1s to prevent common black frame issues at the end of generated videos.
        const newDuration = Math.max(MIN_CLIP_DURATION, generatedPreview.duration - 0.1);

        const newClipData: Omit<Clip, 'timelineStart'> = {
            id: crypto.randomUUID(),
            type: 'generated',
            sourceFile: generatedPreview.file,
            startTime: 0,
            endTime: newDuration,
            duration: newDuration,
            thumbnails: generatedPreview.thumbnails,
            prompt: selectedClip.prompt,
            promptImage: selectedClip.promptImage,
            promptImagePreview: selectedClip.promptImagePreview,
            generatedVideoUrl: generatedPreview.url,
            trackId: selectedClip.trackId,
        };

        setTracks(currentTracks => {
            return currentTracks.map(track => {
                if (track.id !== newClipData.trackId) return track;

                const newClips: Clip[] = [];
                let timelineCursor = 0;
                const originalClips = track.clips;
                
                if (addAsNewClip) {
                    const insertIndex = originalClips.findIndex(c => c.id === selectedClipId) + 1;
                    const clipsBefore = originalClips.slice(0, insertIndex);
                    const clipsAfter = originalClips.slice(insertIndex);
                    const allClips = [...clipsBefore, { ...newClipData, timelineStart: 0 }, ...clipsAfter];
                     allClips.forEach(c => {
                        const updatedClip = {...c, timelineStart: timelineCursor};
                        newClips.push(updatedClip);
                        timelineCursor += c.duration;
                    });

                } else {
                    originalClips.forEach(c => {
                        if (c.id === selectedClipId) {
                            newClips.push({ ...newClipData, timelineStart: timelineCursor });
                            timelineCursor += newClipData.duration;
                        } else {
                            newClips.push({ ...c, timelineStart: timelineCursor });
                            timelineCursor += c.duration;
                        }
                    });
                }
                return { ...track, clips: newClips };
            });
        });
        
        setSelectedClipId(newClipData.id);
        setGeneratedPreview(null);
    };
    
    const handleDiscardPreview = () => {
        if(generatedPreview) URL.revokeObjectURL(generatedPreview.url);
        setGeneratedPreview(null);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDraggingOver) setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) handleImageFileChange(file);
    };

    return (
        <div className="flex flex-col h-full flex-grow min-h-0">
            {tracks.length === 0 && !isLoading && (
                <div 
                    className="flex flex-col items-center justify-center w-full h-full flex-grow border-2 border-dashed border-gray-600 rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <UploadIcon className="w-12 h-12 text-gray-400 mb-4" />
                    <p className="text-base sm:text-lg font-semibold text-gray-300">Click to upload your first video</p>
                    <p className="text-sm text-gray-500">MP4, MOV, or WEBM</p>
                    <input type="file" ref={fileInputRef} onChange={handleAddMedia} accept="video/*" className="hidden" />
                </div>
            )}

            {error && <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg my-4" role="alert" onClick={() => setError(null)}>{error}</div>}
            
            {isLoading && (
                 <div className="flex flex-col items-center justify-center flex-grow h-full bg-gray-800/50 rounded-lg p-8 text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mb-4"></div>
                    <p className="text-lg font-semibold">{loadingMessage}</p>
                </div>
            )}

            {tracks.length > 0 && !isLoading && (
                <div className="flex flex-col flex-grow h-full space-y-4 min-h-0">
                     <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
                        {/* Left Column: Video Player */}
                        <div className="lg:col-span-2 w-full rounded-lg bg-black overflow-hidden shadow-lg flex items-center justify-center">
                             <video ref={videoRef} controls className="max-w-full max-h-full" muted playsInline></video>
                        </div>
                        {/* Right Column: Editor & Segments */}
                        <div className="flex flex-col gap-4 min-h-0">
                            <div 
                                className={`bg-gray-800 p-4 rounded-lg flex flex-col justify-center shadow-lg transition-all ${isDraggingOver ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900' : ''}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <h3 className="text-xl font-semibold mb-2 text-gray-100">AI Segment Editor</h3>
                                {generatedPreview ? (
                                    <div className="space-y-4">
                                        <p className="text-green-400">Preview generated. Apply it to the timeline or discard.</p>
                                        <div className="flex gap-4">
                                            <button onClick={handleApplyPreview} className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700">Apply</button>
                                            <button onClick={handleDiscardPreview} className="w-full bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700">Discard</button>
                                        </div>
                                    </div>
                                ) : selectedClip ? (
                                    <>
                                        <p className="text-gray-400 mb-2 text-sm">Describe changes for segment ({selectedClip.duration.toFixed(2)}s) or provide an image.</p>
                                        <div className="flex gap-2 mb-2">
                                            {selectedClip.promptImagePreview ? (
                                                <div className="relative w-24 h-24 flex-shrink-0">
                                                    <img src={selectedClip.promptImagePreview} alt="Prompt preview" className="w-full h-full object-cover rounded-md"/>
                                                    <button onClick={() => handleImageFileChange(null)} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 text-white hover:bg-red-700"><XIcon className="w-4 h-4" /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => imageInputRef.current?.click()} className="w-24 h-24 border-2 border-dashed border-gray-600 rounded-md flex flex-col items-center justify-center text-gray-400 hover:bg-gray-700/50">
                                                    <UploadIcon className="w-6 h-6 mb-1"/>
                                                    <span className="text-xs">Upload Image</span>
                                                </button>
                                            )}
                                            <textarea
                                                value={selectedClip.prompt}
                                                onChange={handlePromptChange}
                                                placeholder="e.g., 'A dog wearing sunglasses...'"
                                                className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                            />
                                        </div>
                                        <input type="file" ref={imageInputRef} onChange={(e) => handleImageFileChange(e.target.files?.[0] || null)} accept="image/*" className="hidden"/>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                                <input type="checkbox" id="addAsNew" checked={addAsNewClip} onChange={(e) => setAddAsNewClip(e.target.checked)} className="form-checkbox h-4 w-4 text-purple-600 bg-gray-700 border-gray-500 rounded focus:ring-purple-500"/>
                                                <label htmlFor="addAsNew">Add as new clip</label>
                                            </div>
                                            <button
                                                onClick={handleGeneratePreview}
                                                disabled={isLoading || !selectedClip.prompt}
                                                className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                                            >
                                                Generate Preview
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-gray-400">Select a clip to edit.</p>
                                )}
                            </div>
                            {videoTrack && videoTrack.clips.length > 0 && (
                                <SegmentList 
                                    clips={videoTrack.clips}
                                    selectedClipId={selectedClipId}
                                    onClipSelected={setSelectedClipId}
                                    onCopyPrevious={handleCopyPrevious}
                                />
                            )}
                        </div>
                     </div>
                     
                    <div className="flex flex-col bg-gray-800 p-2 rounded-lg shadow-lg h-[275px] flex-shrink-0">
                        <div className="flex items-center justify-between mb-2 px-2">
                             <h3 className="text-xl font-semibold">Timeline</h3>
                             <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 bg-green-600 text-white font-bold py-1.5 px-3 rounded-lg hover:bg-green-700 transition-colors text-sm"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Add Media
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleAddMedia} accept="video/*" className="hidden" />
                                <button 
                                    onClick={handleSplitClip}
                                    disabled={!selectedClipId}
                                    className="flex items-center gap-2 bg-blue-600 text-white font-bold py-1.5 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:bg-gray-500 disabled:cursor-not-allowed"
                                >
                                    <ScissorsIcon className="w-4 h-4" />
                                    Split Clip
                                </button>
                             </div>
                        </div>
                         <Timeline 
                            tracks={tracks}
                            duration={totalDuration}
                            playheadPosition={playheadPosition}
                            selectedClipId={selectedClipId}
                            onTimeUpdate={setPlayheadPosition}
                            onClipSelected={setSelectedClipId}
                            onClipResize={handleClipResize}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoProcessor;