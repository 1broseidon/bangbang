import * as vscode from 'vscode';
import { BoardViewProvider } from './boardViewProvider';

const LOG_PREFIX = '[BangBang]';

export function log(...args: any[]) {
  console.log(LOG_PREFIX, ...args);
}

export function activate(context: vscode.ExtensionContext) {
  log('Extension activated');

  try {
    // Register the tasks view provider
    const provider = new BoardViewProvider(context.extensionUri);

    // Register webview provider with proper options
    const webviewDisposable = vscode.window.registerWebviewViewProvider(
      BoardViewProvider.viewType,
      provider,
      {
        // Ensure webview content is retained when hidden
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    );
    context.subscriptions.push(webviewDisposable);

    // Add provider to subscriptions for proper disposal
    context.subscriptions.push(provider as any);

    // Register commands
    context.subscriptions.push(
      vscode.commands.registerCommand('bangbang.refresh', () => {
        log('Refreshing tasks');
        provider.refresh();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('bangbang.createBoard', () => {
        log('Creating new BangBang board');
        provider.createBoard();
      })
    );

    log('All providers and commands registered');
  } catch (error) {
    log('Error activating extension:', error);
    vscode.window.showErrorMessage('Failed to activate BangBang extension');
  }
}

export function deactivate() {
  log('Extension deactivating...');
  // All cleanup will be handled by disposal of subscriptions
  log('Extension deactivated');
}
