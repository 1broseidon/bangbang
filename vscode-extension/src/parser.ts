import * as yaml from 'js-yaml';
import { Board } from './types';

export class BangBangParser {
  /**
   * Parse a .bangbang.md file content into a Board object
   */
  static parse(content: string): Board | null {
    try {
      // Extract YAML frontmatter
      const lines = content.split('\n');

      // Check for frontmatter start
      if (!lines[0].trim().startsWith('---')) {
        return null;
      }

      // Find frontmatter end
      let endIndex = -1;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
          endIndex = i;
          break;
        }
      }

      if (endIndex === -1) {
        return null;
      }

      // Extract YAML content
      const yamlContent = lines.slice(1, endIndex).join('\n');

      // Parse YAML
      const board = yaml.load(yamlContent) as Board;

      return board;
    } catch (error) {
      console.error('Error parsing .bangbang.md:', error);
      return null;
    }
  }

  /**
   * Serialize a Board object back to .bangbang.md format
   */
  static serialize(board: Board): string {
    const yamlContent = yaml.dump(board, {
      indent: 4,
      lineWidth: -1,
      noRefs: true
    });

    return `---\n${yamlContent}---\n`;
  }
}
