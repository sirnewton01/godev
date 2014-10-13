/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 ******************************************************************************/
/*eslint-env browser, amd*/

//NLS_CHARSET=UTF-8

define({
	"Compare": "Compare", //$NON-NLS-0$  //$NON-NLS-1$
	"View the side-by-side compare": "View the side-by-side compare", //$NON-NLS-0$  //$NON-NLS-1$
	"WorkingDirVer": "Open Working Directory", //$NON-NLS-0$  //$NON-NLS-1$
	"Working Directory": "Working Directory", //$NON-NLS-0$  //$NON-NLS-1$
	"ViewWorkingDirVer": "View the working directory version of the file", //$NON-NLS-0$  //$NON-NLS-1$
	"Loading...": "Loading...", //$NON-NLS-0$  //$NON-NLS-1$
	"Repositories": "All Git Repositories", //$NON-NLS-0$  //$NON-NLS-1$
	"Repo": "Repositories", //$NON-NLS-0$  //$NON-NLS-1$
	"0 on 1 - Git": "${0} on ${1} - Git", //$NON-NLS-0$  //$NON-NLS-1$
	"Git": "Git", //$NON-NLS-0$  //$NON-NLS-1$
	"Show in eclipse.org": "Show in eclipse.org", //$NON-NLS-0$  //$NON-NLS-1$
	"Show in GitHub": "Show in GitHub", //$NON-NLS-0$  //$NON-NLS-1$
	"Show this repository in GitHub": "Show this repository in GitHub", //$NON-NLS-0$  //$NON-NLS-1$
	"Commit Details": "Commit Details", //$NON-NLS-0$  //$NON-NLS-1$
	"No Commits": "No Commits", //$NON-NLS-0$  //$NON-NLS-1$
	"commit: 0": "commit: ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"parent: 0": "parent: ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"authored by 0 (1) on 2": "authored by ${0} <${1}> on ${2}", //$NON-NLS-0$  //$NON-NLS-1$
	"committed by 0 (1)": "committed by ${0} <${1}>", //$NON-NLS-0$  //$NON-NLS-1$
	"committedby": "committed by ", //$NON-NLS-0$  //$NON-NLS-1$
	"authoredby": "authored by ", //$NON-NLS-0$  //$NON-NLS-1$
	"on": " on ", //$NON-NLS-0$  //$NON-NLS-1$
	"nameEmail": "${0} <${1}>", //$NON-NLS-0$  //$NON-NLS-1$
	"Tags:": "Tags:", //$NON-NLS-0$  //$NON-NLS-1$
	"No Tags": "No Tags", //$NON-NLS-0$  //$NON-NLS-1$
	"Diffs": "Changes", //$NON-NLS-0$  //$NON-NLS-1$
	"WorkingDirChanges": "Working Directory Changes", //$NON-NLS-0$  //$NON-NLS-1$
	"CommitChanges": "Commit Changes", //$NON-NLS-0$  //$NON-NLS-1$
	"CommitChangesDialog": "Commit Changes", //$NON-NLS-0$  //$NON-NLS-1$
	"more": "more ...", //$NON-NLS-0$  //$NON-NLS-1$
	"less": "less ...", //$NON-NLS-0$  //$NON-NLS-1$
	"More": "More", //$NON-NLS-0$  //$NON-NLS-1$
	"MoreCommits": "More commits for \"${0}\"", //$NON-NLS-0$  //$NON-NLS-1$
	"MoreCommitsProgress": "Loading more commits for \"${0}\"...", //$NON-NLS-0$  //$NON-NLS-1$
	"MoreBranches": "More branches for \"${0}\"", //$NON-NLS-0$  //$NON-NLS-1$
	"MoreBranchesProgress": "Loading more branches for \"${0}\"...", //$NON-NLS-0$  //$NON-NLS-1$
	"MoreTags": "More tags", //$NON-NLS-0$  //$NON-NLS-1$
	"MoreTagsProgress": "Loading more tags...", //$NON-NLS-0$  //$NON-NLS-1$
	"MoreStashes": "More stashes", //$NON-NLS-0$  //$NON-NLS-1$
	"MoreStashesProgress": "Loading more stashes...", //$NON-NLS-0$  //$NON-NLS-1$
	"Loading git log...": "Loading git log...", //$NON-NLS-0$  //$NON-NLS-1$
	"local": "local", //$NON-NLS-0$  //$NON-NLS-1$
	"remote": "remote", //$NON-NLS-0$  //$NON-NLS-1$
	"View All": "View All", //$NON-NLS-0$  //$NON-NLS-1$
	"Error ${0}: ": "Error ${0}: ", //$NON-NLS-0$  //$NON-NLS-1$
	"Loading ": "Loading ", //$NON-NLS-0$  //$NON-NLS-1$
	"Message": "Message", //$NON-NLS-0$  //$NON-NLS-1$
	"Author": "Author", //$NON-NLS-0$  //$NON-NLS-1$
	"Date": "Date", //$NON-NLS-0$  //$NON-NLS-1$
	"fromDate:": "Start Date:", //$NON-NLS-0$  //$NON-NLS-1$
	"toDate:": "End Date:", //$NON-NLS-0$  //$NON-NLS-1$
	"Actions": "Actions", //$NON-NLS-0$  //$NON-NLS-1$
	"Branches": "Branches", //$NON-NLS-0$  //$NON-NLS-1$
	"Tags": "Tags", //$NON-NLS-0$  //$NON-NLS-1$
	"Stage": "Stage", //$NON-NLS-0$  //$NON-NLS-1$
	"Unstaged removal": "Unstaged removal", //$NON-NLS-0$  //$NON-NLS-1$
	"Unstage": "Unstage", //$NON-NLS-0$  //$NON-NLS-1$
	"Staged removal": "Staged removal", //$NON-NLS-0$  //$NON-NLS-1$
	"Unstaged change": "Unstaged change", //$NON-NLS-0$  //$NON-NLS-1$
	"Staged change": "Staged change", //$NON-NLS-0$  //$NON-NLS-1$
	"Unstaged add": "Unstaged add", //$NON-NLS-0$  //$NON-NLS-1$
	"Staged add": "Staged add", //$NON-NLS-0$  //$NON-NLS-1$
	"Addition": "Addition", //$NON-NLS-0$  //$NON-NLS-1$
	"Deletion": "Deletion", //$NON-NLS-0$  //$NON-NLS-1$
	"Resolve Conflict": "Resolve Conflict", //$NON-NLS-0$  //$NON-NLS-1$
	"Conflicting": "Conflicting", //$NON-NLS-0$  //$NON-NLS-1$
	"Commit message": "Commit message", //$NON-NLS-0$  //$NON-NLS-1$
	"Commit": "Commit", //$NON-NLS-0$  //$NON-NLS-1$
	"CommitTooltip": "Commit the selected files with the given message.", //$NON-NLS-0$  //$NON-NLS-1$
	"AuthMsgLink":"Authentication required for: ${0}. <a target=\"_blank\" href=\"${1}\">${2}</a> and re-try the request. </span>", //$NON-NLS-0$  //$NON-NLS-1$
	"SmartCommit": "Enter the commit message", //$NON-NLS-0$  //$NON-NLS-1$
	"SmartCountCommit": "Commit ${0} file(s)", //$NON-NLS-0$  //$NON-NLS-1$
	"Amend last commit": "Amend last commit", //$NON-NLS-0$  //$NON-NLS-1$
	" Amend": " Amend", //$NON-NLS-0$  //$NON-NLS-1$
	"Rebase in progress. Choose action:": "Rebase in progress. Choose action:", //$NON-NLS-0$  //$NON-NLS-1$
	"RebaseProgress": "Rebase in progress", //$NON-NLS-0$  //$NON-NLS-1$
	"RebaseTip": "Rebase your commits by removing them from the active branch, starting the active branch again based on the latest state of \"${0}\" and applying each commit again to the updated active branch.", //$NON-NLS-0$  //$NON-NLS-1$
	"RebasingRepo": "Rebasing git repository", //$NON-NLS-0$  //$NON-NLS-1$
	"AddingConfig": "Adding git configuration property: key=${0} value=${1}", //$NON-NLS-0$  //$NON-NLS-1$
	"EditingConfig": "Editing git configuration property: key=${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"DeletingConfig": "Deleting git configuration property: key=${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"AddClone": "Cloning repository: ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"RebaseProgressDetails": "Rebasing branch.\n\n\tUse Continue after merging the conflicts and selecting all files;\n\tSkip to bypass the current patch;\n\tAbort to end the rebase at any time.", //$NON-NLS-0$  //$NON-NLS-1$
	"Committer name:": "Committer name:", //$NON-NLS-0$  //$NON-NLS-1$
	"Name:": "Name:", //$NON-NLS-0$  //$NON-NLS-1$
	"email:": "email:", //$NON-NLS-0$  //$NON-NLS-1$
	"Email:": "Email:", //$NON-NLS-0$  //$NON-NLS-1$
	"Author name: ": "Author name: ", //$NON-NLS-0$  //$NON-NLS-1$
	"Unstaged": "Unstaged", //$NON-NLS-0$  //$NON-NLS-1$
	"Staged": "Staged", //$NON-NLS-0$  //$NON-NLS-1$
	"ChangedFiles": "Changed Files", //$NON-NLS-0$  //$NON-NLS-1$
	"Recent commits on": "Recent commits on", //$NON-NLS-0$  //$NON-NLS-1$
	"Git Status": "Git Status", //$NON-NLS-0$  //$NON-NLS-1$
	"Go to Git Status": "Open the Git Status page for the repository containing this file or folder.", //$NON-NLS-0$  //$NON-NLS-1$
	"GetGitIncomingMsg": "Getting git incoming changes...", //$NON-NLS-0$  //$NON-NLS-1$
	"Checkout": "Checkout", //$NON-NLS-0$  //$NON-NLS-1$
	"Checking out...": "Checking out...", //$NON-NLS-0$  //$NON-NLS-1$
	"Stage the change": "Stage the change", //$NON-NLS-0$  //$NON-NLS-1$
	"Staging...": "Staging...", //$NON-NLS-0$  //$NON-NLS-1$
	"CheckoutSelectedFiles": "Checkout all the selected files, discarding all changes", //$NON-NLS-0$  //$NON-NLS-1$
	"AddFilesToGitignore" : "Add all the selected files to .gitignore file(s)", //$NON-NLS-0$  //$NON-NLS-1$
	"Writing .gitignore rules" : "Writing .gitignore rules", //$NON-NLS-0$  //$NON-NLS-1$ 
	"Save Patch": "Save Patch", //$NON-NLS-0$  //$NON-NLS-1$
	"Unstage the change": "Unstage the change", //$NON-NLS-0$  //$NON-NLS-1$
	"Unstaging...": "Unstaging...", //$NON-NLS-0$  //$NON-NLS-1$
	"Undo": "Undo", //$NON-NLS-0$  //$NON-NLS-1$
	"UndoTooltip": "Revert this commit, keeping all changed files and not making any changes to the working directory.", //$NON-NLS-0$  //$NON-NLS-1$
	"UndoConfirm": "The content of your active branch will be replaced with commit \"${0}\". All changes in the commit and working directory will be kept. Are you sure?", //$NON-NLS-0$  //$NON-NLS-1$
	"Reset": "Reset", //$NON-NLS-0$  //$NON-NLS-1$
	"ResetConfirm": "All unstaged and staged changes in the working directory and index will be discarded and cannot be recovered.\n\nAre you sure you want to continue?", //$NON-NLS-0$  //$NON-NLS-1$
	"CheckoutConfirm" : "Your changes to the selected files will be discarded and cannot be recovered.\n\nAre you sure you want to continue?", //$NON-NLS-0$  //$NON-NLS-1$
	"ResetBranchDiscardChanges": "Reset the branch, discarding all staged and unstaged changes", //$NON-NLS-0$  //$NON-NLS-1$
	"ChangesIndexDiscardedMsg": "All unstaged and staged changes in the working directory and index will be discarded and cannot be recovered.", //$NON-NLS-0$  //$NON-NLS-1$
	"ContinueMsg": "Are you sure you want to continue?", //$NON-NLS-0$  //$NON-NLS-1$
	"KeepWorkDir" : "Keep Working Directory", //$NON-NLS-0$  //$NON-NLS-1$
	"Resetting local changes...": "Resetting local changes...", //$NON-NLS-0$  //$NON-NLS-1$
	"Continue rebase...": "Continue rebase...", //$NON-NLS-0$  //$NON-NLS-1$
	"Skipping patch...": "Skipping patch...", //$NON-NLS-0$  //$NON-NLS-1$
	"Aborting rebase...": "Aborting rebase...", //$NON-NLS-0$  //$NON-NLS-1$
	"Complete log": "Complete log", //$NON-NLS-0$  //$NON-NLS-1$
	"local VS index": "local VS index", //$NON-NLS-0$  //$NON-NLS-1$
	"index VS HEAD": "index VS HEAD", //$NON-NLS-0$  //$NON-NLS-1$
	"Compare(${0} : ${1})": "Compare(${0} : ${1})", //$NON-NLS-0$  //$NON-NLS-1$
	"Loading status...": "Loading status...", //$NON-NLS-0$  //$NON-NLS-1$
	"Committing...": "Committing...", //$NON-NLS-0$  //$NON-NLS-1$
	"The author name is required.": "The author name is required.", //$NON-NLS-0$  //$NON-NLS-1$
	"The author mail is required.": "The author mail is required.", //$NON-NLS-0$  //$NON-NLS-1$
	"RepoConflict": ". Repository still contains conflicts.", //$NON-NLS-0$  //$NON-NLS-1$
	"RepoUnmergedPathResolveConflict": ". Repository contains unmerged paths. Resolve conflicts first.", //$NON-NLS-0$  //$NON-NLS-1$
	"Rendering ${0}": "Rendering ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"Configuration": "Configuration", //$NON-NLS-0$  //$NON-NLS-1$
	"Getting configuration of": "Getting configuration of ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"Getting git repository details": "Getting git repository details", //$NON-NLS-0$  //$NON-NLS-1$
	"Getting changes": "Getting changes", //$NON-NLS-0$  //$NON-NLS-1$
	" - Git": " - Git", //$NON-NLS-0$  //$NON-NLS-1$
	"Repositories - Git": "Repositories - Git", //$NON-NLS-0$  //$NON-NLS-1$
	"Repository": "Repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Repository Not Found": "Repository Not Found", //$NON-NLS-0$  //$NON-NLS-1$
	"No Repositories": "No Repositories", //$NON-NLS-0$  //$NON-NLS-1$
	"Loading repository": "Loading repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Loading repositories": "Loading repositories", //$NON-NLS-0$  //$NON-NLS-1$
	"(no remote)": "(no remote)", //$NON-NLS-0$  //$NON-NLS-1$
	"location: ": "location: ", //$NON-NLS-0$  //$NON-NLS-1$
	"NumFilesStageAndCommit": "${0} file(s) to stage and ${1} file(s) to commit.", //$NON-NLS-0$  //$NON-NLS-1$
 	"Nothing to commit.": "Nothing to commit.", //$NON-NLS-0$  //$NON-NLS-1$
	"Nothing to push.": "Nothing to push.", //$NON-NLS-0$  //$NON-NLS-1$
	"NCommitsToPush": "${0} commit(s) to push.", //$NON-NLS-0$  //$NON-NLS-1$
	"You have no changes to commit.": "You have no changes to commit.", //$NON-NLS-0$  //$NON-NLS-1$
	"Rebase in progress!": "Rebase in progress!", //$NON-NLS-0$  //$NON-NLS-1$
	"View all local and remote tracking branches": "View all local and remote tracking branches", //$NON-NLS-0$  //$NON-NLS-1$
	"tracksNoBranch": "tracks no branch", //$NON-NLS-0$  //$NON-NLS-1$
	"tracks": "tracks ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"last modified ${0} by ${1}": "last modified ${0} by ${1}", //$NON-NLS-0$  //$NON-NLS-1$
	"No Remote Branches": "No Remote Branches", //$NON-NLS-0$  //$NON-NLS-1$
	"Rendering branches": "Rendering branches", //$NON-NLS-0$  //$NON-NLS-1$
	"Commits": "Commits", //$NON-NLS-0$  //$NON-NLS-1$
	"GettingCurrentBranch": "Getting current branch for ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"See Full Log": "See Full Log", //$NON-NLS-0$  //$NON-NLS-1$
	"See the full log": "See the full log", //$NON-NLS-0$  //$NON-NLS-1$
	"Getting commits for \"${0}\" branch": "Getting commits for \"${0}\" branch", //$NON-NLS-0$  //$NON-NLS-1$
	"Rendering commits": "Rendering commits", //$NON-NLS-0$  //$NON-NLS-1$
	"Getting outgoing commits": "Getting outgoing commits", //$NON-NLS-0$  //$NON-NLS-1$
	"The branch is up to date.": "The branch is up to date.", //$NON-NLS-0$  //$NON-NLS-1$
	"NoOutgoingIncomingCommits": "You have no outgoing or incoming commits.", //$NON-NLS-0$  //$NON-NLS-1$
 	") by ": ") by ", //$NON-NLS-0$  //$NON-NLS-1$
	" (SHA ": " (SHA ", //$NON-NLS-0$  //$NON-NLS-1$
	"Getting tags": "Getting tags", //$NON-NLS-0$  //$NON-NLS-1$
	"View all tags": "View all tags", //$NON-NLS-0$  //$NON-NLS-1$
	" on ": " on ", //$NON-NLS-0$  //$NON-NLS-1$
	" by ": " by ", //$NON-NLS-0$  //$NON-NLS-1$
	"Remotes": "Remotes", //$NON-NLS-0$  //$NON-NLS-1$
	"Rendering remotes": "Rendering remotes", //$NON-NLS-0$  //$NON-NLS-1$
	"No Remotes": "No Remotes", //$NON-NLS-0$  //$NON-NLS-1$
	"Unstaged addition": "Unstaged addition", //$NON-NLS-0$  //$NON-NLS-1$
	"Staged addition": "Staged addition", //$NON-NLS-0$  //$NON-NLS-1$
	" (Rebase in Progress)": " (Rebase in Progress)", //$NON-NLS-0$  //$NON-NLS-1$
	"Status": "Status", //$NON-NLS-0$  //$NON-NLS-1$
	"Log (0)": "Log (${0})", //$NON-NLS-0$  //$NON-NLS-1$
	"Log (0) - 1": "Log (${0}) - ${1}", //$NON-NLS-0$  //$NON-NLS-1$
	"Status for ${0} - Git ": "Status for ${0} - Git ", //$NON-NLS-0$  //$NON-NLS-1$
	"No Unstaged Changes": "No Unstaged Changes", //$NON-NLS-0$  //$NON-NLS-1$
	"No Staged Changes": "No Staged Changes", //$NON-NLS-0$  //$NON-NLS-1$
	"Changes for \"${0}\" branch": "Changes for ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"Commits for \"${0}\" branch": "Commits for ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"Commits for \"${0}\" branch against": "Commits for \"${0}\" branch against", //$NON-NLS-0$  //$NON-NLS-1$
	"Add Remote": "Add Remote", //$NON-NLS-0$  //$NON-NLS-1$
	"Remote Name:": "Remote Name:", //$NON-NLS-0$  //$NON-NLS-1$
	"Remote URI:": "Remote URI:", //$NON-NLS-0$  //$NON-NLS-1$
	"Apply Patch": "Apply Patch", //$NON-NLS-0$  //$NON-NLS-1$
	"ApplyPatchDialog": "Apply Patch", //$NON-NLS-0$  //$NON-NLS-1$
	"Git Repository": "Git Repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Go to the git repository": "Open the Git Repository page for this file or folder.", //$NON-NLS-0$  //$NON-NLS-1$
	"Clone Git Repository": "Clone Git Repository", //$NON-NLS-0$  //$NON-NLS-1$
	"CloneGitRepositoryDialog": "Clone Git Repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Repository URL:": "Repository URL:", //$NON-NLS-0$  //$NON-NLS-1$
	"Existing directory:": "Existing directory:", //$NON-NLS-0$  //$NON-NLS-1$
	"New folder:": "New folder:", //$NON-NLS-0$  //$NON-NLS-1$
	"ChooseFolderDialog": "Choose a Folder", //$NON-NLS-0$  //$NON-NLS-1$
	"Message:": "Message:", //$NON-NLS-0$  //$NON-NLS-1$
	"Amend:": "Amend:", //$NON-NLS-0$  //$NON-NLS-1$
	"SmartAmend": "Amend previous commit", //$NON-NLS-0$  //$NON-NLS-1$
	"ChangeId:": "ChangeId:", //$NON-NLS-0$  //$NON-NLS-1$
	"SmartChangeId": "Add Change-ID to message", //$NON-NLS-0$  //$NON-NLS-1$
	"Committer Name:": "Committer Name:", //$NON-NLS-0$  //$NON-NLS-1$
	"Committer Email:": "Committer Email:", //$NON-NLS-0$  //$NON-NLS-1$
	"AuthorNamePlaceholder": "Enter author name", //$NON-NLS-0$  //$NON-NLS-1$
	"AuthorEmailPlaceholder": "Enter author email", //$NON-NLS-0$  //$NON-NLS-1$
	"CommitterNamePlaceholder": "Enter committer name", //$NON-NLS-0$  //$NON-NLS-1$
	"CommitterEmailPlaceholder": "Enter committer email", //$NON-NLS-0$  //$NON-NLS-1$
	"Author Name:": "Author Name:", //$NON-NLS-0$  //$NON-NLS-1$
	"Author Email:": "Author Email:", //$NON-NLS-0$  //$NON-NLS-1$
	"The commit message is required.": "The commit message is required.", //$NON-NLS-0$  //$NON-NLS-1$
	"Git Credentials": "Git Credentials", //$NON-NLS-0$  //$NON-NLS-1$
	"Username:": "Username:", //$NON-NLS-0$  //$NON-NLS-1$
	"Private key:": "Private key:", //$NON-NLS-0$  //$NON-NLS-1$
	"Passphrase (optional):": "Passphrase (optional):", //$NON-NLS-0$  //$NON-NLS-1$
	"commit:": "commit: ", //$NON-NLS-0$  //$NON-NLS-1$
	"parent:": "parent: ", //$NON-NLS-0$  //$NON-NLS-1$
	"branches: ": "branches: ", //$NON-NLS-0$  //$NON-NLS-1$
	"tags: ": "tags: ", //$NON-NLS-0$  //$NON-NLS-1$
	"tags": "tags", //$NON-NLS-0$  //$NON-NLS-1$
	" authored by ${0} {${1}) on ${2}": " authored by ${0} (${1}) on ${2}", //$NON-NLS-0$  //$NON-NLS-1$
	"Content": "Content", //$NON-NLS-0$  //$NON-NLS-1$
	"Go to ${0} section": "Go to ${0} section", //$NON-NLS-0$  //$NON-NLS-1$
	"Type the commit name (sha1):": "Type the commit name (sha1):", //$NON-NLS-0$  //$NON-NLS-1$
	"Search": "Search", //$NON-NLS-0$  //$NON-NLS-1$
	"Searching...": "Searching...", //$NON-NLS-0$  //$NON-NLS-1$
	"SelectAll": "Select All", //$NON-NLS-0$  //$NON-NLS-1$
	"Looking for the commit": "Looking for the commit", //$NON-NLS-0$  //$NON-NLS-1$
	"New Branch:": "New Branch:", //$NON-NLS-0$  //$NON-NLS-1$
	"No remote selected": "No remote selected", //$NON-NLS-0$  //$NON-NLS-1$
	"Enter a name...": "Enter a name...", //$NON-NLS-0$  //$NON-NLS-1$
	"OK": "OK", //$NON-NLS-0$  //$NON-NLS-1$
	"Cancel": "Cancel", //$NON-NLS-0$  //$NON-NLS-1$
	"Clear": "Clear", //$NON-NLS-0$  //$NON-NLS-1$
	"Filter": "Filter", //$NON-NLS-0$  //$NON-NLS-1$
	"FilterCommits": "Filter Commits", //$NON-NLS-0$  //$NON-NLS-1$
	"FilterCommitsTip": "Toggles the filter commits panel", //$NON-NLS-0$  //$NON-NLS-1$
	"MaximizeCmd": "Maximize", //$NON-NLS-0$  //$NON-NLS-1$
	"MaximizeTip": "Toggles the maximize state of the editor", //$NON-NLS-0$  //$NON-NLS-1$
	" [New branch]": " [New branch]", //$NON-NLS-0$  //$NON-NLS-1$
	"AddKeyToHostContinueOp": "Would you like to add ${0} key for host ${1} to continue operation? Key fingerpt is ${2}.", //$NON-NLS-0$  //$NON-NLS-1$
 	"Link Repository": "Link Repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Folder name:": "Folder name:", //$NON-NLS-0$  //$NON-NLS-1$
	"Repository was linked to ": "Repository was linked to ", //$NON-NLS-0$  //$NON-NLS-1$
	"CheckoutCommitTooltip": "Checkout this commit, creating a local branch based on its contents.", //$NON-NLS-0$  //$NON-NLS-1$
	"CheckoutTagTooltip": "Checkout this tag, creating a local branch based on its contents.", //$NON-NLS-0$  //$NON-NLS-1$
	"Checking out ${0}": "Checking out ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"CheckoutBranchMsg": "Checkout the branch or corresponding local branch and make it active. If the remote tracking branch does not have a corresponding local branch, the local branch will be created first.", //$NON-NLS-0$  //$NON-NLS-1$
 	"Checking out branch...": "Checking out branch", //$NON-NLS-0$  //$NON-NLS-1$
	"Adding branch ${0}...": "Adding branch ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"Removing branch ${0}...": "Removing branch ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"Adding remote ${0}...": "Adding remote ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"Removing remote ${0}...": "Removing remote ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"Removing repository ${0}": "Removing repository ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"Adding tag {$0}": "Adding tag {$0}", //$NON-NLS-0$  //$NON-NLS-1$
	"Removing tag {$0}": "Removing tag {$0}", //$NON-NLS-0$  //$NON-NLS-1$
	"Merging ${0}": "Merging ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	'Unstaging changes' : 'Unstaging changes', //$NON-NLS-0$  //$NON-NLS-1$
	"Checking out branch ${0}...": "Checking out branch ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"Branch checked out.": "Branch checked out.", //$NON-NLS-0$  //$NON-NLS-1$
	"New Branch": "New Branch", //$NON-NLS-0$  //$NON-NLS-1$
	"Add a new local branch to the repository": "Add a new local branch to the repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Branch name": "Branch name", //$NON-NLS-0$  //$NON-NLS-1$
	"Delete": "Delete", //$NON-NLS-0$  //$NON-NLS-1$
	"Delete the local branch from the repository": "Delete the local branch from the repository", //$NON-NLS-0$  //$NON-NLS-1$
	"DelBrConfirm": "Are you sure you want to delete branch ${0}?", //$NON-NLS-0$  //$NON-NLS-1$
	"Delete the remote tracking branch from the repository": "Delete the remote tracking branch from the repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Are you sure?": "Are you sure?", //$NON-NLS-0$  //$NON-NLS-1$
	"RemoveRemoteBranchConfirm": "You're going to delete remote branch \"${0}\" and push the change.\n\nAre you sure?", //$NON-NLS-0$  //$NON-NLS-1$
	"Removing remote branch: ": "Removing remote branch: ", //$NON-NLS-0$  //$NON-NLS-1$
	"Delete Remote Branch": "Delete Remote Branch", //$NON-NLS-0$  //$NON-NLS-1$
	"New Remote": "New Remote", //$NON-NLS-0$  //$NON-NLS-1$
	"Git Remote": "Git Remote", //$NON-NLS-0$  //$NON-NLS-1$
	"Go to Git Remote": "Open the remote Git Log page for this file or folder.", //$NON-NLS-0$  //$NON-NLS-1$
	"Add a new remote to the repository": "Add a new remote to the repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Delete the remote from the repository": "Delete the remote from the repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Are you sure you want to delete remote ${0}?": "Are you sure you want to delete remote ${0}?", //$NON-NLS-0$  //$NON-NLS-1$
	"Pull": "Pull", //$NON-NLS-0$  //$NON-NLS-1$
	"Pull from the repository": "Pull from the repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Pulling: ": "Pulling: ", //$NON-NLS-0$  //$NON-NLS-1$
	"Pull Git Repository": "Pull Git Repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Git Log": "Git Log", //$NON-NLS-0$  //$NON-NLS-1$
	"Go to Git Log": "Open the local Git Log page for this file or folder.", //$NON-NLS-0$  //$NON-NLS-1$
	"Open the log for the branch": "Open the log for the branch", //$NON-NLS-0$  //$NON-NLS-1$
	"Open the log for the repository": "Open the log for the repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Open the status for the repository": "Open the status for the repository", //$NON-NLS-0$  //$NON-NLS-1$
	"ShowInEditor": "Show in Editor", //$NON-NLS-0$  //$NON-NLS-1$
	"ShowInEditorTooltip": "Show the repository folder in the editor", //$NON-NLS-0$  //$NON-NLS-1$
	"CompareEach": "Compare With Each Other", //$NON-NLS-0$  //$NON-NLS-1$
 	"Compare With Working Tree": "Compare With Working Tree", //$NON-NLS-0$  //$NON-NLS-1$
	"Open": "Open", //$NON-NLS-0$  //$NON-NLS-1$
	"OpenGitCommitTip": "View the tree for this commit", //$NON-NLS-0$  //$NON-NLS-1$
	"OpenCommitVersion": "Open Commit", //$NON-NLS-0$  //$NON-NLS-1$
	"ViewCommitVersionTip": "View the committed version of the file", //$NON-NLS-0$  //$NON-NLS-1$
	"Fetch": "Fetch", //$NON-NLS-0$  //$NON-NLS-1$
	"Fetch from the remote": "Fetch from the remote", //$NON-NLS-0$  //$NON-NLS-1$
	"Password:": "Password:", //$NON-NLS-0$  //$NON-NLS-1$
	"User Name:": "User Name:", //$NON-NLS-0$  //$NON-NLS-1$
	"Fetching remote: ": "Fetching remote: ", //$NON-NLS-0$  //$NON-NLS-1$
	"Force Fetch": "Force Fetch", //$NON-NLS-0$  //$NON-NLS-1$
	"FetchRemoteBranch": "Fetch from the remote branch into your remote tracking branch overriding its current content", //$NON-NLS-0$  //$NON-NLS-1$
	"OverrideContentRemoteTrackingBr": "You're going to override content of the remote tracking branch. This can cause the branch to lose commits.", //$NON-NLS-0$  //$NON-NLS-1$
	"Merge": "Merge", //$NON-NLS-0$  //$NON-NLS-1$
	"MergeContentFrmBr": "Merge the content from the branch to your active branch", //$NON-NLS-0$  //$NON-NLS-1$
 	". Go to ${0}.": ". Go to ${0}.", //$NON-NLS-0$  //$NON-NLS-1$
	"Git Status page": "Git Status page", //$NON-NLS-0$  //$NON-NLS-1$
	"Rebase": "Rebase", //$NON-NLS-0$  //$NON-NLS-1$
	"RebaseCommitsMsg": "Rebase your commits by removing them from the active branch, starting the active branch again based on the latest state of the selected branch ", //$NON-NLS-0$  //$NON-NLS-1$
 	"Rebase on top of ": "Rebase on top of ", //$NON-NLS-0$  //$NON-NLS-1$
	"RebaseSTOPPED": ". Some conflicts occurred. Please resolve them and continue, skip patch or abort rebasing.", //$NON-NLS-0$  //$NON-NLS-1$
	"RebaseFAILED_WRONG_REPOSITORY_STATE": ". Repository state is invalid (i.e. already during rebasing).", //$NON-NLS-0$  //$NON-NLS-1$
	"RebaseFAILED_UNMERGED_PATHS": ". Repository contains unmerged paths.", //$NON-NLS-0$  //$NON-NLS-1$
	"RebaseFAILED_PENDING_CHANGES": ". Repository contains pending changes. Please commit or stash them.", //$NON-NLS-0$  //$NON-NLS-1$
	"RebaseUNCOMMITTED_CHANGES": ". There are uncommitted changes.", //$NON-NLS-0$  //$NON-NLS-1$
	"RebaseCommitsByRmvingThem": "Rebase your commits by removing them from the active branch, ", //$NON-NLS-0$  //$NON-NLS-1$
	"StartActiveBranch": "starting the active branch again based on the latest state of '", //$NON-NLS-0$  //$NON-NLS-1$
	"ApplyEachCommitAgain": "and applying each commit again to the updated active branch.", //$NON-NLS-0$  //$NON-NLS-1$
	"Push All": "Push All", //$NON-NLS-0$  //$NON-NLS-1$
	"PushCommitsTagsFrmLocal": "Push commits and tags from your local branch into the remote branch", //$NON-NLS-0$  //$NON-NLS-1$
 	"Push Branch": "Push Branch", //$NON-NLS-0$  //$NON-NLS-1$
 	"PushCommitsWithoutTags": "Push commits without tags from your local branch into the remote branch", //$NON-NLS-0$  //$NON-NLS-1$
 	"Push for Review": "Push for Review", //$NON-NLS-0$  //$NON-NLS-1$
	"Push commits to Gerrit Code Review": "Push commits to Gerrit Code Review", //$NON-NLS-0$  //$NON-NLS-1$
	"Force Push Branch": "Force Push Branch", //$NON-NLS-0$  //$NON-NLS-1$
	"PushCommitsWithoutTagsOverridingCurrentContent": "Push commits without tags from your local branch into the remote branch overriding its current content", //$NON-NLS-0$  //$NON-NLS-1$
 	"Pushing remote: ": "Pushing remote: ", //$NON-NLS-0$  //$NON-NLS-1$
	"ChooseBranchDialog": "Choose Branch", //$NON-NLS-0$  //$NON-NLS-1$
	"Choose the remote branch.": "Choose the remote branch.", //$NON-NLS-0$  //$NON-NLS-1$
	"Force Push All": "Force Push All", //$NON-NLS-0$  //$NON-NLS-1$
	"PushCommitsTagsFrmLocalBr": "Push commits and tags from your local branch into the remote branch overriding its current content", //$NON-NLS-0$  //$NON-NLS-1$
	"OverrideContentOfRemoteBr": "You're going to override content of the remote branch. This can cause the remote repository to lose commits.", //$NON-NLS-0$  //$NON-NLS-1$
	"< Previous Page": "< Previous Page", //$NON-NLS-0$  //$NON-NLS-1$
	"Show previous page of git log": "Show previous page of git log", //$NON-NLS-0$  //$NON-NLS-1$
	"Show previous page of git tags" : "Show previous page of git tags", //$NON-NLS-0$  //$NON-NLS-1$
	"Next Page >": "Next Page >", //$NON-NLS-0$  //$NON-NLS-1$
	"Show next page of git log": "Show next page of git log", //$NON-NLS-0$  //$NON-NLS-1$
	"Show next page of git tags" : "Show next page of git tags", //$NON-NLS-0$  //$NON-NLS-1$
	"Push from your local branch into the selected remote branch": "Push from your local branch into the selected remote branch", //$NON-NLS-0$  //$NON-NLS-1$
	"ResetActiveBr": "Reset your active branch to the state of this reference. Discard all staged and unstaged changes.", //$NON-NLS-0$  //$NON-NLS-1$
 	"GitResetIndexConfirm": "The content of your active branch will be replaced with commit \"${0}\". All unstaged and staged changes will be discarded and cannot be recovered if \"${1}\" is not checked. Are you sure?", //$NON-NLS-0$  //$NON-NLS-1$
	"Resetting index...": "Resetting index...", //$NON-NLS-0$  //$NON-NLS-1$
	"Resetting git index for ${0}" : "Resetting git index for ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"Tag": "Tag", //$NON-NLS-0$  //$NON-NLS-1$
	"Create a tag for the commit": "Create a tag for the commit", //$NON-NLS-0$  //$NON-NLS-1$
	"ProjectSetup": "Your project is being set up. This may take a minute...", //$NON-NLS-0$  //$NON-NLS-1$
	"LookingForProject": "Looking for project: ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"Tag name": "Tag name", //$NON-NLS-0$  //$NON-NLS-1$
	"Delete the tag from the repository": "Delete the tag from the repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Are you sure you want to delete tag ${0}?": "Are you sure you want to delete tag ${0}?", //$NON-NLS-0$  //$NON-NLS-1$
	"Cherry-Pick": "Cherry-Pick", //$NON-NLS-0$  //$NON-NLS-1$
	"CherryPicking": "Cherry Picking commit: ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"RevertingCommit": "Reverting commit: ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"Apply the change introduced by the commit to your active branch": "Apply the change introduced by the commit to your active branch", //$NON-NLS-0$  //$NON-NLS-1$
	"Nothing changed.": "Nothing changed.", //$NON-NLS-0$  //$NON-NLS-1$
	". Some conflicts occurred": ". Some conflicts occurred.", //$NON-NLS-0$  //$NON-NLS-1$
	"Fetch from the remote branch into your remote tracking branch": "Fetch from the remote branch into your remote tracking branch", //$NON-NLS-0$  //$NON-NLS-1$
	"Fetch Git Repository": "Fetch Git Repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Push": "Push", //$NON-NLS-0$  //$NON-NLS-1$
	"Push from your local branch into the remote branch": "Push from your local branch into the remote branch", //$NON-NLS-0$  //$NON-NLS-1$
	"Push Git Repository": "Push Git Repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Key:": "Key:", //$NON-NLS-0$  //$NON-NLS-1$
	"Value:": "Value:", //$NON-NLS-0$  //$NON-NLS-1$
	"New Configuration Entry": "New Configuration Entry", //$NON-NLS-0$  //$NON-NLS-1$
	"Edit": "Edit", //$NON-NLS-0$  //$NON-NLS-1$
	"Edit the configuration entry": "Edit the configuration entry", //$NON-NLS-0$  //$NON-NLS-1$
	"Delete the configuration entry": "Delete the configuration entry", //$NON-NLS-0$  //$NON-NLS-1$
	"Are you sure you want to delete ${0}?": "Are you sure you want to delete ${0}?", //$NON-NLS-0$  //$NON-NLS-1$
	"Clone Repository": "Clone Repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Clone an existing Git repository to a folder": "Clone an existing Git repository to a folder", //$NON-NLS-0$  //$NON-NLS-1$
	"Cloning repository: ": "Cloning repository: ", //$NON-NLS-0$  //$NON-NLS-1$
	"Init Repository": "Init Repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Create a new Git repository in a new folder": "Create a new Git repository in a new folder", //$NON-NLS-0$  //$NON-NLS-1$
	"Initializing repository: ": "Initializing repository: ", //$NON-NLS-0$  //$NON-NLS-1$
	"Init Git Repository": "Init Git Repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Delete the repository": "Delete the repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Are you sure you want do delete ${0} repositories?": "Are you sure you want do delete ${0} repositories?", //$NON-NLS-0$  //$NON-NLS-1$
	"Apply a patch on the selected repository": "Apply a patch on the selected repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Show content": "Show content", //$NON-NLS-0$  //$NON-NLS-1$
	"Commit name:": "Commit name:", //$NON-NLS-0$  //$NON-NLS-1$
	"Open Commit": "Open Commit", //$NON-NLS-0$  //$NON-NLS-1$
	"OpenCommitDialog": "Open Commit", //$NON-NLS-0$  //$NON-NLS-1$
	"Open the commit with the given name": "Open the commit with the given name", //$NON-NLS-0$  //$NON-NLS-1$
	"No commits found": "No commits found", //$NON-NLS-0$  //$NON-NLS-1$
	"Staging changes": "Staging changes", //$NON-NLS-0$  //$NON-NLS-1$
	"Commit message:": "Commit message:", //$NON-NLS-0$  //$NON-NLS-1$
	"Committing changes": "Committing changes", //$NON-NLS-0$  //$NON-NLS-1$
	"Fetching previous commit message": "Fetching previous commit message", //$NON-NLS-0$  //$NON-NLS-1$
	"Resetting local changes": "Resetting local changes", //$NON-NLS-0$  //$NON-NLS-1$
	"Checkout files, discarding all changes": "Checkout files, discarding all changes", //$NON-NLS-0$  //$NON-NLS-1$
	"Show Patch": "Show Patch", //$NON-NLS-0$  //$NON-NLS-1$
	"Loading default workspace": "Loading default workspace", //$NON-NLS-0$  //$NON-NLS-1$
	"Show workspace changes as a patch": "Show workspace changes as a patch", //$NON-NLS-0$  //$NON-NLS-1$
	"Show checked changes as a patch": "Show checked changes as a patch", //$NON-NLS-0$  //$NON-NLS-1$
	"ShowCommitPatchTip": "Show patch for changes in this commit", //$NON-NLS-0$  //$NON-NLS-1$
	"Continue": "Continue", //$NON-NLS-0$  //$NON-NLS-1$
	"Contibue Rebase": "Continue Rebase", //$NON-NLS-0$  //$NON-NLS-1$
	"Skip Patch": "Skip Patch", //$NON-NLS-0$  //$NON-NLS-1$
	"Abort": "Abort", //$NON-NLS-0$  //$NON-NLS-1$
	"Abort Rebase": "Abort Rebase", //$NON-NLS-0$  //$NON-NLS-1$
	"Discard": "Discard", //$NON-NLS-0$  //$NON-NLS-1$
	"Ignore": "Ignore", //$NON-NLS-0$  //$NON-NLS-1$
	"ChangesSelectedFilesDiscard": "Your changes to the selected files will be discarded and cannot be recovered.", //$NON-NLS-0$  //$NON-NLS-1$
 	"Getting git log": "Getting git log", //$NON-NLS-0$  //$NON-NLS-1$
	"Getting stashed changes...": "Getting stashed changes...", //$NON-NLS-0$  //$NON-NLS-1$
	"Active Branch (${0})": "Active Branch (${0})", //$NON-NLS-0$  //$NON-NLS-1$
	"Branch (${0})": "Branch (${0})", //$NON-NLS-0$  //$NON-NLS-1$
	"Tag (${0})": "Tag (${0})", //$NON-NLS-0$  //$NON-NLS-1$
	"Commit (${0})": "Commit (${0})", //$NON-NLS-0$  //$NON-NLS-1$
	"StashCommit (${0})": "Stash (${0})", //$NON-NLS-0$  //$NON-NLS-1$
	"WIPStash": "WIP on ${0}: ${1}", //$NON-NLS-0$  //$NON-NLS-1$
	"IndexStash": "index on ${0}: ${1}", //$NON-NLS-0$  //$NON-NLS-1$
	"RemoteTrackingBranch (${0})": "Remote Branch (${0})", //$NON-NLS-0$  //$NON-NLS-1$
	"Active Branch Log": "Git Log (Active Branch)", //$NON-NLS-0$  //$NON-NLS-1$
	"Show the log for the active local branch": "Show the log for the active local branch", //$NON-NLS-0$  //$NON-NLS-1$
	"Remote Branch Log": "Git Log (Remote Branch)", //$NON-NLS-0$  //$NON-NLS-1$
	"Show the log for the corresponding remote tracking branch": "Show the log for the corresponding remote tracking branch", //$NON-NLS-0$  //$NON-NLS-1$
	"See Full Status" : "See Full Status", //$NON-NLS-0$  //$NON-NLS-1$
	"See the status" : "See the status", //$NON-NLS-0$  //$NON-NLS-1$
	"Choose target location" : "Choose target location", //$NON-NLS-0$  //$NON-NLS-1$
	"Default target location" : "Default target location", //$NON-NLS-0$  //$NON-NLS-1$
	"Change..." : "Change...", //$NON-NLS-0$  //$NON-NLS-1$
	"Merge Squash": "Merge Squash", //$NON-NLS-0$  //$NON-NLS-1$
	"Squash the content of the branch to the index" : "Squash the content of the branch to the index", //$NON-NLS-0$  //$NON-NLS-1$
	"Local Branch Name:" : "Local Branch Name:", //$NON-NLS-0$  //$NON-NLS-1$
	"Local": "local", //$NON-NLS-0$  //$NON-NLS-1$
	"Filter items" : "Filter items", //$NON-NLS-0$  //$NON-NLS-1$
	"Filter filter" : "Filter message", //$NON-NLS-0$  //$NON-NLS-1$
	"Filter author" : "Filter author", //$NON-NLS-0$  //$NON-NLS-1$
	"Filter committer" : "Filter commiter", //$NON-NLS-0$  //$NON-NLS-1$
	"Filter sha1" : "Filter sha1", //$NON-NLS-0$  //$NON-NLS-1$
	"Filter fromDate" : "Filter from date YYYY-MM-DD or 1(h d w m y)", //$NON-NLS-0$  //$NON-NLS-1$
	"Filter toDate" : "Filter to date YYYY-MM-DD or 1(h d w m y)", //$NON-NLS-0$  //$NON-NLS-1$
	"Filter path" : "Filter path", //$NON-NLS-0$  //$NON-NLS-1$
	"Filter remote branches" : "Filter remote branches", //$NON-NLS-0$  //$NON-NLS-1$
	"Getting remote branches" : "Getting remote branches ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"Getting remote details": "Getting remote details: ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"PatchApplied": "Patch applied successfully", //$NON-NLS-0$  //$NON-NLS-1$
	"PatchFailed": "Apply patch failed. ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"Getting branches" : "Getting branches ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"Paste link in email or IM" : "Paste link in email or IM", //$NON-NLS-0$  //$NON-NLS-1$
	"Show Commit in GitHub" : "Show Commit in GitHub", //$NON-NLS-0$  //$NON-NLS-1$
	"Show Repository in GitHub" : "Show Repository in GitHub", //$NON-NLS-0$  //$NON-NLS-1$
	"Show this commit in GitHub": "Show this commit in GitHub", //$NON-NLS-0$  //$NON-NLS-1$
	"Show Commit in eclipse.org": "Show Commit in eclipse.org", //$NON-NLS-0$  //$NON-NLS-1$
	"Show this commit in eclipse.org" : "Show this commit in eclipse.org", //$NON-NLS-0$  //$NON-NLS-1$
	"Show Repository in eclipse.org":"Show Repository in eclipse.org", //$NON-NLS-0$  //$NON-NLS-1$
	"Show this repository in eclipse.org":"Show this repository in eclipse.org", //$NON-NLS-0$  //$NON-NLS-1$
	"Ask for review" : "Ask for review", //$NON-NLS-0$  //$NON-NLS-1$
	"Ask for review tooltip" : "Send email with request for commit review", //$NON-NLS-0$  //$NON-NLS-1$
	"Reviewer name" : "Reviewer name", //$NON-NLS-0$  //$NON-NLS-1$
	"Contribution Review Request" : "Contribution Review Request", //$NON-NLS-0$  //$NON-NLS-1$
	"Send the link to the reviewer" : "Send the link to the reviewer", //$NON-NLS-0$  //$NON-NLS-1$
	"Private key file (optional):" : "Private key file (optional):", //$NON-NLS-0$  //$NON-NLS-1$
	"Don't prompt me again:" : "Don't prompt me again:", //$NON-NLS-0$  //$NON-NLS-1$
	"Your private key will be saved in the browser for further use" : "Your private key will be saved in the browser for further use", //$NON-NLS-0$  //$NON-NLS-1$
	"Loading Contribution Review Request..." : "Loading Contribution Review Request...", //$NON-NLS-0$  //$NON-NLS-1$
	"The commit can be found in the following repositories" : "The commit can be found in the following repositories", //$NON-NLS-0$  //$NON-NLS-1$
	"Try to update your repositories" : "Try to update your repositories", //$NON-NLS-0$  //$NON-NLS-1$
	"Create new repository" : "Create new repository", //$NON-NLS-0$  //$NON-NLS-1$
	"Attach the remote to one of your existing repositories" : "Attach the remote to one of your existing repositories", //$NON-NLS-0$  //$NON-NLS-1$
	"You are reviewing contribution ${0} from ${1}" : "You are reviewing contribution ${0} from ${1}", //$NON-NLS-0$  //$NON-NLS-1$
	"CommitNotFoundInWorkspace" : "Unfortunately the commit can not be found in your workspace. To see it try one of the following: ", //$NON-NLS-0$  //$NON-NLS-1$
 	"To review the commit you can also:" : "To review the commit you can also:", //$NON-NLS-0$  //$NON-NLS-1$
	"Contribution Review Request for ${0} on ${1}" : "Contribution Review Request for ${0} on ${1}", //$NON-NLS-0$  //$NON-NLS-1$
	"Failing paths: ${0}": "Failing paths: ${0}", //$NON-NLS-0$  //$NON-NLS-1$
	"Problem while performing the action": "Problem while performing the action", //$NON-NLS-0$  //$NON-NLS-1$
	"Go to the Orion repositories page to provide a git repository URL. Once the repository is created, it will appear in the Navigator.": "Go to the Orion repositories page to provide a git repository URL. Once the repository is created, it will appear in the Navigator.", //$NON-NLS-0$  //$NON-NLS-1$
	"URL:": "URL:", //$NON-NLS-0$  //$NON-NLS-1$
	"File:": "File:", //$NON-NLS-0$  //$NON-NLS-1$
	"Submit": "Submit", //$NON-NLS-0$  //$NON-NLS-1$
	"git url:": "git url: ", //$NON-NLS-0$  //$NON-NLS-1$
	"Revert": "Revert", //$NON-NLS-0$  //$NON-NLS-1$
	"Revert changes introduced by the commit into your active branch": "Revert changes introduced by the commit into your active branch", //$NON-NLS-0$  //$NON-NLS-1$
	". Could not revert into active branch": ". Could not revert into active branch.", //$NON-NLS-0$  //$NON-NLS-1$
	"Login": "Login", //$NON-NLS-0$  //$NON-NLS-1$
	"Authentication required for: ${0}. ${1} and re-try the request.": "Authentication required for: ${0}. ${1} and re-try the request.", //$NON-NLS-0$  //$NON-NLS-1$
	"Save":"Save", //$NON-NLS-0$  //$NON-NLS-1$
	"Remember my committer name and email:":"Remember my committer name and email:", //$NON-NLS-0$  //$NON-NLS-1$
	"Successfully edited ${0} to have value ${1}":"Successfully edited ${0} to have value ${1}", //$NON-NLS-0$  //$NON-NLS-1$
	"Successfully added ${0} with value ${1}":"Successfully added ${0} with value ${1}", //$NON-NLS-0$  //$NON-NLS-1$
	"Signed-off-by: ":"Signed-off-by: ", //$NON-NLS-0$  //$NON-NLS-1$
	"Change-Id: ":"Change-Id: ", //$NON-NLS-0$  //$NON-NLS-1$
	"REJECTED_NONFASTFORWARD":"Push is non-fastforward and was rejected. Use Fetch to see new commits that must be merged.", //$NON-NLS-0$  //$NON-NLS-1$
	"Commit and Push" : "Commit and Push", //$NON-NLS-0$  //$NON-NLS-1$
	"Sync" : "Sync", //$NON-NLS-0$  //$NON-NLS-1$
	"SyncTooltip" : "Fetch from the remote branch. Rebase your commits by removing them from the local branch, starting the local branch again based on the latest state of the remote branch and applying each commit to the updated local branch. Push commits and tags from your local branch into the remote branch.", //$NON-NLS-0$  //$NON-NLS-1$
	"NoCommits" : "No Changes", //$NON-NLS-0$  //$NON-NLS-1$
	"NoContent" : "No Content", //$NON-NLS-0$  //$NON-NLS-1$
	"Incoming" : "Incoming", //$NON-NLS-0$  //$NON-NLS-1$
	"Outgoing" : "Outgoing", //$NON-NLS-0$  //$NON-NLS-1$
	"IncomingWithCount" : "Incoming (${0})", //$NON-NLS-0$  //$NON-NLS-1$
	"OutgoingWithCount" : "Outgoing (${0})", //$NON-NLS-0$  //$NON-NLS-1$
	"Synchronized" : "History", //$NON-NLS-0$  //$NON-NLS-1$
	"Uncommited" : "Uncommited", //$NON-NLS-0$  //$NON-NLS-1$
	"Repository:" : "Repository:", //$NON-NLS-0$  //$NON-NLS-1$
	"Reference:" : "Reference:", //$NON-NLS-0$  //$NON-NLS-1$
	"Author:" : "Author:", //$NON-NLS-0$  //$NON-NLS-1$
	"Committer:" : "Committer:", //$NON-NLS-0$  //$NON-NLS-1$
	"SHA1:" : "SHA1:", //$NON-NLS-0$  //$NON-NLS-1$
	"ShowActiveBranchCmd" : "Show Active Branch", //$NON-NLS-0$  //$NON-NLS-1$
	"ShowReferenceCmd": "Show Reference", //$NON-NLS-0$  //$NON-NLS-1$
	"ShowReferenceTip": "View the history of ${1} \"${2}\"", //$NON-NLS-0$  //$NON-NLS-1$
	"ShowActiveBranchTip": "View the history of \"${0}\" relative to ${1} \"${2}\"", //$NON-NLS-0$  //$NON-NLS-1$
	"CommitType": "commit", //$NON-NLS-0$  //$NON-NLS-1$
	"BranchType": "branch", //$NON-NLS-0$  //$NON-NLS-1$
	"RemoteTrackingBranchType": "remote branch", //$NON-NLS-0$  //$NON-NLS-1$
	"TagType": "tag", //$NON-NLS-0$  //$NON-NLS-1$
	"StashCommitType": "stash", //$NON-NLS-0$  //$NON-NLS-1$
	"Path:" : "Path:", //$NON-NLS-0$  //$NON-NLS-1$
	"LocalChanges" : "Working Directory Changes", //$NON-NLS-0$  //$NON-NLS-1$
	"LocalChangesDetails" : "Working Directory Details", //$NON-NLS-0$  //$NON-NLS-1$
	"CompareChanges" : "Compare (${0} => ${1})", //$NON-NLS-0$  //$NON-NLS-1$
	"NoBranch" : "No Branch", //$NON-NLS-0$  //$NON-NLS-1$
	"NoActiveBranch" : "No Active Branch", //$NON-NLS-0$  //$NON-NLS-1$
	"NoRef" : "No Selected Reference", //$NON-NLS-0$  //$NON-NLS-1$
	"None": "None", //$NON-NLS-0$  //$NON-NLS-1$
	"FileSelected": "${0} file selected", //$NON-NLS-0$  //$NON-NLS-1$
	"FilesSelected": "${0} files selected", //$NON-NLS-0$  //$NON-NLS-1$
	"FileChanged": "${0} file changed", //$NON-NLS-0$  //$NON-NLS-1$
	"FilesChanged": "${0} files changed", //$NON-NLS-0$  //$NON-NLS-1$
	"file": "file", //$NON-NLS-0$  //$NON-NLS-1$
	"files": "files", //$NON-NLS-0$  //$NON-NLS-1$
	"EmptyCommitWarning": "The commit is empty", //$NON-NLS-0$  //$NON-NLS-1$
	"FilesChangedVsReadyToCommit": "${0} ${1} changed. ${2} ${3} ready to commit.", //$NON-NLS-0$  //$NON-NLS-1$
	"CommitPush": "Commit and Push", //$NON-NLS-0$  //$NON-NLS-1$
	"Commits and pushes files to the default remote": "Commits and pushes files to the default remote", //$NON-NLS-0$  //$NON-NLS-1$
	"Stash" : "Stash", //$NON-NLS-0$  //$NON-NLS-1$
	"stashIndex" : "stash@{${0}}: ${1}", //$NON-NLS-0$  //$NON-NLS-1$
	"Stash all current changes away" : "Stash all current changes away", //$NON-NLS-0$  //$NON-NLS-1$
	"Drop" : "Drop", //$NON-NLS-0$  //$NON-NLS-1$
	"Drop the commit from the stash list" : "Drop the commit from the stash list", //$NON-NLS-0$  //$NON-NLS-1$
	"Apply" : "Apply", //$NON-NLS-0$  //$NON-NLS-1$
	"Pop Stash" : "Pop Stash", //$NON-NLS-0$  //$NON-NLS-1$
	"Apply the most recently stashed change to your active branch and drop it from the stashes" : "Apply the most recently stashed change to your active branch and drop it from the stashes", //$NON-NLS-0$  //$NON-NLS-1$
	"stashes" : "stashes", //$NON-NLS-0$  //$NON-NLS-1$
	'addDependencyName': "Git Repository", //$NON-NLS-0$  //$NON-NLS-1$
	'addDependencyTooltip': "Associate a git repository with this project.",  //$NON-NLS-0$  //$NON-NLS-1$
	'addProjectName': "Git Repository",  //$NON-NLS-0$  //$NON-NLS-1$
	'addProjectTooltip': "Create a project from a git repository.",  //$NON-NLS-0$  //$NON-NLS-1$
	'fetchGroup': 'Fetch',  //$NON-NLS-0$  //$NON-NLS-1$
	'pushGroup' : 'Push',  //$NON-NLS-0$  //$NON-NLS-1$
	'Url:' : 'Url:', //$NON-NLS-0$  //$NON-NLS-1$
	'Ssh Private Key:' : 'Ssh Private Key:', //$NON-NLS-0$  //$NON-NLS-1$
	'Ssh Passphrase:' : 'Ssh Passphrase:', //$NON-NLS-0$  //$NON-NLS-1$
	'confirmUnsavedChanges': 'There are unsaved changes. Do you want to save them?' //$NON-NLS-1$ //$NON-NLS-0$
});
