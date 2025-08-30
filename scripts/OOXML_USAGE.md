
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
