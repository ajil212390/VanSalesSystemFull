import os, re
for root, dirs, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as fp:
                content = fp.read()
                for line_idx, line in enumerate(content.splitlines()):
                    if 'Dashboard' in line and ('Button' in line or 'Link' in line or 'navigate' in line or 'onClick' in line or 'icon' in line.lower() or 'arrow' in line.lower() or 'leftsection' in line.lower()):
                        print(f'{path}:{line_idx+1}: {line.strip()}')
