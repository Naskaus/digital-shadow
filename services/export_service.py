import pandas as pd
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet
import matplotlib.pyplot as plt
import os

def generate_excel_export(data, view_name="Export"):
    """
    Generate an Excel file from data using pandas.
    data can be a list of dicts or multiple lists for sheets.
    """
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        if isinstance(data, dict):
            for sheet_name, df_data in data.items():
                df = pd.DataFrame(df_data)
                df.to_excel(writer, sheet_name=sheet_name, index=False)
        else:
            df = pd.DataFrame(data)
            df.to_excel(writer, sheet_name="Data", index=False)
    
    output.seek(0)
    return output

def generate_pdf_export(summary_data, chart_data, title="Financial Report"):
    """
    Generate a PDF report with ReportLab and embedded charts.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(Paragraph(title, styles['Title']))
    elements.append(Spacer(1, 12))

    # Summary Table
    t_data = [["Metric", "Value"]]
    for k, v in summary_data.items():
        t_data.append([k.replace('_', ' ').title(), f"{v:,.2f}"])
    
    table = Table(t_data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(table)
    elements.append(Spacer(1, 24))

    # Charts
    if chart_data:
        chart_img_path = _create_temp_chart(chart_data)
        img = Image(chart_img_path, width=400, height=200)
        elements.append(img)
        # Cleanup temp file would happen after doc.build in a real app or use BytesIO
        
    doc.build(elements)
    buffer.seek(0)
    return buffer

def _create_temp_chart(data):
    """Internal helper to create PNG chart for PDF."""
    plt.figure(figsize=(8, 4))
    plt.plot(data['labels'], data['values'], marker='o')
    plt.title(data.get('title', 'Trend'))
    plt.xticks(rotation=45)
    plt.tight_layout()
    
    img_buffer = BytesIO()
    plt.savefig(img_buffer, format='png')
    img_buffer.seek(0)
    plt.close()
    
    # In this environment, we might need to save to a temp file for ReportLab Image
    temp_path = "temp_chart.png"
    with open(temp_path, "wb") as f:
        f.write(img_buffer.getbuffer())
    return temp_path
