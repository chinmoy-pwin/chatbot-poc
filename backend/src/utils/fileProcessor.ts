import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { parse } from 'csv-parse/sync';

export class FileProcessor {
  static async extractText(buffer: Buffer, filename: string): Promise<string> {
    const extension = filename.split('.').pop()?.toLowerCase();

    try {
      switch (extension) {
        case 'pdf':
          const pdfData = await pdf(buffer);
          return pdfData.text;

        case 'docx':
          const docxResult = await mammoth.extractRawText({ buffer });
          return docxResult.value;

        case 'txt':
        case 'md':
          return buffer.toString('utf-8');

        case 'json':
          const jsonData = JSON.parse(buffer.toString('utf-8'));
          return JSON.stringify(jsonData, null, 2);

        case 'csv':
          const csvData = parse(buffer, { columns: true });
          return JSON.stringify(csvData, null, 2);

        default:
          return buffer.toString('utf-8');
      }
    } catch (error) {
      throw new Error(`Failed to extract text from ${filename}: ${error}`);
    }
  }
}