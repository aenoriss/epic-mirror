import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import QRCode from 'qrcode.react';
import countryside from '../assets/countryside.mp4';
import interview from '../assets/interview.mp4'; 
import { saveCurrentCapture } from '../Utils/firebase';
import { set } from 'firebase/database';

const BackgroundSegmentation = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const backgroundVideoRef = useRef(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const overlayRef = useRef(null);

  const [thumbsUp, setThumbsUp] = useState(null);
  const [indexUp, setIndexUp] = useState(null);

  const timerRef = useRef(null);
  const [isCaptureActive, setIsCaptureActive] = useState(false);

  const [currentScene, setCurrentScene] = useState(1);
  const [captureId, setCaptureId] = useState(null);

  const [triggerCounter, setTriggerCounter] = useState(4);
  const segmentationPromiseRef = useRef(null);
  const [loadingState, setLoadingState] = useState('initial');
  const [error, setError] = useState(null);
  const segmenterRef = useRef(null);
  const gestureRecognizerRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {


    if (backgroundVideoRef.current) {
      currentScene == 1 ? backgroundVideoRef.current.src = countryside : backgroundVideoRef.current.src = interview;
      backgroundVideoRef.current.loop = true;
      backgroundVideoRef.current.muted = true;
      backgroundVideoRef.current.play().catch(error => {
      });
    }

    return () => {
      if (backgroundVideoRef.current) {
        backgroundVideoRef.current.pause();
        backgroundVideoRef.current.src = '';
      }
    };
  }, [currentScene]);

  useEffect(() => {
    const updateOverlaySize = () => {
      if (canvasRef.current && overlayRef.current) {
        const { width, height } = canvasRef.current.getBoundingClientRect();
        overlayRef.current.style.width = `${width}px`;
        overlayRef.current.style.height = `${height}px`;
      }
    };

    updateOverlaySize();
    window.addEventListener('resize', updateOverlaySize);

    return () => window.removeEventListener('resize', updateOverlaySize);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  const createBlobFromCanvas = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.toBlob(async (blob) => {
        if (blob) {
          console.log('Blob created:', URL.createObjectURL(blob));
          const uniqueId = await saveCurrentCapture(blob);

          const url = new URL(window.location.href);
          const newPath =  url.origin + "/photo" + "/" + uniqueId;

          setCaptureId(newPath);

          console.log("newPath", newPath);

        } else {
          console.error('Failed to create blob from canvas');
        }
      }, 'image/png');
    }
  }, []);

  useEffect(() => {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const runCountdown = async () => {

      console.log(" COUNTDOWN CALLED");

        // Countdown starts
        for (let i = 4; i >= 0; i--) {
          await sleep(2000);
          setTriggerCounter(i);
        }

        // Segmentation is stopped
        stopSegmentation();

        // Capture is taken and saved
        createBlobFromCanvas();
        
        //Experience Restarts
        await sleep(2000);

        //Experience Restarts
        setIsCaptureActive(false);
        startSegmentation();
    };

    if(isCaptureActive == true){
      console.log("Capture Active");
      runCountdown();
    }

    return () => {
      //When Capture finishes restart countdown
      setTriggerCounter(4);
    };

  }, [isCaptureActive]);

  useEffect(() => {
    console.log("triggerCounter", triggerCounter);
  }, [triggerCounter]);

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

      const gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
      });

      gestureRecognizerRef.current = gestureRecognizer;
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
    if (videoRef.current && videoRef.current.videoWidth > 0 && segmenterRef.current && gestureRecognizerRef.current) {
      try {
        const segmentationPromise = new Promise((resolve) => {
          segmentationPromiseRef.current = { resolve };
        });

        const [_, gestureResults] = await Promise.all([
          segmenterRef.current.send({ image: videoRef.current }),
          gestureRecognizerRef.current.recognizeForVideo(videoRef.current, performance.now()),
          segmentationPromise
        ]);

        const segmentationResults = await segmentationPromise;

        onResults({
          segmentationMask: segmentationResults.segmentationMask,
          image: segmentationResults.image,
          gestureRecognitionResult: gestureResults
        });

        let currentThumbsUp = false;
        let currentIndexUp = false;

        if (gestureResults.gestures && gestureResults.gestures.length > 0) {
          currentThumbsUp = gestureResults.gestures[0].some(gesture => gesture.categoryName === 'Thumb_Up');
          currentIndexUp = gestureResults.gestures[0].some(gesture => gesture.categoryName === 'Pointing_Up');
        }

        if (!isCaptureActive) {
          setThumbsUp(currentThumbsUp);
          setIndexUp(currentIndexUp);
        }

      } catch (error) {
        console.error('Error in sendToSegmenter:', error);
        if (error.name === 'BindingError') {
          console.log('Attempting to reinitialize segmenter and gesture recognizer...');
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
  }, [isSegmenting, onResults, initializeSegmenter, initializePoseLandmarker, isCaptureActive]);

  const changeScene = async () => {
    currentScene == 1 ? setCurrentScene(2) : setCurrentScene(1);
  };

  useEffect(() => {
    console.log("currentScene", currentScene);
  },[currentScene]);

  useEffect(() => {
    if (thumbsUp) {
      timerRef.current = setTimeout(() => {
        if(isCaptureActive == false){
          setIsCaptureActive(true);
        }
      }, 3000);
    } else if(indexUp){
      timerRef.current = setTimeout(() => {
        if(isCaptureActive == false){
          changeScene();
        }
      }, 3000);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [thumbsUp, indexUp]);

  

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
      
      {thumbsUp && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-red-500 text-white rounded z-20">
          Thumbs up
        </div>
      )}

      {indexUp && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-red-500 text-white rounded z-20">
          indexUp
        </div>
      )}

      {!isCaptureActive && <button 
        onClick={isSegmenting ? stopSegmentation : startSegmentation}
        className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors z-20 ${loadingState !== 'ready' ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={loadingState !== 'ready'}
      >
        {isSegmenting ? 'Stop Segmentation' : 'Start Segmentation'}
      </button>}

      <video ref={videoRef} className="hidden" autoPlay playsInline />
      <video ref={backgroundVideoRef} className="hidden" loop muted playsInline autoPlay />

      <div className="h-full flex items-center justify-center absolute top-0 left-1/2 transform -translate-x-1/2">
        <canvas ref={canvasRef} className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10" />

        <div 
        ref={overlayRef} 
        className="w-full h-full flex items-center justify-center pointer-events-none z-50"
      >
        {isCaptureActive && (
          <div className="text-white text-9xl font-bold text-center" style={{
            textShadow: '0 0 10px rgba(0,0,0,0.5)',
            transition: 'opacity 0.3s ease-in-out',
            opacity: triggerCounter >= 0 ? 1 : 0,
          }}>
            {triggerCounter !== 0 ? triggerCounter : '¡Foto Tomada!'}
          </div>
        )}
        {captureId && <QRCode value={captureId} size={500} />}
      </div>
      </div>
      
    </div>
  );
};

export default BackgroundSegmentation;