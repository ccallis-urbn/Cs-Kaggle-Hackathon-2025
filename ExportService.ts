
import { AnalysisResult } from './types';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  ImageRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType,
  AlignmentType
} from 'docx';
import { createDoc, handleAuthClick } from './services/googleDocsService';

export type ExportFormat = 'markdown' | 'html' | 'pdf' | 'docx' | 'google-docs' | 'json' | 'csv';

export interface ExportOptions {
  format: ExportFormat;
  data: AnalysisResult;
  batchData?: AnalysisResult[];
  markdown: string;
  individualReports?: string[];
}

export class ExportService {
  /**
   * Captures a DOM element as a base64 PNG string.
   */
  static async captureElement(elementId: string): Promise<string | null> {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Export: Element ${elementId} not found in DOM`);
      return null;
    }
    
    try {
      // Ensure we wait for any potential rendering
      const svg = element.querySelector('svg');
      if (!svg) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return await toPng(element, { 
        backgroundColor: '#09090b',
        style: {
          visibility: 'visible',
          opacity: '1'
        }
      });
    } catch (error) {
      console.error(`Failed to capture element ${elementId}:`, error);
      return null;
    }
  }

  /**
   * Generates a plain text/markdown version of the report.
   */
  static generateMarkdown(options: ExportOptions, chartImages: Record<string, string> = {}): string {
    const { data, batchData, markdown, individualReports } = options;
    let content = `# CrUX Intelligence Report\n\n`;
    
    const sites = batchData && batchData.length > 0 ? batchData : [data];
    
    if (batchData && batchData.length > 1) {
      content += `## Batch Summary\n\n${markdown}\n\n`;
    }

    sites.forEach((site, i) => {
      const report = individualReports ? individualReports[i] : markdown;
      content += `## Analysis for ${site.domain}\n\n`;
      content += report + '\n\n';
      
      // Add chart images as base64
      content += `### Performance Trends\n\n`;
      const domainKey = site.domain.replace(/[^a-z0-9]/gi, '-');
      for (const ff of ['phone', 'desktop']) {
        content += `#### ${ff.toUpperCase()} Metrics\n\n`;
        for (const metric of ['lcp', 'cls', 'inp']) {
          const id = `chart-${domainKey}-${ff}-${metric}`;
          const img = chartImages[id];
          if (img) {
            content += `![${ff} ${metric}](${img})\n`;
          }
        }
        content += '\n';
      }
    });
    
    return content;
  }

  /**
   * Generates an HTML version of the report.
   */
  static generateHTML(options: ExportOptions, chartImages: Record<string, string> = {}): string {
    const markdown = this.generateMarkdown(options, chartImages);
    // Simple conversion for now, could use a markdown parser if needed
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>CrUX Intelligence Report</title>
          <style>
            body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 1000px; margin: 0 auto; padding: 2rem; background: #f9fafb; }
            .container { background: white; padding: 3rem; border-radius: 1rem; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
            h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 0.5rem; }
            h2 { color: #1f2937; margin-top: 2rem; border-bottom: 1px solid #e5e7eb; }
            h3 { color: #374151; margin-top: 1.5rem; }
            pre { background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; white-space: pre-wrap; }
            table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
            th, td { border: 1px solid #e5e7eb; padding: 0.75rem; text-align: left; }
            th { background: #f9fafb; }
            img { max-width: 100%; height: auto; margin: 1rem 0; border-radius: 0.5rem; border: 1px solid #e5e7eb; }
            .chart-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
          </style>
        </head>
        <body>
          <div class="container">
            ${markdown.split('\n').map(line => {
              if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
              if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
              if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
              if (line.startsWith('#### ')) return `<h4>${line.slice(5)}</h4>`;
              if (line.startsWith('![')) {
                const match = line.match(/!\[(.*?)\]\((.*?)\)/);
                if (match) return `<img src="${match[2]}" alt="${match[1]}" />`;
              }
              return `<p>${line}</p>`;
            }).join('\n')}
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generates a PDF version of the report with images.
   */
  static async generatePDF(options: ExportOptions, chartImages: Record<string, string>): Promise<Blob> {
    const doc = new jsPDF();
    const { data, batchData, markdown, individualReports } = options;
    
    let y = 20;
    const addText = (text: string, size = 12, isBold = false) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, 170);
      lines.forEach((line: string) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += size * 0.5;
      });
      y += 5;
    };

    addText('CrUX Intelligence Report', 22, true);
    
    const sites = batchData && batchData.length > 0 ? batchData : [data];
    
    if (batchData && batchData.length > 1) {
        addText('Batch Summary', 16, true);
        addText(markdown);
    }

    for (let i = 0; i < sites.length; i++) {
        const site = sites[i];
        const report = individualReports ? individualReports[i] : markdown;
        
        if (i > 0 || (batchData && batchData.length > 1)) doc.addPage();
        y = 20;
        
        addText(`Analysis for ${site.domain}`, 18, true);
        addText(report);

        // Add Charts
        addText('Performance Trends', 14, true);
        const domainKey = site.domain.replace(/[^a-z0-9]/gi, '-');
        
        for (const ff of ['phone', 'desktop']) {
            addText(`${ff.toUpperCase()} Metrics`, 12, true);
            let x = 20;
            for (const metric of ['lcp', 'cls', 'inp']) {
                const id = `chart-${domainKey}-${ff}-${metric}`;
                const img = chartImages[id];
                if (img) {
                    doc.addImage(img, 'PNG', x, y, 50, 40);
                    x += 55;
                }
            }
            y += 45;
        }
    }
    
    return doc.output('blob');
  }

  /**
   * Generates a DOCX version of the report with images.
   */
  static async generateDOCX(options: ExportOptions, chartImages: Record<string, string>): Promise<Blob> {
    const { data, batchData, markdown, individualReports } = options;
    const sites = batchData && batchData.length > 0 ? batchData : [data];
    
    const children: any[] = [];

    children.push(new Paragraph({
      text: "CrUX Intelligence Report",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }));

    if (batchData && batchData.length > 1) {
      children.push(new Paragraph({ text: "Batch Summary", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }));
      children.push(new Paragraph({ text: markdown }));
    }

    for (let i = 0; i < sites.length; i++) {
        const site = sites[i];
        const report = individualReports ? individualReports[i] : markdown;
        const domainKey = site.domain.replace(/[^a-z0-9]/gi, '-');

        children.push(new Paragraph({ 
            text: `Analysis for ${site.domain}`, 
            heading: HeadingLevel.HEADING_1, 
            pageBreakBefore: i > 0 || (batchData && batchData.length > 1),
            spacing: { before: 400, after: 200 }
        }));
        
        children.push(new Paragraph({ text: report }));

        children.push(new Paragraph({ text: "Performance Trends", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));

        for (const ff of ['phone', 'desktop']) {
            children.push(new Paragraph({ text: `${ff.toUpperCase()} Metrics`, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }));
            
            const images = [];
            for (const metric of ['lcp', 'cls', 'inp']) {
                const id = `chart-${domainKey}-${ff}-${metric}`;
                const img = chartImages[id];
                if (img) {
                    images.push(new ImageRun({
                        data: img.split(',')[1],
                        transformation: { width: 180, height: 135 },
                        type: "png",
                    }));
                    images.push(new TextRun("   ")); // Spacer
                }
            }
            children.push(new Paragraph({ children: images }));
        }
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: children,
      }],
    });

    return await Packer.toBlob(doc);
  }

  /**
   * Exports to Google Docs.
   */
  static async exportToGoogleDocs(options: ExportOptions): Promise<string> {
    try {
        await handleAuthClick();
        const markdown = this.generateMarkdown(options);
        const title = `CrUX Report - ${new Date().toLocaleDateString()}`;
        return await createDoc(title, markdown);
    } catch (error) {
        console.error('Google Docs Auth failed:', error);
        throw new Error('Authentication failed. Please allow popups and try again.');
    }
  }

  /**
   * Generates a CSV version of the metrics.
   */
  static generateCSV(options: ExportOptions): string {
    const { data, batchData, markdown, individualReports } = options;
    const sites = batchData && batchData.length > 0 ? batchData : [data];
    
    let csv = 'Domain,Form Factor,Metric,Value,Rating,Collection Period,Analysis Summary\n';
    
    sites.forEach((site, i) => {
      const summary = individualReports ? individualReports[i].replace(/"/g, '""') : markdown.replace(/"/g, '""');
      
      ['phone', 'desktop'].forEach(ff => {
        const factor = ff === 'phone' ? site.phone : site.desktop;
        const ffLabel = ff === 'phone' ? 'Mobile' : 'Desktop';
        
        csv += `${site.domain},${ffLabel},LCP,${factor.metrics.lcp.value},${factor.metrics.lcp.rating},"${factor.collectionPeriod}","${summary}"\n`;
        csv += `${site.domain},${ffLabel},CLS,${factor.metrics.cls.value},${factor.metrics.cls.rating},"${factor.collectionPeriod}","${summary}"\n`;
        csv += `${site.domain},${ffLabel},INP,${factor.metrics.inp.value},${factor.metrics.inp.rating},"${factor.collectionPeriod}","${summary}"\n`;
      });
    });
    
    return csv;
  }

  /**
   * Main export function.
   */
  static async export(options: ExportOptions): Promise<void | string> {
    const { format, data, batchData, markdown, individualReports } = options;
    const filename = `CrUX_Report_${data.domain.replace(/[^a-z0-9]/gi, '_')}_${new Date().getTime()}`;

    // Capture charts if needed
    const chartImages: Record<string, string> = {};
    if (['pdf', 'docx', 'google-docs'].includes(format)) {
      // Small delay to ensure hidden charts are rendered
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const sitesToCapture = batchData && batchData.length > 0 ? batchData : [data];
      console.log(`Export: Capturing charts for ${sitesToCapture.length} sites...`);
      
      for (const site of sitesToCapture) {
        const domainKey = site.domain.replace(/[^a-z0-9]/gi, '-');
        for (const ff of ['phone', 'desktop']) {
          for (const metric of ['lcp', 'cls', 'inp']) {
            const id = `chart-${domainKey}-${ff}-${metric}`;
            const img = await this.captureElement(id);
            if (img) {
              chartImages[id] = img;
            } else {
              console.warn(`Export: Failed to capture chart ${id}`);
            }
          }
        }
      }
    }

    switch (format) {
      case 'markdown':
        const md = this.generateMarkdown(options, chartImages);
        saveAs(new Blob([md], { type: 'text/markdown' }), `${filename}.md`);
        break;
      case 'html':
        const html = this.generateHTML(options, chartImages);
        saveAs(new Blob([html], { type: 'text/html' }), `${filename}.html`);
        break;
      case 'pdf':
        const pdfBlob = await this.generatePDF(options, chartImages);
        saveAs(pdfBlob, `${filename}.pdf`);
        break;
      case 'docx':
        const docxBlob = await this.generateDOCX(options, chartImages);
        saveAs(docxBlob, `${filename}.docx`);
        break;
      case 'google-docs':
        return await this.exportToGoogleDocs(options);
      case 'json':
        const jsonContent = JSON.stringify({
          exportedAt: new Date().toISOString(),
          summary: markdown,
          sites: batchData && batchData.length > 0 ? batchData : [data],
          individualAnalysis: individualReports || []
        }, null, 2);
        saveAs(new Blob([jsonContent], { type: 'application/json' }), `${filename}.json`);
        break;
      case 'csv':
        const csvContent = this.generateCSV(options);
        saveAs(new Blob([csvContent], { type: 'text/csv' }), `${filename}.csv`);
        break;
    }
  }
}
