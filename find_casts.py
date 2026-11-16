import os, re

pattern = re.compile(r"\[\s*['\"](\w+)['\"]\s*\]")
for root, dirs, files in os.walk('driver_app/lib'):
    for f in files:
        if f.endswith('.dart'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as fp:
                for idx, line in enumerate(fp):
                    matches = pattern.findall(line)
                    for m in matches:
                        if any(k in m.lower() for k in ['price', 'rate', 'amount', 'gst', 'tax', 'discount', 'qty', 'quantity', 'stock', 'balance', 'total', 'charge']):
                            if not any(fn in line for fn in ['safeDouble', 'safeInt', 'toString', '?? 0', 'safeIntNullable', 'safeNum']):
                                print(f"{path}:{idx+1} [{m}]: {line.strip()}")
