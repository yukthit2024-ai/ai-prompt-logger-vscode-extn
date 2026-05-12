import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

    console.log('AI Interaction Logger is now active');

    // Define the chat participant
    const handler: vscode.ChatRequestHandler = async (request: vscode.ChatRequest, chatContext: vscode.ChatContext, response: vscode.ChatResponseStream, token: vscode.CancellationToken) => {
        
        const prompt = request.prompt;
        const lowerPrompt = prompt.toLowerCase();

        // Check if user is asking for help or explanation
        if (lowerPrompt.includes('how it works') || lowerPrompt.includes('help') || lowerPrompt.includes('what do you do')) {
            const helpResponse = `### 🤖 AI Interaction Logger Help\n\nI am designed to capture and archive your AI interactions.\n\n**How I work:**\n1. I capture every prompt you send to me (@ai-logger).\n2. I save the interaction as a timestamped \`.txt\` file.\n3. I organize these logs in your workspace or a custom directory.\n\n**Commands you can use:**\n- \`AI Logger: Log Manual Entry\`: Manually log an external interaction.\n- \`AI Logger: Open Logs Directory\`: Quickly open your logs folder.\n\n**Configuration:**\n- Use \`aiInteractionLogger.logDirectory\` in settings to change where I save files.\n\n_Everything you say to me from now on will be logged!_`;
            
            // Log the help request too
            await logInteraction(prompt, "Displayed Help Documentation");
            
            response.markdown(helpResponse);
            return { metadata: { command: '' } };
        }
        
        // Default: Log the interaction
        const logPath = await logInteraction(prompt, "Logging this interaction...");

        const aiResponse = `### Interaction Logged ✅\n\nI have captured your prompt: **"${prompt}"**\n\n- **Timestamp:** ${new Date().toLocaleString()}\n- **File Path:** \`${logPath || 'Unknown'}\`\n\n> [!TIP]\n> You can view all your logs by running the **AI Logger: Open Logs Directory** command.`;

        response.markdown(aiResponse);

        return { metadata: { command: '' } };
    };

    // Register the chat participant
    const agent = vscode.chat.createChatParticipant('ai-logger.agent', handler);
    agent.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.png');

    // Manual logging command
    let logManualDisposable = vscode.commands.registerCommand('ai-interaction-logger.logManual', async () => {
        const prompt = await vscode.window.showInputBox({ prompt: 'Enter the prompt you want to log' });
        if (!prompt) return;

        const response = await vscode.window.showInputBox({ prompt: 'Enter the AI response you want to log' });
        if (!response) return;

        await logInteraction(prompt, response);
    });

    // Open logs directory command
    let openDirDisposable = vscode.commands.registerCommand('ai-interaction-logger.openLogDir', async () => {
        let logDirStr = vscode.workspace.getConfiguration('aiInteractionLogger').get<string>('logDirectory');
        let logDirUri: vscode.Uri;
        
        if (logDirStr) {
            logDirUri = vscode.Uri.file(logDirStr);
        } else if (vscode.workspace.workspaceFolders) {
            logDirUri = vscode.workspace.workspaceFolders[0].uri;
        } else {
            const home = process.env.USERPROFILE || process.env.HOME || '.';
            logDirUri = vscode.Uri.file(home);
        }

        await vscode.commands.executeCommand('revealFileInOS', logDirUri);
    });

    // Run diagnostics command
    let diagnosticsDisposable = vscode.commands.registerCommand('ai-interaction-logger.runDiagnostics', async () => {
        const testPrompt = "DIAGNOSTIC TEST";
        const testResponse = "If you see this file, the extension is working correctly.";
        
        vscode.window.showInformationMessage("Starting diagnostics...");
        
        const result = await logInteraction(testPrompt, testResponse);
        
        if (result) {
            vscode.window.showInformationMessage(`✅ Success! Test file created at: ${result}`);
        } else {
            vscode.window.showErrorMessage("❌ Failure! Could not create test file. Check Extension Host logs.");
        }
    });

    context.subscriptions.push(logManualDisposable, openDirDisposable, diagnosticsDisposable);
}

async function logInteraction(prompt: string, aiResponse: string): Promise<string | null> {
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
    const content = `TIMESTAMP: ${now.toLocaleString()}\nPROMPT:\n${prompt}\n\n${separator}\n\nRESPONSE:\n${aiResponse}\n`;

    let logDirUri: vscode.Uri | undefined;
    let logDirStr = vscode.workspace.getConfiguration('aiInteractionLogger').get<string>('logDirectory');
    
    if (logDirStr) {
        logDirUri = vscode.Uri.file(logDirStr);
    } else if (vscode.workspace.workspaceFolders) {
        logDirUri = vscode.workspace.workspaceFolders[0].uri;
    } else {
        // Fallback to home directory
        const home = process.env.USERPROFILE || process.env.HOME || '.';
        logDirUri = vscode.Uri.file(home);
    }

    const fileUri = vscode.Uri.joinPath(logDirUri, fileName);

    try {
        // Ensure directory exists (create if missing)
        await vscode.workspace.fs.createDirectory(logDirUri);

        // Write the file
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        await vscode.workspace.fs.writeFile(fileUri, data);

        console.log(`Logged to ${fileUri.fsPath}`);
        vscode.window.showInformationMessage(`Interaction logged: ${fileName}`);
        return fileUri.fsPath;
    } catch (err) {
        const errorMsg = `Failed to write log file to ${fileUri.fsPath}: ${err}`;
        console.error(errorMsg);
        vscode.window.showErrorMessage(errorMsg);
        return null;
    }
}

export function deactivate() {}
