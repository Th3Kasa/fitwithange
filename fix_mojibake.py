import os

files = [
    r'C:\Users\hanan\OneDrive\Documents\FitWithAnge\index.html',
    r'C:\Users\hanan\OneDrive\Documents\FitWithAnge\about.html',
    r'C:\Users\hanan\OneDrive\Documents\FitWithAnge\services.html',
    r'C:\Users\hanan\OneDrive\Documents\FitWithAnge\gallery.html',
    r'C:\Users\hanan\OneDrive\Documents\FitWithAnge\contact.html',
    r'C:\Users\hanan\OneDrive\Documents\FitWithAnge\enquire.html',
]

# The files contain literal mojibake strings (UTF-8 bytes misread as latin-1)
# â€" = U+2014 em dash (UTF-8: E2 80 94, misread as â=C3A2, =E2 80, "=9C -> but stored as 3 chars)
# The trick: encode the mojibake as latin-1, then decode as utf-8
replacements_literal = [
    ('â\x80\x93', '–'),   # en dash
    ('â\x80\x94', '—'),   # em dash
    ('â\x80\x99', '’'),   # right single quote
    ('â\x80\x9c', '“'),   # left double quote
    ('â\x80\x9d', '”'),   # right double quote
    ('â\x80\x98', '‘'),   # left single quote
    ('\xc2\xb7', '·'),    # middle dot
]

for fpath in files:
    # Read as binary to see actual bytes
    with open(fpath, 'rb') as f:
        raw = f.read()

    original_raw = raw
    for bad_str, good_char in replacements_literal:
        bad_bytes = bad_str.encode('latin-1')
        good_bytes = good_char.encode('utf-8')
        raw = raw.replace(bad_bytes, good_bytes)

    if raw != original_raw:
        with open(fpath, 'wb') as f:
            f.write(raw)
        print("Fixed: " + os.path.basename(fpath))
    else:
        print("No changes: " + os.path.basename(fpath))

print("Done.")
