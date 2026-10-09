import re
css_path = r'c:\Users\GUEST 1\Desktop\RepoxRay\repoXray\frontend\src\app\page.module.css'
with open(css_path, 'r') as f:
    content = f.read()

replacements = {
    '--border-glass-hover: #60A5FA;': '--border-glass-hover: #35369C;',
    '--border-active: #60A5FA;': '--border-active: #35369C;',
    '--accent-indigo: #60A5FA;': '--accent-indigo: #35369C;',
    '--accent-violet: #38BDF8;': '--accent-violet: #7C67AE;',
    '--accent-fuchsia: #7dd3fc;': '--accent-fuchsia: #3F2548;',
    '--shadow-neon: 0 4px 14px rgba(96,165,250,0.08);': '--shadow-neon: 0 4px 14px rgba(53,54,156,0.15);',
    '--shadow-neon-strong: 0 6px 20px rgba(96,165,250,0.15);': '--shadow-neon-strong: 0 6px 20px rgba(53,54,156,0.3);',
    '--border-glass-hover: #1E3A8A;': '--border-glass-hover: rgba(124, 103, 174, 0.5);',
    '--border-active: #1E3A8A;': '--border-active: #7C67AE;',
    '--accent-indigo: #1E3A8A;': '--accent-indigo: #6B6FD6;',
    '--accent-violet: #EC4899;': '--accent-violet: #7C67AE;',
    '--accent-fuchsia: #d946ef;': '--accent-fuchsia: #C8C793;',
    '--shadow-neon: 0 4px 18px rgba(30,58,138,0.18);': '--shadow-neon: 0 4px 18px rgba(107, 111, 214, 0.15);',
    '--shadow-neon-strong: 0 6px 26px rgba(236,72,153,0.20);': '--shadow-neon-strong: 0 6px 26px rgba(107, 111, 214, 0.35);',
    'linear-gradient(90deg, #60A5FA, #38BDF8)': 'var(--btn-primary-bg)',
    'linear-gradient(135deg, #60A5FA 0%, #38BDF8 100%)': 'var(--btn-primary-bg)',
    'linear-gradient(90deg, #1E3A8A, #EC4899)': 'linear-gradient(90deg, #6B6FD6, #C8C793)',
    'linear-gradient(135deg, #1E3A8A 0%, #EC4899 100%)': 'var(--btn-primary-bg)',
}

for k, v in replacements.items():
    content = content.replace(k, v)

with open(css_path, 'w') as f:
    f.write(content)
print('page.module.css updated.')
