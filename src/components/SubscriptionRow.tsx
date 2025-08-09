import React from 'react';

interface Props {
  name: string;
  amount: string;
  billing: string;
  renewal?: string | null;
  iconUrl?: string;
  onMenu?: () => void;
  isGain?: boolean; // true for green, false for red, undefined for neutral galaxy
}

const SubscriptionRow: React.FC<Props> = ({ name, amount, billing, renewal, iconUrl, onMenu, isGain }) => {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-md bg-gray-100 overflow-hidden flex items-center justify-center">
          {iconUrl ? (
            <img src={iconUrl} alt={name} className="h-10 w-10 object-cover" />
          ) : (
            <span className="small-label text-gray-500">•</span>
          )}
        </div>
        <div>
          <div className="text-[16px] font-semibold text-gray-900">{name}</div>
          <div className="text-[13px] text-gray-500">
            {billing}
            {renewal ? <span className="ml-2">• Renews {renewal}</span> : null}
          </div>
        </div>
      </div>
      <div className={`font-mono text-[16px] font-bold ${isGain === undefined ? 'text-galaxy' : isGain ? 'text-gain' : 'text-loss'}`}>
        {amount}
      </div>
      <button onClick={onMenu} className="ml-3 p-2 rounded-md hover:bg-gray-100">
        <svg className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </button>
    </div>
  );
};

export default SubscriptionRow;


