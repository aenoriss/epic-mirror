import React, { useRef, useEffect, useState } from 'react';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

const BackgroundSegmentation = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const segmenterRef = useRef(null);
  const [loadingState, setLoadingState] = useState('initial');
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSegmentation = async () => {
      setLoadingState('loading');
      try {
        const segmenter = new SelfieSegmentation({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`;
          }
        });

        await segmenter.initialize();

        segmenter.setOptions({
          modelSelection: 1,
          selfieMode: true,
        });

        segmenter.onResults((results) => {
          onResults(results);
        });

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.onloadedmetadata = () => {
                updateCanvasSize();
              };
            }
          } catch (error) {
            console.error('Error accessing the camera:', error);
            setError('Failed to access camera. Please ensure you have granted camera permissions.');
            setLoadingState('error');
            return;
          }
        }

        segmenterRef.current = segmenter;
        setLoadingState('ready');
      } catch (error) {
        console.error('Error in loadSegmentation:', error);
        setError('Failed to load segmentation. Please refresh and try again.');
        setLoadingState('error');
      }
    };

    loadSegmentation();

    return () => {
      if (segmenterRef.current) {
        segmenterRef.current.close();
      }
    };
  }, []);

  const updateCanvasSize = () => {
    if (videoRef.current && canvasRef.current) {
      const videoAspectRatio = videoRef.current.videoWidth / videoRef.current.videoHeight;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const screenAspectRatio = screenWidth / screenHeight;

      let canvasWidth, canvasHeight;

      if (videoAspectRatio > screenAspectRatio) {
        // Video is wider than the screen
        canvasWidth = screenWidth;
        canvasHeight = screenWidth / videoAspectRatio;
      } else {
        // Video is taller than or equal to the screen
        canvasHeight = screenHeight;
        canvasWidth = screenHeight * videoAspectRatio;
      }

      const pixelRatio = window.devicePixelRatio || 1;
      canvasRef.current.width = canvasWidth * pixelRatio;
      canvasRef.current.height = canvasHeight * pixelRatio;
      canvasRef.current.style.width = `${canvasWidth}px`;
      canvasRef.current.style.height = `${canvasHeight}px`;
    }
  };

  const onResults = (results) => {
    if (!canvasRef.current) {
      return;
    }

    const canvasCtx = canvasRef.current.getContext('2d');
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, width, height);
    
    canvasCtx.drawImage(results.segmentationMask, 0, 0, width, height);
    
    canvasCtx.globalCompositeOperation = 'source-in';
    canvasCtx.drawImage(results.image, 0, 0, width, height);
    
    canvasCtx.globalCompositeOperation = 'destination-atop';
    canvasCtx.fillStyle = '#00FF00';  // Green background
    canvasCtx.fillRect(0, 0, width, height);
    
    canvasCtx.restore();
  };

  const startSegmentation = () => {
    setIsSegmenting(true);
  };

  const stopSegmentation = () => {
    setIsSegmenting(false);
  };

  useEffect(() => {
    if (loadingState !== 'ready') return;

    let animationFrameId;

    const sendToSegmenter = async () => {
      if (videoRef.current && videoRef.current.videoWidth > 0 && segmenterRef.current) {
        await segmenterRef.current.send({image: videoRef.current});
      }
      if (isSegmenting) {
        animationFrameId = requestAnimationFrame(sendToSegmenter);
      }
    };

    if (isSegmenting) {
      sendToSegmenter();
    } else if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isSegmenting, loadingState]);

  useEffect(() => {
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {loadingState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white z-30">
          Loading...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-red-500 z-30">
          {error}
        </div>
      )}
      <button 
        onClick={isSegmenting ? stopSegmentation : startSegmentation}
        className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors z-20 ${loadingState !== 'ready' ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={loadingState !== 'ready'}
      >
        {isSegmenting ? 'Stop Segmentation' : 'Start Segmentation'}
      </button>
      <video ref={videoRef} className="hidden" autoPlay playsInline />
      <canvas ref={canvasRef} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10" />
    </div>
  );
};

export default BackgroundSegmentation;