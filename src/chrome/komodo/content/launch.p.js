/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 * 
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is Komodo code.
 * 
 * The Initial Developer of the Original Code is ActiveState Software Inc.
 * Portions created by ActiveState Software Inc are Copyright (C) 2000-2007
 * ActiveState Software Inc. All Rights Reserved.
 * 
 * Contributor(s):
 *   ActiveState Software Inc
 * 
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * 
 * ***** END LICENSE BLOCK ***** */

/*
 * This file contains the functions that launch new windows such as
 * the help system, Rx, etc.
 *
 */

if (typeof(ko) == 'undefined') {
    var ko = {};
}
ko.launch = {};
ko.help = {};


(function () {
var _log = ko.logging.getLogger("ko.help");

var _bundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
        .getService(Components.interfaces.nsIStringBundleService)
        .createBundle("chrome://komodo/locale/komodo.properties");

/* XXX duplicated from help/content/contextHelp.js.  We do NOT want
   alwaysRaised attribute on the window, that's obnoxious! */

function openHelp(topic, contentPack)
{
  var helpFileURI = contentPack || helpFileURI;

  var topWindow = locateHelpWindow(helpFileURI);

  if ( topWindow ) {
    topWindow.focus();
    topWindow.displayTopic(topic);
  } else {
    const params = Components.classes["@mozilla.org/embedcomp/dialogparam;1"]
                             .createInstance(Components.interfaces.nsIDialogParamBlock);
    params.SetNumberStrings(2);
    params.SetString(0, helpFileURI);
    params.SetString(1, topic);
    ko.windowManager.openOrFocusDialog(
        "chrome://help/content/help.xul",
        "mozilla:help",
        "chrome,all,close=yes",
        params);
  }
}

function locateHelpWindow(contentPack) {
    const windowManagerInterface = Components
        .classes['@mozilla.org/appshell/window-mediator;1'].getService()
        .QueryInterface(Components.interfaces.nsIWindowMediator);
    const iterator = windowManagerInterface.getEnumerator("mozilla:help");
    var topWindow = null;
    var aWindow;

    while (iterator.hasMoreElements()) {
        aWindow = iterator.getNext();
        if (aWindow.getHelpFileURI() == contentPack) {
            topWindow = aWindow;
        }
    }
    return topWindow;
}
/* end of contextHelp.js duplication */

/**
 * Open the Komodo help window.
 *
 * @param page {String} A page tag as defined in toc.xml
 */
this.open = function(page) {
    openHelp(page, 'chrome://komododoc/locale/komodohelp.rdf');
}

/**
 * Opens language specific help for the current buffer.
 *
 * @param searchTerm {string}  Open language help for this search term.
 */
this.language = function(searchTerm) {
    // Get the current document's language.
    var language = null;
    var view = ko.window.focusedView();
    if (!view) view = ko.views.manager.currentView;
    if (view != null) {
        if (view.koDoc) {
            language = view.koDoc.subLanguage;
            if (language == "XML") {
                // use the primary language, not the sublanguage
                language = view.koDoc.language
            }
        } else {
            language = view.language;
        }
    }

    // Get the help command appropriate for that language.
    var command=null, name=null;
    if (language) {
        if (gPrefs.hasStringPref(language+'HelpCommand')) {
            command = gPrefs.getStringPref(language+'HelpCommand');
        } else {
            // try to get from the language service
            var langRegistrySvc = Components.classes['@activestate.com/koLanguageRegistryService;1'].
                              getService(Components.interfaces.koILanguageRegistryService);
            var languageObj = langRegistrySvc.getLanguage(language);
            if (languageObj.searchURL) {
                var searchURL = languageObj.searchURL;
                if (searchURL.indexOf("?") == -1) {
                    // search with google, encode URL correctly.
                    searchURL = ("http://www.google.com/search?q="
                                 + encodeURIComponent("site:" + searchURL)
                                 + "+%W");
                }
// #if PLATFORM == "darwin"
                command = "open " + searchURL;
// #else
                command = "%(browser) " + searchURL;
// #endif
            }
        }
        if (command) {
            name = language + " Help";
        }
    }
    if (!command) {
        // Couldn't find language-specific help command -- use the default one.
        command = gPrefs.getStringPref('DefaultHelpCommand');
        name = "Help";
    }

    if (searchTerm && command.indexOf("%W") >= 0) {
        command = command.replace("%W", searchTerm);
    }

    ko.run.runCommand(window,
                   command,
                   null, // cwd
                   null, // env
                   false, // insertOutput
                   false, // operateOnSelection
                   true, // doNotOpenOutputWindow
                   'no-console', // runIn
                   0, // parseOutput
                   '', // parseRegex
                   0, // showParsedOutputList
                   name); // name
}


/**
 * Launches the alternate help command.
 */
this.alternate = function() {
    var command = gPrefs.getStringPref('OtherHelpCommand');
    ko.run.runCommand(window,
                   command,
                   null, // cwd
                   null, // env
                   false, // insertOutput
                   false, // operateOnSelection
                   true, // doNotOpenOutputWindow
                   'no-console', // runIn
                   0, // parseOutput
                   '', // parseRegex
                   0, // showParsedOutputList
                   "Alternate Help"); // name
}


/**
 * Open the Komodo error log for viewing.
 */
this.viewErrorLog = function() {
    var osSvc = Components.classes['@activestate.com/koOs;1'].getService(Components.interfaces.koIOs);
    var dirsSvc = Components.classes['@activestate.com/koDirs;1'].getService(Components.interfaces.koIDirs);
    var sysUtilsSvc = Components.classes['@activestate.com/koSysUtils;1'].getService(Components.interfaces.koISysUtils);
    var logPath = osSvc.path.join(dirsSvc.userDataDir, 'pystderr.log');
    if (osSvc.path.exists(logPath)) {
        sysUtilsSvc.FlushStderr();
        var windowOpts = "centerscreen,chrome,resizable,scrollbars,dialog=no,close";
        try {
            ko.windowManager.openDialog('chrome://komodo/content/tail/tail.xul',
                                        "komodo:errorlog", windowOpts, logPath);
        } catch(e) {
            var msg = _bundle.formatStringFromName("logFileOpenFailure.alert", [e], 1);
            ko.dialogs.alert(msg);
        }
    } else {
        var msg = _bundle.formatStringFromName("logFileDoesNotExist.alert", [logPath], 1);
        ko.dialogs.alert(msg);
    }
}

}).apply(ko.help);

(function () {
var _log = ko.logging.getLogger("ko.launch");



// Used for passing information reliably to the find dialog.
this.find2_dialog_args = null;

/**
 * Open the Find dialog.
 *
 * @param pattern {String} The pattern to search for.
 */
this.find = function(pattern /* =null */) {
    if (typeof(pattern) == 'undefined') pattern = null;
    // Transfer focus to the hidden input buffer to capture keystrokes
    // from the user while find2.xul is loading. The find dialog will
    // retrieve these contents when it is ready.
    ko.inputBuffer.start();

    // Special global to pass info to find2.xul. Passing in via
    // openDialog() doesn't work if the dialog is already up.
    ko.launch.find2_dialog_args = {
        "pattern": pattern,
        "mode": "find"
    };

    // WARNING: Do NOT use ko.windowManager.openOrFocusDialog() here.
    // Because that ends up causing problems when re-opening the find
    // dialog (i.e. Ctrl+F when the Find dialog is already up).
    // openOrFocusDialog() results in the onfocus event but not onload
    // to the find dialog. That *could* be worked around with an onfocus
    // handler on find2.xul, but then you run into problems attempting
    // to focus the pattern textbox. (Or at least I did when experimenting
    // on Windows.)
    return ko.windowManager.openDialog(
        "chrome://komodo/content/find/find2.xul",
        "komodo_find2",
        "chrome,close=yes,centerscreen");
}


/**
 * Open the Find/Replace dialog.
 *
 * @param pattern {String} The pattern to search for.
 * @param repl {String} The replacement pattern.
 */
this.replace = function(pattern /* =null */, repl /* =null */) {
    // Transfer focus to the hidden input buffer to capture keystrokes
    // from the user while find2.xul is loading. The find dialog will
    // retrieve these contents when it is ready.
    ko.inputBuffer.start();

    // Special global to pass info to find2.xul. Passing in via
    // openDialog() doesn't work if the dialog is already up.
    ko.launch.find2_dialog_args = {
        "pattern": pattern,
        "repl": repl,
        "mode": "replace"
    };

    // WARNING: Do NOT use ko.windowManager.openOrFocusDialog() here.
    // (See above for why.)
    return ko.windowManager.openDialog(
        "chrome://komodo/content/find/find2.xul",
        "komodo_find2",
        "chrome,close=yes,centerscreen");
}

/**
 * Open the find dialog for searching in a "collection" find context.
 *
 * @param collection {koICollectionFindContext} defines in what to search.
 * @param pattern {string} is the pattern to search for. Optional.
 */
this.findInCollection = function(collection, pattern /* =null */) {
    // Transfer focus to the hidden input buffer to capture keystrokes
    // from the user while find2.xul is loading. The find dialog will
    // retrieve these contents when it is ready.
    ko.inputBuffer.start();

    // Special global to pass info to find2.xul. Passing in via
    // openDialog() doesn't work if the dialog is already up.
    ko.launch.find2_dialog_args = {
        "collection": collection,
        "pattern": pattern,
        "mode": "findincollection"
    };

    // WARNING: Do NOT use ko.windowManager.openOrFocusDialog() here.
    // (See above for why.)
    return ko.windowManager.openDialog(
        "chrome://komodo/content/find/find2.xul",
        "komodo_find2",
        "chrome,close=yes,centerscreen");
}

/**
 * Open the find dialog to find & replace in a "collection" of files.
 *
 * @param collection {koICollectionFindContext} defines in what to search.
 * @param pattern {String} The pattern to search for.
 * @param repl {String} The replacement pattern.
 */
this.replaceInCollection = function(collection, pattern /* =null */,
                                    repl /* =null */) {
    // Transfer focus to the hidden input buffer to capture keystrokes
    // from the user while find2.xul is loading. The find dialog will
    // retrieve these contents when it is ready.
    ko.inputBuffer.start();

    // Special global to pass info to find2.xul. Passing in via
    // openDialog() doesn't work if the dialog is already up.
    ko.launch.find2_dialog_args = {
        "collection": collection,
        "pattern": pattern,
        "repl": repl,
        "mode": "replaceincollection"
    };

    // WARNING: Do NOT use ko.windowManager.openOrFocusDialog() here.
    // (See above for why.)
    return ko.windowManager.openDialog(
        "chrome://komodo/content/find/find2.xul",
        "komodo_find2",
        "chrome,close=yes,centerscreen");
}

/**
 * Open Find dialog to search in the current project.
 *
 * @param pattern {String}
 */
this.findInCurrProject = function(pattern /* =null */) {
    // Transfer focus to the hidden input buffer to capture keystrokes
    // from the user while find2.xul is loading. The find dialog will
    // retrieve these contents when it is ready.
    ko.inputBuffer.start();

    // Special global to pass info to find2.xul. Passing in via
    // openDialog() doesn't work if the dialog is already up.
    ko.launch.find2_dialog_args = {
        "pattern": pattern,
        "mode": "findincurrproject"
    };

    // WARNING: Do NOT use ko.windowManager.openOrFocusDialog() here.
    // (See above for why.)
    return ko.windowManager.openDialog(
        "chrome://komodo/content/find/find2.xul",
        "komodo_find2",
        "chrome,close=yes,centerscreen");
}


/**
 * Open Find dialog to find & replace in the current project.
 *
 * @param pattern {String} The pattern to search for.
 * @param repl {String} The replacement pattern.
 */
this.replaceInCurrProject = function(pattern /* =null */, repl /* =null */) {
    // Transfer focus to the hidden input buffer to capture keystrokes
    // from the user while find2.xul is loading. The find dialog will
    // retrieve these contents when it is ready.
    ko.inputBuffer.start();

    // Special global to pass info to find2.xul. Passing in via
    // openDialog() doesn't work if the dialog is already up.
    ko.launch.find2_dialog_args = {
        "pattern": pattern,
        "repl": repl,
        "mode": "replaceincurrproject"
    };

    // WARNING: Do NOT use ko.windowManager.openOrFocusDialog() here.
    // (See above for why.)
    return ko.windowManager.openDialog(
        "chrome://komodo/content/find/find2.xul",
        "komodo_find2",
        "chrome,close=yes,centerscreen");
}

/**
 * Open Find dialog to search in files.
 *
 * @param pattern {String}
 * @param dirs {String}
 * @param includes {Array}
 * @param excludes {Array}
 */
this.findInFiles = function(pattern /* =null */, dirs /* =null */,
                            includes /* =null */, excludes /* =null */) {
    // Transfer focus to the hidden input buffer to capture keystrokes
    // from the user while find2.xul is loading. The find dialog will
    // retrieve these contents when it is ready.
    ko.inputBuffer.start();

    // Use the current view's cwd for interpreting relative paths.
    var view = ko.views.manager.currentView;
    var cwd = null;
    if (view != null &&
        view.getAttribute("type") == "editor" &&
        view.koDoc.file &&
        view.koDoc.file.isLocal) {
        cwd = view.koDoc.file.dirName;
    }

    // Special global to pass info to find2.xul. Passing in via
    // openDialog() doesn't work if the dialog is already up.
    var mode = dirs ? "findinfiles" : "findinlastfiles";
    ko.launch.find2_dialog_args = {
        "pattern": pattern,
        "dirs": dirs,
        "includes": includes,
        "excludes": excludes,
        "cwd": cwd,
        "mode": mode
    };

    // WARNING: Do NOT use ko.windowManager.openOrFocusDialog() here.
    // (See above for why.)
    return ko.windowManager.openDialog(
            "chrome://komodo/content/find/find2.xul",
            "komodo_find2",
            "chrome,close=yes,centerscreen");
}

/**
 * Open Find dialog to make replacements in files.
 *
 * @param pattern {String}
 * @param repl {String}
 * @param dirs {String}
 * @param includes {Array}
 * @param excludes {Array}
 */
this.replaceInFiles = function(pattern /* =null */, repl /* =null */,
                               dirs /* =null */, includes /* =null */,
                               excludes /* =null */) {
    // Transfer focus to the hidden input buffer to capture keystrokes
    // from the user while find2.xul is loading. The find dialog will
    // retrieve these contents when it is ready.
    ko.inputBuffer.start();

    // Special global to pass info to find2.xul. Passing in via
    // openDialog() doesn't work if the dialog is already up.
    var mode = dirs ? "replaceinfiles" : "replaceinlastfiles";
    ko.launch.find2_dialog_args = {
        "pattern": pattern,
        "repl": repl,
        "dirs": dirs,
        "includes": includes,
        "excludes": excludes,
        "mode": mode
    };

    // WARNING: Do NOT use ko.windowManager.openOrFocusDialog() here.
    // (See above for why.)
    return ko.windowManager.openDialog(
            "chrome://komodo/content/find/find2.xul",
            "komodo_find2",
            "chrome,close=yes,centerscreen");
}


/**
 * Show Komodo's about dialog.
 */
this.about = function about() {
    ko.windowManager.openDialog("chrome://komodo/content/about/about.xul",
        "komodo_about",
        "chrome,centerscreen,titlebar,resizable=no");
}


/**
 * runCommand
 *
 * open the run command dialog
 */
this.runCommand = function() {
    // Transfer focus to the hidden input buffer to capture keystrokes from the
    // user while run.xul is loading.  (Get the current view before calling
    // inputbuffer start so we have the correct focus coming out of the
    // dialog.)
    ko.inputBuffer.start();
    return window.openDialog("chrome://komodo/content/run/run.xul",
                      "_blank",
                      "chrome,close=yes,centerscreen");
}


/**
 * diff
 *
 * open the diff dialog, you must provide the diff
 *
 * @param {String} diff
 * @param {String} title
 * @param {String} message
 */
this.diff = function(diff, title /* ="Diff" */, message /* =null */)
{
    if (typeof(title) == "undefined") {
        title = "Diff";
    }
    if (typeof(message) == "undefined") {
        message = null;
    }

    var obj = new Object();
    obj.title = title;
    obj.diff = diff;
    obj.message = message;
    return ko.windowManager.openDialog(
        "chrome://komodo/content/dialogs/diff.xul",
        "_blank",
        "chrome,all,close=yes,resizable=yes,scrollbars=yes,centerscreen",
        obj);
}


/**
 * watchLocalFile
 *
 * prompt for a file to watch, then open a new watch window
 *
 */
this.watchLocalFile = function() {
    var filename = ko.filepicker.browseForFile();
    if (filename)
        return window.openDialog("chrome://komodo/content/tail/tail.xul",
                          "_blank",
                          "chrome,all,close=yes,resizable,scrollbars,centerscreen",
                          filename,
                          window);
    return null;
}


/**
 * openAddonsMgr
 *
 * open the extension/add ons manager window
 *
 */
this.openAddonsMgr = function launch_openAddonsMgr()
{
    return ko.windowManager.openOrFocusDialog("chrome://mozapps/content/extensions/extensions.xul",
                                       "Extension:Manager",
                                       "chrome,menubar,extra-chrome,toolbar,resizable");
                                       
}


/**
 * Opens the update manager and checks for updates to the application.
 * From http://plow/source/xref/mozilla/1.8/browser/base/content/utilityOverlay.js#452
 */
this.checkForUpdates = function checkForUpdates()
{
    var um = Components.classes["@mozilla.org/updates/update-manager;1"].
        getService(Components.interfaces.nsIUpdateManager);
    var prompter = Components.classes["@mozilla.org/updates/update-prompt;1"].
        createInstance(Components.interfaces.nsIUpdatePrompt);

    // If there's an update ready to be applied, show the "Update Downloaded"
    // UI instead and let the user know they have to restart the browser for
    // the changes to be applied. 
    if (um.activeUpdate && um.activeUpdate.state == "pending") {
        prompter.showUpdateDownloaded(um.activeUpdate);
    } else {
        // bug80785 -- if we observe "quit-application-requested", each
        // window will get called, and only the last window in the
        // workspace will be saved.  Better to save the workspace now,
        // even if it turns out there's no need to restart.
        ko.workspace.saveWorkspace();
        prompter.checkForUpdates();
    }
}


this.newWindow = function newWindow(uri /* =null */)
{
    var args = {};
    if (typeof(uri) != "undefined") {
        args.uris = [uri];
    }
    return ko.windowManager.openDialog("chrome://komodo/content",
                                "_blank",
                                "chrome,all,dialog=no",
                                args);
}

this.newWindowFromWorkspace = function newWindow(workspaceIndex)
{
    ko.windowManager.openDialog("chrome://komodo/content",
                                "_blank",
                                "chrome,all,dialog=no",
                                {workspaceIndex: workspaceIndex});
}

this.newTemplate = function newTemplate(obj)
{
    window.openDialog("chrome://komodo/content/templates/new.xul",
                      "_blank",
                      "chrome,modal,titlebar,resizable=yes,centerscreen",
                      obj);
}


}).apply(ko.launch);

/**
 * Input buffering
 * When you need to capture user input while a slow XUL window is loading you
 * can use the input buffer. Usage:
 *  - in some JS code:
 *      ko.inputBuffer.start()
 *      // open XUL window
 *
 *  - in slow XUL window onload handler:
 *      var contents = ko.inputBuffer.finish();
 *      // use the contents somehow
 */
ko.inputBuffer = {};
(function() { // ko.inputBuffer

var _isActive = false;
this.id = "hidden-input-buffer";
this.start = function()
{
    _isActive = true;
    var inputBufferWidget = document.getElementById(ko.inputBuffer.id);
    inputBufferWidget.focus();
}

this.focus = function(event)
{
    // if it is not active the hidden input buffer should not have the focus
    if (!_isActive && ko.views.manager.currentView) {
        // This has to be in a timeout for the controllers to work right.
        window.setTimeout('ko.views.manager.currentView.setFocus();', 1)
    }
}


this.finish = function()
{
    // Return the contents of the input buffer and stop buffering.
    var inputBufferWidget = document.getElementById(ko.inputBuffer.id);
    var contents = inputBufferWidget.value;
    inputBufferWidget.value = "";

    _isActive = false;
    return contents;
}

}).apply(ko.inputBuffer);



// backwards compat api for ko.help
var launch_LanguageHelp = ko.help.language;
var launch_AlternateLanguageHelp = ko.help.alternate;
var launch_MainHelp = ko.help.open;

// backwards compat api for ko.launch
var InputBuffer_Start = ko.inputBuffer.start;
var InputBuffer_OnFocus = ko.inputBuffer.focus;
var InputBuffer_Finish = ko.inputBuffer.finish;

var launch_openAddonsMgr = ko.launch.openAddonsMgr;
var launch_watchLocalFile = ko.launch.watchLocalFile;
var launch_DiffWindow = ko.launch.diff;
var launch_Find = ko.launch.find;
var launch_Replace = ko.launch.replace;
var launch_RunCommand = ko.launch.runCommand;
var launch_FindInFiles = ko.launch.findInFiles;
