# vsdbg patcher

A VS Code extension that automatically patches `libvsdbg.so` in the C# extension, enabling vsdbg to work seamlessly with code-oss (open source builds of VS Code) on Linux.

> **⚠️ Linux Only**: This extension is designed for Linux systems only. The patch targets the Linux version of libvsdbg.so.

## Features

- **Automatic Patching** - Detects and patches unpatched libvsdbg.so on startup
- **Manual Controls** - Commands to patch, restore, and check status when needed
- **Safe Operations** - Automatic backups and verification
- **Silent Operation** - Works in the background without interrupting your workflow

The extension automatically locates the C# extension's debugger folder and handles all file operations safely with automatic backups.

## Requirements

- **Linux operating system** (this extension only works on Linux)
- VS Code (or code-oss)
- C# extension (`ms-dotnettools.csharp`) must be installed

## Usage

### Automatic Mode (Default)

Simply install the extension and restart VS Code. The extension will:
1. Automatically check if libvsdbg.so needs patching on startup
2. Apply the patch if needed (you'll see a notification)
3. Stay silent if already patched

### Manual Commands

Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and run:
- `vsdbg: Patch libvsdbg.so` - Manually apply the patch
- `vsdbg: Check Patch Status` - View current patch status and backup info
- `vsdbg: Restore Original libvsdbg.so` - Restore from backup

## What does the patch do?

The patch modifies a specific byte sequence in `libvsdbg.so` to bypass a check that prevents vsdbg from running in non-official VS Code builds:

- **Original bytes**: `48 89 E7 48 8D 54 24 30 E8 6F BB E9 FF`
- **Patched bytes**: `BB 01 00 00 00 90 90 90 E9 7D 00 00 00`

A backup (`.bak`) is automatically created before any modifications.

## Safety

- Automatic backup creation before first patch
- Automatic detection and patching on startup
- Status check to verify current state
- Easy restoration from backup
- No manual file editing required
- Silent operation when already patched

## Development

To run the extension in development mode:

```bash
npm install
npm run compile
# Press F5 to launch Extension Development Host
```

## Known Issues

None currently. Please report issues on the GitHub repository.

## Release Notes

### 0.0.1

Initial release with automatic patching, manual patch/restore commands, and status checking.

---

**Note**: This extension modifies binary files from the C# extension. Use at your own risk. The patch enables vsdbg debugging in code-oss environments.

