import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import backgroundVideo from '../assets/campo.mp4';  // Adjust the path as needed

const BackgroundSegmentation = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const backgroundVideoRef = useRef(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [raisingHand, setRaisingHand] = useState(false);
  const [frameCounter, setFrameCounter] = useState(0);
  const segmentationPromiseRef = useRef(null);
  const [loadingState, setLoadingState] = useState('initial');
  const [error, setError] = useState(null);
  const segmenterRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (backgroundVideoRef.current) {
      backgroundVideoRef.current.src = backgroundVideo;
      backgroundVideoRef.current.loop = true;
      backgroundVideoRef.current.muted = true;
      backgroundVideoRef.current.play().catch(error => {
        // Handle error silently or set an error state if needed
      });
    }

    return () => {
      if (backgroundVideoRef.current) {
        backgroundVideoRef.current.pause();
        backgroundVideoRef.current.src = '';
      }
    };
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  const initializeSegmenter = useCallback(async () => {
    try {
      const segmenter = new SelfieSegmentation({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`,
      });

      await segmenter.initialize();

      segmenter.setOptions({
        modelSelection: 1,
        selfieMode: true,
      });

      segmenter.onResults((results) => {
        if (segmentationPromiseRef.current) {
          segmentationPromiseRef.current.resolve(results);
          segmentationPromiseRef.current = null;
        }
      });

      segmenterRef.current = segmenter;
      setLoadingState('ready');

    } catch (error) {
      setError('Failed to initialize segmentation. Please refresh and try again.');
      setLoadingState('error');
    }
  }, []);

  const initializePoseLandmarker = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );

      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 2,
      });

      poseLandmarkerRef.current = poseLandmarker;
    } catch (error) {
      console.error('Failed to initialize pose landmarker:', error);
    }
  }, []);

  useEffect(() => {
    const loadSegmentation = async () => {
      setLoadingState('loading');
      try {
        await initializeSegmenter();
        await initializePoseLandmarker();

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
            setError('Failed to access camera. Please ensure you have granted camera permissions.');
            setLoadingState('error');
            return;
          }
        }
      } catch (error) {
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
  }, [initializeSegmenter, initializePoseLandmarker]);

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
    }
  };

  const onResults = useCallback((results) => {
    if (!canvasRef.current || !backgroundVideoRef.current) {
      return;
    }

    const canvasCtx = canvasRef.current.getContext('2d');
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, width, height);

    // Draw the segmentation mask (already inverted due to selfieMode: true)
    canvasCtx.drawImage(results.segmentationMask, 0, 0, width, height);

    // Set composite operation to only draw where the mask is
    canvasCtx.globalCompositeOperation = 'source-in';

    // Draw the camera feed (now flipped)
    canvasCtx.drawImage(results.image, 0, 0, width, height);

    // Reset the transform
    canvasCtx.setTransform(1, 0, 0, 1, 0, 0);

    // Draw the background video behind everything
    canvasCtx.globalCompositeOperation = 'destination-over';
    canvasCtx.drawImage(backgroundVideoRef.current, 0, 0, width, height);

    canvasCtx.restore();
  }, []);

  const sendToSegmenter = useCallback(async () => {
    if (videoRef.current && videoRef.current.videoWidth > 0 && segmenterRef.current && poseLandmarkerRef.current) {
      try {
        const segmentationPromise = new Promise((resolve) => {
          segmentationPromiseRef.current = { resolve };
        });

        const [_, poseResults] = await Promise.all([
          segmenterRef.current.send({ image: videoRef.current }),
          poseLandmarkerRef.current.detectForVideo(videoRef.current, performance.now()),
          segmentationPromise
        ]);

        const segmentationResults = await segmentationPromise;

        onResults({
          segmentationMask: segmentationResults.segmentationMask,
          image: segmentationResults.image,
          poseLandmarks: poseResults.landmarks
        });

        if (poseResults.landmarks && poseResults.landmarks.length > 0) {
          setRaisingHand(poseResults.landmarks[0][15].y < poseResults.landmarks[0][11].y);
        } else {
          console.log('No landmarks detected');
        }

        setFrameCounter(prev => prev + 1);

      } catch (error) {
        console.error('Error in sendToSegmenter:', error);
        if (error.name === 'BindingError') {
          console.log('Attempting to reinitialize segmenter and pose landmarker...');
          await initializeSegmenter();
          await initializePoseLandmarker();
        } else {
          setError(`Processing error: ${error.message}. Please try again.`);
          stopSegmentation();
          return;
        }
      }
    }

    if (isSegmenting) {
      animationFrameRef.current = requestAnimationFrame(sendToSegmenter);
    }
  }, [isSegmenting, onResults, initializeSegmenter, initializePoseLandmarker]);

  useEffect(() => {
    if (loadingState === 'ready' && isSegmenting) {
      sendToSegmenter();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [loadingState, isSegmenting, sendToSegmenter]);

  const startSegmentation = useCallback(async () => {
    if (!segmenterRef.current) {
      await initializeSegmenter();
    }
    setIsSegmenting(true);
  }, [initializeSegmenter]);

  const stopSegmentation = useCallback(() => {
    setIsSegmenting(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
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
      {raisingHand && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-red-500 text-white rounded z-20">
          LEVANTANDO LA MANO
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
      <video ref={backgroundVideoRef} className="hidden" loop muted playsInline autoPlay />
      <canvas ref={canvasRef} className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10" />
    </div>
  );
};

export default BackgroundSegmentation;