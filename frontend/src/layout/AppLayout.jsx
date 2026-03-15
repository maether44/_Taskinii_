import React from "react";
import { Outlet } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";

export default function AppLayout() {
  return (
    <>
      <NavigationBar />
      <div style={{ paddingTop: "72px" }}>
        <Outlet />
      </div>
    </>
  );
}
