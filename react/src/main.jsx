import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import Index from "./Index";
import Login from "./pages/Login";
import "./index.css";
import App from "./pages/App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/app" element={<App />} />
      <Route path="/" element={<Index />} />
    </Routes>
  </BrowserRouter>
);
