import React from 'react';

const RecordingBar = ({ stage, countdown }) => {
    const text = stage === 1 ? "PREPARATE..." : "GRABANDO...";
    
    return (
        <div className="recording-bar w-full h-64 flex items-center justify-center space-x-16">
            <div className="relative w-48 h-48">
                <svg className="w-full h-full" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="44" fill="#26C1D8" />
                    <text 
                        x="50%" 
                        y="50%" 
                        dominantBaseline="central" 
                        textAnchor="middle" 
                        fill="white" 
                        fontSize="60" 
                        fontWeight="bold"
                    >
                        {countdown}
                    </text>
                </svg>
            </div>
            <div className="text-white text-8xl font-bold tracking-wider">
                {text}
            </div>
        </div>
    );
}

export default RecordingBar;