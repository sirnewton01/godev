/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/

define(['domReady', 'orion/xhr', 'orion/PageUtil', 'orion/PageLinks', 'orion/webui/littlelib'], function(domReady, xhr, PageUtil, PageLinks, lib) {
	var userCreationEnabled;
	var registrationURI;
	var forceUserEmail;

	function getParam(key) {
		var regex = new RegExp('[\\?&]' + key + '=([^&#]*)');
		var results = regex.exec(window.location.href);
		if (results === null) {
			return;
		}
		return results[1];
	}

	function decodeBase64(input) {
		var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;

		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

		while (i < input.length) {

			enc1 = _keyStr.indexOf(input.charAt(i++));
			enc2 = _keyStr.indexOf(input.charAt(i++));
			enc3 = _keyStr.indexOf(input.charAt(i++));
			enc4 = _keyStr.indexOf(input.charAt(i++));

			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;

			output = output + String.fromCharCode(chr1);

			if (enc3 !== 64) {
				output = output + String.fromCharCode(chr2);
			}
			if (enc4 !== 64) {
				output = output + String.fromCharCode(chr3);
			}

		}
		output = output.replace(/\r\n/g, "\n");
		var utftext = "";

		for (var n = 0; n < output.length; n++) {

			var c = output.charCodeAt(n);

			if (c < 128) {
				utftext += String.fromCharCode(c);
			} else if ((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			} else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}

		}

		return utftext;
	}

	function showErrorMessage(msg) {
		if (typeof msg !== "undefined") {
			document.getElementById("errorMessage").textContent = msg;
		}
		document.getElementById("errorWin").style.visibility = '';
	}

	function hideErrorMessage() {
		document.getElementById("errorMessage").textContent = "\u00a0";
		document.getElementById("errorWin").style.visibility = 'hidden';
	}

	function setResetMessage(isError, message) {
		//document.getElementById("reset_errorList").className = isError ? "loginError" : "loginInfo";
		showErrorMessage(message);
	}

	function confirmResetUser() {
		var responseObject;
		if (document.getElementById("reset").value === "" && document.getElementById("resetEmail").value === "") {
			setResetMessage(true, "Provide username or email to reset.");
			return;
		}
		var mypostrequest = new XMLHttpRequest();
		mypostrequest.onreadystatechange = function() {
			hideErrorMessage();
			if (mypostrequest.readyState === 4) {
				if (mypostrequest.status === 200) {
					responseObject = JSON.parse(mypostrequest.responseText);
					if (responseObject.Message) {
						setResetMessage(false, responseObject.Message);
					} else {
						showErrorMessage();
					}
				} else {
					try {
						responseObject = JSON.parse(mypostrequest.responseText);
						if (responseObject.Message) {
							setResetMessage(true, responseObject.Message);
							return;
						}
					} catch (e) {
						// not json
					}
					setResetMessage(true, mypostrequest.statusText);
				}
			}
		};

		mypostrequest.open("POST", "../useremailconfirmation", true);
		mypostrequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		mypostrequest.setRequestHeader("Orion-Version", "1");
		mypostrequest.send("{login='" + document.getElementById("reset").value + "', email='" + document.getElementById("resetEmail").value + "'}");

		setResetMessage(false, "Sending password reset confirmation...");
	}

	function getRedirect() {
		var regex = new RegExp('[\\?&]redirect=([^&#]*)');
		var results = regex.exec(window.location.href);
		return results === null ? null : results[1];
	}

	function finishLogin() {
		var redirect = getRedirect();
		redirect = redirect === null ? PageLinks.getOrionHome() : redirect;
		if (redirect !== null) {
			redirect = decodeURIComponent(redirect);
			if(PageUtil.validateURLScheme(redirect)) {
				window.location = redirect;
				return;
			}
		}
		window.close();

	}

	function createOAuthLink(oauth) {
		if (oauth !== "" && oauth !== null) {
			var redirect = getRedirect();
			if (redirect !== null && PageUtil.validateURLScheme(decodeURIComponent(redirect))) {
				return "../login/oauth?oauth="+oauth+"&redirect=" + redirect;
			} else {
				return "../login/oauth?oauth="+oauth;
			}
		}
	}

	/* handleSelectionEvent - centralize decision making criteria for the key press,
	   click, gesture etc that we respect as a user choice */

	function handleSelectionEvent( event ){

		var outcome = false;

		if( event.type === 'click' || event.keyCode === 13 ){
			outcome = true;
		}

		event.stopPropagation();

		return outcome;
	}

	function confirmLogin(login, password) {
		if (!login) {
			login = document.getElementById('login').value.trim();
			password = document.getElementById('password').value;
		}

		if( login.length > 0 && password.length > 0 ){

			var mypostrequest = new XMLHttpRequest();
			mypostrequest.onreadystatechange = function() {
				if (mypostrequest.readyState === 4) {
					if (mypostrequest.status !== 200 && window.location.href.indexOf("http") !== -1) {
						var responseObject = JSON.parse(mypostrequest.responseText);
						showErrorMessage(responseObject.error);
					} else {
						finishLogin();
					}
				}
			};

			var parameters = "login=" + encodeURIComponent(login) + "&password=" + encodeURIComponent(password);
			mypostrequest.open("POST", "../login/form", true);
			mypostrequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			mypostrequest.setRequestHeader("Orion-Version", "1");
			mypostrequest.send(parameters);
		}
	}

	function validatePassword() {
		if (document.getElementById("create_password").value !== document.getElementById("create_passwordRetype").value) {
			showErrorMessage("Passwords don't match!");
			return false;
		}
		hideErrorMessage();
		return true;
	}

	function hideRegistration() {
		document.getElementById('newUserHeaderShown').style.visibility = 'hidden';
		document.getElementById('orionOpen').style.visibility = '';

		if (userCreationEnabled || registrationURI) {
			document.getElementById('orionRegister').style.visibility = '';
		}
		document.getElementById("registerButton").focus();
	}

	function hideLinkedRegistration() {
		document.getElementById('createLinkedHeaderShown').style.visibility = 'hidden';
		document.getElementById('orionOpen').style.visibility = '';

		if (userCreationEnabled || registrationURI) {
			document.getElementById('orionRegister').style.visibility = '';
		}
		document.getElementById("registerButton").focus();
	}

	function confirmCreateUser() {
		if (!validatePassword()) {
			document.getElementById("create_password").setAttribute("aria-invalid", "true");
			document.getElementById("create_passwordRetype").setAttribute("aria-invalid", "true");
			return;
		}
		document.getElementById("create_password").setAttribute("aria-invalid", "false");
		document.getElementById("create_passwordRetype").setAttribute("aria-invalid", "false");
		var mypostrequest = new XMLHttpRequest();
		var login = document.getElementById("create_login").value;
		var password = document.getElementById("create_password").value;
		var email =  document.getElementById("create_email").value;
		mypostrequest.onreadystatechange = function() {
			if (mypostrequest.readyState === 4) {
				if (mypostrequest.status !== 200 && window.location.href.indexOf("http") !== -1) {
					if (!mypostrequest.responseText) {
						return;
					}
					var responseObject = JSON.parse(mypostrequest.responseText);
					showErrorMessage(responseObject.Message);
					if(mypostrequest.status === 201){
						hideRegistration();
					}
				} else {
					confirmLogin(login, password);
				}
			}
		};
		var parameters = "login=" + encodeURIComponent(login) + "&password=" + encodeURIComponent(password) + "&email=" + encodeURIComponent(email);
		mypostrequest.open("POST", "../users", true);
		mypostrequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		mypostrequest.setRequestHeader("Orion-Version", "1");
		mypostrequest.send(parameters);
	}

	function confirmCreateLinkedUser(){
		var login = document.getElementById("create_linked_login").value;
		var email =  document.getElementById("create_linked_email").value;
		var identifier = getParam("identifier");
		var password = generateRandomPassword();

		var mypostrequest = new XMLHttpRequest();
		mypostrequest.onreadystatechange = function() {
			if (mypostrequest.readyState === 4) {
				if (mypostrequest.status !== 200 && window.location.href.indexOf("http") !== -1) {
					if (!mypostrequest.responseText) {
						return;
					}
					var responseObject = JSON.parse(mypostrequest.responseText);
					showErrorMessage(responseObject.Message);
					if(mypostrequest.status === 201){
						hideLinkedRegistration();
					}
				} else {
					confirmLogin(login, password);
				}
			}
		};
		var parameters = "login=" + encodeURIComponent(login) + "&password=" + encodeURIComponent(password) + "&identifier=" + encodeURIComponent(identifier) + "&email=" + encodeURIComponent(email);
		mypostrequest.open("POST", "../users", true);
		mypostrequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		mypostrequest.setRequestHeader("Orion-Version", "1");
		mypostrequest.send(parameters);
	}

	function generateRandomPassword() {
		// Passwords are a mix of both alpha and non-alpha charaters
		var aphaCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
		var nonAlphaCharacters = "0123456789";
		var minLength = 7;
		var password = "";
		for(var i = 0; i < minLength; i++) {
			password += aphaCharacters.charAt(Math.floor(Math.random() * aphaCharacters.length));
		}
		for(var i = 0; i < minLength; i++) {
			password += nonAlphaCharacters.charAt(Math.floor(Math.random() * nonAlphaCharacters.length));
		}
		return password;
	}

	function revealRegistration( event ) {
		// If registrationURI is set and userCreation is not, open the URI in a new window

		if( handleSelectionEvent( event ) ){

			if (!userCreationEnabled && registrationURI) {
				window.open(registrationURI);
				return;
			}

			document.getElementById('orionOpen').style.visibility = 'hidden';
			document.getElementById('orionRegister').style.visibility = 'hidden';

			document.getElementById('orionLoginForm').style.visibility = 'hidden';
			document.getElementById('orionRegister').style.visibility = 'hidden';
			document.getElementById('newUserHeaderShown').style.visibility = '';
			document.getElementById('create_login').focus();
		}
	}

	function showCreateUser( email, username ) {
		// Hide stuff
		document.getElementById('orionOpen').style.visibility = 'hidden';
		document.getElementById('orionRegister').style.visibility = 'hidden';

		document.getElementById('orionLoginForm').style.visibility = 'hidden';
		document.getElementById('orionRegister').style.visibility = 'hidden';
		// Show stuff
		document.getElementById('createLinkedHeaderShown').style.visibility = '';
		document.getElementById('create_linked_login').focus();
		document.getElementById('create_linked_login').value = username;
		document.getElementById('create_linked_email').value = email;
	}

	function formatForNoUserCreation() {
		document.getElementById('orionRegister').style.visibility = 'hidden';
	}

	function revealResetUser() {
		document.getElementById('orionLoginForm').style.visibility = 'hidden';
		if (!userCreationEnabled && !registrationURI) {
			document.getElementById('orionRegister').style.visibility = 'hidden';
			document.getElementById('orionReset').style.height = '212px';
		}
		document.getElementById('newUserHeaderShown').style.display = 'none';
		document.getElementById('orionReset').style.visibility = '';
		document.getElementById('reset').focus();
	}

	function hideResetUser() {
		document.getElementById('orionLoginForm').style.visibility = '';
		document.getElementById('newUserHeaderShown').style.display = '';
		document.getElementById('orionReset').style.visibility = 'hidden';
	}

	function revealLogin( event ){
		if( handleSelectionEvent( event ) ){
			lib.stop(event);
			document.getElementById('orionOpen').style.visibility = 'hidden';
			document.getElementById('orionRegister').style.visibility = 'hidden';
			document.getElementById('orionLoginForm').style.visibility = '';
			document.getElementById("login").focus();
		}
	}

	function hideLogin(){
		document.getElementById('orionLoginForm').style.visibility = 'hidden';
		document.getElementById('orionOpen').style.visibility = '';

		if (userCreationEnabled || registrationURI) {
			document.getElementById('orionRegister').style.visibility = '';
		}
		document.getElementById("orionLogin").focus();
		hideErrorMessage();
	}

	function clickElement( event ){
		if( handleSelectionEvent( event ) ){
			event.srcElement.click();
		}
	}

	domReady(function() {

		var error = getParam("error");
		if (error) {
			var errorMessage = decodeBase64(error);

			showErrorMessage(errorMessage);
		}

		var oauth = getParam("oauth");
		if (oauth) {
			var email = getParam("email");
			var username = getParam("username");
			showCreateUser(email, username);
		}

		var checkusersrequest = new XMLHttpRequest();
		checkusersrequest.onreadystatechange = function() {
			if (checkusersrequest.readyState === 4) {
				if (checkusersrequest.status === 200) {
					var responseObject = JSON.parse(checkusersrequest.responseText);
					userCreationEnabled = responseObject.CanAddUsers;
					forceUserEmail = responseObject.ForceEmail;
					document.getElementById("create_email").setAttribute("aria-required", forceUserEmail);
					registrationURI = responseObject.RegistrationURI;
					if (!userCreationEnabled && !registrationURI) {
						formatForNoUserCreation();
					}
					document.getElementById("login-window").style.display = '';
					document.getElementById("orionLogin").focus();
				}
			}
		};

		checkusersrequest.open("POST", "../login/canaddusers", true);
		checkusersrequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		checkusersrequest.setRequestHeader("Orion-Version", "1");
		checkusersrequest.send();

		var checkemailrequest = new XMLHttpRequest();
		checkemailrequest.onreadystatechange = function() {
			if (checkemailrequest.readyState === 4) {
				if (checkemailrequest.status === 200) {
					var responseObject = JSON.parse(checkemailrequest.responseText);
					if (responseObject.emailConfigured === false) {
						document.getElementById("resetUserLink").style.display = 'none';
					}
				}
			}
		};

		checkemailrequest.open("POST", "../useremailconfirmation/cansendemails", true);
		checkemailrequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		checkemailrequest.setRequestHeader("Orion-Version", "1");
		checkemailrequest.send();

		xhr("GET", "../server-status.json", { //$NON-NLS-0$
			timeout: 15000,
			responseType: "json"
		}).then(function(result) {
			var messages = result.response.messages;
			if (messages.length > 0) {
				var currentDate = new Date();
				var startDate = new Date(messages[0].startdate);
				startDate.setHours(0, 0, 0, 0);
				if (startDate > currentDate) { return; }
				var endDate = new Date(messages[0].enddate);
				endDate.setHours(23, 59, 59);
				if (endDate <= currentDate)  { return; }
				document.getElementById("orionInfoArea").style.visibility = '';
				document.getElementById("orionInfoMessage").textContent = messages[0].title;
			}
		}, function(error) {
		});

		// TODO: Temporary --- old page logic
		document.getElementById("login").addEventListener("keypress", function(event) {
			if (event.keyCode === lib.KEY.ENTER) {
				confirmLogin();
				lib.stop(event);
			}
		});

		document.getElementById("password").addEventListener("keypress", function(event) {
			if (event.keyCode === lib.KEY.ENTER) {
				confirmLogin();
				lib.stop(event);
			}
		});

		document.getElementById("loginButton").addEventListener("click", function() {
			confirmLogin();
		});

		document.getElementById("orionLoginForm").addEventListener("keyup", function(event) {
			if (event.keyCode === lib.KEY.ESCAPE) {
				hideLogin();
				lib.stop(event);
			}
		});

		document.getElementById("resetUserLink").addEventListener("click",  revealResetUser);

		document.getElementById("reset").addEventListener("keypress", function(event) {
			if (event.keyCode === lib.KEY.ENTER) {
				confirmResetUser();
				lib.stop(event);
			}
		});

		document.getElementById("resetEmail").addEventListener("keypress", function(event) {
			if (event.keyCode === lib.KEY.ENTER) {
				confirmResetUser();
				lib.stop(event);
			}
		});

		document.getElementById("registerButton").addEventListener("click", revealRegistration);
		document.getElementById("registerButton").addEventListener("keydown", revealRegistration);

		document.getElementById("create_login").addEventListener("keyup", function(event) {
			if (event.keyCode === lib.KEY.ENTER) {
				confirmCreateUser();
			} else {
				validatePassword();
			}
		});

		document.getElementById("create_password").addEventListener("keyup", function(event) {
			if (event.keyCode === lib.KEY.ENTER) {
				confirmCreateUser();
			} else {
				validatePassword();
			}
		});

		document.getElementById("create_passwordRetype").addEventListener("keyup", function(event) {
			if (event.keyCode === lib.KEY.ENTER) {
				confirmCreateUser();
			} else {
				validatePassword();
			}
		});

		document.getElementById("create_email").addEventListener("keyup", function(event) {
			if (event.keyCode === lib.KEY.ENTER) {
				confirmCreateUser();
			} else {
				validatePassword();
			}
		});

		document.getElementById("newUserHeaderShown").addEventListener("keyup", function(event) {
			if (event.keyCode === lib.KEY.ESCAPE) {
				hideRegistration();
			}
		});

		document.getElementById("createButton").addEventListener("click", confirmCreateUser);
		document.getElementById('cancelLoginButton').addEventListener("click", hideLogin);

		document.getElementById("newUserHeaderShown").onkeyup = function(event) {
			if (event.keyCode === lib.KEY.ESCAPE) {
				hideRegistration();
			}
		};

		document.getElementById("hideRegisterButton").addEventListener("click", hideRegistration);

		document.getElementById("createLinkedButton").addEventListener("click", confirmCreateLinkedUser);
		document.getElementById("hideLinkedRegisterButton").addEventListener("click", hideLinkedRegistration);


		// FIX the hrefs of the various forms here.
		document.getElementById("googleLoginPlus").href = createOAuthLink("google");
		document.getElementById("googleLoginPlus").addEventListener("keydown", clickElement);

		document.getElementById("githubLogin").href = createOAuthLink("github");
		document.getElementById("githubLogin").addEventListener("keydown", clickElement);

		document.getElementById("orionLogin").addEventListener("click", revealLogin);
		document.getElementById("orionLogin").onkeydown = revealLogin;

		document.getElementById("cancelResetButton").onclick = hideResetUser;

		document.getElementById("sendResetButton").onclick = confirmResetUser;
	});
});
