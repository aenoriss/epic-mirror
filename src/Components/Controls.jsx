import React, { useState, useEffect } from 'react';
import ThumbsUpImage from '../assets/ThumbsUp.png';
import IndexUpImage from '../assets/IndexUp.png';

const Controls = ({ leftControlValue, rightControlValue }) => {
    const [leftAuraActive, setLeftAuraActive] = useState(false);
    const [rightAuraActive, setRightAuraActive] = useState(false);

    // Ensure the values are between 0 and 100
    const clampedLeftValue = Math.max(0, Math.min(100, leftControlValue));
    const clampedRightValue = Math.max(0, Math.min(100, rightControlValue));

    useEffect(() => {
        let timer;
        if (clampedLeftValue === 100) {
            setLeftAuraActive(true);
            timer = setTimeout(() => setLeftAuraActive(false), 2000);
        } else if (clampedLeftValue === 0) {
            setLeftAuraActive(false);
            clearTimeout(timer);
        }
        return () => clearTimeout(timer);
    }, [clampedLeftValue]);

    useEffect(() => {
        let timer;
        if (clampedRightValue === 100) {
            setRightAuraActive(true);
            timer = setTimeout(() => setRightAuraActive(false), 2000);
        } else if (clampedRightValue === 0) {
            setRightAuraActive(false);
            clearTimeout(timer);
        }
        return () => clearTimeout(timer);
    }, [clampedRightValue]);

    return (
        <div className="controls w-full h-full relative mb-[14%]">
            {/* Left button (Thumbs Up) */}
            <div className="absolute left-[5%] top-1/2 -translate-y-1/2 flex items-center">
                <button 
                    className="w-40 h-40 rounded-full flex items-center justify-center overflow-hidden transition-shadow duration-300 mr-4"
                    aria-label="Pulgar Arriba control"
                    style={{
                        background: `linear-gradient(to top, #26C1D8 ${clampedLeftValue}%, transparent ${clampedLeftValue}%)`,
                        boxShadow: leftAuraActive ? '0 0 30px 15px rgba(38, 193, 216, 0.8)' : 'none',
                    }}
                >
                    <img src={ThumbsUpImage} alt="Pulgar Arriba" className="w-full h-full object-cover" />
                </button>
                <div className="text-left">
                    <p className="text-[#26C1D8] text-[200%] font-bold leading-tight">PULGAR ARRIBA</p>
                    <p className="text-white text-[180%]">iniciar grabación</p>
                </div>
            </div>

            {/* Right button (Index Up) */}
            <div className="absolute right-[5%] top-1/2 -translate-y-1/2 flex items-center">
                <div className="text-right mr-4">
                    <p className="text-[#26C1D8] text-[200%] font-bold leading-tight">INDICE ARRIBA</p>
                    <p className="text-white text-[180%]">cambiar escena</p>
                </div>
                <button 
                    className="w-40 h-40 rounded-full flex items-center justify-center overflow-hidden transition-shadow duration-300"
                    aria-label="Indice Arriba control"
                    style={{
                        background: `linear-gradient(to top, #26C1D8 ${clampedRightValue}%, transparent ${clampedRightValue}%)`,
                        boxShadow: rightAuraActive ? '0 0 30px 15px rgba(38, 193, 216, 0.8)' : 'none',
                    }}
                >
                    <img src={IndexUpImage} alt="Indice Arriba" className="w-full h-full object-cover" />
                </button>
            </div>
        </div>
    )
}

export default Controls;