import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import backgroundVideo from '../assets/campo.mp4';  // Adjust the path as needed

const BackgroundSegmentation = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const backgroundVideoRef = useRef(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const segmenterRef = useRef(null);
  const [loadingState, setLoadingState] = useState('initial');
  const [error, setError] = useState(null);

  const initializeSegmenter = useCallback(async () => {
    try {
      console.log("Initializing segmenter...");
      const segmenter = new SelfieSegmentation({
        locateFile: (file) => {
          console.log(`Loading file: ${file}`);
          return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`;
        }
      });

      await segmenter.initialize();
      console.log("Segmenter initialized successfully");

      segmenter.setOptions({
        modelSelection: 1,
        selfieMode: true,
      });

      segmenter.onResults((results) => {
        console.log("Segmentation results received", results);
        onResults(results);
      });

      segmenterRef.current = segmenter;
      setLoadingState('ready');
    } catch (error) {
      console.error('Error initializing segmenter:', error);
      setError('Failed to initialize segmentation. Please refresh and try again.');
      setLoadingState('error');
    }
  }, []);

  useEffect(() => {
    const loadSegmentation = async () => {
      setLoadingState('loading');
      try {
        await initializeSegmenter();

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.onloadedmetadata = () => {
                updateCanvasSize();
                videoRef.current.play();
              };
            }
          } catch (error) {
            console.error('Error accessing the camera:', error);
            setError('Failed to access camera. Please ensure you have granted camera permissions.');
            setLoadingState('error');
            return;
          }
        }
      } catch (error) {
        console.error('Error in loadSegmentation:', error);
        setError('Failed to load segmentation. Please refresh and try again.');
        setLoadingState('error');
      }
    };

    loadSegmentation();

    // Set up background video
    if (backgroundVideoRef.current) {
      backgroundVideoRef.current.src = backgroundVideo;
      backgroundVideoRef.current.loop = true;
      backgroundVideoRef.current.muted = true;
      backgroundVideoRef.current.play();
    }

    return () => {
      if (segmenterRef.current) {
        segmenterRef.current.close();
      }
    };
  }, [initializeSegmenter]);

  const updateCanvasSize = () => {
    if (videoRef.current && canvasRef.current) {
      const videoAspectRatio = videoRef.current.videoWidth / videoRef.current.videoHeight;
      const screenHeight = window.innerHeight;
      
      const canvasHeight = screenHeight;
      const canvasWidth = screenHeight * videoAspectRatio;

      const pixelRatio = window.devicePixelRatio || 1;
      canvasRef.current.width = canvasWidth * pixelRatio;
      canvasRef.current.height = canvasHeight * pixelRatio;
      canvasRef.current.style.width = `${canvasWidth}px`;
      canvasRef.current.style.height = `${canvasHeight}px`;
      console.log(`Canvas size updated: ${canvasWidth}x${canvasHeight}`);
    }
  };

  const onResults = (results) => {
    if (!canvasRef.current || !backgroundVideoRef.current) {
      console.log("Canvas or background video not ready");
      return;
    }

    const canvasCtx = canvasRef.current.getContext('2d');
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, width, height);
    
    // Draw the background video
    canvasCtx.drawImage(backgroundVideoRef.current, 0, 0, width, height);
    
    // Draw the segmentation mask
    canvasCtx.globalCompositeOperation = 'destination-in';
    canvasCtx.drawImage(results.segmentationMask, 0, 0, width, height);
    
    // Draw the original image (person)
    canvasCtx.globalCompositeOperation = 'source-over';
    canvasCtx.drawImage(results.image, 0, 0, width, height);
    
    canvasCtx.restore();
    console.log("Frame rendered");
  };

  const startSegmentation = useCallback(async () => {
    if (!segmenterRef.current) {
      await initializeSegmenter();
    }
    setIsSegmenting(true);
    console.log("Segmentation started");
  }, [initializeSegmenter]);

  const stopSegmentation = () => {
    setIsSegmenting(false);
    console.log("Segmentation stopped");
  };

  useEffect(() => {
    if (loadingState !== 'ready' || !isSegmenting) return;

    let animationFrameId;

    const sendToSegmenter = async () => {
      if (videoRef.current && videoRef.current.videoWidth > 0 && segmenterRef.current) {
        try {
          await segmenterRef.current.send({image: videoRef.current});
          console.log("Frame sent to segmenter");
        } catch (error) {
          console.error('Error in segmentation:', error);
          if (error.name === 'BindingError') {
            console.log("Reinitializing segmenter due to BindingError");
            await initializeSegmenter();
          } else {
            setError('Segmentation error occurred. Please try again.');
            stopSegmentation();
            return;
          }
        }
      }
      if (isSegmenting) {
        animationFrameId = requestAnimationFrame(sendToSegmenter);
      }
    };

    sendToSegmenter();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isSegmenting, loadingState, initializeSegmenter]);

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
      <video ref={backgroundVideoRef} className="hidden" loop muted playsInline />
      <canvas ref={canvasRef} className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10" />
    </div>
  );
};

export default BackgroundSegmentation;