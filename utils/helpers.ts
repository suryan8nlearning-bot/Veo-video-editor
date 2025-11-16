

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

export const extractFramesFromVideo = (
    videoFile: File,
    frameCount: number,
    startTime: number = 0
): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(videoFile);
        video.muted = true;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const frames: string[] = [];
        let framesCaptured = 0;
        
        const revokeUrl = () => URL.revokeObjectURL(video.src);

        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            if (!context) {
                revokeUrl();
                reject(new Error("Canvas context is not available"));
                return;
            }

            const duration = video.duration - startTime;
            if (duration <= 0) {
                 revokeUrl();
                 resolve([]);
                 return;
            }
            const interval = duration / frameCount;
            let currentTime = startTime;

            const captureFrame = () => {
                video.currentTime = currentTime;
            };

            video.onseeked = () => {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                frames.push(canvas.toDataURL('image/jpeg', 0.8));
                framesCaptured++;
                currentTime += interval;

                if (framesCaptured >= frameCount || currentTime > video.duration) {
                    revokeUrl();
                    resolve(frames);
                } else {
                    captureFrame();
                }
            };

            // Start capturing
            captureFrame();
        };
        
        video.onerror = (e) => {
            revokeUrl();
            reject("Error loading video for frame extraction.");
        }
    });
};


export const extractFrameAtTime = (
    videoFile: File,
    time: number
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(videoFile);
        video.muted = true;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        const revokeUrl = () => URL.revokeObjectURL(video.src);

        video.onloadedmetadata = () => {
            video.currentTime = Math.min(Math.max(0, time), video.duration);
        };
        
        video.onseeked = () => {
            if (!context) {
                revokeUrl();
                reject(new Error("Canvas context is not available"));
                return;
            }
            // Ensure canvas dimensions are set after metadata is loaded
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = canvas.toDataURL('image/jpeg', 0.8);
            revokeUrl();
            resolve(frame);
        };
        
        video.onerror = (e: string | Event) => {
            revokeUrl();
            // Fix: The parameter 'e' can be a string, which does not have a 'target' property.
            // This now checks if 'e' is an Event before accessing 'target'.
            const error = e instanceof Event ? (e.target as HTMLVideoElement)?.error : null;
            reject(`Error loading video for frame extraction: ${error?.message || (typeof e === 'string' ? e : 'Unknown error')}`);
        };
    });
};