// -- IMPORTS

const vscode = require( 'vscode' );
const path = require( 'path' );
const { exec } = require( 'child_process' );

// -- FUNCTIONS

function getFolderLabel(
    folderPath
    )
{
    if ( vscode.workspace.workspaceFolders !== undefined
         && vscode.workspace.workspaceFolders.length > 0 )
    {
        let baseFolderPath = vscode.workspace.workspaceFolders[ 0 ].uri.fsPath;

        if ( baseFolderPath !== undefined )
        {
            if ( folderPath === baseFolderPath )
            {
                return '.';
            }
            else if ( folderPath.startsWith( baseFolderPath + '\\' )
                      || folderPath.startsWith( baseFolderPath + '/' ) )
            {
                return '.' + folderPath.substring( baseFolderPath.length );
            }
        }
    }

    return folderPath;
}

// -- TYPES

class FolderItem
    extends vscode.TreeItem
{
    // -- CONSTRUCTORS

    constructor(
        label,
        uri
        )
    {
        super( label, vscode.TreeItemCollapsibleState.Expanded );

        this.resourceUri = uri;
        this.contextValue = 'folder';
    }
}

// --

class FileItem
    extends vscode.TreeItem
{
    constructor(
        label,
        uri
        )
    {
        super( label, vscode.TreeItemCollapsibleState.None );

        this.resourceUri = uri;
        this.contextValue = 'file';
        this.command = { command: 'vscode.open', title: 'Open File', arguments: [ uri ] };
    }
}

// --

class FileDataProvider
{
    // -- CONSTRUCTORS

    constructor(
        )
    {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }

    // -- INQUIRIES

    getTreeItem(
        element
        )
    {
        return element;
    }

    // ~~

    getChildren(
        element
        )
    {
        let documentArrayByFolderPathMap = {};

        for ( let tabGroup of vscode.window.tabGroups.all )
        {
            for ( let tab of tabGroup.tabs )
            {
                if ( tab.input instanceof vscode.TabInputText )
                {
                    let filePath = tab.input.uri.fsPath;
                    let fileName = path.basename( filePath );
                    let folderPath = path.dirname( filePath );
                    let fileUri = tab.input.uri;

                    if ( !documentArrayByFolderPathMap[ folderPath ] )
                    {
                        documentArrayByFolderPathMap[ folderPath ] = [];
                    }

                    documentArrayByFolderPathMap[ folderPath ].push( { fileName, fileUri } );
                }
            }
        }

        if ( element )
        {
            let folderPath = element.resourceUri.fsPath;

            if ( documentArrayByFolderPathMap[ folderPath ] )
            {
                let sortedDocumentArray
                    = documentArrayByFolderPathMap[ folderPath ].sort(
                        ( firstDocument, secondDocument ) => firstDocument.fileName.localeCompare( secondDocument.fileName )
                        );

                return Promise.resolve(
                    sortedDocumentArray.map( ( document ) => new FileItem( document.fileName, document.fileUri ) )
                    );
            }
            return Promise.resolve( [] );
        }
        else
        {
            let sortedFolderPathArray = Object.keys( documentArrayByFolderPathMap ).sort();

            return Promise.resolve(
                sortedFolderPathArray.map(
                    ( folderPath ) => new FolderItem( getFolderLabel( folderPath ), vscode.Uri.file( folderPath ) )
                    )
                );
        }
    }

    refresh(
        )
    {
        this._onDidChangeTreeData.fire();
    }
}

// ~~

function activate(
    context
    )
{
    let fileDataProvider = new FileDataProvider();
    vscode.window.registerTreeDataProvider( 'Folio', fileDataProvider );

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(
            () =>fileDataProvider.refresh()
            )
        );

    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(
            () =>fileDataProvider.refresh()
            )
        );

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(
            () =>fileDataProvider.refresh()
            )
        );

    context.subscriptions.push(
        vscode.window.onDidChangeVisibleTextEditors(
            () =>fileDataProvider.refresh()
            )
        );

    context.subscriptions.push(
        vscode.window.onDidChangeWindowState(
            () =>fileDataProvider.refresh()
            )
        );

    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorViewColumn(
            () =>fileDataProvider.refresh()
            )
        );

    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(
            () =>fileDataProvider.refresh()
            )
        );

    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorVisibleRanges(
            () =>fileDataProvider.refresh()
            )
        );

    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorOptions(
            () =>fileDataProvider.refresh()
            )
        );

    context.subscriptions.push(
        vscode.window.onDidChangeActiveColorTheme(
            () =>fileDataProvider.refresh()
            )
        );

    let openInExplorer
        = vscode.commands.registerCommand(
            'extension.openInExplorer',
            ( item ) =>
            {
                if ( item.contextValue === 'folder' )
                {
                    exec( `explorer "${ item.resourceUri.fsPath }"` );
                }
                else if ( item.contextValue === 'file' )
                {
                    exec( `explorer /select,"${ item.resourceUri.fsPath }"` );
                }
            }
            );

    context.subscriptions.push( openInExplorer );
}

// -- EXPORTS

exports.activate = activate;
