import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import Index from "./Index";
import Login from "./pages/Login";
import "./index.css";
import AppForm from "./pages/AppForm";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/app" element={<AppForm />} />
      <Route path="/" element={<Index />} />
    </Routes>
  </BrowserRouter>
);
