# 📄 How to Generate Your Thesis PDF

## ⚡ Quick Methods (Pick One)

### Method 1: Docker (Recommended) 🐳

**Run the compilation script:**
```bash
cd /home/izcy-tuf/Desktop/UGM/Skripsi/docs/latex-templates/my-thesis
./compile_pdf.sh
```

**Or manually:**
```bash
docker pull texlive/texlive:latest
docker run --rm -v "$(pwd)":/workspace -w /workspace texlive/texlive:latest \
  pdflatex -interaction=nonstopmode main.tex
```

---

### Method 2: Overleaf (Easiest) 🌐

1. Go to **https://www.overleaf.com**
2. Click **"New Project"** → **"Blank Project"**
3. Name it: "Lakomi Thesis"
4. Upload these files/folders:
   - `main.tex`
   - `thesisdtetiugm.cls` (from parent directory)
   - `contents/` folder (entire folder)
5. Click **"Recompile"** button (top right)
6. Download PDF

**✅ Pros:**
- No installation needed
- Real-time preview
- Easy collaboration
- Works on any device

---

### Method 3: Install LaTeX Locally 💻

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y texlive-full texlive-lang-indonesian
```

**Then compile:**
```bash
cd /home/izcy-tuf/Desktop/UGM/Skripsi/docs/latex-templates/my-thesis
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

**✅ Output:** `main.pdf`

---

## 📋 What You Need to Compile

### Required Files:
```
my-thesis/
├── main.tex                    ← Main file
├── thesisdtetiugm.cls          ← DTETI template (in parent dir)
└── contents/                   ← All chapters
    ├── chapter-1/
    ├── chapter-2/
    ├── chapter-3/
    ├── chapter-4/
    ├── chapter-5/
    ├── abstract/
    ├── dedication/
    ├── preface/
    └── nomenclature/
```

---

## 🎯 Current Status

### ✅ What's Ready:
- **Chapter 1**: Complete (Pendahuluan)
- **Template**: DTETI UGM format
- **Metadata**: Your name, ID, title configured

### ⏳ What's Missing:
- **Chapters 2-5**: Need to be added
- **References**: Bibliography file
- **Appendices**: If needed

---

## 🔧 Troubleshooting

### "Docker image not found"
```bash
docker pull texlive/texlive:latest
# Wait for download (may take 5-10 minutes)
```

### "pdflatex not found"
Install TeX Live or use Docker/Overleaf

### "File not found: thesisdtetiugm.cls"
Copy the .cls file from parent directory:
```bash
cp ../thesisdtetiugm.cls .
```

### Compilation errors
Check for:
- Missing braces {}
- Undefined references
- Missing images

---

## 📊 Expected Output

**File:** `main.pdf`
**Size:** ~500KB - 2MB
**Pages:** Varies (currently ~10 pages with Chapter 1 only)

---

## 🚀 Quick Start (Fastest Method)

**For immediate PDF, use Overleaf:**
1. Open https://www.overleaf.com
2. Create new project
3. Upload files
4. Click Recompile
5. Download PDF

**⏱️ Time: 2-3 minutes**

---

## 💡 Recommendations

1. **For quick preview**: Use the HTML preview (`preview.html`)
2. **For sharing with supervisors**: Use Overleaf
3. **For final submission**: Use local LaTeX or Docker
4. **For collaboration**: Use Overleaf

---

## 📞 Need Help?

If you encounter issues:
1. Check LaTeX error messages
2. Verify all files are uploaded
3. Try a different method (Docker → Overleaf → Local)
4. Check that `thesisdtetiugm.cls` is included

---

**Your thesis is ready to compile! Pick a method and generate your PDF.** 🎓📄
