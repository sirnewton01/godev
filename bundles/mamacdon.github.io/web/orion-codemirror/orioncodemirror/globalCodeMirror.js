/*global define*/
/*jslint browser:true*/

/**
 * This sets the global CodeMirror object. Must be loaded before any modes from CodeMirror2 are loaded,
 * as they expect the global to be set.
 */
define(['orion/editor/mirror'], function(mMirror) {
	if (!window.CodeMirror) {
		window.CodeMirror = new mMirror.Mirror();
	}
	return window.CodeMirror;
});