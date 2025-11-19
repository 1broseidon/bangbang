import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { marked } from 'marked';
import { BangBangParser } from './parser';
import { Board, Subtask } from './types';
import { log } from './extension';

export class BoardViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'bangbang.tasksView';

  private _view?: vscode.WebviewView;
  private _boardFilePath?: string;
  private _fileWatcher?: vscode.FileSystemWatcher;
  private _archiveWatcher?: vscode.FileSystemWatcher;
  private _textDocumentListener?: vscode.Disposable;
  private _refreshTimer?: NodeJS.Timeout;
  private _isFirstRender: boolean = true;
  private _disposables: vscode.Disposable[] = [];
  private _lastContentHash?: string;
  private _writeDebounceTimer?: NodeJS.Timeout;
  private _pendingWrite?: { content: string; callback?: () => void };

  constructor(
    private readonly _extensionUri: vscode.Uri,
  ) {}

  /**
   * Debounced write to prevent file conflicts when multiple agents/humans edit simultaneously
   */
  private debouncedWrite(content: string, callback?: () => void) {
    if (!this._boardFilePath) {
      log('No board file path for write');
      return;
    }

    // Store the pending write
    this._pendingWrite = { content, callback };

    // Clear existing timer
    if (this._writeDebounceTimer) {
      clearTimeout(this._writeDebounceTimer);
    }

    // Set new timer (300ms debounce)
    this._writeDebounceTimer = setTimeout(() => {
      if (this._pendingWrite && this._boardFilePath) {
        try {
          // Check if file has changed externally before writing
          const currentContent = fs.readFileSync(this._boardFilePath, 'utf8');
          const currentHash = this.hashContent(currentContent);

          // If file changed externally and differs from our pending write
          if (currentHash !== this._lastContentHash && currentHash !== this.hashContent(this._pendingWrite.content)) {
            log('File changed externally, attempting merge');
            // For now, just warn - could implement merge logic later
            vscode.window.showWarningMessage('Board file was modified externally. Your changes may conflict.');
          }

          // Write the file
          fs.writeFileSync(this._boardFilePath, this._pendingWrite.content, 'utf8');
          this._lastContentHash = this.hashContent(this._pendingWrite.content);

          // Execute callback if provided
          if (this._pendingWrite.callback) {
            this._pendingWrite.callback();
          }
        } catch (error) {
          log('Error in debounced write:', error);
          vscode.window.showErrorMessage('Failed to save board changes');
        }

        this._pendingWrite = undefined;
      }
    }, 300);
  }

  public refresh() {
    this.updateView();
  }

  public async createBoard() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const bangbangPath = path.join(rootPath, '.bangbang.md');

    // Check if file already exists
    if (fs.existsSync(bangbangPath)) {
      const answer = await vscode.window.showWarningMessage(
        '.bangbang.md already exists. Overwrite?',
        'Yes', 'No'
      );
      if (answer !== 'Yes') {
        return;
      }
    }

    await this.createDefaultBangBangFile(bangbangPath);
    this.updateView();
  }

  public async quickAddTask() {
    if (!this._boardFilePath) {
      vscode.window.showErrorMessage('No BangBang board found');
      return;
    }

    // Get column options
    const content = fs.readFileSync(this._boardFilePath, 'utf8');
    const board = BangBangParser.parse(content);
    if (!board) {
      vscode.window.showErrorMessage('Failed to parse board');
      return;
    }

    // Quick input for task title
    const title = await vscode.window.showInputBox({
      prompt: 'Task title',
      placeHolder: 'Enter task title',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Task title is required';
        }
        return null;
      }
    });

    if (!title) {
      return;
    }

    // Quick pick for column selection
    const columnOptions = board.columns.map(col => ({
      label: col.title,
      description: `${col.tasks.length} tasks`,
      id: col.id
    }));

    const selectedColumn = await vscode.window.showQuickPick(columnOptions, {
      placeHolder: 'Select column (default: To Do)',
      canPickMany: false
    });

    const columnId = selectedColumn?.id || 'todo';

    // Optional description
    const description = await vscode.window.showInputBox({
      prompt: 'Task description (optional)',
      placeHolder: 'Enter task description (supports markdown)'
    });

    // Generate next task ID
    const allTaskIds = board.columns.flatMap(col =>
      col.tasks.map(t => parseInt(t.id.replace('task-', '')) || 0)
    );
    const maxId = Math.max(0, ...allTaskIds);
    const newTaskId = `task-${maxId + 1}`;

    // Add task to the selected column
    const column = board.columns.find(col => col.id === columnId);
    if (column) {
      column.tasks.push({
        id: newTaskId,
        title: title.trim(),
        description: description?.trim() || ''
      });

      // Save the updated board with debouncing
      const newContent = BangBangParser.serialize(board);
      this.debouncedWrite(newContent, () => {
        log(`Quick added task ${newTaskId} to column ${columnId}`);
        vscode.window.showInformationMessage(`Added task "${title}" to ${column.title}`);
      });

      // Update the view
      this.updateView();
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    log('Resolving webview view');
    this._view = webviewView;

    // When webview is moved between panes, it gets recreated
    // Reset first render flag to ensure full HTML is set
    this._isFirstRender = true;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    // Find .bangbang.md file
    this.findBangBangFile().then(() => {
      log('Board file found:', this._boardFilePath);
      this.updateView();
      this.watchFile();
    });

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(data => {
      log('Received message from webview:', data.type, data);
      switch (data.type) {
        case 'updateTask':
          this.handleUpdateTask(data.columnId, data.taskId, data.title, data.description);
          break;
        case 'deleteTask':
          this.handleDeleteTask(data.columnId, data.taskId);
          break;
        case 'moveTask':
          this.handleMoveTask(data.taskId, data.fromColumn, data.toColumn, data.toIndex);
          break;
        case 'updateTitle':
          this.handleUpdateTitle(data.title);
          break;
        case 'openFile':
          this.handleOpenFile(data.filePath);
          break;
        case 'clearCache':
          this.handleClearCache();
          break;
        case 'archiveTask':
          this.handleArchiveTask(data.columnId, data.taskId);
          break;
        case 'addTaskToColumn':
          this.handleAddTaskToColumn(data.columnId);
          break;
        case 'toggleSubtask':
          this.handleToggleSubtask(data.taskId, data.subtaskId);
          break;
      }
    });
  }

  private async findBangBangFile() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return;
    }

    const rootPath = workspaceFolders[0].uri.fsPath;

    // Check for non-hidden bangbang.md first (new default)
    const nonHiddenPath = path.join(rootPath, 'bangbang.md');
    if (fs.existsSync(nonHiddenPath)) {
      this._boardFilePath = nonHiddenPath;
      return;
    }

    // Check for hidden .bangbang.md (backward compatibility)
    const hiddenPath = path.join(rootPath, '.bangbang.md');
    if (fs.existsSync(hiddenPath)) {
      this._boardFilePath = hiddenPath;
      return;
    }

    // Check for .bb.md (shorthand - backward compatibility)
    const bbPath = path.join(rootPath, '.bb.md');
    if (fs.existsSync(bbPath)) {
      this._boardFilePath = bbPath;
      return;
    }

    // If no file exists, create default bangbang.md (non-hidden)
    await this.createDefaultBangBangFile(nonHiddenPath);
  }

  private async createDefaultBangBangFile(filePath: string) {
    try {
      const defaultContent = `---
title: My Project
agent:
  instructions:
    - Modify only the YAML frontmatter
    - Preserve all IDs
    - Keep ordering
    - Make minimal changes
    - Preserve unknown fields
rules:
  always: []
  never: []
  prefer: []
  context: []
columns:
  - id: todo
    title: To Do
    tasks: []
  - id: in-progress
    title: In Progress
    tasks: []
  - id: done
    title: Done
    tasks: []
---
`;

      fs.writeFileSync(filePath, defaultContent, 'utf8');
      this._boardFilePath = filePath;

      const fileName = path.basename(filePath);
      log(`Created default ${fileName} file`);
      vscode.window.showInformationMessage(`Created ${fileName} with starter template`);
    } catch (error) {
      const fileName = path.basename(filePath);
      log(`Error creating default ${fileName}:`, error);
      vscode.window.showErrorMessage(`Failed to create ${fileName} file`);
    }
  }

  private watchFile() {
    if (!this._boardFilePath) {
      log('No board file to watch');
      return;
    }

    this.disposeWatchers();

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      log('No workspace folder found for watcher');
      return;
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const boardRelative = path.relative(rootPath, this._boardFilePath);
    const boardPattern = new vscode.RelativePattern(rootPath, boardRelative);

    log('Setting up file watchers for:', this._boardFilePath);

    this._fileWatcher = vscode.workspace.createFileSystemWatcher(boardPattern, false, false, false);
    this._fileWatcher.onDidChange((uri) => {
      log('Board file changed on disk:', uri.fsPath);
      this.scheduleBoardRefresh('file-change', uri);
    });
    this._fileWatcher.onDidCreate((uri) => {
      log('Board file created:', uri.fsPath);
      this._boardFilePath = uri.fsPath;
      this.scheduleBoardRefresh('file-create', uri);
    });
    this._fileWatcher.onDidDelete(() => {
      log('Board file deleted');
      this._boardFilePath = undefined;
      this.updateView(true);
    });

    const archivePath = this.getArchivePath();
    if (archivePath) {
      const archiveRelative = path.relative(rootPath, archivePath);
      const archivePattern = new vscode.RelativePattern(rootPath, archiveRelative);
      this._archiveWatcher = vscode.workspace.createFileSystemWatcher(archivePattern, false, false, false);
      this._archiveWatcher.onDidChange((uri) => {
        log('Archive file changed on disk:', uri.fsPath);
        this.scheduleBoardRefresh('archive-change', uri);
      });
      this._archiveWatcher.onDidCreate((uri) => {
        log('Archive file created:', uri.fsPath);
        this.scheduleBoardRefresh('archive-create', uri);
      });
      this._archiveWatcher.onDidDelete(() => {
        log('Archive file deleted');
        this.scheduleBoardRefresh('archive-delete');
      });
    }

    this._textDocumentListener = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.fsPath === this._boardFilePath) {
        log('Board document changed in editor');
        this.scheduleBoardRefresh('document-change', event.document.uri);
      }
    });

    // Trigger an initial refresh to sync hash state
    this.scheduleBoardRefresh('initial-watch');
  }

  private scheduleBoardRefresh(reason: string, _uri?: vscode.Uri) {
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
    }

    this._refreshTimer = setTimeout(() => {
      this.refreshBoardFromSource(reason);
    }, 150);
  }

  private async refreshBoardFromSource(reason: string) {
    if (!this._boardFilePath) {
      log('No board file to refresh from');
      return;
    }

    try {
      const content = await this.readBoardContent();

      const currentHash = this.hashContent(content);
      if (currentHash === this._lastContentHash) {
        log('Refresh skipped - content hash unchanged');
        return;
      }

      log(`Refreshing board due to ${reason}; new hash: ${currentHash}`);
      this._lastContentHash = currentHash;
      this.updateView(false, content);
    } catch (error) {
      log('Error refreshing board from source:', error);
      // Only show error if it's not a file not found error (could be deleted)
      if (error instanceof Error && !error.message.includes('ENOENT')) {
        vscode.window.showErrorMessage(`Failed to refresh BangBang board: ${error.message}`);
      }
    }
  }

  private async readBoardContent(): Promise<string> {
    if (!this._boardFilePath) {
      throw new Error('No board file path set');
    }

    const openDoc = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === this._boardFilePath);
    if (openDoc) {
      return openDoc.getText();
    }

    const data = await vscode.workspace.fs.readFile(vscode.Uri.file(this._boardFilePath));
    return Buffer.from(data).toString('utf8');
  }

  private disposeWatchers() {
    if (this._fileWatcher) {
      this._fileWatcher.dispose();
      this._fileWatcher = undefined;
    }

    if (this._archiveWatcher) {
      this._archiveWatcher.dispose();
      this._archiveWatcher = undefined;
    }

    if (this._textDocumentListener) {
      this._textDocumentListener.dispose();
      this._textDocumentListener = undefined;
    }

    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = undefined;
    }
  }

  private hashContent(content: string): string {
    // Simple hash function for change detection
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  private updateView(forceFullRefresh: boolean = false, contentOverride?: string) {
    if (!this._view || !this._boardFilePath) {
      log('Cannot update view - missing view or board file');
      return;
    }

    try {
      log('Updating tasks view');
      const content = contentOverride ?? fs.readFileSync(this._boardFilePath, 'utf8');
      const board = BangBangParser.parse(content);

      if (!board) {
        log('Failed to parse board file');
        this._view.webview.html = this.getErrorHtml('Failed to parse .bangbang.md');
        return;
      }

      this._lastContentHash = this.hashContent(content);

      // Load archive from separate file if it exists
      this.loadArchive(board);

      log('Board parsed successfully:', board.title, `(${board.columns.length} columns)`);

      // Debug log for subtasks
      board.columns.forEach(col => {
        col.tasks.forEach(task => {
          if (task.subtasks) {
            log(`Task ${task.id} has ${task.subtasks.length} subtasks`);
          }
        });
      });

      // On first load or forced refresh, set the full HTML
      if (this._isFirstRender || forceFullRefresh) {
        log('Setting initial HTML');
        this._view.webview.html = this.getTasksHtml(board);
        this._isFirstRender = false;
      } else {
        // On subsequent updates, use postMessage to preserve state
        log('Sending board update via postMessage');
        this._view.webview.postMessage({
          type: 'boardUpdate',
          board: board
        });
      }
    } catch (error) {
      log('Error updating view:', error);
      vscode.window.showErrorMessage('Failed to update BangBang board view');
    }
  }

  private handleUpdateTask(columnId: string, taskId: string, newTitle: string, newDescription: string) {
    if (!this._boardFilePath) return;

    log(`Updating task ${taskId} in column ${columnId}`);
    const content = fs.readFileSync(this._boardFilePath, 'utf8');
    const board = BangBangParser.parse(content);
    if (!board) return;

    for (const col of board.columns) {
      if (col.id === columnId) {
        const task = col.tasks.find(t => t.id === taskId);
        if (task) {
          task.title = newTitle;
          task.description = newDescription;
          const newContent = BangBangParser.serialize(board);

          // Use debounced write to prevent conflicts
          this.debouncedWrite(newContent, () => {
            log('Task updated successfully');
          });

          // Immediately update the view
          this.updateView();
          return;
        }
      }
    }
  }

  private handleDeleteTask(columnId: string, taskId: string) {
    if (!this._boardFilePath) return;

    log(`Deleting task ${taskId} from column ${columnId}`);
    const content = fs.readFileSync(this._boardFilePath, 'utf8');
    const board = BangBangParser.parse(content);
    if (!board) return;

    for (const col of board.columns) {
      if (col.id === columnId) {
        col.tasks = col.tasks.filter(t => t.id !== taskId);
        const newContent = BangBangParser.serialize(board);

        // Use debounced write to prevent conflicts
        this.debouncedWrite(newContent, () => {
          log('Task deleted successfully');
        });

        // Immediately update the view
        this.updateView();
        return;
      }
    }
  }

  private handleMoveTask(taskId: string, fromColumnId: string, toColumnId: string, toIndex: number) {
    if (!this._boardFilePath) return;

    log(`Moving task ${taskId} from ${fromColumnId} to ${toColumnId} at index ${toIndex}`);
    const content = fs.readFileSync(this._boardFilePath, 'utf8');
    const board = BangBangParser.parse(content);
    if (!board) return;

    // Find source column and remove task
    let taskToMove = null;
    for (const col of board.columns) {
      if (col.id === fromColumnId) {
        const taskIndex = col.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          taskToMove = col.tasks.splice(taskIndex, 1)[0];
          break;
        }
      }
    }

    if (!taskToMove) return;

    // Add to target column at specific index
    for (const col of board.columns) {
      if (col.id === toColumnId) {
        col.tasks.splice(toIndex, 0, taskToMove);
        break;
      }
    }

    const newContent = BangBangParser.serialize(board);
    fs.writeFileSync(this._boardFilePath, newContent, 'utf8');

    // Update hash to prevent double update
    this._lastContentHash = this.hashContent(newContent);

    log('Task moved successfully');

    // Immediately update the view
    this.updateView();
  }

  private handleUpdateTitle(newTitle: string) {
    if (!this._boardFilePath) return;

    log(`Updating board title to: ${newTitle}`);
    const content = fs.readFileSync(this._boardFilePath, 'utf8');
    const board = BangBangParser.parse(content);
    if (!board) return;

    board.title = newTitle;
    const newContent = BangBangParser.serialize(board);
    fs.writeFileSync(this._boardFilePath, newContent, 'utf8');

    // Update hash to prevent double update
    this._lastContentHash = this.hashContent(newContent);

    log('Board title updated successfully');

    // Immediately update the view
    this.updateView();
  }

  private async handleOpenFile(filePath: string) {
    try {
      log(`Opening file: ${filePath}`);

      // Check if filePath contains line number (e.g., "file.ts:42")
      const match = filePath.match(/^(.+):(\d+)$/);
      let actualPath = filePath;
      let lineNumber = 0;

      if (match) {
        actualPath = match[1];
        lineNumber = parseInt(match[2], 10) - 1; // VSCode uses 0-based line numbers
      }

      // Resolve relative paths from workspace root
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        log('No workspace folder found');
        return;
      }

      const absolutePath = path.isAbsolute(actualPath)
        ? actualPath
        : path.join(workspaceFolders[0].uri.fsPath, actualPath);

      const uri = vscode.Uri.file(absolutePath);
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);

      // Jump to line if specified
      if (lineNumber > 0) {
        const position = new vscode.Position(lineNumber, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position));
      }

      log('File opened successfully');
    } catch (error) {
      log('Error opening file:', error);
      vscode.window.showErrorMessage(`Failed to open file: ${filePath}`);
    }
  }

  private handleClearCache() {
    try {
      log('Clearing cache and reloading window');

      // Dispose all resources
      this.dispose();

      // Reload the window
      vscode.commands.executeCommand('workbench.action.reloadWindow');
    } catch (error) {
      log('Error clearing cache:', error);
      vscode.window.showErrorMessage('Failed to clear cache');
    }
  }

  private getArchivePath(): string | undefined {
    if (!this._boardFilePath) return;

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return;

    const rootPath = workspaceFolders[0].uri.fsPath;

    // Determine archive filename based on main board filename
    const mainFilename = path.basename(this._boardFilePath);
    const archiveFilename = mainFilename.replace(/\.md$/, '-archive.md');
    return path.join(rootPath, archiveFilename);
  }

  private loadArchive(board: Board) {
    const archivePath = this.getArchivePath();
    if (!archivePath || !this._boardFilePath) return;

    if (!fs.existsSync(archivePath)) {
      log('No archive file found at:', archivePath);
      board.archive = [];
      return;
    }

    try {
      log('Loading archive from:', archivePath);
      const archiveContent = fs.readFileSync(archivePath, 'utf8');
      const archiveBoard = BangBangParser.parse(archiveContent);

      if (archiveBoard && archiveBoard.archive) {
        board.archive = archiveBoard.archive;
        log(`Loaded ${archiveBoard.archive.length} archived tasks`);
      } else {
        board.archive = [];
      }
    } catch (error) {
      log('Error loading archive:', error);
      board.archive = [];
    }
  }

  private async handleAddTaskToColumn(columnId: string) {
    if (!this._boardFilePath) return;

    // Show quick input for task title
    const title = await vscode.window.showInputBox({
      prompt: 'Task title',
      placeHolder: 'Enter task title',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Task title is required';
        }
        return null;
      }
    });

    if (!title) return;

    // Optional description
    const description = await vscode.window.showInputBox({
      prompt: 'Task description (optional)',
      placeHolder: 'Enter task description (supports markdown)'
    });

    // Read current board
    const content = fs.readFileSync(this._boardFilePath, 'utf8');
    const board = BangBangParser.parse(content);
    if (!board) return;

    // Generate next task ID
    const allTaskIds = board.columns.flatMap(col =>
      col.tasks.map(t => parseInt(t.id.replace('task-', '')) || 0)
    );
    const maxId = Math.max(0, ...allTaskIds);
    const newTaskId = `task-${maxId + 1}`;

    // Add task to the specified column
    const column = board.columns.find(col => col.id === columnId);
    if (column) {
      column.tasks.push({
        id: newTaskId,
        title: title.trim(),
        description: description?.trim() || ''
      });

      // Save the updated board
      const newContent = BangBangParser.serialize(board);
      fs.writeFileSync(this._boardFilePath, newContent, 'utf8');

      // Update hash to prevent double update
      this._lastContentHash = this.hashContent(newContent);

      log(`Added task ${newTaskId} to column ${columnId}`);
      vscode.window.showInformationMessage(`Added task "${title}" to ${column.title}`);

      // Update the view
      this.updateView();
    }
  }

  private handleToggleSubtask(taskId: string, subtaskId: string) {
    if (!this._boardFilePath) return;

    log(`Toggling subtask ${subtaskId} for task ${taskId}`);

    // Read current board
    const content = fs.readFileSync(this._boardFilePath, 'utf8');
    const board = BangBangParser.parse(content);
    if (!board) return;

    // Find the task and subtask
    for (const col of board.columns) {
      const task = col.tasks.find(t => t.id === taskId);
      if (task && task.subtasks) {
        const subtask = task.subtasks.find(st => st.id === subtaskId);
        if (subtask) {
          // Toggle the completed state
          subtask.completed = !subtask.completed;

          // Save the updated board
          const newContent = BangBangParser.serialize(board);
          fs.writeFileSync(this._boardFilePath, newContent, 'utf8');

          // Update hash to prevent double update
          this._lastContentHash = this.hashContent(newContent);

          log(`Subtask ${subtaskId} toggled to ${subtask.completed ? 'completed' : 'incomplete'}`);

          // Update the view
          this.updateView();
          return;
        }
      }
    }
  }

  private handleArchiveTask(columnId: string, taskId: string) {
    if (!this._boardFilePath) return;

    log(`Archiving task ${taskId} from column ${columnId}`);

    // Read main board
    const content = fs.readFileSync(this._boardFilePath, 'utf8');
    const board = BangBangParser.parse(content);
    if (!board) return;

    // Find and remove the task from the column
    let taskToArchive = null;
    for (const col of board.columns) {
      if (col.id === columnId) {
        const taskIndex = col.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          taskToArchive = col.tasks.splice(taskIndex, 1)[0];
          break;
        }
      }
    }

    if (!taskToArchive) {
      log('Task not found');
      return;
    }

    // Save updated main board (without the archived task)
    const newContent = BangBangParser.serialize(board);
    fs.writeFileSync(this._boardFilePath, newContent, 'utf8');

    // Update hash to prevent double update
    this._lastContentHash = this.hashContent(newContent);

    // Get archive file path
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const rootPath = workspaceFolders[0].uri.fsPath;
    const mainFilename = path.basename(this._boardFilePath);
    const archiveFilename = mainFilename.replace(/\.md$/, '-archive.md');
    const archivePath = path.join(rootPath, archiveFilename);

    // Read or create archive file
    let archiveBoard: Board;
    if (fs.existsSync(archivePath)) {
      const archiveContent = fs.readFileSync(archivePath, 'utf8');
      const parsed = BangBangParser.parse(archiveContent);
      if (parsed) {
        archiveBoard = parsed;
      } else {
        archiveBoard = this.createEmptyArchiveBoard();
      }
    } else {
      archiveBoard = this.createEmptyArchiveBoard();
    }

    // Add task to archive
    if (!archiveBoard.archive) {
      archiveBoard.archive = [];
    }
    archiveBoard.archive.unshift(taskToArchive); // Add to beginning

    // Save archive file
    const archiveContent = BangBangParser.serialize(archiveBoard);
    fs.writeFileSync(archivePath, archiveContent, 'utf8');

    log('Task archived successfully');
    vscode.window.showInformationMessage(`Task "${taskToArchive.title}" archived`);

    // Force a full refresh with the updated archive
    // Load the archive into the current board before updating
    board.archive = archiveBoard.archive;

    // Send update via postMessage for reactive update
    if (this._view) {
      this._view.webview.postMessage({
        type: 'boardUpdate',
        board: board
      });
    }
  }

  private createEmptyArchiveBoard(): Board {
    return {
      title: 'Archive',
      columns: [],
      archive: []
    };
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private getSubtaskProgress(subtasks: Subtask[]): number {
    if (!subtasks || subtasks.length === 0) return 0;
    const completed = subtasks.filter(st => st.completed).length;
    return Math.round((completed / subtasks.length) * 100);
  }

  private getCompletedSubtaskCount(subtasks: Subtask[]): number {
    if (!subtasks) return 0;
    return subtasks.filter(st => st.completed).length;
  }

  private getTasksHtml(board: Board): string {
    // Calculate progress metrics
    const totalTasks = board.columns.reduce((sum, col) => sum + col.tasks.length, 0);
    const doneColumn = board.columns.find(col => col.id === 'done');
    const doneTasks = doneColumn ? doneColumn.tasks.length : 0;
    const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    // Generate nonce for CSP
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._view?.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>BangBang Tasks</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background: var(--vscode-sideBar-background);
      color: var(--vscode-sideBar-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .board-header {
      padding: 16px;
      border-bottom: 1px solid var(--vscode-panel-border);
      background: var(--vscode-sideBarSectionHeader-background);
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding: 0 4px;
      position: relative;
    }

    .board-title-wrapper {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
    }

    .board-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--vscode-editor-foreground);
      opacity: 0.95;
      letter-spacing: -0.01em;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 4px;
      transition: background 0.15s;
    }

    .board-title:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }

    .title-edit-btn {
      background: transparent;
      border: none;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 12px;
      opacity: 0;
      transition: opacity 0.15s;
    }

    .header-top:hover .title-edit-btn {
      opacity: 0.7;
    }

    .title-edit-btn:hover {
      opacity: 1 !important;
      background: var(--vscode-toolbar-hoverBackground);
    }

    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .tab {
      background: transparent;
      border: none;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 500;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.15s;
      letter-spacing: -0.01em;
      position: relative;
    }

    .tab:hover {
      color: var(--vscode-foreground);
      background: var(--vscode-toolbar-hoverBackground);
    }

    .tab.active {
      color: var(--vscode-editor-foreground);
      border-bottom-color: var(--vscode-focusBorder);
      opacity: 0.95;
    }

    .tab-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4ade80;
      position: absolute;
      top: 6px;
      right: 6px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .tab.has-changes .tab-indicator {
      opacity: 1;
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }

    .progress-section {
      margin-top: 8px;
    }

    .progress-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: var(--vscode-editor-foreground);
      opacity: 0.7;
      margin-bottom: 6px;
    }

    .progress-percent {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      font-size: 13px;
      color: var(--vscode-editor-foreground);
      opacity: 0.95;
    }

    .progress-bar {
      height: 6px;
      background: var(--vscode-input-background);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 3px;
    }

    .stats {
      display: flex;
      gap: 12px;
      margin-top: 12px;
    }

    .stat {
      flex: 1;
      padding: 8px;
      background: var(--vscode-input-background);
      border-radius: 6px;
      border: 1px solid var(--vscode-panel-border);
    }

    .stat-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 20px;
      font-weight: 600;
      color: var(--vscode-editor-foreground);
      opacity: 0.95;
    }

    .stat-label {
      font-size: 10px;
      color: var(--vscode-editor-foreground);
      opacity: 0.6;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }

    .column-section {
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .column-section.collapsed .task {
      display: none;
    }

    .column-section.collapsed .empty-state {
      display: none;
    }

    .column-header {
      padding: 10px 16px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      background: var(--vscode-sideBarSectionHeader-background);
      color: var(--vscode-editor-foreground);
      opacity: 0.9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      letter-spacing: 0.5px;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s;
    }

    .column-header:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .column-header-title {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .column-header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .add-task-btn {
      background: transparent;
      border: none;
      color: var(--vscode-editor-foreground);
      opacity: 0;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 14px;
      transition: opacity 0.15s;
    }

    .column-header:hover .add-task-btn {
      opacity: 0.6;
    }

    .add-task-btn:hover {
      opacity: 1 !important;
      background: var(--vscode-toolbar-hoverBackground);
    }

    .collapse-icon {
      font-size: 10px;
      opacity: 0.7;
      transition: transform 0.2s;
    }

    .column-section.collapsed .collapse-icon {
      transform: rotate(-90deg);
    }

    .task-count {
      font-size: 11px;
      opacity: 0.8;
      font-family: 'JetBrains Mono', monospace;
    }

    .task {
      padding: 10px 16px;
      border-left: 3px solid transparent;
      cursor: pointer;
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }

    .task:hover {
      background: var(--vscode-list-hoverBackground);
      border-left-color: var(--vscode-list-activeSelectionBackground);
    }

    .task.expanded {
      background: var(--vscode-list-inactiveSelectionBackground);
      border-left-color: var(--vscode-list-activeSelectionBackground);
    }

    .task.dragging {
      opacity: 0.5;
    }

    .task.drag-over {
      border-top: 2px solid var(--vscode-list-activeSelectionBackground);
    }

    .task-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .drag-handle {
      cursor: grab;
      color: var(--vscode-descriptionForeground);
      opacity: 0;
      transition: opacity 0.15s;
      font-size: 12px;
    }

    .task:hover .drag-handle {
      opacity: 0.5;
    }

    .drag-handle:hover {
      opacity: 1 !important;
    }

    .task-title {
      flex: 1;
      font-size: 13px;
      font-weight: 500;
      color: var(--vscode-editor-foreground);
      opacity: 0.95;
      letter-spacing: -0.01em;
    }

    .task-actions {
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.15s;
    }

    .task:hover .task-actions {
      opacity: 1;
    }

    .task-action {
      padding: 4px 6px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      color: var(--vscode-descriptionForeground);
      transition: all 0.15s;
      border: none;
      background: transparent;
    }

    .task-action:hover {
      background: var(--vscode-button-hoverBackground);
      color: var(--vscode-button-foreground);
    }

    .task-action.delete:hover {
      background: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-inputValidation-errorForeground);
    }

    .task-description {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      line-height: 1.5;
      margin-top: 6px;
      padding-left: 20px;
      display: none;
    }

    .task.expanded .task-description {
      display: block;
    }

    /* Subtasks styling */
    .subtasks-container {
      margin-top: 8px;
      padding-left: 20px;
      display: none;
    }

    .task.expanded .subtasks-container {
      display: block;
    }

    .subtask-progress {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
    }

    .subtask-progress-bar {
      flex: 1;
      height: 4px;
      background: var(--vscode-input-background);
      border-radius: 2px;
      overflow: hidden;
    }

    .subtask-progress-fill {
      height: 100%;
      background: var(--vscode-progressBar-background);
      transition: width 0.3s ease;
    }

    .subtask-count {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      opacity: 0.8;
    }

    .subtask-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .subtask-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 3px 0;
      font-size: 11px;
      color: var(--vscode-editor-foreground);
      opacity: 0.9;
    }

    .subtask-checkbox {
      width: 12px;
      height: 12px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
      background: var(--vscode-input-background);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }

    .subtask-item.completed .subtask-checkbox {
      background: var(--vscode-button-background);
      border-color: var(--vscode-button-background);
    }

    .subtask-item.completed .subtask-checkbox::after {
      content: '✓';
      color: var(--vscode-button-foreground);
      font-size: 9px;
    }

    .subtask-item.completed .subtask-title {
      text-decoration: line-through;
      opacity: 0.6;
    }

    /* Markdown styling in task descriptions */
    .task-description p {
      margin: 4px 0;
    }

    .task-description code {
      background: var(--vscode-textCodeBlock-background);
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
    }

    .task-description pre {
      background: var(--vscode-textCodeBlock-background);
      padding: 8px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 6px 0;
    }

    .task-description pre code {
      background: transparent;
      padding: 0;
    }

    .task-description ul, .task-description ol {
      margin: 4px 0;
      padding-left: 20px;
    }

    .task-description li {
      margin: 2px 0;
    }

    .task-description strong {
      font-weight: 600;
      color: var(--vscode-editor-foreground);
    }

    .task-description em {
      font-style: italic;
    }

    .task-description a {
      color: var(--vscode-textLink-foreground);
      text-decoration: none;
    }

    .task-description a:hover {
      text-decoration: underline;
    }

    .task-related-files {
      margin-top: 8px;
      padding-left: 20px;
      display: none;
    }

    .task.expanded .task-related-files {
      display: block;
    }

    .related-file {
      font-size: 10px;
      color: var(--vscode-textLink-foreground);
      padding: 4px 6px;
      margin: 2px 0;
      background: var(--vscode-input-background);
      border-radius: 3px;
      cursor: pointer;
      transition: background 0.15s;
      font-family: 'JetBrains Mono', monospace;
    }

    .related-file:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .edit-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .edit-modal.show {
      display: flex;
    }

    .edit-modal-content {
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      padding: 16px;
      width: 90%;
      max-width: 400px;
    }

    .edit-modal-title {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--vscode-foreground);
    }

    .edit-input {
      width: 100%;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      padding: 8px;
      margin-bottom: 8px;
      color: var(--vscode-input-foreground);
      font-family: var(--vscode-font-family);
      font-size: 12px;
    }

    .edit-input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }

    .edit-textarea {
      resize: vertical;
      min-height: 80px;
      font-family: var(--vscode-font-family);
    }

    .edit-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      justify-content: flex-end;
    }

    .edit-button {
      padding: 6px 12px;
      border-radius: 4px;
      border: none;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }

    .edit-button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .edit-button.primary:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .edit-button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .edit-button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .empty-state {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      padding: 16px;
      font-style: italic;
      opacity: 0.7;
      text-align: center;
    }

    .rules-view {
      padding: 0;
    }

    .rules-category {
      border-bottom: 1px solid var(--vscode-panel-border);
      padding: 16px;
    }

    .rules-category-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--vscode-editor-foreground);
      opacity: 0.7;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }

    .rule-item-full {
      padding: 8px 0;
      border-bottom: 1px solid var(--vscode-panel-border);
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .rule-item-full:last-child {
      border-bottom: none;
    }

    .rule-number {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      color: var(--vscode-editor-foreground);
      opacity: 0.7;
      min-width: 20px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .rule-icon {
      font-size: 14px;
      margin-top: 2px;
      flex-shrink: 0;
    }

    .rule-text {
      font-size: 12px;
      color: var(--vscode-editor-foreground);
      opacity: 0.9;
      line-height: 1.5;
      letter-spacing: -0.01em;
    }

    .settings-view {
      padding: 16px;
    }

    .settings-section {
      margin-bottom: 24px;
    }

    .settings-section-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--vscode-editor-foreground);
      opacity: 0.7;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }

    .settings-item {
      margin-bottom: 16px;
    }

    .settings-label {
      font-size: 12px;
      color: var(--vscode-editor-foreground);
      opacity: 0.9;
      margin-bottom: 6px;
      display: block;
    }

    .settings-description {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      opacity: 0.7;
      margin-top: 4px;
      line-height: 1.4;
    }

    .settings-input {
      width: 100%;
      padding: 6px 8px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
      font-size: 12px;
      font-family: var(--vscode-font-family);
    }

    .settings-input:focus {
      outline: 1px solid var(--vscode-focusBorder);
      border-color: var(--vscode-focusBorder);
    }

    .archive-view {
      padding: 0;
    }

    .archived-task {
      opacity: 0.7;
      border-left-color: var(--vscode-descriptionForeground) !important;
    }

    .archived-task .task-description,
    .archived-task .task-related-files {
      display: block;
    }

    .archived-task:hover {
      opacity: 1;
    }
  </style>
</head>
<body>
  <div class="header-top">
    <div class="board-title-wrapper">
      <div class="board-title" id="boardTitle">${this.escapeHtml(board.title)}</div>
      <button class="title-edit-btn" id="titleEditBtn" title="Edit title">✎</button>
    </div>
  </div>

  <div class="tabs">
    <button class="tab active" data-tab="tasks">
      Tasks
      <span class="tab-indicator"></span>
    </button>
    <button class="tab" data-tab="rules">
      Rules
      <span class="tab-indicator"></span>
    </button>
    <button class="tab" data-tab="archive">
      Archive
      <span class="tab-indicator"></span>
    </button>
    <button class="tab" data-tab="settings">
      Settings
      <span class="tab-indicator"></span>
    </button>
  </div>

  <div class="tab-content active" id="tasksTab">
    <div class="board-header">
      <div class="progress-section">
        <div class="progress-label">
          <span>Progress</span>
          <span class="progress-percent">${progressPercent}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progressPercent}%"></div>
        </div>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="stat-value">${totalTasks}</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat">
          <div class="stat-value">${doneTasks}</div>
          <div class="stat-label">Done</div>
        </div>
      </div>
    </div>

    ${board.columns.map(col => `
      <div class="column-section" data-column-id="${col.id}">
        <div class="column-header">
          <div class="column-header-title">
            <span class="collapse-icon">▼</span>
            <span>${this.escapeHtml(col.title)}</span>
          </div>
          <div class="column-header-right">
            <button class="add-task-btn" data-column-id="${col.id}" title="Add task to ${this.escapeHtml(col.title)}">+</button>
            <span class="task-count">${col.tasks.length}</span>
          </div>
        </div>
        ${col.tasks.length === 0
          ? '<div class="empty-state">No tasks</div>'
          : col.tasks.map((task, index) => `
            <div class="task"
                 data-task-id="${task.id}"
                 data-column-id="${col.id}"
                 data-task-index="${index}"
                 draggable="true">
              <div class="task-header">
                <span class="drag-handle">⋮⋮</span>
                <div class="task-title">${this.escapeHtml(task.title)}</div>
                <div class="task-actions">
                  <button class="task-action edit" data-action="edit" title="Edit">✎</button>
                  ${col.id === 'done' ? '<button class="task-action archive" data-action="archive" title="Archive">⬇</button>' : ''}
                  <button class="task-action delete" data-action="delete" title="Delete">×</button>
                </div>
              </div>
              <div class="task-description">${this.renderMarkdown(task.description || '')}</div>
              ${task.subtasks && task.subtasks.length > 0 ? `
                <div class="subtasks-container">
                  <div class="subtask-progress">
                    <div class="subtask-progress-bar">
                      <div class="subtask-progress-fill" style="width: ${this.getSubtaskProgress(task.subtasks)}%"></div>
                    </div>
                    <span class="subtask-count">${this.getCompletedSubtaskCount(task.subtasks)}/${task.subtasks.length}</span>
                  </div>
                  <ul class="subtask-list">
                    ${task.subtasks.map(subtask => `
                      <li class="subtask-item ${subtask.completed ? 'completed' : ''}" data-task-id="${task.id}" data-subtask-id="${subtask.id}">
                        <div class="subtask-checkbox"></div>
                        <span class="subtask-title">${this.escapeHtml(subtask.title)}</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              ` : ''}
              ${task.relatedFiles && task.relatedFiles.length > 0 ? `
                <div class="task-related-files">
                  ${task.relatedFiles.map(file => `
                    <div class="related-file" data-file="${this.escapeHtml(file)}">📄 ${this.escapeHtml(file)}</div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')
        }
      </div>
    `).join('')}
  </div>

  <div class="tab-content" id="rulesTab">
    ${board.rules ? `
      <div class="rules-view">
        ${board.rules.always && board.rules.always.length > 0 ? `
          <div class="rules-category">
            <div class="rules-category-title">ALWAYS</div>
            ${board.rules.always.map(rule => `
              <div class="rule-item-full">
                <div class="rule-number">${rule.id}</div>
                <div class="rule-text">${this.escapeHtml(rule.rule)}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${board.rules.never && board.rules.never.length > 0 ? `
          <div class="rules-category">
            <div class="rules-category-title">NEVER</div>
            ${board.rules.never.map(rule => `
              <div class="rule-item-full">
                <div class="rule-number">${rule.id}</div>
                <div class="rule-text">${this.escapeHtml(rule.rule)}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${board.rules.prefer && board.rules.prefer.length > 0 ? `
          <div class="rules-category">
            <div class="rules-category-title">PREFER</div>
            ${board.rules.prefer.map(rule => `
              <div class="rule-item-full">
                <div class="rule-number">${rule.id}</div>
                <div class="rule-text">${this.escapeHtml(rule.rule)}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${board.rules.context && board.rules.context.length > 0 ? `
          <div class="rules-category">
            <div class="rules-category-title">CONTEXT</div>
            ${board.rules.context.map(rule => `
              <div class="rule-item-full">
                <div class="rule-number">${rule.id}</div>
                <div class="rule-text">${this.escapeHtml(rule.rule)}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    ` : '<div class="empty-state">No rules defined</div>'}
  </div>

  <div class="tab-content" id="archiveTab">
    ${board.archive && board.archive.length > 0 ? `
      <div class="archive-view">
        ${board.archive.map(task => `
          <div class="task archived-task" data-task-id="${task.id}">
            <div class="task-header">
              <div class="task-title">${this.escapeHtml(task.title)}</div>
            </div>
            <div class="task-description">${this.renderMarkdown(task.description)}</div>
            ${task.relatedFiles && task.relatedFiles.length > 0 ? `
              <div class="task-related-files">
                ${task.relatedFiles.map(file => `
                  <div class="related-file" data-file="${this.escapeHtml(file)}">📄 ${this.escapeHtml(file)}</div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    ` : '<div class="empty-state">No archived tasks</div>'}
  </div>

  <div class="tab-content" id="settingsTab">
    <div class="settings-view">
      <div class="settings-section">
        <div class="settings-section-title">Board Configuration</div>
        <div class="settings-item">
          <label class="settings-label">Board File Location</label>
          <input type="text" class="settings-input" value="${this._boardFilePath || 'No file loaded'}" readonly>
          <div class="settings-description">The current .bangbang.md file being displayed</div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Developer</div>
        <div class="settings-item">
          <button class="edit-button primary" id="clearCacheBtn">Clear Cache & Reload Window</button>
          <div class="settings-description">
            Disposes all watchers and reloads VSCode. Useful for resolving stale state issues.
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">About</div>
        <div class="settings-item">
          <div class="settings-description">
            BangBang is a protocol-first AI task management system.<br>
            Edit your .bangbang.md file directly to manage tasks and rules.
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="edit-modal" id="editModal">
    <div class="edit-modal-content">
      <div class="edit-modal-title">Edit Task</div>
      <input type="text" class="edit-input" id="editTitle" placeholder="Task title">
      <textarea class="edit-input edit-textarea" id="editDescription" placeholder="Task description"></textarea>
      <div class="edit-actions">
        <button class="edit-button secondary" id="cancelEdit">Cancel</button>
        <button class="edit-button primary" id="saveEdit">Save</button>
      </div>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    // Edit modal state
    let currentEditTask = null;

    // Task expansion
    document.querySelectorAll('.task').forEach(taskEl => {
      taskEl.addEventListener('click', (e) => {
        if (e.target.closest('.task-action') || e.target.closest('.drag-handle') || e.target.closest('.related-file') || e.target.closest('.subtask-item')) {
          return;
        }
        taskEl.classList.toggle('expanded');
      });
    });

    // Subtask checkbox clicks
    document.querySelectorAll('.subtask-item').forEach(subtaskEl => {
      subtaskEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = subtaskEl.dataset.taskId;
        const subtaskId = subtaskEl.dataset.subtaskId;
        vscode.postMessage({
          type: 'toggleSubtask',
          taskId: taskId,
          subtaskId: subtaskId
        });
      });
    });

    // Related file clicks
    document.querySelectorAll('.related-file').forEach(fileEl => {
      fileEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const filePath = fileEl.dataset.file;
        if (filePath) {
          vscode.postMessage({
            type: 'openFile',
            filePath: filePath
          });
        }
      });
    });

    // Edit action
    document.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskEl = e.target.closest('.task');
        const taskId = taskEl.dataset.taskId;
        const columnId = taskEl.dataset.columnId;
        const title = taskEl.querySelector('.task-title').textContent;
        const description = taskEl.querySelector('.task-description').textContent;

        currentEditTask = { taskId, columnId };
        document.getElementById('editTitle').value = title;
        document.getElementById('editDescription').value = description;
        document.getElementById('editModal').classList.add('show');
        document.getElementById('editTitle').focus();
      });
    });

    // Delete action
    document.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskEl = e.target.closest('.task');
        const taskId = taskEl.dataset.taskId;
        const columnId = taskEl.dataset.columnId;

        vscode.postMessage({
          type: 'deleteTask',
          columnId: columnId,
          taskId: taskId
        });
      });
    });

    // Archive action
    document.querySelectorAll('[data-action="archive"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskEl = e.target.closest('.task');
        const taskId = taskEl.dataset.taskId;
        const columnId = taskEl.dataset.columnId;

        vscode.postMessage({
          type: 'archiveTask',
          columnId: columnId,
          taskId: taskId
        });
      });
    });

    // Save edit
    document.getElementById('saveEdit').addEventListener('click', () => {
      if (!currentEditTask) return;

      const title = document.getElementById('editTitle').value.trim();
      const description = document.getElementById('editDescription').value.trim();

      if (title) {
        vscode.postMessage({
          type: 'updateTask',
          columnId: currentEditTask.columnId,
          taskId: currentEditTask.taskId,
          title: title,
          description: description
        });
      }

      document.getElementById('editModal').classList.remove('show');
      currentEditTask = null;
    });

    // Cancel edit
    document.getElementById('cancelEdit').addEventListener('click', () => {
      document.getElementById('editModal').classList.remove('show');
      currentEditTask = null;
    });

    // Close modal on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('editModal').classList.contains('show')) {
        document.getElementById('cancelEdit').click();
      }
    });

    // Drag and drop
    let draggedTask = null;

    document.querySelectorAll('.task').forEach(task => {
      task.addEventListener('dragstart', (e) => {
        draggedTask = task;
        task.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      task.addEventListener('dragend', () => {
        task.classList.remove('dragging');
        document.querySelectorAll('.task').forEach(t => t.classList.remove('drag-over'));
      });

      task.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (draggedTask && draggedTask !== task) {
          task.classList.add('drag-over');
        }
      });

      task.addEventListener('dragleave', () => {
        task.classList.remove('drag-over');
      });

      task.addEventListener('drop', (e) => {
        e.preventDefault();
        task.classList.remove('drag-over');

        if (!draggedTask || draggedTask === task) return;

        const fromColumnId = draggedTask.dataset.columnId;
        const toColumnId = task.dataset.columnId;
        const taskId = draggedTask.dataset.taskId;
        const toIndex = parseInt(task.dataset.taskIndex);

        vscode.postMessage({
          type: 'moveTask',
          taskId: taskId,
          fromColumn: fromColumnId,
          toColumn: toColumnId,
          toIndex: toIndex
        });
      });
    });

    // Allow drop on empty columns
    document.querySelectorAll('.column-section').forEach(column => {
      column.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      column.addEventListener('drop', (e) => {
        e.preventDefault();

        if (!draggedTask) return;

        const toColumnId = column.dataset.columnId;
        const fromColumnId = draggedTask.dataset.columnId;
        const taskId = draggedTask.dataset.taskId;

        // Drop at end of column
        vscode.postMessage({
          type: 'moveTask',
          taskId: taskId,
          fromColumn: fromColumnId,
          toColumn: toColumnId,
          toIndex: 999 // Will be clamped to end
        });
      });
    });

    // Add task buttons
    document.querySelectorAll('.add-task-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const columnId = btn.dataset.columnId;
        vscode.postMessage({
          type: 'addTaskToColumn',
          columnId: columnId
        });
      });
    });

    // Column collapse/expand
    document.querySelectorAll('.column-header').forEach(header => {
      header.addEventListener('click', (e) => {
        // Don't collapse if clicking on add button
        if (e.target.closest('.add-task-btn')) {
          return;
        }
        const columnSection = header.closest('.column-section');
        columnSection.classList.toggle('collapsed');
      });
    });

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;

        // Update tab buttons
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Remove change indicator when viewing the tab
        tab.classList.remove('has-changes');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        document.getElementById(tabName + 'Tab').classList.add('active');
      });
    });

    // Title editing
    let originalTitle = '';

    const editTitle = () => {
      const titleEl = document.getElementById('boardTitle');
      originalTitle = titleEl.textContent;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'settings-input';
      input.value = originalTitle;
      input.style.fontSize = '14px';
      input.style.fontWeight = '600';
      input.style.padding = '4px 6px';

      titleEl.replaceWith(input);
      input.focus();
      input.select();

      const saveTitle = () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== originalTitle) {
          vscode.postMessage({
            type: 'updateTitle',
            title: newTitle
          });
        }

        const titleDiv = document.createElement('div');
        titleDiv.className = 'board-title';
        titleDiv.id = 'boardTitle';
        titleDiv.textContent = newTitle || originalTitle;
        titleDiv.addEventListener('click', editTitle);

        input.replaceWith(titleDiv);
      };

      input.addEventListener('blur', saveTitle);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          saveTitle();
        } else if (e.key === 'Escape') {
          const titleDiv = document.createElement('div');
          titleDiv.className = 'board-title';
          titleDiv.id = 'boardTitle';
          titleDiv.textContent = originalTitle;
          titleDiv.addEventListener('click', editTitle);
          input.replaceWith(titleDiv);
        }
      });
    };

    document.getElementById('boardTitle').addEventListener('click', editTitle);
    document.getElementById('titleEditBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      editTitle();
    });

    // Clear cache button
    document.getElementById('clearCacheBtn').addEventListener('click', () => {
      vscode.postMessage({
        type: 'clearCache'
      });
    });

    // Handle board updates from file changes
    let previousBoard = ${JSON.stringify(board)};

    window.addEventListener('message', (event) => {
      const message = event.data;

      if (message.type === 'boardUpdate') {
        const newBoard = message.board;
        const activeTab = document.querySelector('.tab.active').dataset.tab;

        // Check what changed
        const tasksChanged = JSON.stringify(newBoard.columns) !== JSON.stringify(previousBoard.columns);
        const rulesChanged = JSON.stringify(newBoard.rules) !== JSON.stringify(previousBoard.rules);

        // Update indicators if not on active tab
        if (activeTab !== 'tasks' && tasksChanged) {
          document.querySelector('[data-tab="tasks"]').classList.add('has-changes');
        }
        if (activeTab !== 'rules' && rulesChanged) {
          document.querySelector('[data-tab="rules"]').classList.add('has-changes');
        }

        // Update the content
        previousBoard = newBoard;

        // Update title
        const titleEl = document.getElementById('boardTitle');
        if (titleEl && titleEl.textContent !== newBoard.title) {
          titleEl.textContent = newBoard.title;
        }

        // Rebuild the tabs content (but don't switch tabs)
        updateTabsContent(newBoard, activeTab);
      }
    });

    function getSubtaskProgress(subtasks) {
      if (!subtasks || subtasks.length === 0) return 0;
      const completed = subtasks.filter(st => st.completed).length;
      return Math.round((completed / subtasks.length) * 100);
    }

    function getCompletedSubtaskCount(subtasks) {
      if (!subtasks) return 0;
      return subtasks.filter(st => st.completed).length;
    }

    function updateTabsContent(board, activeTab) {
      // Store currently expanded tasks before updating
      const expandedTasks = new Set();
      document.querySelectorAll('.task.expanded').forEach(task => {
        expandedTasks.add(task.dataset.taskId);
      });

      // Update tasks tab
      const tasksTab = document.getElementById('tasksTab');
      tasksTab.innerHTML = \`
        <div class="board-header">
          <div class="progress-section">
            <div class="progress-label">
              <span>Progress</span>
              <span class="progress-percent">\${calculateProgress(board)}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: \${calculateProgress(board)}%"></div>
            </div>
          </div>

          <div class="stats">
            <div class="stat">
              <div class="stat-value">\${getTotalTasks(board)}</div>
              <div class="stat-label">Total</div>
            </div>
            <div class="stat">
              <div class="stat-value">\${getDoneTasks(board)}</div>
              <div class="stat-label">Done</div>
            </div>
          </div>
        </div>

        \${board.columns.map(col => \`
          <div class="column-section" data-column-id="\${col.id}">
            <div class="column-header">
              <div class="column-header-title">
                <span class="collapse-icon">▼</span>
                <span>\${escapeHtml(col.title)}</span>
              </div>
              <div class="column-header-right">
                <button class="add-task-btn" data-column-id="\${col.id}" title="Add task to \${escapeHtml(col.title)}">+</button>
                <span class="task-count">\${col.tasks.length}</span>
              </div>
            </div>
            \${col.tasks.length === 0
              ? '<div class="empty-state">No tasks</div>'
              : col.tasks.map((task, index) => \`
                <div class="task"
                     data-task-id="\${task.id}"
                     data-column-id="\${col.id}"
                     data-task-index="\${index}"
                     draggable="true">
                  <div class="task-header">
                    <span class="drag-handle">⋮⋮</span>
                    <div class="task-title">\${escapeHtml(task.title)}</div>
                    <div class="task-actions">
                      <button class="task-action edit" data-action="edit" title="Edit">✎</button>
                      \${col.id === 'done' ? '<button class="task-action archive" data-action="archive" title="Archive">⬇</button>' : ''}
                      <button class="task-action delete" data-action="delete" title="Delete">×</button>
                    </div>
                  </div>
                  <div class="task-description">\${renderMarkdown(task.description || '')}</div>
                  \${task.subtasks && task.subtasks.length > 0 ? \`
                    <div class="subtasks-container">
                      <div class="subtask-progress">
                        <div class="subtask-progress-bar">
                          <div class="subtask-progress-fill" style="width: \${getSubtaskProgress(task.subtasks)}%"></div>
                        </div>
                        <span class="subtask-count">\${getCompletedSubtaskCount(task.subtasks)}/\${task.subtasks.length}</span>
                      </div>
                      <ul class="subtask-list">
                        \${task.subtasks.map(subtask => \`
                          <li class="subtask-item \${subtask.completed ? 'completed' : ''}" data-task-id="\${task.id}" data-subtask-id="\${subtask.id}">
                            <div class="subtask-checkbox"></div>
                            <span class="subtask-title">\${escapeHtml(subtask.title)}</span>
                          </li>
                        \`).join('')}
                      </ul>
                    </div>
                  \` : ''}
                  \${task.relatedFiles && task.relatedFiles.length > 0 ? \`
                    <div class="task-related-files">
                      \${task.relatedFiles.map(file => \`
                        <div class="related-file" data-file="\${file}">📄 \${file}</div>
                      \`).join('')}
                    </div>
                  \` : ''}
                </div>
              \`).join('')
            }
          </div>
        \`).join('')}
      \`;

      // Update rules tab
      const rulesTab = document.getElementById('rulesTab');
      rulesTab.innerHTML = board.rules ? \`
        <div class="rules-view">
          \${board.rules.always && board.rules.always.length > 0 ? \`
            <div class="rules-category">
              <div class="rules-category-title">ALWAYS</div>
              \${board.rules.always.map(rule => \`
                <div class="rule-item-full">
                  <div class="rule-number">\${rule.id}</div>
                  <div class="rule-text">\${escapeHtml(rule.rule)}</div>
                </div>
              \`).join('')}
            </div>
          \` : ''}

          \${board.rules.never && board.rules.never.length > 0 ? \`
            <div class="rules-category">
              <div class="rules-category-title">NEVER</div>
              \${board.rules.never.map(rule => \`
                <div class="rule-item-full">
                  <div class="rule-number">\${rule.id}</div>
                  <div class="rule-text">\${escapeHtml(rule.rule)}</div>
                </div>
              \`).join('')}
            </div>
          \` : ''}

          \${board.rules.prefer && board.rules.prefer.length > 0 ? \`
            <div class="rules-category">
              <div class="rules-category-title">PREFER</div>
              \${board.rules.prefer.map(rule => \`
                <div class="rule-item-full">
                  <div class="rule-number">\${rule.id}</div>
                  <div class="rule-text">\${escapeHtml(rule.rule)}</div>
                </div>
              \`).join('')}
            </div>
          \` : ''}

          \${board.rules.context && board.rules.context.length > 0 ? \`
            <div class="rules-category">
              <div class="rules-category-title">CONTEXT</div>
              \${board.rules.context.map(rule => \`
                <div class="rule-item-full">
                  <div class="rule-number">\${rule.id}</div>
                  <div class="rule-text">\${escapeHtml(rule.rule)}</div>
                </div>
              \`).join('')}
            </div>
          \` : ''}
        </div>
      \` : '<div class="empty-state">No rules defined</div>';

      // Update archive tab
      const archiveTab = document.getElementById('archiveTab');
      archiveTab.innerHTML = board.archive && board.archive.length > 0 ? \`
        <div class="archive-view">
          \${board.archive.map(task => \`
            <div class="task archived-task" data-task-id="\${task.id}">
              <div class="task-header">
                <div class="task-title">\${escapeHtml(task.title)}</div>
              </div>
              <div class="task-description">\${renderMarkdown(task.description)}</div>
              \${task.relatedFiles && task.relatedFiles.length > 0 ? \`
                <div class="task-related-files">
                  \${task.relatedFiles.map(file => \`
                    <div class="related-file" data-file="\${escapeHtml(file)}">📄 \${escapeHtml(file)}</div>
                  \`).join('')}
                </div>
              \` : ''}
            </div>
          \`).join('')}
        </div>
      \` : '<div class="empty-state">No archived tasks</div>';

      // Re-attach event listeners for tasks
      attachTaskEventListeners();

      // Restore expanded state
      expandedTasks.forEach(taskId => {
        const taskEl = document.querySelector(\`.task[data-task-id="\${taskId}"]\`);
        if (taskEl) {
          taskEl.classList.add('expanded');
        }
      });
    }

    function calculateProgress(board) {
      const total = board.columns.reduce((sum, col) => sum + col.tasks.length, 0);
      const done = board.columns.find(col => col.id === 'done')?.tasks.length || 0;
      return total > 0 ? Math.round((done / total) * 100) : 0;
    }

    function getTotalTasks(board) {
      return board.columns.reduce((sum, col) => sum + col.tasks.length, 0);
    }

    function getDoneTasks(board) {
      return board.columns.find(col => col.id === 'done')?.tasks.length || 0;
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function renderMarkdown(text) {
      if (!text) return '';
      // Basic markdown rendering - you might want to use a library like marked for full support
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
        .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
        .replace(/\\n/g, '<br>');
    }

    function attachTaskEventListeners() {
      // Re-attach all task-related event listeners
      document.querySelectorAll('.task').forEach(taskEl => {
        taskEl.addEventListener('click', (e) => {
          if (e.target.closest('.task-action') || e.target.closest('.drag-handle') || e.target.closest('.related-file') || e.target.closest('.subtask-item')) {
            return;
          }
          taskEl.classList.toggle('expanded');
        });
      });

      // Re-attach subtask clicks
      document.querySelectorAll('.subtask-item').forEach(subtaskEl => {
        subtaskEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const taskId = subtaskEl.dataset.taskId;
          const subtaskId = subtaskEl.dataset.subtaskId;
          vscode.postMessage({
            type: 'toggleSubtask',
            taskId: taskId,
            subtaskId: subtaskId
          });
        });
      });

      // Related file clicks
      document.querySelectorAll('.related-file').forEach(fileEl => {
        fileEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const filePath = fileEl.dataset.file;
          if (filePath) {
            vscode.postMessage({
              type: 'openFile',
              filePath: filePath
            });
          }
        });
      });

      document.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const taskEl = e.target.closest('.task');
          const taskId = taskEl.dataset.taskId;
          const columnId = taskEl.dataset.columnId;
          const title = taskEl.querySelector('.task-title').textContent;
          const description = taskEl.querySelector('.task-description').textContent;

          currentEditTask = { taskId, columnId };
          document.getElementById('editTitle').value = title;
          document.getElementById('editDescription').value = description;
          document.getElementById('editModal').classList.add('show');
          document.getElementById('editTitle').focus();
        });
      });

      document.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const taskEl = e.target.closest('.task');
          const taskId = taskEl.dataset.taskId;
          const columnId = taskEl.dataset.columnId;

          vscode.postMessage({
            type: 'deleteTask',
            columnId: columnId,
            taskId: taskId
          });
        });
      });

      // Archive action
      document.querySelectorAll('[data-action="archive"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const taskEl = e.target.closest('.task');
          const taskId = taskEl.dataset.taskId;
          const columnId = taskEl.dataset.columnId;

          vscode.postMessage({
            type: 'archiveTask',
            columnId: columnId,
            taskId: taskId
          });
        });
      });

      // Re-attach add task buttons
      document.querySelectorAll('.add-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const columnId = btn.dataset.columnId;
          vscode.postMessage({
            type: 'addTaskToColumn',
            columnId: columnId
          });
        });
      });

      // Re-attach column collapse listeners
      document.querySelectorAll('.column-header').forEach(header => {
        header.addEventListener('click', (e) => {
          // Don't collapse if clicking on add button
          if (e.target.closest('.add-task-btn')) {
            return;
          }
          const columnSection = header.closest('.column-section');
          columnSection.classList.toggle('collapsed');
        });
      });

      // Re-attach drag and drop
      attachDragAndDrop();
    }

    function attachDragAndDrop() {
      let draggedTask = null;

      document.querySelectorAll('.task').forEach(task => {
        task.addEventListener('dragstart', (e) => {
          draggedTask = task;
          task.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
        });

        task.addEventListener('dragend', () => {
          task.classList.remove('dragging');
          document.querySelectorAll('.task').forEach(t => t.classList.remove('drag-over'));
        });

        task.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';

          if (draggedTask && draggedTask !== task) {
            task.classList.add('drag-over');
          }
        });

        task.addEventListener('dragleave', () => {
          task.classList.remove('drag-over');
        });

        task.addEventListener('drop', (e) => {
          e.preventDefault();
          task.classList.remove('drag-over');

          if (!draggedTask || draggedTask === task) return;

          const fromColumnId = draggedTask.dataset.columnId;
          const toColumnId = task.dataset.columnId;
          const taskId = draggedTask.dataset.taskId;
          const toIndex = parseInt(task.dataset.taskIndex);

          vscode.postMessage({
            type: 'moveTask',
            taskId: taskId,
            fromColumn: fromColumnId,
            toColumn: toColumnId,
            toIndex: toIndex
          });
        });
      });

      document.querySelectorAll('.column-section').forEach(column => {
        column.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        });

        column.addEventListener('drop', (e) => {
          e.preventDefault();

          if (!draggedTask) return;

          const toColumnId = column.dataset.columnId;
          const fromColumnId = draggedTask.dataset.columnId;
          const taskId = draggedTask.dataset.taskId;

          vscode.postMessage({
            type: 'moveTask',
            taskId: taskId,
            fromColumn: fromColumnId,
            toColumn: toColumnId,
            toIndex: 999
          });
        });
      });
    }
  </script>
</body>
</html>`;
  }

  private getErrorHtml(message: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      padding: 20px;
      color: var(--vscode-errorForeground);
      font-family: var(--vscode-font-family);
    }
  </style>
</head>
<body>
  <p>Error: ${this.escapeHtml(message)}</p>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private renderMarkdown(text: string | undefined): string {
    if (!text) return '';

    // Configure marked for safe rendering
    marked.setOptions({
      breaks: true,
      gfm: true
    });

    // Parse markdown and sanitize
    const html = marked.parse(text) as string;
    return html;
  }

  public dispose() {
    // Clean up all resources properly
    this.disposeWatchers();

    // Clear any pending timers
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = undefined;
    }

    // Dispose all tracked disposables
    this._disposables.forEach(d => {
      try {
        d.dispose();
      } catch (error) {
        log('Error disposing resource:', error);
      }
    });
    this._disposables = [];

    // Clear view reference
    this._view = undefined;

    log('BoardViewProvider disposed');
  }
}
