import React, { useRef, useEffect, useState } from 'react';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

const BackgroundSegmentation = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isSegmenting, setIsSegmenting] = useState(false);

  useEffect(() => {
    const loadSegmentation = async () => {

      //Loads relevant models from the web
      const segmenter = new SelfieSegmentation({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`;
        }
      });

      //Starts segmentation
      await segmenter.initialize();

      segmenter.setOptions({
        modelSelection: 1,
        selfieMode: true,
      });

      //Creates 2D canvas to display the resulting video feed.
      segmenter.onResults(onResults);

      //Request camera access and stream video feed
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing the camera:', error);
        }
      }

      //returns segmentation model for later use
      return segmenter;
    };

    let segmenter;
    loadSegmentation().then(s => {
      segmenter = s;
    });

    //Stops segmentation model when the component is unmounted
    return () => {
      if (segmenter) {
        segmenter.close();
      }
    };
  }, []);

  //Defines 2D canvas where the result is to be shown
  const onResults = (results) => {
    const canvasCtx = canvasRef.current.getContext('2d');
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    const pixelRatio = window.devicePixelRatio || 1;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, width, height);

    canvasCtx.scale(pixelRatio, pixelRatio);
    
    canvasCtx.drawImage(results.segmentationMask, 0, 0, width / pixelRatio, height / pixelRatio);
    
    canvasCtx.globalCompositeOperation = 'source-in';
    canvasCtx.drawImage(results.image, 0, 0, width / pixelRatio, height / pixelRatio);
    
    canvasCtx.globalCompositeOperation = 'destination-atop';
    canvasCtx.fillStyle = '#00FF00';  // Green background
    canvasCtx.fillRect(0, 0, width / pixelRatio, height / pixelRatio);
    
    canvasCtx.restore();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <button 
      onClick={startSegmentation}
      disabled={isSegmenting}
      className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-gray-400"
    >
      {isSegmenting ? 'Segmentation Running' : 'Start Segmentation'}
    </button>
    <video ref={videoRef} className="hidden" autoPlay playsInline />
    <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
  </div>
  );
};

export default BackgroundSegmentation;