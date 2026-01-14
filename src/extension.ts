import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Byte patterns for patching
const ORIGINAL_BYTES = Buffer.from('4889E7488D542430E86FBBE9FF', 'hex');
const NEW_BYTES = Buffer.from('BB01000000909090E97D000000', 'hex');

export function activate(context: vscode.ExtensionContext) {
	console.log('vsdbg-patcher extension is now active');

	// Automatically check and patch on activation
	autoPatchOnStartup();

	// Register patch command
	const patchCommand = vscode.commands.registerCommand('vsdbg-patcher.patch', async () => {
		try {
			// Check if running on Linux
			if (os.platform() !== 'linux') {
				vscode.window.showErrorMessage('vsdbg-patcher: This extension only works on Linux');
				return;
			}

			const libPath = findLibVsdbg();
			if (!libPath) {
				vscode.window.showErrorMessage('Could not find libvsdbg.so. Is the C# extension installed?');
				return;
			}

			const result = await patchLibVsdbg(libPath);
			if (result.success) {
				vscode.window.showInformationMessage(result.message);
			} else {
				vscode.window.showErrorMessage(result.message);
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Patch failed: ${error}`);
		}
	});

	// Register restore command
	const restoreCommand = vscode.commands.registerCommand('vsdbg-patcher.restore', async () => {
		try {
			// Check if running on Linux
			if (os.platform() !== 'linux') {
				vscode.window.showErrorMessage('vsdbg-patcher: This extension only works on Linux');
				return;
			}

			const libPath = findLibVsdbg();
			if (!libPath) {
				vscode.window.showErrorMessage('Could not find libvsdbg.so. Is the C# extension installed?');
				return;
			}

			const result = await restoreFromBackup(libPath);
			if (result.success) {
				vscode.window.showInformationMessage(result.message);
			} else {
				vscode.window.showErrorMessage(result.message);
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Restore failed: ${error}`);
		}
	});

	// Register status command
	const statusCommand = vscode.commands.registerCommand('vsdbg-patcher.status', async () => {
		try {
			// Check if running on Linux
			if (os.platform() !== 'linux') {
				vscode.window.showInformationMessage('vsdbg-patcher: This extension is designed for Linux only');
				return;
			}

			const libPath = findLibVsdbg();
			if (!libPath) {
				vscode.window.showInformationMessage('C# extension not found or libvsdbg.so does not exist');
				return;
			}

			const status = await checkPatchStatus(libPath);
			vscode.window.showInformationMessage(status);
		} catch (error) {
			vscode.window.showErrorMessage(`Status check failed: ${error}`);
		}
	});

	context.subscriptions.push(patchCommand, restoreCommand, statusCommand);
}

function findLibVsdbg(): string | null {
	// Find C# extension
	const csharpExt = vscode.extensions.getExtension('ms-dotnettools.csharp');
	if (!csharpExt) {
		return null;
	}

	// Look for libvsdbg.so in the debugger folder
	const debuggerPath = path.join(csharpExt.extensionPath, '.debugger', 'libvsdbg.so');
	
	if (fs.existsSync(debuggerPath)) {
		return debuggerPath;
	}

	return null;
}

async function patchLibVsdbg(libPath: string): Promise<{success: boolean, message: string}> {
	try {
		// Create backup if it doesn't exist
		const backupPath = libPath + '.bak';
		if (!fs.existsSync(backupPath)) {
			fs.copyFileSync(libPath, backupPath);
		}

		// Read the file
		const data = fs.readFileSync(libPath);

		// Find the pattern
		const offset = data.indexOf(ORIGINAL_BYTES);

		if (offset === -1) {
			// Check if already patched
			if (data.indexOf(NEW_BYTES) !== -1) {
				return { success: true, message: 'libvsdbg.so is already patched' };
			} else {
				return { success: false, message: 'Original byte pattern not found in libvsdbg.so' };
			}
		}

		// Apply the patch by creating a new buffer
		const patchedData = Buffer.concat([
			data.slice(0, offset),
			NEW_BYTES,
			data.slice(offset + ORIGINAL_BYTES.length)
		]);

		// Write the patched file
		fs.writeFileSync(libPath, patchedData);

		return { 
			success: true, 
			message: `Successfully patched libvsdbg.so at offset 0x${offset.toString(16).toUpperCase()}`
		};
	} catch (error) {
		return { success: false, message: `Patch failed: ${error}` };
	}
}

async function restoreFromBackup(libPath: string): Promise<{success: boolean, message: string}> {
	try {
		const backupPath = libPath + '.bak';
		
		if (!fs.existsSync(backupPath)) {
			return { success: false, message: 'No backup file found (.bak)' };
		}

		fs.copyFileSync(backupPath, libPath);
		return { success: true, message: 'Successfully restored libvsdbg.so from backup' };
	} catch (error) {
		return { success: false, message: `Restore failed: ${error}` };
	}
}

async function checkPatchStatus(libPath: string): Promise<string> {
	try {
		const data = fs.readFileSync(libPath);
		const backupExists = fs.existsSync(libPath + '.bak');
		
		const hasOriginal = data.indexOf(ORIGINAL_BYTES) !== -1;
		const hasPatched = data.indexOf(NEW_BYTES) !== -1;

		let status = `libvsdbg.so: ${libPath}\n`;
		status += `Backup exists: ${backupExists ? 'Yes' : 'No'}\n`;
		status += `Looking for original: ${ORIGINAL_BYTES.toString('hex').toUpperCase()}\n`;
		status += `Looking for patched: ${NEW_BYTES.toString('hex').toUpperCase()}\n`;
		
		if (hasPatched) {
			status += 'Status: PATCHED ✓';
		} else if (hasOriginal) {
			status += 'Status: ORIGINAL (not patched)';
		} else {
			status += 'Status: UNKNOWN (neither original nor patched pattern found)';
		}

		return status;
	} catch (error) {
		return `Failed to check status: ${error}`;
	}
}

async function autoPatchOnStartup() {
	try {
		// Only run on Linux
		if (os.platform() !== 'linux') {
			console.log('vsdbg-patcher: Skipping patch - not running on Linux');
			return;
		}

		const libPath = findLibVsdbg();
		if (!libPath) {
			// C# extension not installed, silently skip
			return;
		}

		const data = fs.readFileSync(libPath);
		const hasOriginal = data.indexOf(ORIGINAL_BYTES) !== -1;
		const hasPatched = data.indexOf(NEW_BYTES) !== -1;

		if (hasPatched) {
			// Already patched, nothing to do
			console.log('vsdbg-patcher: libvsdbg.so is already patched');
			return;
		}

		if (hasOriginal) {
			// Needs patching, apply it automatically
			console.log('vsdbg-patcher: Unpatched libvsdbg.so detected, applying patch...');
			const result = await patchLibVsdbg(libPath);
			
			if (result.success) {
				vscode.window.showInformationMessage('vsdbg-patcher: Automatically patched libvsdbg.so for code-oss compatibility');
				console.log('vsdbg-patcher: Auto-patch successful');
			} else {
				vscode.window.showWarningMessage(`vsdbg-patcher: Auto-patch failed - ${result.message}`);
				console.error('vsdbg-patcher: Auto-patch failed:', result.message);
			}
		}
	} catch (error) {
		console.error('vsdbg-patcher: Auto-patch check failed:', error);
	}
}

export function deactivate() {}
