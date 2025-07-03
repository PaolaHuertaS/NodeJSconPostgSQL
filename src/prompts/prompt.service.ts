import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class PromptService {
  private readonly promptsPath = join(process.cwd(), 'src', 'prompts');

 loadPrompt(fileName: string): string {
  try {
    const filePath = join(this.promptsPath, `${fileName}.xml`);
    console.log('Buscando archivo en:', filePath); 
    console.log('Directorio prompts:', this.promptsPath); 
    
    const content = readFileSync(filePath, 'utf8');
    console.log('Archivo leído correctamente');
    return content;
  } catch (error) {
    console.error(`Error loading prompt ${fileName}:`, error);
    throw new Error(`Could not load prompt: ${fileName}`);
  }
}
}