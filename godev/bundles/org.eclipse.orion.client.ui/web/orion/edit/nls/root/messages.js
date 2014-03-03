/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 ******************************************************************************/

/*global define */

//NLS_CHARSET=UTF-8

define({
	"Editor": "Editor", //$NON-NLS-1$ //$NON-NLS-0$
	"switchEditor": "Switch Editor", //$NON-NLS-1$ //$NON-NLS-0$
	"Fetching": "Fetching: ${0}", //$NON-NLS-1$ //$NON-NLS-0$
	"confirmUnsavedChanges": "There are unsaved changes.  Do you still want to navigate away?", //$NON-NLS-1$ //$NON-NLS-0$
	"searchFiles": "Search Files...", //$NON-NLS-1$ //$NON-NLS-0$
	"searchTerm": "Enter search term:", //$NON-NLS-1$ //$NON-NLS-0$
	"unsavedChanges": "There are unsaved changes.", //$NON-NLS-1$ //$NON-NLS-0$
	"unsavedAutoSaveChanges": "Please stay on the page until Auto Save is complete.", //$NON-NLS-1$ //$NON-NLS-0$
	"Save": "Save", //$NON-NLS-1$ //$NON-NLS-0$
	"Saved": "Saved", //$NON-NLS-1$ //$NON-NLS-0$
	"Blame": "Blame", //$NON-NLS-1$ //$NON-NLS-0$
	"BlameTooltip":"Show blame annotations", //$NON-NLS-1$ //$NON-NLS-0$
	"saveOutOfSync": "Resource is out of sync with the server. Do you want to save it anyway?", //$NON-NLS-1$ //$NON-NLS-0$
	"loadOutOfSync": "Resource is out of sync with the server. Do you want to load it anyway? This will overwrite your local changes.", //$NON-NLS-1$ //$NON-NLS-0$
	"ReadingMetadata": "Reading metadata of ${0}", //$NON-NLS-1$ //$NON-NLS-0$
	"ReadingMetadataError": "Can not get metadata of ${0}", //$NON-NLS-1$ //$NON-NLS-0$
	"Reading": "Reading ${0}", //$NON-NLS-1$ //$NON-NLS-0$
	"readonly": "Read Only.", //$NON-NLS-1$ //$NON-NLS-0$
	"saveFile": "Save this file", //$NON-NLS-1$ //$NON-NLS-0$
	"gotoLine": "Go to Line...", //$NON-NLS-1$ //$NON-NLS-0$
	"gotoLineTooltip": "Go to specified line number", //$NON-NLS-1$ //$NON-NLS-0$
	"gotoLinePrompt": "Go to line:", //$NON-NLS-1$ //$NON-NLS-0$
	"Undo": "Undo", //$NON-NLS-1$ //$NON-NLS-0$
	"Redo": "Redo", //$NON-NLS-1$ //$NON-NLS-0$
	"Find": "Find...", //$NON-NLS-1$ //$NON-NLS-0$
	"noResponse": "No response from server.  Check your internet connection and try again.", //$NON-NLS-1$ //$NON-NLS-0$
	"savingFile": "Saving file ${0}", //$NON-NLS-1$ //$NON-NLS-0$
	"running": "Running ${0}", //$NON-NLS-1$ //$NON-NLS-0$
	"Saving..." : "Saving...", //$NON-NLS-1$ //$NON-NLS-0$
	"View": "View", //$NON-NLS-1$ //$NON-NLS-0$
	"SidePanel": "Side Panel", //$NON-NLS-1$ //$NON-NLS-0$
	"SidePanelTooltip": "Choose what to show in the side panel.", //$NON-NLS-1$ //$NON-NLS-0$
	"Actions": "Actions", //$NON-NLS-1$ //$NON-NLS-0$
	"Navigator": "Navigator", //$NON-NLS-1$ //$NON-NLS-0$
	"FolderNavigator": "Folder Navigator", //$NON-NLS-1$ //$NON-NLS-0$
	"Project": "Project", //$NON-NLS-1$ //$NON-NLS-0$
	"New": "New", //$NON-NLS-1$ //$NON-NLS-0$
	"File": "File", //$NON-NLS-1$ //$NON-NLS-0$
	"Edit": "Edit", //$NON-NLS-1$ //$NON-NLS-0$
	"Tools": "Tools", //$NON-NLS-1$ //$NON-NLS-0$
	"Add": "Add", //$NON-NLS-1$ //$NON-NLS-0$
	"noActions": "There are no actions for the current selection.", //$NON-NLS-1$ //$NON-NLS-0$
	"NoFile": "Use the ${0} to create new files and folders. Click a file to start coding.", //$NON-NLS-1$ //$NON-NLS-0$
	"LocalEditorSettings": "Local Editor Settings", //$NON-NLS-1$ //$NON-NLS-0$
	"NoProject": "${0} is not a project. To convert it to a project use ${1}.", //$NON-NLS-1$ //$NON-NLS-0$
	"NoProjects": "There are no projects in your workspace. Use the ${0} menu to create projects.", //$NON-NLS-1$ //$NON-NLS-0$
	"disconnected": "(disconnected)", //$NON-NLS-1$ //$NON-NLS-0$
	"ChooseFS": "Choose Filesystem", //$NON-NLS-1$ //$NON-NLS-0$
	"ChooseFSTooltip": "Choose the filesystem you want to view.", //$NON-NLS-1$ //$NON-NLS-0$
	"FSTitle": "${0} (${1})", //$NON-NLS-1$ //$NON-NLS-0$
	"Deploy": "Deploy", //$NON-NLS-1$ //$NON-NLS-0$
	"Deploy As": "Deploy As", //$NON-NLS-1$ //$NON-NLS-0$
	"Import": "Import", //$NON-NLS-1$ //$NON-NLS-0$
	"Export": "Export", //$NON-NLS-1$ //$NON-NLS-0$
	"OpenWith": "Open With", //$NON-NLS-1$ //$NON-NLS-0$
	"OpenRelated": "Open Related", //$NON-NLS-1$ //$NON-NLS-0$
	"Dependency": "Dependency", //$NON-NLS-1$ //$NON-NLS-0$
	"UnnamedCommand": "Unnamed" //$NON-NLS-1$ //$NON-NLS-0$
});
