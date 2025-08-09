import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface BottomActionBarProps {
  onScan?: () => void;
  onAddManual?: () => void;
}

const BottomActionBar: React.FC<BottomActionBarProps> = ({ onScan, onAddManual }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleScan = () => (onScan ? onScan() : navigate('/scanning'));
  const handleAddManual = () => (onAddManual ? onAddManual() : navigate('/dashboard?add=true'));

  return (
    <div className="fixed bottom-16 left-0 right-0 md:hidden z-20 px-4">
      <div className="flex flex-col space-y-2">
        <button
          onClick={handleScan}
          className="w-full py-3 rounded-lg text-white bg-galaxy shadow-lg heading-3 text-center"
        >
          Scan for Subscriptions
        </button>
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="w-full py-2 rounded-lg text-galaxy bg-white border border-galaxy shadow-sm small-label"
          >
            Add
          </button>
          {open && (
            <div className="absolute bottom-12 left-0 right-0 bg-white border rounded-lg shadow-md overflow-hidden">
              <button onClick={handleScan} className="w-full text-left px-4 py-3 hover:bg-gray-50 small-label">Start New Scan</button>
              <button onClick={handleAddManual} className="w-full text-left px-4 py-3 hover:bg-gray-50 small-label">Add Manually</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BottomActionBar;


