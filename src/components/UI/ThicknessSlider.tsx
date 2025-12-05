'use client';

interface ThicknessSliderProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    color?: string;
}

const ThicknessSlider = ({
    value,
    onChange,
    min = 1,
    max = 50,
    color = '#ffffff',
}: ThicknessSliderProps) => {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-xs text-white/40 uppercase tracking-wider">
                    Thickness
                </label>
                <span className="text-xs text-white/60 font-mono">{value}px</span>
            </div>

            {/* Visual Preview */}
            <div className="flex items-center justify-center h-12 bg-white/5 rounded-xl">
                <div
                    className="rounded-full transition-all duration-150"
                    style={{
                        width: `${Math.min(value * 1.5, 40)}px`,
                        height: `${Math.min(value * 1.5, 40)}px`,
                        backgroundColor: color,
                    }}
                />
            </div>

            {/* Slider */}
            <div className="relative">
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value))}
                    className="w-full h-2 appearance-none bg-white/10 rounded-full cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-125
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-moz-range-thumb]:appearance-none
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:border-0
          "
                    style={{
                        background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) 100%)`,
                    }}
                />
            </div>
        </div>
    );
};

export default ThicknessSlider;
