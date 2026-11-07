with open('core/views.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "ReferenceTable='Purchase'" in l or 'ReferenceTable="Purchase"' in l:
        print(f"Line {i+1}: {l.strip()}")
        # print 30 lines after
        for j in range(max(0, i-10), min(len(lines), i+60)):
            print(f"{j+1:4d}: {lines[j]}", end="")
        print("\n" + "="*80 + "\n")

