import * as yaml from 'js-yaml';
import { Board } from './types';

export class BangBangParser {
  /**
   * Parse a bangbang.md file content into a Board object
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
      console.error('Error parsing bangbang.md:', error);
      return null;
    }
  }

  /**
   * Serialize a Board object back to bangbang.md format
   */
  static serialize(board: Board): string {
    const yamlContent = yaml.dump(board, {
      indent: 4,
      lineWidth: -1,
      noRefs: true
    });

    return `---\n${yamlContent}---\n`;
  }

  /**
   * Find the line number of a task in the file
   */
  static findTaskLocation(content: string, taskId: string): { line: number, column: number } | null {
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      // Look for lines that contain the task ID
      if (lines[i].includes(`id: ${taskId}`)) {
        // Check if this line starts with a dash followed by id (standard format: - id: task-N)
        if (lines[i].match(/^\s*-\s+id:\s+/)) {
          return { line: i + 1, column: 0 }; // +1 because VSCode is 1-indexed
        }

        // Check if the id is on the next line after a dash (alternative format)
        if (i > 0 && lines[i - 1].match(/^\s*-\s*$/)) {
          return { line: i, column: 0 }; // Return the dash line
        }

        // Default to the line with the id
        return { line: i + 1, column: 0 };
      }
    }

    return null;
  }
}
