import os

files = [
    r'C:\Users\hanan\OneDrive\Documents\FitWithAnge\index.html',
    r'C:\Users\hanan\OneDrive\Documents\FitWithAnge\about.html',
    r'C:\Users\hanan\OneDrive\Documents\FitWithAnge\services.html',
    r'C:\Users\hanan\OneDrive\Documents\FitWithAnge\gallery.html',
    r'C:\Users\hanan\OneDrive\Documents\FitWithAnge\contact.html',
    r'C:\Users\hanan\OneDrive\Documents\FitWithAnge\enquire.html',
]

# These are the mojibake sequences: UTF-8 bytes read as Latin-1
# We re-encode each file as latin-1 bytes then decode as utf-8
for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Try to fix by re-encoding as latin-1 and reading as utf-8
    try:
        fixed = content.encode('latin-1').decode('utf-8')
    except (UnicodeDecodeError, UnicodeEncodeError):
        # If that fails, do targeted string replacements
        fixed = content
        replacements = [
            ('â', '—'),  # em dash
            ('â', '–'),  # en dash
            ('â', '’'),  # right single quote
            ('â', '“'),  # left double quote
            ('â', '”'),  # right double quote
            ('â', '‘'),  # left single quote
            ('Â·', '·'),        # middle dot
        ]
        for bad, good in replacements:
            fixed = fixed.replace(bad, good)

    if fixed != content:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(fixed)
        print("Fixed: " + os.path.basename(fpath))
    else:
        print("No changes needed: " + os.path.basename(fpath))

print("Done.")
