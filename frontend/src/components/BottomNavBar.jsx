import { motion } from 'framer-motion';

export default function BottomNavBar({ items, activeId, onChange }) {
  return (
    <div className="tubelight-wrap">
      <div className="tubelight-track">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`tubelight-item ${isActive ? 'active' : ''}`}
              aria-label={item.label}
            >
              <span className="tubelight-label">{item.label}</span>
              <span className="tubelight-icon">
                <Icon size={18} strokeWidth={2.5} />
              </span>
              {isActive && (
                <motion.div
                  layoutId="tubelight-lamp"
                  className="tubelight-lamp-bg"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <div className="tubelight-lamp-bar">
                    <div className="tubelight-glow tubelight-glow-1" />
                    <div className="tubelight-glow tubelight-glow-2" />
                    <div className="tubelight-glow tubelight-glow-3" />
                  </div>
                </motion.div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}