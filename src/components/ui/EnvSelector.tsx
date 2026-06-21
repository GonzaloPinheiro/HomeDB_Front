import { useState } from 'react';
import { ENVIRONMENTS, EnvKey, getActiveEnv, setActiveEnv, isProductionDomain } from '../../lib/envConfig';
import { colors } from '../../lib/theme';

export default function EnvSelector() {
  const locked = isProductionDomain();
  const [active, setActive] = useState<EnvKey>(getActiveEnv);

  function handleSelect(key: EnvKey) {
    if (locked) return;
    setActive(key);
    setActiveEnv(key);
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: '3px 4px',
        opacity: locked ? 0.8 : 1,
      }}
    >
      {(Object.keys(ENVIRONMENTS) as EnvKey[]).map((key) => (
        <button
          key={key}
          onClick={() => handleSelect(key)}
          disabled={locked}
          style={{
            padding: '3px 10px',
            borderRadius: 6,
            border: 'none',
            cursor: locked ? 'default' : 'pointer',
            fontSize: 12,
            fontWeight: active === key ? 600 : 400,
            color: active === key ? '#ffffff' : colors.textSecondary,
            backgroundColor: active === key ? colors.accent : 'transparent',
            transition: 'background-color 0.15s, color 0.15s',
          }}
        >
          {ENVIRONMENTS[key].label}
        </button>
      ))}
    </div>
  );
}
