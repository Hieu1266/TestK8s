import { TabKey } from './types';

type LessonTabsNavProps = {
  tabs: [TabKey, string][];
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
};

/** Thanh chuyển tab: Bài giảng / Tài liệu / Ghi chú / Bài thi */
export default function LessonTabsNav({ tabs, activeTab, onChange }: LessonTabsNavProps) {
  return (
    <div className="flex gap-2 relative">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`relative px-5 py-3 text-sm font-bold transition-colors duration-200 cursor-pointer ${activeTab === key ? 'text-[#161826]' : 'text-[#8A8FA3] hover:text-[#565A70]'}`}
        >
          {label}
          <span
            className="absolute left-4 right-4 -bottom-px h-[3px] rounded-full transition-all duration-300"
            style={{
              backgroundColor: activeTab === key ? '#5B5FEF' : 'transparent',
              transform: activeTab === key ? 'scaleX(1)' : 'scaleX(0)',
            }}
          />
        </button>
      ))}
      <span className="absolute left-0 right-0 bottom-0 h-px bg-[#ECEAF0]" />
    </div>
  );
}
