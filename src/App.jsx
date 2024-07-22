import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import BackgroundSegmentation from './components/BackgroundSegmentation';

function App() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full" >
      <BackgroundSegmentation />
    </div>
  )
}

export default App