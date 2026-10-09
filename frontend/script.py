import re
css_path = r'c:\Users\GUEST 1\Desktop\RepoxRay\repoXray\frontend\src\app\globals.css'
with open(css_path, 'r') as f:
    content = f.read()

# .glass-btn
content = content.replace(
    'background: var(--gradient-primary);',
    'background: var(--btn-primary-bg);'
)
content = re.sub(
    r'\.glass-btn\s*\{[^}]*\}',
    lambda m: m.group(0).replace('color: #fff;', 'color: var(--btn-primary-text);').replace('box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);', 'box-shadow: var(--btn-primary-shadow);'),
    content
)
# Secondary button
content = re.sub(
    r'\.glass-btn-secondary\s*\{[^}]*\}',
    lambda m: m.group(0).replace('background: rgba(255, 255, 255, 0.05) !important;', 'background: var(--btn-secondary-bg) !important;').replace('border: 1px solid var(--border-glass) !important;', 'border: 1px solid var(--btn-secondary-border) !important;').replace('color: var(--text-primary) !important;', 'color: var(--btn-secondary-text) !important;'),
    content
)
content = re.sub(
    r'\.glass-btn-secondary:hover\s*\{[^}]*\}',
    lambda m: m.group(0).replace('background: rgba(255, 255, 255, 0.1) !important;', 'background: var(--btn-secondary-hover-bg) !important;'),
    content
)

# Body gradients
content = re.sub(
    r'body::after\s*\{[^}]*background-image:[^}]*\}',
    'body::after {\n  content: "";\n  position: fixed;\n  inset: 0;\n  z-index: -2;\n  pointer-events: none;\n  background-image: var(--page-bg-gradient);\n}',
    content
)
content = re.sub(
    r'\.dark body::after\s*\{[^}]*background-image:[^}]*\}',
    '.dark body::after {\n  background-image: var(--page-bg-gradient);\n}',
    content
)

# Demo badge overrides
content = re.sub(
    r'\.demo-badge-accent\s*\{[^}]*\}',
    '.demo-badge-accent {\n  background: var(--badge-bg) !important;\n  border: 1px solid var(--badge-border) !important;\n  color: var(--badge-text) !important;\n}',
    content
)

with open(css_path, 'w') as f:
    f.write(content)
print('globals.css buttons and backgrounds updated.')
