/*******************************************************************************
 * @license Copyright (c) 2012 IBM Corporation and others. All rights reserved.
 *          This program and the accompanying materials are made available under
 *          the terms of the Eclipse Public License v1.0
 *          (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse
 *          Distribution License v1.0
 *          (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
 
 /*global define window*/

define([ 'i18n!git/nls/gitmessages', 'orion/webui/dialog' ], function(messages, dialog) {

	function ReviewRequestDialog(options) {
		this._init(options);
	}

	ReviewRequestDialog.prototype = new dialog.Dialog();

	ReviewRequestDialog.prototype.TEMPLATE = '<div>'
		+ '<div id="treeContentPane" style="padding: 8px">'
		+ '<label for="reviewReqUrl">${Paste link in email or IM}</label><br>'
		+ '<input id="reviewReqUrl" style="width: 50em" value=""/>' 
		+ '</div>'
		+ '<div id="newBranchPane" style="padding: 8px">' 
		+ '<label for="reviewerName">${Send the link to the reviewer}</label><br>'
		+ '<input id="reviewerName" style="width: 30em"  value=""/>' 
		+ '</div>' 
		+ '</div>';

	ReviewRequestDialog.prototype._init = function(options) {
		var that = this;

		this.title = options.title || messages["Contribution Review Request"];
		this.modal = true;
		this.messages = messages;
		this.url = options.url;
		this.func = options.func;

		this.buttons = [];

		this.buttons.push({ callback : function() {
			that.destroy();
			that.func(that.$reviewerName.value);
		},
		text : messages["Submit"]
		});

		// Start the dialog initialization.
		this._initialize();
	};

	ReviewRequestDialog.prototype._bindToDom = function(parent) {
		this.$reviewReqUrl.value = this.url;
	};

	ReviewRequestDialog.prototype.constructor = ReviewRequestDialog;

	// return the module exports
	return { ReviewRequestDialog : ReviewRequestDialog
	};
});
