export default function EthicalBanner() {
  return (
    <div className="bg-red-900/80 text-white text-xs font-semibold py-2 px-4 text-center border-b border-red-500 shadow-[0_0_10px_rgba(255,0,0,0.5)]">
      WARNING: This system generates approximate synthetic facial representations using AI-based trait mapping. It does NOT identify real individuals and is strictly for educational/simulation purposes. Dataset contains demographic biases.
    </div>
  );
}
