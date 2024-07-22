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
    // Get the 2D rendering context of the canvas
    const canvasCtx = canvasRef.current.getContext('2d');
    
    // Save the current canvas state
    canvasCtx.save();
    
    // Clear the entire canvas
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Draw the segmentation mask onto the canvas
    // This mask is a grayscale image where white represents the person and black the background
    canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Set the composition mode to 'source-in'
    // This will make subsequent drawing operations only affect the non-transparent parts of the existing content
    canvasCtx.globalCompositeOperation = 'source-in';
    
    // Draw the original image
    // Due to 'source-in', this will only be drawn where the mask is non-transparent (i.e., the person)
    canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Change the composition mode to 'destination-atop'
    // This will draw new content behind the existing content, but only where the existing content is transparent
    canvasCtx.globalCompositeOperation = 'destination-atop';
    
    // Set the fill color to green
    canvasCtx.fillStyle = '#00FF00';
    
    // Fill the entire canvas with green
    // Due to 'destination-atop', this will only fill the areas where the canvas is currently transparent (i.e., the background)
    canvasCtx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Restore the canvas state to what it was before we started drawing
    canvasCtx.restore();
  };

  const startSegmentation = async () => {

    //If there is video feed init the segmentation model
    if (videoRef.current && canvasRef.current) {
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

      segmenter.onResults(onResults);

      //Passes camera frame to segmentation model
      const sendToSegmenter = async () => {
        if (videoRef.current.videoWidth > 0) {
          await segmenter.send({image: videoRef.current});
        }
        requestAnimationFrame(sendToSegmenter);
      };

      sendToSegmenter();
      setIsSegmenting(true);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
    <video ref={videoRef} className="hidden" autoPlay playsInline />
    <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
    <button 
      onClick={startSegmentation}
      disabled={isSegmenting}
      className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-gray-400"
    >
      {isSegmenting ? 'Segmentation Running' : 'Start Segmentation'}
    </button>
  </div>
  );
};

export default BackgroundSegmentation;