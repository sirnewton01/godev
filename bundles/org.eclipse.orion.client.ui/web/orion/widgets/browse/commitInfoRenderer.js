/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others. 
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global console define URL*/
/*jslint browser:true sub:true*/
define([
	'orion/objects',
	"orion/URITemplate",
	'orion/webui/littlelib',
	'orion/URL-shim'
], function(objects, URITemplate, lib) {

	function _timeDifference(commitTimeStamp) {
		var currentDate = new Date();
		var commitDate = new Date(commitTimeStamp);
	    var difference = currentDate.getTime() - commitDate.getTime();
	    var yearDiff = Math.floor(difference/1000/60/60/24/365);
	    difference -= yearDiff*1000*60*60*24*365;
	    var monthDiff = Math.floor(difference/1000/60/60/24/30);
	    difference -= monthDiff*1000*60*60*24*30;
	    var daysDifference = Math.floor(difference/1000/60/60/24);
	    difference -= daysDifference*1000*60*60*24;
		var hoursDifference = Math.floor(difference/1000/60/60);
	    difference -= hoursDifference*1000*60*60;
	    var minutesDifference = Math.floor(difference/1000/60);
	    difference -= minutesDifference*1000*60;
	    var secondsDifference = Math.floor(difference/1000);
	    return {year: yearDiff, month: monthDiff, day: daysDifference, hour: hoursDifference, minute: minutesDifference, second: secondsDifference};
	}
	function _generateTimeString(number, singleTerm, term) {
		if(number > 0) {
			if(number === 1) {
				return singleTerm + " ";
			}
			return number + " " + term + " ";
		}
		return "";
	}
	function calculateTime(commitTimeStamp) {
		var diff = _timeDifference(commitTimeStamp);
		var yearStr = _generateTimeString(diff.year, "a year", "years");
		var monthStr = _generateTimeString(diff.month, "a month", "months");
		var dayStr = _generateTimeString(diff.day, "a day", "days");
		var hourStr = _generateTimeString(diff.hour, "an hour", "hours");
		var minuteStr = _generateTimeString(diff.minute, "a minute", "minutes");
		var disPlayStr = "";
		if(yearStr) {
			disPlayStr = diff.year > 0 ? yearStr : yearStr + monthStr;
		} else if(monthStr) {
			disPlayStr = diff.month > 0 ? monthStr : monthStr + dayStr;
		} else if(dayStr) {
			disPlayStr = diff.day > 0 ? dayStr : dayStr + hourStr;
		} else if(hourStr) {
			disPlayStr = diff.hour > 0 ? hourStr : hourStr + minuteStr;
		} else if(minuteStr) {
			disPlayStr = minuteStr;
		}
		if(disPlayStr) {
			return disPlayStr + "ago";
		}	
		return "Just now";	
	}
	/**
	 * @name orion.widgets.browse.CommitInfoRenderer
	 * @class Comit Info renderer.
	 * @description Renders a DIV with commit information.
	 * @name orion.browse.CommitInfoOptions
	 *
	 * @property {String|DOMElement} parent the parent element for the commit information, it can be either a DOM element or an ID for a DOM element.
	 * @property {Object} commitInfo the information object of a commit information.
	 *	{
	 *	   Author: {Name: "string", Email: "email@addre.ss", Date: milliseconds(integer) },
	 *	   Committer: {Name: "string", Email: "email@addre.ss", Date: milliseconds(integer) },
	 *	   Message: "string",
	 * 	   URL: "string",
	 * 	   AvatarURL: "string"
	 *	}
	 */

	function CommitInfoRenderer(params) {
		this._parentDomNode = lib.node(params.parent);//Required
		this._commitInfo = params.commitInfo;//Required
	}
	objects.mixin(CommitInfoRenderer.prototype, /** @lends orion.widgets.Filesystem.CommitInfoRenderer */ {
		destroy: function() {
		},
		_simpleMessage: function(maxLength) {
			var message = this._commitInfo.Message ? this._commitInfo.Message : "";
			if(message) {
				var arrayofMsg = message.replace(/\r\n|\n\r|\n|\r/g,"\n").split("\n");		
				if(arrayofMsg && arrayofMsg.length > 0) {
					message = arrayofMsg[0];
				}
				if(maxLength > 10 && message.length > maxLength) {
					message = message.substring(0, maxLength-3) + "...";
				}
			}
			return message;
		},
		_generateMessageNode: function(message) {
			var messageNode;
			if(this._commitInfo.URL || this._commitInfo.SHA1) {
				messageNode = document.createElement("a"); //$NON-NLS-0$
				if(this._commitInfo.SHA1) {
					var commitURLBase = (new URL("commit", window.location.href)).href;
					messageNode.href = new URITemplate(commitURLBase + "{/SHA1}").expand(this._commitInfo);
				} else {
					messageNode.href = this._commitInfo.URL;
				}
				messageNode.classList.add("commitInfolink"); //$NON-NLS-0$
				messageNode.appendChild(document.createTextNode(message));
			} else {
				messageNode = document.createElement("span"); //$NON-NLS-0$
				messageNode.appendChild(document.createTextNode(message));
			}
			return messageNode;
		},
		renderSimple: function(maxWidth) {
			this._parentDomNode.appendChild(this._generateMessageNode(this._simpleMessage(maxWidth)));
		},
		render: function(commitLabel, showAvatar) {
			//var commitDate = this._commitInfo.Author && this._commitInfo.Author.Date ? new Date(this._commitInfo.Author.Date).toLocaleString() : "";
			var commitDate = this._commitInfo.Author && this._commitInfo.Author.Date ? calculateTime(this._commitInfo.Author.Date) : "";
			
			var message = this._simpleMessage(-1);
			var authorName = this._commitInfo.Author && this._commitInfo.Author.Name ? this._commitInfo.Author.Name : "";
			
			//Render the avatar or label
			var label = commitLabel;
			if(!label) {
				label = "Commit";
			}
			label = "Last " + label;
			if(showAvatar) {
				var avatarContainer = document.createElement("div");
				var avatarImage = new Image();//document.createElement("image");
				if(this._commitInfo.AvatarURL) {
					avatarImage.src = this._commitInfo.AvatarURL;
				} else {
					avatarImage.src = "https://www.gravatar.com/avatar/?d=mm";
				}
				avatarImage.classList.add("commitInfoAvatar"); //$NON-NLS-0$
				avatarContainer.appendChild(avatarImage);
				this._parentDomNode.appendChild(avatarContainer);
			} else {
				var labelContainer = document.createElement("div");
				labelContainer.classList.add("commitInfoLabelContainer"); //$NON-NLS-0$
				labelContainer.appendChild(document.createTextNode(label.toUpperCase()));
				this._parentDomNode.appendChild(labelContainer);
			}
			
			//Render the message, author and date on the right of the avatar
			var messageContainer = document.createElement("div");
			messageContainer.classList.add("commitInfoMessageContainer"); //$NON-NLS-0$
			
			var authorNode = document.createElement("div");
			authorNode.classList.add("commitInfoAutorContainer"); //$NON-NLS-0$
			var fragment = document.createDocumentFragment();
			var nameLabel = document.createElement("span"); //$NON-NLS-0$
			nameLabel.appendChild(document.createTextNode(authorName)); //$NON-NLS-0$
			nameLabel.classList.add("navColumnBold"); //$NON-NLS-0$
			var segments;
			if(showAvatar) {
				var segLabel = document.createElement("span"); //$NON-NLS-0$
				segLabel.appendChild(document.createTextNode(label)); //$NON-NLS-0$
				segLabel.classList.add("navColumnBold"); //$NON-NLS-0$
				fragment.textContent = commitDate ? "${0} by ${1} " + commitDate +"." : "${0} by ${1}.";
				segments = [segLabel, nameLabel];
			} else {
				fragment.textContent = commitDate ? "by ${0} " + commitDate +"." : "by ${0}.";
				segments = [nameLabel];
			}
			lib.processDOMNodes(fragment, segments);
			authorNode.appendChild(fragment);
			messageContainer.appendChild(authorNode);
			
			var messageTextContainer = document.createElement("div");
			messageTextContainer.classList.add("commitInfoMessageTextContainer"); //$NON-NLS-0$
			messageTextContainer.appendChild(this._generateMessageNode(message));
			messageContainer.appendChild(messageTextContainer);

			this._parentDomNode.appendChild(messageContainer);
		}
	});

	return {CommitInfoRenderer: CommitInfoRenderer,
			calculateTime: calculateTime
	};
});
