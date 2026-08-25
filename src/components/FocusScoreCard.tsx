import React from "react";

interface Props {
  score: number;
}

const FocusScoreCard: React.FC<Props> = ({ score }) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <h3 className="text-sm font-bold uppercase text-slate-500">
        Focus Score
      </h3>

      <div className="text-5xl font-black text-amber-500 mt-3">
        {score}
        <span className="text-xl text-slate-400">/100</span>
      </div>

      <p className="text-xs text-slate-500 mt-2">
        Current focus performance
      </p>
    </div>
  );
};

export default FocusScoreCard;