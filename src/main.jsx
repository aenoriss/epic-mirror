import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './Views/App.jsx'
import Client from './Views/Client.jsx'
import './index.css'
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const router = createBrowserRouter([
    {
        path: "/",
        element: <div>¡Escanea el QR para descargar tu foto!</div>,
    },
    {
        path: "/totem",
        element: <App/>
    },
    {
        path: "/photo/:id",
        element: <Client/>
    },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
    <RouterProvider router={router} />
)
