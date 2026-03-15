import React from "react";
import Hero from "../components/Hero";
import Features from "../components/Features";
import DashboardPreview from "../components/DashboardPreview";
import Footer from "../components/Footer";

export default function LandingPage() {
  return (
    <div className="app-container">
      <Hero />
      <Features />
      <DashboardPreview />
      <Footer />
    </div>
  );
}
