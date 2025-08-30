#!/usr/bin/env python3
"""
Test script per OOXML Parser
=============================

Testa el parser OOXML amb un document simple per verificar funcionament.
"""

import os
import sys
import json
from pathlib import Path

# Afegir el directori actual al path per imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from ingest_docx import OOXMLStyleParser
except ImportError as e:
    print(f"❌ Error importing OOXML parser: {e}")
    print("Make sure you have installed dependencies: pip install -r requirements.txt")
    sys.exit(1)

def test_ooxml_parser():
    """Test basic functionality of OOXML parser"""
    
    print("Testing OOXML Parser...")
    print("=" * 50)
    
    # Per aquest test, necessitaríem un document DOCX sample
    # Podem crear un test mock o usar un document existent
    
    sample_docx = "sample_document.docx"
    
    if not os.path.exists(sample_docx):
        print("WARNING: No sample DOCX found. Creating instructions for manual test...")
        print()
        print("Manual test instructions:")
        print("1. Place a DOCX file in this directory named 'sample_document.docx'")
        print("2. Run this test again")
        print("3. Or run directly: python ingest_docx.py your_document.docx --output-dir ./output")
        print()
        
        # Test parser initialization without file
        try:
            parser = OOXMLStyleParser("nonexistent.docx")
            print("SUCCESS: Parser class initialized successfully")
            
            # Test vocabulary
            vocab = parser.html_vocabulary
            print(f"SUCCESS: HTML vocabulary loaded: {len(vocab)} elements")
            
            for html_elem, word_styles in vocab.items():
                print(f"   {html_elem}: {word_styles}")
            
        except Exception as e:
            print(f"ERROR: Error testing parser class: {e}")
        
        return False
    
    # Test amb document real
    try:
        print(f"📄 Testing with: {sample_docx}")
        
        # Crear parser
        parser = OOXMLStyleParser(sample_docx)
        
        # Processar pipeline complet
        result = parser.process_full_pipeline("./test_output")
        
        if result['success']:
            print("\n🎉 OOXML Parser Test PASSED!")
            print(f"⏱️ Processing time: {result['processing_time_seconds']:.2f}s")
            
            manifest = result['style_manifest']
            print(f"📊 Results:")
            print(f"   - Styles found: {manifest['statistics']['total_styles_found']}")
            print(f"   - HTML mappings: {manifest['statistics']['mapped_styles']}")
            print(f"   - Fallbacks: {manifest['statistics']['fallback_styles']}")
            print(f"   - Warnings: {len(manifest['warnings'])}")
            
            print(f"\n📁 Output files:")
            for output_type, path in result['outputs'].items():
                print(f"   - {output_type}: {path}")
            
            return True
        else:
            print(f"\n💥 OOXML Parser Test FAILED!")
            print(f"❌ Error: {result['error']}")
            return False
            
    except Exception as e:
        print(f"\n💥 OOXML Parser Test FAILED!")
        print(f"❌ Exception: {e}")
        return False

def create_sample_usage():
    """Crea exemples d'ús per l'usuari"""
    
    usage_examples = """
# Textami OOXML Parser - Usage Examples
# =====================================

# Basic usage - process DOCX and save outputs
python ingest_docx.py document.docx --output-dir ./outputs

# Process with verbose output
python ingest_docx.py document.docx --output-dir ./outputs --verbose

# Integration with Node.js/Next.js
# ---------------------------------
import subprocess
import json

def process_docx_with_ooxml(docx_path, output_dir):
    cmd = ['python', 'scripts/ingest_docx.py', docx_path, '--output-dir', output_dir]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        # Read generated styleManifest.json
        manifest_path = f"{output_dir}/styleManifest.json"
        with open(manifest_path, 'r') as f:
            style_manifest = json.load(f)
        return style_manifest
    else:
        raise Exception(f"OOXML processing failed: {result.stderr}")

# Expected outputs:
# - {filename}_styleManifest.json: HTML style mappings
# - {filename}_preview.html: HTML preview of document  
# - {filename}_report.json: Processing report and statistics
"""
    
    with open('OOXML_USAGE.md', 'w') as f:
        f.write(usage_examples)
    
    print("📝 Created OOXML_USAGE.md with integration examples")

if __name__ == '__main__':
    success = test_ooxml_parser()
    create_sample_usage()
    
    if success:
        print("\n🚀 Ready for integration with Textami!")
    else:
        print("\n🔧 Fix issues above before integration")