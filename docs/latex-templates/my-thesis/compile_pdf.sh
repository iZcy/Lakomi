#!/bin/bash

###############################################################################
# LaTeX PDF Compilation Script for Lakomi Thesis
###############################################################################

echo "🎓 Lakomi Thesis PDF Compiler"
echo "================================"
echo ""

# Options for compilation
echo "Choose compilation method:"
echo "1) Docker (recommended - requires Docker)"
echo "2) Local pdflatex (requires TeX Live)"
echo "3) Overleaf instructions (manual)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo "🐳 Using Docker to compile PDF..."
        echo "Pulling TeX Live Docker image (this may take a few minutes)..."

        # Try to pull and run texlive image
        if docker pull texlive/texlive:latest 2>/dev/null; then
            echo "✅ Docker image pulled successfully"
            echo "📄 Compiling your thesis..."

            docker run --rm -v "$(pwd)":/workspace -w /workspace texlive/texlive:latest \
                pdflatex -interaction=nonstopmode main.tex

            if [ $? -eq 0 ]; then
                echo ""
                echo "✅ SUCCESS! PDF generated: main.pdf"
                echo "📁 Location: $(pwd)/main.pdf"

                # Try to open the PDF
                if command -v xdg-open &> /dev/null; then
                    xdg-open main.pdf
                elif command -v open &> /dev/null; then
                    open main.pdf
                else
                    echo "📖 Open main.pdf to view your thesis"
                fi
            else
                echo "❌ Compilation failed. Check for LaTeX errors."
            fi
        else
            echo "❌ Failed to pull Docker image"
            echo "Try option 2 or 3 instead"
        fi
        ;;

    2)
        echo "📦 Using local pdflatex..."

        if command -v pdflatex &> /dev/null; then
            echo "✅ pdflatex found"
            echo "📄 Compiling your thesis..."

            # Compile twice for references
            pdflatex -interaction=nonstopmode main.tex
            bibtex main 2>/dev/null
            pdflatex -interaction=nonstopmode main.tex

            if [ -f main.pdf ]; then
                echo ""
                echo "✅ SUCCESS! PDF generated: main.pdf"
                echo "📁 Location: $(pwd)/main.pdf"

                # Try to open the PDF
                if command -v xdg-open &> /dev/null; then
                    xdg-open main.pdf
                elif command -v open &> /dev/null; then
                    open main.pdf
                else
                    echo "📖 Open main.pdf to view your thesis"
                fi
            else
                echo "❌ Compilation failed. Check for LaTeX errors."
            fi
        else
            echo "❌ pdflatex not found"
            echo "Install TeX Live:"
            echo "  sudo apt-get install texlive-full"
            echo "Or use option 1 (Docker) or 3 (Overleaf)"
        fi
        ;;

    3)
        echo "🌐 Overleaf Instructions:"
        echo ""
        echo "1. Go to https://www.overleaf.com"
        echo "2. Create a new project (Blank Project)"
        echo "3. Upload all files from this directory:"
        echo "   - main.tex"
        echo "   - thesisdtetiugm.cls (if in parent dir)"
        echo "   - contents/ (entire folder)"
        echo "4. Click 'Recompile' button"
        echo "5. Download PDF"
        echo ""
        echo "📝 Tip: Overleaf is the easiest method if you don't have LaTeX installed!"
        ;;

    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎓 Good luck with your thesis!"
