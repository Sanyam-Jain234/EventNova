import React from "react";

const Footer = () => {
  return (
    <footer className="border-t border-gray-800/50 py-8 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-400">
          © 2026 <span className="text-white font-semibold">EventNova</span>
          {" "}— Smart Event Management Platform
        </div>

        <div className="text-sm text-gray-400 text-center md:text-right">
          <p>Developed by</p>
          <p className="text-gray-300 mt-1">
            Sutikshn Koushik · Shlok Rathore · Shreyansh Rathore · Sanyam Jain
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;