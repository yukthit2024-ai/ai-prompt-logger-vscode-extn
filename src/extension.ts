import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

    console.log('AI Interaction Logger is now active');

    // Define the chat participant
    const handler: vscode.ChatRequestHandler = async (request: vscode.ChatRequest, chatContext: vscode.ChatContext, response: vscode.ChatResponseStream, token: vscode.CancellationToken) => {
        
        const prompt = request.prompt;
        // In a real scenario, you'd call an actual AI API here.
        // For this extension, we'll just echo or use a placeholder response 
        // to demonstrate the logging capability.
        const aiResponse = `I received your prompt: "${prompt}". This interaction has been logged.`;

        response.markdown(aiResponse);

        // Log the interaction
        await logInteraction(prompt, aiResponse);

        return { metadata: { command: '' } };
    };

    // Register the chat participant
    const agent = vscode.chat.createChatParticipant('ai-logger.agent', handler);
    agent.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.png');

    // Manual logging command
    let disposable = vscode.commands.registerCommand('ai-interaction-logger.logManual', async () => {
        const prompt = await vscode.window.showInputBox({ prompt: 'Enter the prompt you want to log' });
        if (!prompt) return;

        const response = await vscode.window.showInputBox({ prompt: 'Enter the AI response you want to log' });
        if (!response) return;

        await logInteraction(prompt, response);
        vscode.window.showInformationMessage('Interaction logged successfully!');
    });

    context.subscriptions.push(disposable);
}

async function logInteraction(prompt: string, aiResponse: string) {
    const now = new Date();
    
    // Format: yyyyMMdd.hhmmss
    const timestamp = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') + '.' +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');

    const fileName = `prompt-and-response-${timestamp}.txt`;
    
    const separator = '-'.repeat(50);
    const content = `PROMPT:\n${prompt}\n\n${separator}\n\nRESPONSE:\n${aiResponse}\n`;

    let logDir = vscode.workspace.getConfiguration('aiInteractionLogger').get<string>('logDirectory');
    
    if (!logDir && vscode.workspace.workspaceFolders) {
        logDir = vscode.workspace.workspaceFolders[0].uri.fsPath;
    }

    if (!logDir) {
        // Fallback to home directory if no workspace is open
        logDir = process.env.USERPROFILE || process.env.HOME || '.';
    }

    const filePath = path.join(logDir, fileName);

    try {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Logged to ${filePath}`);
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to write log file: ${err}`);
    }
}

export function deactivate() {}
